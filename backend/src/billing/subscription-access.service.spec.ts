import { ForbiddenException } from "@nestjs/common";
import { SubscriptionBillingStatus, TenantStatus } from "@velon/database";
import { SubscriptionAccessService } from "./subscription-access.service";
import { IDS } from "../../test/helpers/fixtures";
import { createMockPrisma, createMockPrismaClient } from "../../test/helpers/mocks";

describe("SubscriptionAccessService", () => {
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const subscriptions = {
    ensureForTenant: jest.fn(),
  };
  const service = new SubscriptionAccessService(prisma, subscriptions as never);

  beforeEach(() => jest.clearAllMocks());

  it("blocks deleted or missing tenants", async () => {
    client.tenant.findUnique.mockResolvedValue(null);
    await expect(service.assertWorkspaceAccess(IDS.tenant)).rejects.toThrow(ForbiddenException);

    client.tenant.findUnique.mockResolvedValue({
      status: TenantStatus.ACTIVE,
      deletedAt: new Date(),
    });
    await expect(service.assertWorkspaceAccess(IDS.tenant)).rejects.toThrow(ForbiddenException);
  });

  it("blocks suspended tenants", async () => {
    client.tenant.findUnique.mockResolvedValue({
      status: TenantStatus.SUSPENDED,
      deletedAt: null,
    });
    await expect(service.assertWorkspaceAccess(IDS.tenant)).rejects.toThrow(/suspended/i);
  });

  it("allows active subscriptions for normal workspace paths", async () => {
    client.tenant.findUnique.mockResolvedValue({
      status: TenantStatus.ACTIVE,
      deletedAt: null,
    });
    subscriptions.ensureForTenant.mockResolvedValue({
      status: SubscriptionBillingStatus.ACTIVE,
      currentPeriodEnd: new Date("2026-12-31"),
      trialEndsAt: null,
    });

    await expect(
      service.assertWorkspaceAccess(IDS.tenant, "/app/crm"),
    ).resolves.toBeUndefined();
  });

  it("restricts past-due tenants to billing portal paths", async () => {
    client.tenant.findUnique.mockResolvedValue({
      status: TenantStatus.ACTIVE,
      deletedAt: null,
    });
    subscriptions.ensureForTenant.mockResolvedValue({
      status: SubscriptionBillingStatus.PAST_DUE,
      currentPeriodEnd: new Date("2026-12-31"),
      trialEndsAt: null,
    });

    await expect(service.assertWorkspaceAccess(IDS.tenant, "/app/crm")).rejects.toThrow(
      /past due/i,
    );
  });

  it("returns access state from subscription", async () => {
    subscriptions.ensureForTenant.mockResolvedValue({
      status: SubscriptionBillingStatus.ACTIVE,
      currentPeriodEnd: new Date("2026-12-31T00:00:00.000Z"),
      trialEndsAt: null,
    });
    const state = await service.getAccessState(IDS.tenant);
    expect(state).toMatchObject({
      status: SubscriptionBillingStatus.ACTIVE,
      allowsWorkspace: true,
      allowsBillingPortal: true,
      currentPeriodEnd: "2026-12-31",
      trialEndsAt: null,
    });
  });
});
