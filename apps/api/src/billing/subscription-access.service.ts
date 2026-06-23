import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SubscriptionBillingStatus, TenantStatus } from "@velon/database";
import { isBillingPortalPath, subscriptionAllowsWorkspaceAccess } from "@velon/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionService } from "./subscription.service";

@Injectable()
export class SubscriptionAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  async assertWorkspaceAccess(tenantId: string, requestPath?: string) {
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true, deletedAt: true },
    });
    if (!tenant || tenant.deletedAt) {
      throw new ForbiddenException("Workspace unavailable. Contact support.");
    }
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException("Tenant suspended. Contact support or visit billing to reactivate.");
    }

    const sub = await this.subscriptions.ensureForTenant(tenantId);

    if (sub.status === SubscriptionBillingStatus.SUSPENDED) {
      throw new ForbiddenException("Workspace suspended. Contact support or visit billing to reactivate.");
    }

    if (sub.status === SubscriptionBillingStatus.CANCELLED) {
      throw new ForbiddenException("Subscription cancelled. Visit billing to restore access.");
    }

    if (
      sub.status === SubscriptionBillingStatus.PAST_DUE &&
      requestPath &&
      !isBillingPortalPath(requestPath)
    ) {
      throw new ForbiddenException(
        "Subscription past due. ERP access is restricted until payment is received. Visit billing to pay.",
      );
    }

    if (!subscriptionAllowsWorkspaceAccess(sub.status) && requestPath && !isBillingPortalPath(requestPath)) {
      throw new ForbiddenException("Subscription inactive. Visit billing to restore access.");
    }
  }

  async getAccessState(tenantId: string) {
    const sub = await this.subscriptions.ensureForTenant(tenantId);
    return {
      status: sub.status,
      allowsWorkspace: subscriptionAllowsWorkspaceAccess(sub.status),
      allowsBillingPortal: true,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString().slice(0, 10),
      trialEndsAt: sub.trialEndsAt?.toISOString().slice(0, 10) ?? null,
    };
  }
}
