import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { WorkspaceContextService } from "./workspace-context.service";
import { IDS, platformAdmin, tenantOwner } from "../../test/helpers/fixtures";
import { createMockPrisma, createMockPrismaClient } from "../../test/helpers/mocks";

describe("WorkspaceContextService", () => {
  const client = createMockPrismaClient();
  const service = new WorkspaceContextService(createMockPrisma(client));

  beforeEach(() => jest.clearAllMocks());

  it("requires an authenticated tenant user", () => {
    expect(() => service.assertTenantUser(undefined)).toThrow(UnauthorizedException);
    expect(() => service.assertTenantUser(platformAdmin())).toThrow(ForbiddenException);
  });

  it("returns tenantId only from JWT claims", () => {
    expect(service.tenantIdFromAuth(tenantOwner())).toBe(IDS.tenant);
  });

  it("rejects revoked or mismatched memberships", async () => {
    client.tenantMembership.findUnique.mockResolvedValue(null);
    await expect(service.resolve(tenantOwner())).rejects.toThrow(ForbiddenException);
  });

  it("resolves workspace context from membership mock data", async () => {
    const renewalDate = new Date("2026-12-31T00:00:00.000Z");
    client.tenantMembership.findUnique.mockResolvedValue({
      id: IDS.membership,
      isActive: true,
      userId: IDS.owner,
      tenantId: IDS.tenant,
      role: "TENANT_OWNER",
      user: { id: IDS.owner, email: "owner@example.test", name: "Owner", isActive: true },
      tenant: {
        id: IDS.tenant,
        name: "Acme",
        slug: "acme",
        status: "ACTIVE",
        plan: "STARTER",
        renewalDate,
        companyProfile: null,
        workspace: {
          id: IDS.workspace,
          name: "Acme HQ",
          slug: "acme-hq",
          timezone: "UTC",
          countryCode: "US",
          currency: "USD",
          currencySymbol: "$",
          dateFormat: "MM/DD/YYYY",
          numberFormat: "1,234.56",
          language: "en",
          isActive: true,
        },
      },
    });

    const ctx = await service.resolve(tenantOwner());
    expect(ctx.tenantId).toBe(IDS.tenant);
    expect(ctx.workspace.name).toBe("Acme HQ");
    expect(ctx.user.email).toBe("owner@example.test");
    expect(ctx.subscription.plan).toBe("STARTER");
  });
});
