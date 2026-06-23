import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@velon/database";
import * as crypto from "crypto";
import { normalizeVelonRole, VelonRole } from "@velon/shared";
import type { PrismaService } from "../prisma/prisma.service";

export const INVITE_TTL_DAYS = 7;
const ASSIGNABLE_ROLES: UserRole[] = [UserRole.DEPARTMENT_ADMIN, UserRole.USER];

export function assertOwnerRole(role: string) {
  const normalized = normalizeVelonRole(role);
  if (normalized !== VelonRole.TENANT_OWNER && normalized !== VelonRole.TENANT_ADMIN) {
    throw new ForbiddenException("Tenant Owner access required.");
  }
}

export function assertTenantOwnerRole(role: string) {
  if (normalizeVelonRole(role) !== VelonRole.TENANT_OWNER) {
    throw new ForbiddenException("Only the workspace owner can delete the company workspace.");
  }
}

export function assertAssignableRole(role: UserRole) {
  if (
    role === UserRole.TENANT_OWNER ||
    role === UserRole.TENANT_ADMIN ||
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.PLATFORM_SUPPORT
  ) {
    throw new BadRequestException("Cannot assign owner or platform roles.");
  }
  if (!ASSIGNABLE_ROLES.includes(role) && role !== UserRole.USER && role !== UserRole.TENANT_USER) {
    throw new BadRequestException("Invalid role for assignment.");
  }
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function inviteExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_TTL_DAYS);
  return d;
}

export async function assertAtLeastOneOwner(
  prisma: PrismaService,
  tenantId: string,
  excludingMembershipId?: string,
) {
  const owners = await prisma.client.tenantMembership.count({
    where: {
      tenantId,
      isActive: true,
      role: { in: [UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN] },
      ...(excludingMembershipId ? { id: { not: excludingMembershipId } } : {}),
    },
  });
  if (owners < 1) {
    throw new BadRequestException("At least one active Tenant Owner must remain.");
  }
}

export function mapMembership(row: {
  id: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  departmentId: string | null;
  user: { id: string; email: string; name: string | null; isActive: boolean; lastLoginAt: Date | null };
  department: { id: string; name: string } | null;
}) {
  return {
    id: row.id,
    userId: row.user.id,
    email: row.user.email,
    fullName: row.user.name,
    role: row.role,
    isActive: row.isActive && row.user.isActive,
    userDisabled: !row.user.isActive,
    membershipDisabled: !row.isActive,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
    joinedAt: row.createdAt.toISOString(),
  };
}
