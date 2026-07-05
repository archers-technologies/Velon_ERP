import { TenantsService } from "./tenants.service";
import { IDS } from "../../test/helpers/fixtures";
import {
  createMockAudit,
  createMockPrisma,
  createMockPrismaClient,
  createMockRedis,
} from "../../test/helpers/mocks";

describe("TenantsService", () => {
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const audit = createMockAudit();
  const redis = createMockRedis();
  const subscriptions = { ensureForTenant: jest.fn() };
  const service = new TenantsService(
    prisma,
    audit as never,
    redis as never,
    subscriptions as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it("lists production tenants with last-active labels", async () => {
    client.tenant.findMany.mockResolvedValue([
      {
        id: IDS.tenant,
        name: "Acme",
        slug: "acme",
        tenantCode: "T-001",
        country: "US",
        plan: "STARTER",
        status: "ACTIVE",
        health: "HEALTHY",
        industryTemplate: "GENERAL",
        usersCount: 2,
        mrr: 29,
        storageUsedGb: 1,
        storageCapGb: 10,
        renewalDate: new Date("2026-12-31"),
        isolationVerified: true,
        createdAt: new Date("2026-01-01"),
        workspace: { countryCode: "US", currency: "USD", currencySymbol: "$" },
      },
    ]);
    client.tenantMembership.findFirst.mockResolvedValue({
      user: { lastLoginAt: new Date(Date.now() - 60_000) },
    });

    const rows = await service.findAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: IDS.tenant,
      name: "Acme",
      plan: "STARTER",
      users: 2,
      mrr: 29,
      lastActiveLabel: "1m ago",
    });
  });
});
