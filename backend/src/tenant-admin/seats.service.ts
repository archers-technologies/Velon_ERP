import { ForbiddenException, Injectable } from "@nestjs/common";
import { canAddSeat, seatLimitForPlan, seatsRemaining } from "@velon/shared";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveTenantContext } from "../common/tenant-context.storage";

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  private tenantId(): string {
    return getActiveTenantContext().tenantId;
  }

  async countActiveSeats(tenantId = this.tenantId()): Promise<number> {
    return this.prisma.client.tenantMembership.count({
      where: {
        tenantId,
        isActive: true,
        user: { isActive: true },
      },
    });
  }

  async countPendingInvites(tenantId = this.tenantId()): Promise<number> {
    const { InvitationStatus } = await import("@velon/database");
    return this.prisma.client.tenantInvitation.count({
      where: {
        tenantId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async countReservedSeats(tenantId = this.tenantId()): Promise<number> {
    const [active, pending] = await Promise.all([
      this.countActiveSeats(tenantId),
      this.countPendingInvites(tenantId),
    ]);
    return active + pending;
  }

  async getSeatSummary(tenantId = this.tenantId()) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { plan: true },
    });
    const activeSeats = await this.countActiveSeats(tenantId);
    const pendingInvites = await this.countPendingInvites(tenantId);
    const reserved = activeSeats + pendingInvites;
    const limit = seatLimitForPlan(tenant.plan);
    return {
      plan: tenant.plan,
      limit,
      activeSeats,
      pendingInvites,
      reservedSeats: reserved,
      remaining: seatsRemaining(tenant.plan, reserved),
      unlimited: limit === null,
    };
  }

  async assertCanAddSeat(tenantId = this.tenantId()) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { plan: true },
    });
    const reserved = await this.countReservedSeats(tenantId);
    if (!canAddSeat(tenant.plan, reserved)) {
      throw new ForbiddenException(
        `Seat limit reached (${reserved}/${seatLimitForPlan(tenant.plan)}). Upgrade your plan to add more users.`,
      );
    }
  }

  async syncUsersCount(tenantId: string) {
    const active = await this.countActiveSeats(tenantId);
    await this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: { usersCount: active },
    });
    return active;
  }
}
