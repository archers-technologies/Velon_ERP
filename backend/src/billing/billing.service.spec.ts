import { BadRequestException } from "@nestjs/common";
import { TenantPlan } from "@velon/database";
import { BillingService } from "./billing.service";
import { createMockAudit, createMockPrisma, createMockPrismaClient } from "../../test/helpers/mocks";

describe("BillingService", () => {
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const audit = createMockAudit();
  const subscriptions = { ensureForTenant: jest.fn(), getTenantSubscription: jest.fn() };
  const subscriptionAccess = { getAccessState: jest.fn(), assertWorkspaceAccess: jest.fn() };
  const planDefinitions = {
    listCatalog: jest.fn(),
    updatePlan: jest.fn(),
  };
  const pricing = { resolveForTenant: jest.fn() };

  let service: BillingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BillingService(
      prisma,
      audit as never,
      subscriptions as never,
      subscriptionAccess as never,
      planDefinitions as never,
      pricing as never,
    );
  });

  it("maps plan catalog for public display", async () => {
    planDefinitions.listCatalog.mockResolvedValue([
      {
        id: TenantPlan.STARTER,
        displayName: "Starter",
        globalMonthlyPrice: 29,
        globalAnnualPrice: 290,
        seatLimit: 5,
        description: "Starter plan",
        features: ["crm"],
        regionalPrices: {},
      },
    ]);

    const catalog = await service.getPlanCatalog();
    expect(catalog).toEqual([
      expect.objectContaining({
        id: TenantPlan.STARTER,
        displayName: "Starter",
        monthlyPrice: 29,
        annualPrice: 290,
        currency: "USD",
        seatLimit: 5,
      }),
    ]);
  });

  it("rejects negative plan prices on platform updates", async () => {
    await expect(
      service.updatePlanDefinition(TenantPlan.STARTER, { monthlyPrice: -1 }, "admin-1"),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updatePlanDefinition(TenantPlan.STARTER, { currency: "US" }, "admin-1"),
    ).rejects.toThrow(/3-letter/i);
  });

  it("delegates valid plan updates to plan definitions", async () => {
    planDefinitions.updatePlan.mockResolvedValue({ id: TenantPlan.STARTER, monthlyPrice: 39 });
    await expect(
      service.updatePlanDefinition(TenantPlan.STARTER, { monthlyPrice: 39 }, "admin-1"),
    ).resolves.toMatchObject({ monthlyPrice: 39 });
    expect(planDefinitions.updatePlan).toHaveBeenCalledWith(
      TenantPlan.STARTER,
      { monthlyPrice: 39 },
      "admin-1",
    );
  });
});
