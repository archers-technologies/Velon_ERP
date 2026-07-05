import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole, type AuditLog, type Tenant } from '@velon/database';
import { productionPlatformUserWhere, productionTenantWhere } from '@velon/shared';
import { AuditService } from '../audit/audit.service';
import { assertPasswordAllowed } from '../auth/password-policy.util';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { CreatePlatformUserDto } from './dto/platform-user.dto';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async getSyncState() {
    const revision = await this.redis.getRevision();
    const dbRev = await this.prisma.client.platformRevision.findUnique({ where: { id: 'main' } });
    const events = await this.prisma.client.auditLog.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      select: { action: true, createdAt: true, entityType: true, entityId: true },
    });
    return {
      revision: Math.max(revision, dbRev?.revision ?? 0),
      postgresConnected: true,
      updatedAt: dbRev?.updatedAt?.toISOString() ?? null,
      events: events.map(
        (e: Pick<AuditLog, 'action' | 'createdAt' | 'entityType' | 'entityId'>) => ({
          at: e.createdAt.toISOString(),
          kind: e.action,
          summary: `${e.action} · ${e.entityType}${e.entityId ? ` ${e.entityId}` : ''}`,
        }),
      ),
    };
  }

  async getOverview() {
    const tenants: Tenant[] = await this.prisma.client.tenant.findMany({
      where: productionTenantWhere(),
      orderBy: { createdAt: 'desc' },
    });
    const mrrTotal = tenants.reduce((s: number, t: Tenant) => s + Number(t.mrr), 0);
    const trialCount = tenants.filter((t: Tenant) => t.status === 'TRIAL').length;
    const activeTenantCount = tenants.filter(
      (t: Tenant) => t.status === 'ACTIVE' || t.status === 'TRIAL',
    ).length;
    const totalSeatsAllocated = tenants.reduce((s: number, t: Tenant) => s + t.usersCount, 0);

    const planCounts = { STARTER: 0, GROWTH: 0, ENTERPRISE: 0 };
    for (const t of tenants) {
      if (t.plan in planCounts) planCounts[t.plan as keyof typeof planCounts] += 1;
    }
    const planTotal = tenants.length || 1;

    const recentAudit = await this.prisma.client.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: { id: true, action: true, createdAt: true, entityType: true },
    });

    return {
      mrrTotal,
      arrGrowthPct: 0,
      activeTenantCount,
      trialCount,
      totalSeatsAllocated,
      licenseSeatCapacity: totalSeatsAllocated,
      platformUptimePct: 100,
      pendingPlanRequests: 0,
      openSecurityAlerts: 0,
      recentTenants: tenants.slice(0, 5).map((t: Tenant) => ({
        id: t.id,
        name: t.name,
        plan: t.plan,
        status: t.status,
        mrr: Number(t.mrr),
        country: t.country,
        users: t.usersCount,
      })),
      revenueByMonth: [{ month: 'Current', mrr: mrrTotal }],
      tenantSignupsByMonth: [{ month: 'Current', newTenants: tenants.length }],
      planDistribution: [
        { plan: 'Starter', pct: Math.round((planCounts.STARTER / planTotal) * 100) },
        { plan: 'Growth', pct: Math.round((planCounts.GROWTH / planTotal) * 100) },
        { plan: 'Enterprise', pct: Math.round((planCounts.ENTERPRISE / planTotal) * 100) },
      ],
      moduleUsage: [],
      activityFeed: recentAudit.map((e) => ({
        id: e.id,
        kind: 'infra' as const,
        title: e.action,
        timeLabel: e.createdAt.toISOString(),
        severity: 'info' as const,
      })),
      systemLogs: [],
    };
  }

  async listPlatformStaff() {
    const users = await this.prisma.client.user.findMany({
      where: {
        role: { in: [UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT] },
        ...productionPlatformUserWhere(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.email.split('@')[0] ?? u.email,
      name: u.name ?? u.email,
      email: u.email,
      role: u.role === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Platform Support',
      lastActive: (u.lastLoginAt ?? u.createdAt).toISOString(),
      status: u.isActive ? ('Active' as const) : ('Suspended' as const),
      mfaEnabled: false,
    }));
  }

  /** SUPER_ADMIN platform diagnostics — no tenant business data. */
  async getDiagnostics() {
    const tenantWhere = productionTenantWhere();
    const [tenantCount, activeUserCount, securityEvents, recentErrors] = await Promise.all([
      this.prisma.client.tenant.count({
        where: { ...tenantWhere, status: { in: ['ACTIVE', 'TRIAL'] } },
      }),
      this.prisma.client.tenantMembership.count({
        where: {
          isActive: true,
          user: { isActive: true, ...productionPlatformUserWhere() },
          tenant: tenantWhere,
        },
      }),
      this.prisma.client.auditLog.findMany({
        where: { action: { startsWith: 'security.' } },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, action: true, createdAt: true, entityType: true, tenantId: true },
      }),
      this.prisma.client.auditLog.findMany({
        where: { action: { contains: 'error' } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, action: true, createdAt: true, entityType: true },
      }),
    ]);

    let postgresStatus: 'ok' | 'degraded' = 'ok';
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch {
      postgresStatus = 'degraded';
    }

    let redisStatus: 'ok' | 'degraded' = 'ok';
    try {
      await this.redis.getRevision();
    } catch {
      redisStatus = 'degraded';
    }

    let migrations: { applied: number; pending: number; status: 'ok' | 'degraded' } = {
      applied: 0,
      pending: 0,
      status: 'degraded',
    };
    try {
      const rows = await this.prisma.client.$queryRaw<
        { migration_name: string; finished_at: Date | null }[]
      >`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC NULLS LAST`;
      const applied = rows.filter((r) => r.finished_at).length;
      const pending = rows.filter((r) => !r.finished_at).length;
      migrations = { applied, pending, status: pending > 0 ? 'degraded' : 'ok' };
    } catch {
      migrations = { applied: 0, pending: 0, status: 'degraded' };
    }

    return {
      activeTenants: tenantCount,
      activeUsers: activeUserCount,
      database: {
        postgres: postgresStatus,
        redis: redisStatus,
      },
      migrations,
      api: { status: 'ok' as const },
      queue: { status: redisStatus, label: 'Redis revision bus' },
      recentSecurityEvents: securityEvents.map((e) => ({
        id: e.id,
        action: e.action,
        at: e.createdAt.toISOString(),
        entityType: e.entityType,
        tenantId: e.tenantId,
      })),
      recentErrors: recentErrors.map((e) => ({
        id: e.id,
        action: e.action,
        at: e.createdAt.toISOString(),
        entityType: e.entityType,
      })),
      checkedAt: new Date().toISOString(),
    };
  }

  async createPlatformUser(dto: CreatePlatformUserDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.client.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered.');

    await assertPasswordAllowed(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.client.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        role: dto.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'platform.user_created',
      entityType: 'user',
      entityId: user.id,
      metadata: { role: dto.role, email },
    });

    return {
      id: user.id,
      username: user.email.split('@')[0] ?? user.email,
      name: user.name ?? user.email,
      email: user.email,
      role: user.role === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Platform Support',
      lastActive: (user.lastLoginAt ?? user.createdAt).toISOString(),
      status: 'Active' as const,
      mfaEnabled: false,
    };
  }

  async setPlatformUserActive(id: string, isActive: boolean, actorId: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.PLATFORM_SUPPORT)) {
      throw new NotFoundException('Platform user not found.');
    }

    if (!isActive && user.role === UserRole.SUPER_ADMIN) {
      const otherAdmins = await this.prisma.client.user.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true, id: { not: id } },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException('Cannot disable the last super admin.');
      }
    }

    const updated = await this.prisma.client.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: isActive ? 'platform.user_enabled' : 'platform.user_disabled',
      entityType: 'user',
      entityId: id,
      metadata: { email: updated.email },
    });

    return {
      id: updated.id,
      username: updated.email.split('@')[0] ?? updated.email,
      name: updated.name ?? updated.email,
      email: updated.email,
      role: updated.role === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Platform Support',
      lastActive: (updated.lastLoginAt ?? updated.createdAt).toISOString(),
      status: updated.isActive ? ('Active' as const) : ('Suspended' as const),
      mfaEnabled: false,
    };
  }

  async deletePlatformUser(id: string, actorId: string) {
    const user = await this.prisma.client.user.findFirst({
      where: {
        id,
        role: { in: [UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT] },
        ...productionPlatformUserWhere(),
      },
    });
    if (!user) throw new NotFoundException('Platform user not found.');

    if (user.role === UserRole.SUPER_ADMIN) {
      const otherAdmins = await this.prisma.client.user.count({
        where: {
          role: UserRole.SUPER_ADMIN,
          isActive: true,
          id: { not: id },
          ...productionPlatformUserWhere(),
        },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException('Cannot delete the last super admin.');
      }
    }

    await this.prisma.client.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.client.user.delete({ where: { id } });

    await this.audit.log({
      actorId,
      action: 'platform.user_deleted',
      entityType: 'user',
      entityId: id,
      metadata: { email: user.email },
    });

    return { id, deleted: true as const };
  }

  async cleanupDemoData(actorId: string, dryRun = false) {
    const demoUsers = await this.prisma.client.user.findMany({
      where: { seedSource: { in: ['demo', 'e2e'] } },
      select: { id: true, email: true, seedSource: true },
    });
    const demoTenants = await this.prisma.client.tenant.findMany({
      where: { seedSource: { in: ['demo', 'e2e'] } },
      select: { id: true, name: true, tenantCode: true, seedSource: true },
    });

    if (dryRun) {
      return {
        dryRun: true,
        tenants: demoTenants,
        users: demoUsers,
      };
    }

    for (const tenant of demoTenants) {
      await this.prisma.client.tenant.delete({ where: { id: tenant.id } });
    }
    for (const user of demoUsers) {
      await this.prisma.client.refreshToken.deleteMany({ where: { userId: user.id } });
      await this.prisma.client.user.delete({ where: { id: user.id } });
    }

    await this.audit.log({
      actorId,
      action: 'platform.demo_data_cleaned',
      entityType: 'system',
      metadata: {
        tenantsRemoved: demoTenants.length,
        usersRemoved: demoUsers.length,
      },
    });

    await this.redis.bumpRevision();

    return {
      dryRun: false,
      tenantsRemoved: demoTenants.length,
      usersRemoved: demoUsers.length,
    };
  }
}
