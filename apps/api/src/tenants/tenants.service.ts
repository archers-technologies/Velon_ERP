import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as crypto from "crypto";
import { IndustryTemplate, Prisma, TenantPlan, TenantStatus } from "@velon/database";
import { planCatalogEntry, productionTenantWhere, seatLimitForPlan } from "@velon/shared";
import { AuditService } from "../audit/audit.service";
import { cleanupUsersWithoutMemberships } from "../common/tenant-lifecycle.util";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { SubscriptionService } from "../billing/subscription.service";
import type { CreateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "tenant"
  );
}

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  private formatLastActive(at: Date | null | undefined): string {
    if (!at) return "Never";
    const diffMs = Date.now() - at.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return at.toISOString().slice(0, 10);
  }

  private async lastActiveLabelForTenant(tenantId: string): Promise<string> {
    const row = await this.prisma.client.tenantMembership.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { user: { lastLoginAt: "desc" } },
      select: { user: { select: { lastLoginAt: true } } },
    });
    return this.formatLastActive(row?.user.lastLoginAt);
  }

  private mapTenant(t: Prisma.TenantGetPayload<object>, lastActiveLabel = "Never") {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      tenantCode: t.tenantCode,
      country: t.country,
      plan: t.plan,
      status: t.status,
      health: t.health,
      industryTemplate: t.industryTemplate,
      users: t.usersCount,
      mrr: Number(t.mrr),
      storageUsedGb: t.storageUsedGb,
      storageCapGb: t.storageCapGb,
      renewalDate: t.renewalDate.toISOString().slice(0, 10),
      isolationVerified: t.isolationVerified,
      createdAt: t.createdAt.toISOString().slice(0, 10),
      lastActiveLabel,
      modules: {
        hrm: true,
        crm: true,
        finance: true,
        inventory: true,
        manufacturing: t.industryTemplate === "MANUFACTURING",
      },
    };
  }

  async findAll() {
    const rows = await this.prisma.client.tenant.findMany({
      where: productionTenantWhere(),
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      rows.map(async (t: Prisma.TenantGetPayload<object>) =>
        this.mapTenant(t, await this.lastActiveLabelForTenant(t.id)),
      ),
    );
  }

  async create(dto: CreateTenantDto, actorId: string) {
    const slug = slugify(dto.slug ?? dto.name);
    const cap = dto.plan === "ENTERPRISE" ? 500 : dto.plan === "GROWTH" ? 120 : 20;
    const renewal = new Date();
    renewal.setDate(renewal.getDate() + 30);
    const row = await this.prisma.client.tenant.create({
      data: {
        name: dto.name.trim(),
        slug,
        tenantCode: `TNT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
        country: dto.country.trim(),
        plan: dto.plan,
        status: dto.status,
        industryTemplate: dto.industryTemplate,
        usersCount: dto.users,
        mrr: dto.mrr,
        storageCapGb: cap,
        renewalDate: renewal,
      },
    });
    await this.redis.bumpRevision();
    await this.redis.publish(
      "velon:platform:events",
      JSON.stringify({ kind: "tenant.created", id: row.id }),
    );
    await this.audit.log({
      actorId,
      tenantId: row.id,
      action: "tenant.created",
      entityType: "tenant",
      entityId: row.id,
    });
    await this.subscriptions.ensureForTenant(row.id, {
      plan: row.plan,
      status: undefined,
      trialEndsAt: row.status === TenantStatus.TRIAL ? renewal : undefined,
      currentPeriodEnd: renewal,
    });
    return this.mapTenant(row);
  }

  async update(id: string, dto: UpdateTenantDto, actorId: string) {
    const existing = await this.prisma.client.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tenant not found");

    const data: Prisma.TenantUpdateInput = {};
    if (dto.plan !== undefined) {
      const activeSeats = await this.prisma.client.tenantMembership.count({
        where: { tenantId: id, isActive: true, user: { isActive: true } },
      });
      const limit = seatLimitForPlan(dto.plan);
      if (limit !== null && activeSeats > limit) {
        throw new BadRequestException(
          `Cannot set plan ${dto.plan}: ${activeSeats} active seats exceeds ${limit}-seat limit.`,
        );
      }
      data.plan = dto.plan;
      data.mrr = planCatalogEntry(dto.plan).monthlyPrice;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === TenantStatus.SUSPENDED) {
        await this.subscriptions.platformSuspend(id);
        await this.prisma.client.workspace.updateMany({
          where: { tenantId: id },
          data: { isActive: false },
        });
      } else if (existing.status === TenantStatus.SUSPENDED) {
        await this.subscriptions.platformActivate(id);
        await this.prisma.client.workspace.updateMany({
          where: { tenantId: id },
          data: { isActive: true },
        });
      }
    }
    if (dto.users !== undefined) data.usersCount = dto.users;
    if (dto.mrr !== undefined && dto.plan === undefined) data.mrr = dto.mrr;

    const row = await this.prisma.client.tenant.update({
      where: { id },
      data,
    });
    await this.redis.bumpRevision();
    await this.audit.log({
      actorId,
      tenantId: id,
      action: "tenant.updated",
      entityType: "tenant",
      entityId: id,
      metadata: dto as Prisma.InputJsonValue,
    });
    return this.mapTenant(row, await this.lastActiveLabelForTenant(id));
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.client.tenant.findFirst({
      where: { id, ...productionTenantWhere() },
      include: { memberships: { select: { userId: true } } },
    });
    if (!existing) throw new NotFoundException("Tenant not found");

    const memberUserIds = existing.memberships.map((m) => m.userId);

    await this.audit.log({
      actorId,
      tenantId: id,
      action: "tenant.deleted",
      entityType: "tenant",
      entityId: id,
      metadata: { name: existing.name, tenantCode: existing.tenantCode, slug: existing.slug, soft: true },
    });

    await this.subscriptions.platformSuspend(id);
    await this.prisma.client.workspace.updateMany({
      where: { tenantId: id },
      data: { isActive: false },
    });
    await this.prisma.client.tenantMembership.updateMany({
      where: { tenantId: id },
      data: { isActive: false },
    });
    await this.prisma.client.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), status: TenantStatus.SUSPENDED },
    });
    await cleanupUsersWithoutMemberships(this.prisma.client, memberUserIds);
    await this.redis.bumpRevision();
    await this.redis.publish(
      "velon:platform:events",
      JSON.stringify({ kind: "tenant.deleted", id }),
    );

    return { id, deleted: true as const, soft: true as const };
  }
}
