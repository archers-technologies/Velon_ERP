import { IDS } from '../../test/helpers/fixtures';
import {
  createMockAudit,
  createMockPrisma,
  createMockPrismaClient,
  createMockRedis,
} from '../../test/helpers/mocks';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  const client = createMockPrismaClient({
    platformRevision: {
      findUnique: jest.fn(),
    },
  });
  const prisma = createMockPrisma(client);
  const redis = createMockRedis();
  const audit = createMockAudit();
  const service = new PlatformService(prisma, redis as never, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it('builds sync state from redis and audit mocks', async () => {
    redis.getRevision.mockResolvedValue(3);
    (client.platformRevision as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
      id: 'main',
      revision: 2,
      updatedAt: new Date('2026-01-01'),
    });
    client.auditLog.findMany.mockResolvedValue([
      {
        action: 'auth.login',
        createdAt: new Date('2026-01-02'),
        entityType: 'user',
        entityId: IDS.user,
      },
    ]);

    const state = await service.getSyncState();
    expect(state.revision).toBe(3);
    expect(state.postgresConnected).toBe(true);
    expect(state.events[0].kind).toBe('auth.login');
  });

  it('aggregates overview metrics from tenant mocks', async () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    client.tenant.findMany.mockResolvedValue([
      {
        id: IDS.tenant,
        name: 'Acme',
        plan: 'STARTER',
        status: 'ACTIVE',
        mrr: 29,
        country: 'US',
        usersCount: 3,
        createdAt: lastMonth,
      },
      {
        id: 'tenant-2',
        name: 'Beta',
        plan: 'GROWTH',
        status: 'TRIAL',
        mrr: 99,
        country: 'IN',
        usersCount: 5,
        createdAt: now,
      },
    ]);
    client.auditLog.findMany.mockResolvedValue([]);

    const overview = await service.getOverview();
    expect(overview.mrrTotal).toBe(128);
    expect(overview.activeTenantCount).toBe(2);
    expect(overview.trialCount).toBe(1);
    expect(overview.totalSeatsAllocated).toBe(8);
    expect(overview.recentTenants).toHaveLength(2);
    expect(overview.revenueByMonth.length).toBe(12);
    expect(overview.revenueByDay.length).toBe(30);
    expect(overview.revenueByMonth.at(-1)?.mrr).toBe(128);
    expect(overview.tenantSignupsByMonth.length).toBe(6);
  });
});
