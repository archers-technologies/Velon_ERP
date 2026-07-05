import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BillingInterval, TenantPlan, TenantStatus } from "@velon/database";
import { planCatalogEntry, productionTenantWhere, seatLimitForPlan } from "@velon/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { BillingPricingService } from "./billing-pricing.service";
import { SubscriptionAccessService } from "./subscription-access.service";
import { SubscriptionService } from "./subscription.service";
import { PlanDefinitionService } from "./plan-definition.service";
import type { UpdatePlanDefinitionDto } from "./dto/billing.dto";

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly planDefinitions: PlanDefinitionService,
    private readonly pricing: BillingPricingService,
  ) {}

  getPlanCatalog() {
    return this.planDefinitions.listCatalog().then((plans) =>
      plans.map((plan) => ({
        id: plan.id,
        displayName: plan.displayName,
        monthlyPrice: plan.globalMonthlyPrice,
        annualPrice: plan.globalAnnualPrice,
        currency: "USD",
        seatLimit: plan.seatLimit,
        description: plan.description,
        features: plan.features,
        regionalPrices: plan.regionalPrices,
      })),
    );
  }

  async getTenantPlanCatalog(tenantId: string) {
    const plans = await this.planDefinitions.listCatalog();
    const interval = BillingInterval.MONTHLY;
    return Promise.all(
      plans.map(async (plan) => {
        const resolved = await this.pricing.resolveForTenant(tenantId, plan.id, interval);
        return {
          id: plan.id,
          displayName: plan.displayName,
          monthlyPrice: resolved.monthlyEquivalent,
          annualPrice:
            (
              await this.pricing.resolveForTenant(tenantId, plan.id, BillingInterval.YEARLY)
            ).amount,
          currency: resolved.currency,
          regionApplied: resolved.regionApplied,
          seatLimit: plan.seatLimit,
          description: plan.description,
          features: plan.features,
        };
      }),
    );
  }

  async updatePlanDefinition(plan: TenantPlan, dto: UpdatePlanDefinitionDto, actorId: string) {
    if (dto.monthlyPrice !== undefined && dto.monthlyPrice < 0) {
      throw new BadRequestException("Monthly price cannot be negative.");
    }
    if (dto.annualPrice !== undefined && dto.annualPrice < 0) {
      throw new BadRequestException("Annual price cannot be negative.");
    }
    if (dto.indiaMonthlyPrice !== undefined && dto.indiaMonthlyPrice < 0) {
      throw new BadRequestException("India monthly price cannot be negative.");
    }
    if (dto.globalMonthlyPrice !== undefined && dto.globalMonthlyPrice < 0) {
      throw new BadRequestException("Global monthly price cannot be negative.");
    }
    if (dto.currency && !/^[A-Z]{3}$/.test(dto.currency.trim().toUpperCase())) {
      throw new BadRequestException("Currency must be a valid 3-letter ISO code.");
    }
    return this.planDefinitions.updatePlan(plan, dto, actorId);
  }

  async getPlatformSubscriptionOverview() {
    const plans = await this.planDefinitions.listCatalog();
    const tenants = await this.prisma.client.tenant.findMany({
      where: productionTenantWhere(),
      select: {
        id: true,
        name: true,
        plan: true,
        status: true,
        usersCount: true,
        mrr: true,
        renewalDate: true,
        country: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const byPlan = Object.fromEntries(
      (Object.values(TenantPlan) as TenantPlan[]).map((p) => [p, 0]),
    ) as Record<TenantPlan, number>;
    for (const t of tenants) byPlan[t.plan] = (byPlan[t.plan] ?? 0) + 1;

    const active = tenants.filter((t) => t.status === TenantStatus.ACTIVE).length;
    const trial = tenants.filter((t) => t.status === TenantStatus.TRIAL).length;
    const suspended = tenants.filter((t) => t.status === TenantStatus.SUSPENDED).length;
    const mrrTotal = tenants.reduce((s, t) => s + Number(t.mrr), 0);

    return {
      plans,
      summary: {
        totalTenants: tenants.length,
        activeTenants: active,
        trialTenants: trial,
        suspendedTenants: suspended,
        mrrTotal,
      },
      byPlan,
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        plan: t.plan,
        planDisplayName: plans.find((p) => p.id === t.plan)?.displayName ?? t.plan,
        status: t.status,
        seatsUsed: t.usersCount,
        seatLimit: plans.find((p) => p.id === t.plan)?.seatLimit ?? null,
        mrr: Number(t.mrr),
        renewalDate: t.renewalDate.toISOString().slice(0, 10),
        country: t.country,
      })),
    };
  }

  private async activeSeatCount(tenantId: string): Promise<number> {
    return this.prisma.client.tenantMembership.count({
      where: { tenantId, isActive: true, user: { isActive: true } },
    });
  }

  private assertPlanFitsSeats(plan: TenantPlan, activeSeats: number) {
    const limit = seatLimitForPlan(plan);
    if (limit !== null && activeSeats > limit) {
      throw new BadRequestException(
        `Cannot assign ${plan}: ${activeSeats} active seats exceeds the ${limit}-seat limit.`,
      );
    }
  }

  async changeTenantPlan(tenantId: string, plan: TenantPlan, actorId: string) {
    const tenant = await this.prisma.client.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const activeSeats = await this.activeSeatCount(tenantId);
    this.assertPlanFitsSeats(plan, activeSeats);

    const entry = planCatalogEntry(plan);
    const resolved = await this.pricing.resolveForTenant(tenantId, plan, BillingInterval.MONTHLY);
    const updated = await this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: { plan, mrr: resolved.monthlyEquivalent },
    });

    await this.subscriptions.ensureForTenant(tenantId);
    await this.subscriptions.changePlan(tenantId, plan);

    await this.audit.log({
      actorId,
      tenantId,
      action: "billing.plan_changed",
      entityType: "tenant",
      entityId: tenantId,
      metadata: { from: tenant.plan, to: plan, mrr: resolved.monthlyEquivalent },
    });

    return {
      id: updated.id,
      plan: updated.plan,
      mrr: Number(updated.mrr),
      seatLimit: entry.seatLimit,
      seatsUsed: activeSeats,
    };
  }

  async resetTenantSubscription(tenantId: string, actorId: string) {
    const tenant = await this.prisma.client.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    const updated = await this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: {
        renewalDate,
        status: tenant.status === TenantStatus.SUSPENDED ? TenantStatus.ACTIVE : tenant.status,
      },
    });

    await this.audit.log({
      actorId,
      tenantId,
      action: "billing.subscription_reset",
      entityType: "tenant",
      entityId: tenantId,
      metadata: { renewalDate: renewalDate.toISOString().slice(0, 10) },
    });

    return {
      id: updated.id,
      status: updated.status,
      renewalDate: updated.renewalDate.toISOString().slice(0, 10),
      plan: updated.plan,
      mrr: Number(updated.mrr),
    };
  }

  getTenantAccessState(tenantId: string) {
    return this.subscriptionAccess.getAccessState(tenantId);
  }

  async listPendingPayments() {
    const rows = await this.prisma.client.subscriptionPayment.findMany({
      where: { status: "PENDING", provider: "BANK_TRANSFER" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        subscription: { include: { tenant: { select: { id: true, name: true, tenantCode: true } } } },
        invoice: { select: { invoiceNumber: true, amount: true } },
      },
    });
    return rows.map((row) => this.mapPlatformPayment(row));
  }

  async listPlatformPayments() {
    const rows = await this.prisma.client.subscriptionPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        subscription: {
          include: {
            tenant: { select: { id: true, name: true, tenantCode: true } },
          },
        },
        invoice: { select: { invoiceNumber: true, amount: true } },
      },
    });
    return rows.map((row) => this.mapPlatformPayment(row));
  }

  private mapPlatformPayment(row: {
    id: string;
    tenantId: string;
    amount: unknown;
    currency: string;
    status: string;
    provider: string;
    providerPaymentId: string | null;
    providerOrderId: string | null;
    verifiedAt: Date | null;
    failureReason: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    subscription: { plan: string; tenant: { id: string; name: string; tenantCode: string } };
    invoice: { invoiceNumber: string; amount: unknown } | null;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.subscription.tenant.name,
      tenantCode: row.subscription.tenant.tenantCode,
      plan: row.subscription.plan,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      provider: row.provider,
      providerOrderId: row.providerOrderId,
      providerPaymentId: row.providerPaymentId,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      failureReason: row.failureReason,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      invoiceNumber: row.invoice?.invoiceNumber ?? null,
      createdAt: row.createdAt.toISOString(),
      manualApprovalOnly: row.provider === "BANK_TRANSFER",
    };
  }

  async approvePendingPayment(paymentId: string, actorId: string) {
    const result = await this.subscriptions.approveBankTransferPayment(paymentId, actorId);
    const payment = await this.prisma.client.subscriptionPayment.findUnique({
      where: { id: paymentId },
      select: { tenantId: true, amount: true, provider: true },
    });
    if (payment) {
      await this.audit.log({
        actorId,
        tenantId: payment.tenantId,
        action: "billing.payment_approved",
        entityType: "subscription_payment",
        entityId: paymentId,
        metadata: { provider: payment.provider, amount: Number(payment.amount) },
      });
    }
    return result;
  }

  async rejectPendingPayment(paymentId: string, actorId: string, reason?: string) {
    const payment = await this.prisma.client.subscriptionPayment.findUnique({
      where: { id: paymentId },
      select: { tenantId: true, amount: true, provider: true },
    });
    const result = await this.subscriptions.rejectBankTransferPayment(paymentId, actorId, reason);
    if (payment) {
      await this.audit.log({
        actorId,
        tenantId: payment.tenantId,
        action: "billing.payment_rejected",
        entityType: "subscription_payment",
        entityId: paymentId,
        metadata: {
          provider: payment.provider,
          amount: Number(payment.amount),
          reason: reason?.trim() || null,
        },
      });
    }
    return result;
  }
}
