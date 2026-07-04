import { ForbiddenException } from "@nestjs/common";
import { TenantPlan } from "@velon/database";
import { SeatsService } from "./seats.service";
import { IDS } from "../test-utils/fixtures";
import { createMockPrisma, createMockPrismaClient } from "../test-utils/mocks";
import { runWithTenantContext } from "../common/tenant-context.storage";

describe("SeatsService", () => {
  const client = createMockPrismaClient();
  const service = new SeatsService(createMockPrisma(client));

  const withTenant = <T>(fn: () => T) =>
    runWithTenantContext(
      {
        tenantId: IDS.tenant,
        workspaceId: IDS.workspace,
        membershipId: IDS.membership,
        userId: IDS.owner,
      },
      fn,
    );

  beforeEach(() => jest.clearAllMocks());

  it("summarizes seats from active members and pending invites", async () => {
    client.tenant.findUniqueOrThrow.mockResolvedValue({ plan: TenantPlan.STARTER });
    client.tenantMembership.count.mockResolvedValue(2);
    client.tenantInvitation.count.mockResolvedValue(1);

    const summary = await withTenant(() => service.getSeatSummary());

    expect(summary).toMatchObject({
      plan: TenantPlan.STARTER,
      activeSeats: 2,
      pendingInvites: 1,
      reservedSeats: 3,
    });
    expect(typeof summary.remaining).toBe("number");
  });

  it("blocks adding a seat when plan limit is reached", async () => {
    client.tenant.findUniqueOrThrow.mockResolvedValue({ plan: TenantPlan.STARTER });
    // STARTER limit is typically small; reserve at/over limit
    client.tenantMembership.count.mockResolvedValue(100);
    client.tenantInvitation.count.mockResolvedValue(0);

    await expect(withTenant(() => service.assertCanAddSeat())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("syncs usersCount on tenant from active seats", async () => {
    client.tenantMembership.count.mockResolvedValue(4);
    client.tenant.update.mockResolvedValue({});
    const active = await service.syncUsersCount(IDS.tenant);
    expect(active).toBe(4);
    expect(client.tenant.update).toHaveBeenCalledWith({
      where: { id: IDS.tenant },
      data: { usersCount: 4 },
    });
  });
});
