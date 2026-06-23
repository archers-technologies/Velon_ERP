import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InvitationStatus, UserRole } from "@velon/database";
import * as bcrypt from "bcrypt";
import { normalizeVelonRole, VelonRole } from "@velon/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthService } from "../auth/auth.service";
import { assertPasswordAllowed } from "../auth/password-policy.util";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveTenantContext } from "../common/tenant-context.storage";
import { cleanupUsersWithoutMemberships } from "../common/tenant-lifecycle.util";
import { InvitationMailer } from "./invitation-mailer";
import { RedisService } from "../redis/redis.service";
import { SeatsService } from "./seats.service";
import {
  assertAssignableRole,
  assertAtLeastOneOwner,
  assertOwnerRole,
  assertTenantOwnerRole,
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  mapMembership,
} from "./tenant-admin.utils";
import type {
  AcceptInvitationDto,
  AssignDepartmentDto,
  CreateDepartmentDto,
  CreateInvitationDto,
  UpdateCompanyProfileDto,
  UpdateDepartmentDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceDto,
  DeleteWorkspaceDto,
} from "./dto/tenant-admin.dto";

@Injectable()
export class TenantAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly seats: SeatsService,
    private readonly mailer: InvitationMailer,
    private readonly auth: AuthService,
    private readonly redis: RedisService,
  ) {}

  private tenantId(): string {
    return getActiveTenantContext().tenantId;
  }

  private assertOwner(user: AuthenticatedUser) {
    assertOwnerRole(user.role);
  }

  // ─── Overview ─────────────────────────────────────────────────────────────

  async getAdminOverview(user: AuthenticatedUser) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const [seats, departments, pendingInvites, members, auditLogs, tenant, workspace] =
      await Promise.all([
        this.seats.getSeatSummary(tenantId),
        this.prisma.client.department.count({ where: { tenantId } }),
        this.prisma.client.tenantInvitation.count({
          where: { tenantId, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
        }),
        this.prisma.client.tenantMembership.count({ where: { tenantId } }),
        this.audit.listRecent(20, tenantId),
        this.prisma.client.tenant.findUniqueOrThrow({
          where: { id: tenantId },
          include: { companyProfile: true },
        }),
        this.prisma.client.workspace.findUnique({ where: { tenantId } }),
      ]);

    return {
      companyProfile: tenant.companyProfile,
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            timezone: workspace.timezone,
            currency: workspace.currency,
            language: workspace.language,
            isActive: workspace.isActive,
          }
        : null,
      seats,
      departmentCount: departments,
      pendingInvitations: pendingInvites,
      memberCount: members,
      auditLogs: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        at: a.createdAt.toISOString(),
        actorEmail: a.actor?.email ?? null,
        metadata: a.metadata,
      })),
    };
  }

  // ─── Company & workspace ───────────────────────────────────────────────────

  async updateCompanyProfile(
    user: AuthenticatedUser,
    dto: UpdateCompanyProfileDto,
    reqMeta?: { ip?: string; ua?: string },
  ) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const existing = await this.prisma.client.companyProfile.findUnique({
      where: { tenantId },
    });
    if (!existing) throw new NotFoundException("Company profile not found.");
    const row = await this.prisma.client.companyProfile.update({
      where: { tenantId },
      data: {
        ...(dto.legalName !== undefined ? { legalName: dto.legalName.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.country !== undefined ? { country: dto.country.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.website !== undefined ? { website: dto.website?.trim() || null } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId?.trim() || null } : {}),
        ...(dto.logoDataUrl !== undefined ? { logoDataUrl: dto.logoDataUrl || null } : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
      },
    });
    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.company_updated",
      entityType: "company_profile",
      entityId: row.id,
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });
    return row;
  }

  async updateWorkspace(
    user: AuthenticatedUser,
    dto: UpdateWorkspaceDto,
    reqMeta?: { ip?: string; ua?: string },
  ) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const ws = await this.prisma.client.workspace.findUnique({ where: { tenantId } });
    if (!ws) throw new NotFoundException("Workspace not found.");
    const row = await this.prisma.client.workspace.update({
      where: { tenantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone.trim() } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency.trim().toUpperCase() } : {}),
        ...(dto.language !== undefined ? { language: dto.language.trim().toLowerCase() } : {}),
      },
    });
    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.workspace_updated",
      entityType: "workspace",
      entityId: row.id,
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      timezone: row.timezone,
      currency: row.currency,
      language: row.language,
      isActive: row.isActive,
    };
  }

  async deleteWorkspace(
    user: AuthenticatedUser,
    dto: DeleteWorkspaceDto,
    reqMeta?: { ip?: string; ua?: string },
  ) {
    assertTenantOwnerRole(user.role);
    const tenantId = this.tenantId();
    const confirmPhrase = dto.confirmPhrase.trim().toUpperCase();
    if (confirmPhrase !== "DELETE") {
      throw new BadRequestException('Type DELETE to confirm workspace deletion.');
    }

    const [tenant, dbUser] = await Promise.all([
      this.prisma.client.tenant.findUnique({
        where: { id: tenantId },
        include: { memberships: { select: { userId: true } } },
      }),
      this.prisma.client.user.findUnique({ where: { id: user.id } }),
    ]);
    if (!tenant) throw new NotFoundException("Workspace not found.");
    if (!dbUser) throw new NotFoundException("User not found.");

    const passwordOk = await bcrypt.compare(dto.password, dbUser.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("Incorrect password.");
    }

    const memberUserIds = tenant.memberships.map((m) => m.userId);

    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.deleted",
      entityType: "tenant",
      entityId: tenantId,
      metadata: {
        name: tenant.name,
        tenantCode: tenant.tenantCode,
        slug: tenant.slug,
        initiatedBy: "workspace_owner",
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    await this.prisma.client.tenant.delete({ where: { id: tenantId } });
    await cleanupUsersWithoutMemberships(this.prisma.client, memberUserIds);
    await this.redis.bumpRevision();
    await this.redis.publish(
      "velon:platform:events",
      JSON.stringify({ kind: "tenant.deleted", id: tenantId }),
    );

    return { id: tenantId, deleted: true as const };
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  async listDepartments(user: AuthenticatedUser) {
    this.assertOwner(user);
    const rows = await this.prisma.client.department.findMany({
      where: { tenantId: this.tenantId() },
      include: {
        manager: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { memberships: true } },
      },
      orderBy: { name: "asc" },
    });
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      managerId: d.managerId,
      managerName: d.manager?.user.name ?? d.manager?.user.email ?? null,
      memberCount: d._count.memberships,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async createDepartment(user: AuthenticatedUser, dto: CreateDepartmentDto, reqMeta?: { ip?: string; ua?: string }) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    if (dto.managerId) await this.assertMembershipInTenant(dto.managerId, tenantId);
    const row = await this.prisma.client.department.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        managerId: dto.managerId ?? null,
      },
    });
    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.department_created",
      entityType: "department",
      entityId: row.id,
      metadata: { name: row.name },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });
    return row;
  }

  async updateDepartment(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateDepartmentDto,
    reqMeta?: { ip?: string; ua?: string },
  ) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const existing = await this.prisma.client.department.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException("Department not found.");
    if (dto.managerId) await this.assertMembershipInTenant(dto.managerId, tenantId);
    const row = await this.prisma.client.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
      },
    });
    return row;
  }

  async deleteDepartment(user: AuthenticatedUser, id: string, reqMeta?: { ip?: string; ua?: string }) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const existing = await this.prisma.client.department.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException("Department not found.");
    await this.prisma.client.department.delete({ where: { id } });
    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.department_deleted",
      entityType: "department",
      entityId: id,
      metadata: { name: existing.name },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });
    return { ok: true };
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async listMembers(user: AuthenticatedUser, search?: string) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const rows = await this.prisma.client.tenantMembership.findMany({
      where: {
        tenantId,
        ...(search?.trim()
          ? {
              OR: [
                { user: { email: { contains: search.trim(), mode: "insensitive" as const } } },
                { user: { name: { contains: search.trim(), mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { id: true, email: true, name: true, isActive: true, lastLoginAt: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapMembership);
  }

  async updateMemberRole(
    user: AuthenticatedUser,
    membershipId: string,
    dto: UpdateMemberRoleDto,
    reqMeta?: { ip?: string; ua?: string },
  ) {
    this.assertOwner(user);
    assertAssignableRole(dto.role);
    const tenantId = this.tenantId();
    const membership = await this.getMembershipOrThrow(membershipId, tenantId);

    if (membership.userId === user.id && dto.role !== membership.role) {
      throw new ForbiddenException("You cannot change your own role.");
    }

    const wasOwner =
      membership.role === UserRole.TENANT_OWNER || membership.role === UserRole.TENANT_ADMIN;
    const willBeOwner = dto.role === UserRole.TENANT_OWNER || dto.role === UserRole.TENANT_ADMIN;
    if (wasOwner && !willBeOwner) {
      await assertAtLeastOneOwner(this.prisma, tenantId, membershipId);
    }

    const updated = await this.prisma.client.tenantMembership.update({
      where: { id: membershipId },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, email: true, name: true, isActive: true, lastLoginAt: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.role_changed",
      entityType: "membership",
      entityId: membershipId,
      metadata: { from: membership.role, to: dto.role, userId: membership.userId },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return mapMembership(updated);
  }

  async setMemberDepartment(
    user: AuthenticatedUser,
    membershipId: string,
    dto: AssignDepartmentDto,
  ) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    await this.getMembershipOrThrow(membershipId, tenantId);
    if (dto.departmentId) {
      const dept = await this.prisma.client.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      if (!dept) throw new NotFoundException("Department not found.");
    }
    const updated = await this.prisma.client.tenantMembership.update({
      where: { id: membershipId },
      data: { departmentId: dto.departmentId ?? null },
      include: {
        user: { select: { id: true, email: true, name: true, isActive: true, lastLoginAt: true } },
        department: { select: { id: true, name: true } },
      },
    });
    return mapMembership(updated);
  }

  async disableMember(user: AuthenticatedUser, membershipId: string, reqMeta?: { ip?: string; ua?: string }) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const membership = await this.getMembershipOrThrow(membershipId, tenantId);
    if (membership.userId === user.id) {
      throw new BadRequestException("Tenant Owner cannot disable themselves.");
    }
    if (membership.role === UserRole.TENANT_OWNER || membership.role === UserRole.TENANT_ADMIN) {
      await assertAtLeastOneOwner(this.prisma, tenantId, membershipId);
    }
    await this.prisma.client.$transaction([
      this.prisma.client.tenantMembership.update({
        where: { id: membershipId },
        data: { isActive: false },
      }),
      this.prisma.client.user.update({
        where: { id: membership.userId },
        data: { isActive: false },
      }),
    ]);
    await this.seats.syncUsersCount(tenantId);
    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.user_disabled",
      entityType: "membership",
      entityId: membershipId,
      metadata: { userId: membership.userId },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });
    return { ok: true };
  }

  async enableMember(user: AuthenticatedUser, membershipId: string, reqMeta?: { ip?: string; ua?: string }) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    await this.seats.assertCanAddSeat(tenantId);
    const membership = await this.getMembershipOrThrow(membershipId, tenantId);
    await this.prisma.client.$transaction([
      this.prisma.client.tenantMembership.update({
        where: { id: membershipId },
        data: { isActive: true },
      }),
      this.prisma.client.user.update({
        where: { id: membership.userId },
        data: { isActive: true },
      }),
    ]);
    await this.seats.syncUsersCount(tenantId);
    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.user_enabled",
      entityType: "membership",
      entityId: membershipId,
      metadata: { userId: membership.userId },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });
    return { ok: true };
  }

  async removeMember(user: AuthenticatedUser, membershipId: string, reqMeta?: { ip?: string; ua?: string }) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const membership = await this.getMembershipOrThrow(membershipId, tenantId);
    if (membership.userId === user.id) {
      throw new BadRequestException("Tenant Owner cannot remove themselves.");
    }
    if (membership.role === UserRole.TENANT_OWNER || membership.role === UserRole.TENANT_ADMIN) {
      await assertAtLeastOneOwner(this.prisma, tenantId, membershipId);
    }
    await this.prisma.client.tenantMembership.delete({ where: { id: membershipId } });
    await this.seats.syncUsersCount(tenantId);
    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.user_removed",
      entityType: "membership",
      entityId: membershipId,
      metadata: { userId: membership.userId },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });
    return { ok: true };
  }

  // ─── Invitations ──────────────────────────────────────────────────────────

  async listInvitations(user: AuthenticatedUser) {
    this.assertOwner(user);
    const rows = await this.prisma.client.tenantInvitation.findMany({
      where: { tenantId: this.tenantId() },
      include: {
        department: { select: { name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((inv) => ({
      id: inv.id,
      email: inv.email,
      fullName: inv.fullName,
      role: inv.role,
      departmentId: inv.departmentId,
      departmentName: inv.department?.name ?? null,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      acceptedAt: inv.acceptedAt?.toISOString() ?? null,
      invitedBy: inv.invitedBy.name ?? inv.invitedBy.email,
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  async createInvitation(
    user: AuthenticatedUser,
    dto: CreateInvitationDto,
    reqMeta?: { ip?: string; ua?: string; appOrigin?: string },
  ) {
    this.assertOwner(user);
    assertAssignableRole(dto.role);
    const tenantId = this.tenantId();
    try {
      await this.seats.assertCanAddSeat(tenantId);
    } catch (err) {
      await this.audit.log({
        actorId: user.id,
        tenantId,
        action: "tenant.seat_limit_reached",
        entityType: "tenant",
        entityId: tenantId,
        metadata: { email: dto.email.trim().toLowerCase() },
        ipAddress: reqMeta?.ip,
        userAgent: reqMeta?.ua,
      });
      throw err;
    }

    const email = dto.email.trim().toLowerCase();
    const existingMember = await this.prisma.client.tenantMembership.findFirst({
      where: { tenantId, user: { email }, isActive: true },
    });
    if (existingMember) {
      throw new ConflictException("User is already a member of this workspace.");
    }

    const pending = await this.prisma.client.tenantInvitation.findFirst({
      where: {
        tenantId,
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new ConflictException("A pending invitation already exists for this email.");
    }

    if (dto.departmentId) {
      const dept = await this.prisma.client.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      if (!dept) throw new NotFoundException("Department not found.");
    }

    const token = generateInviteToken();
    const expiresAt = inviteExpiresAt();
    const [tenant, workspace, inviter] = await Promise.all([
      this.prisma.client.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.client.workspace.findUnique({ where: { tenantId } }),
      this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } }),
    ]);

    const invitation = await this.prisma.client.tenantInvitation.create({
      data: {
        tenantId,
        email,
        fullName: dto.fullName.trim(),
        role: dto.role === UserRole.TENANT_USER ? UserRole.USER : dto.role,
        departmentId: dto.departmentId ?? null,
        tokenHash: hashInviteToken(token),
        expiresAt,
        invitedById: user.id,
      },
    });

    const origin = reqMeta?.appOrigin ?? process.env.APP_ORIGIN ?? "http://localhost:5173";
    const inviteUrl = `${origin.replace(/\/$/, "")}/invite/${token}`;
    const mail = await this.mailer.sendInvite({
      to: email,
      fullName: dto.fullName.trim(),
      workspaceName: workspace?.name ?? tenant.name,
      inviterName: inviter.name ?? inviter.email,
      inviteUrl,
      expiresAt,
    });

    await this.audit.log({
      actorId: user.id,
      tenantId,
      action: "tenant.invitation_sent",
      entityType: "invitation",
      entityId: invitation.id,
      metadata: { email, role: dto.role, departmentId: dto.departmentId ?? null },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return {
      id: invitation.id,
      email,
      expiresAt: expiresAt.toISOString(),
      delivered: mail.delivered,
      ...(mail.devUrl ? { devInviteUrl: mail.devUrl } : {}),
    };
  }

  async revokeInvitation(user: AuthenticatedUser, id: string, reqMeta?: { ip?: string; ua?: string }) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const inv = await this.prisma.client.tenantInvitation.findFirst({
      where: { id, tenantId, status: InvitationStatus.PENDING },
    });
    if (!inv) throw new NotFoundException("Pending invitation not found.");
    await this.prisma.client.tenantInvitation.update({
      where: { id },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    });
    return { ok: true };
  }

  async resendInvitation(user: AuthenticatedUser, id: string, reqMeta?: { ip?: string; ua?: string; appOrigin?: string }) {
    this.assertOwner(user);
    const tenantId = this.tenantId();
    const inv = await this.prisma.client.tenantInvitation.findFirst({
      where: { id, tenantId },
    });
    if (!inv) throw new NotFoundException("Invitation not found.");
    if (inv.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException("Invitation already accepted.");
    }
    await this.seats.assertCanAddSeat(tenantId);
    const token = generateInviteToken();
    const expiresAt = inviteExpiresAt();
    await this.prisma.client.tenantInvitation.update({
      where: { id },
      data: {
        tokenHash: hashInviteToken(token),
        expiresAt,
        status: InvitationStatus.PENDING,
        revokedAt: null,
      },
    });
    const [tenant, workspace, inviter] = await Promise.all([
      this.prisma.client.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.client.workspace.findUnique({ where: { tenantId } }),
      this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } }),
    ]);
    const origin = reqMeta?.appOrigin ?? process.env.APP_ORIGIN ?? "http://localhost:5173";
    const inviteUrl = `${origin.replace(/\/$/, "")}/invite/${token}`;
    const mail = await this.mailer.sendInvite({
      to: inv.email,
      fullName: inv.fullName,
      workspaceName: workspace?.name ?? tenant.name,
      inviterName: inviter.name ?? inviter.email,
      inviteUrl,
      expiresAt,
    });
    return { ok: true, delivered: mail.delivered, ...(mail.devUrl ? { devInviteUrl: mail.devUrl } : {}) };
  }

  // ─── Public invite flow ───────────────────────────────────────────────────

  async previewInvitation(token: string) {
    const inv = await this.findInvitationByToken(token);
    if (inv.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException("Invitation already accepted.");
    }
    if (inv.status === InvitationStatus.REVOKED) {
      throw new BadRequestException("Invitation was revoked.");
    }
    if (inv.expiresAt <= new Date()) {
      await this.markExpired(inv.id);
      throw new BadRequestException("Invitation has expired.");
    }
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { tenantId: inv.tenantId },
    });
    const inviter = await this.prisma.client.user.findUnique({
      where: { id: inv.invitedById },
      select: { name: true, email: true },
    });
    return {
      email: inv.email,
      fullName: inv.fullName,
      role: inv.role,
      workspaceName: workspace?.name ?? inv.tenant.name,
      inviterName: inviter?.name ?? inviter?.email ?? "Workspace admin",
      expiresAt: inv.expiresAt.toISOString(),
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto, reqMeta?: { ip?: string; ua?: string }) {
    const inv = await this.findInvitationByToken(dto.token);
    if (inv.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException("Invitation already accepted.");
    }
    if (inv.status === InvitationStatus.REVOKED) {
      throw new BadRequestException("Invitation was revoked.");
    }
    if (inv.expiresAt <= new Date()) {
      await this.markExpired(inv.id);
      await this.audit.log({
        tenantId: inv.tenantId,
        action: "tenant.invitation_expired",
        entityType: "invitation",
        entityId: inv.id,
        metadata: { email: inv.email },
      });
      throw new BadRequestException("Invitation has expired.");
    }

    await this.seats.assertCanAddSeat(inv.tenantId);

    await assertPasswordAllowed(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const result = await this.prisma.client.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: inv.email } });
      if (user) {
        const otherTenant = await tx.tenantMembership.findFirst({
          where: { userId: user.id, tenantId: { not: inv.tenantId }, isActive: true },
        });
        if (otherTenant) {
          throw new ConflictException(
            "This email is already registered to another workspace. One email can belong to one tenant.",
          );
        }
        const existing = await tx.tenantMembership.findUnique({
          where: { userId_tenantId: { userId: user.id, tenantId: inv.tenantId } },
        });
        if (existing?.isActive) {
          throw new ConflictException("You are already a member of this workspace.");
        }
        user = await tx.user.update({
          where: { id: user.id },
          data: { name: inv.fullName, passwordHash, isActive: true },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: inv.email,
            name: inv.fullName,
            passwordHash,
            role: UserRole.USER,
            isActive: true,
          },
        });
      }

      const workspace = await tx.workspace.findUniqueOrThrow({ where: { tenantId: inv.tenantId } });
      let membership = await tx.tenantMembership.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: inv.tenantId } },
      });
      if (membership) {
        membership = await tx.tenantMembership.update({
          where: { id: membership.id },
          data: {
            isActive: true,
            role: inv.role,
            departmentId: inv.departmentId,
          },
        });
      } else {
        membership = await tx.tenantMembership.create({
          data: {
            userId: user.id,
            tenantId: inv.tenantId,
            role: inv.role,
            departmentId: inv.departmentId,
            isActive: true,
          },
        });
      }

      await tx.tenantInvitation.update({
        where: { id: inv.id },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      });

      const active = await tx.tenantMembership.count({
        where: { tenantId: inv.tenantId, isActive: true, user: { isActive: true } },
      });
      await tx.tenant.update({ where: { id: inv.tenantId }, data: { usersCount: active } });

      return { user, membership, workspace };
    });

    await this.audit.log({
      actorId: result.user.id,
      tenantId: inv.tenantId,
      action: "tenant.invitation_accepted",
      entityType: "invitation",
      entityId: inv.id,
      metadata: { email: inv.email, membershipId: result.membership.id },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return this.auth.issueTenantSessionFromMembership({
      userId: result.user.id,
      email: result.user.email,
      membershipId: result.membership.id,
      tenantId: inv.tenantId,
      workspaceId: result.workspace.id,
      role: normalizeVelonRole(result.membership.role) as VelonRole,
    });
  }

  async listAuditLogs(user: AuthenticatedUser) {
    this.assertOwner(user);
    const rows = await this.audit.listRecent(50, this.tenantId());
    return rows.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      at: a.createdAt.toISOString(),
      actorEmail: a.actor?.email ?? null,
      metadata: a.metadata,
    }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findInvitationByToken(token: string) {
    const hash = hashInviteToken(token);
    const inv = await this.prisma.client.tenantInvitation.findUnique({
      where: { tokenHash: hash },
      include: { tenant: true },
    });
    if (!inv) throw new NotFoundException("Invitation not found.");
    return inv;
  }

  private async markExpired(id: string) {
    await this.prisma.client.tenantInvitation.update({
      where: { id },
      data: { status: InvitationStatus.EXPIRED },
    });
  }

  private async getMembershipOrThrow(membershipId: string, tenantId: string) {
    const row = await this.prisma.client.tenantMembership.findFirst({
      where: { id: membershipId, tenantId },
    });
    if (!row) throw new NotFoundException("Member not found.");
    return row;
  }

  private async assertMembershipInTenant(membershipId: string, tenantId: string) {
    const row = await this.prisma.client.tenantMembership.findFirst({
      where: { id: membershipId, tenantId, isActive: true },
    });
    if (!row) throw new BadRequestException("Manager must be an active member of this tenant.");
  }
}
