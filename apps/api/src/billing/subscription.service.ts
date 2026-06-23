import { Injectable, BadRequestException } from "@nestjs/common";
import {
  BillingInterval,
  PaymentProvider,
  SubscriptionBillingStatus,
  SubscriptionInvoiceStatus,
  SubscriptionPaymentStatus,
  TenantPlan,
  TenantStatus,
} from "@velon/database";
import {
  TRIAL_DAYS_DEFAULT,
  mapSubscriptionStatusToTenantStatus,
  mrrForPlan,
  planCatalogEntry,
} from "@velon/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { CheckoutSession } from "./providers/payment-provider.types";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateOnly(date: Date): Date {
  return new Date(date.toISOString().slice(0, 10));
}

function isMissingSubscriptionTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2021"
  );
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureForTenant(
    tenantId: string,
    opts?: {
      plan?: TenantPlan;
      status?: SubscriptionBillingStatus;
      trialEndsAt?: Date;
      currentPeriodEnd?: Date;
    },
  ) {
    try {
      const existing = await this.prisma.client.subscription.findUnique({ where: { tenantId } });
      if (existing) return existing;
    } catch (err) {
      if (!isMissingSubscriptionTableError(err)) throw err;
      return this.tenantBackedSubscription(tenantId);
    }

    const tenant = await this.prisma.client.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    const now = new Date();
    const trialEnd = opts?.trialEndsAt ?? tenant.renewalDate;
    const periodEnd = opts?.currentPeriodEnd ?? tenant.renewalDate;

    try {
      return await this.prisma.client.subscription.create({
        data: {
          tenantId,
          plan: opts?.plan ?? tenant.plan,
          billingInterval: BillingInterval.MONTHLY,
          status: opts?.status ?? this.mapTenantStatus(tenant.status),
          trialEndsAt: tenant.status === TenantStatus.TRIAL ? toDateOnly(trialEnd) : null,
          currentPeriodStart: toDateOnly(tenant.createdAt),
          currentPeriodEnd: toDateOnly(periodEnd),
          mrr: tenant.mrr,
        },
      });
    } catch (err) {
      if (!isMissingSubscriptionTableError(err)) throw err;
      return this.tenantBackedSubscription(tenantId);
    }
  }

  private async tenantBackedSubscription(tenantId: string) {
    const tenant = await this.prisma.client.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    const now = new Date();
    return {
      id: `legacy-${tenantId}`,
      tenantId,
      plan: tenant.plan,
      billingInterval: BillingInterval.MONTHLY,
      status: this.mapTenantStatus(tenant.status),
      trialEndsAt: tenant.status === TenantStatus.TRIAL ? tenant.renewalDate : null,
      currentPeriodStart: toDateOnly(tenant.createdAt),
      currentPeriodEnd: tenant.renewalDate,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      provider: null,
      providerSubscriptionId: null,
      mrr: tenant.mrr,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  private mapTenantStatus(status: TenantStatus): SubscriptionBillingStatus {
    switch (status) {
      case TenantStatus.ACTIVE:
        return SubscriptionBillingStatus.ACTIVE;
      case TenantStatus.TRIAL:
        return SubscriptionBillingStatus.TRIAL;
      case TenantStatus.PAST_DUE:
        return SubscriptionBillingStatus.PAST_DUE;
      case TenantStatus.SUSPENDED:
        return SubscriptionBillingStatus.SUSPENDED;
      default:
        return SubscriptionBillingStatus.SUSPENDED;
    }
  }

  async syncTenantFromSubscription(tenantId: string) {
    const sub = await this.prisma.client.subscription.findUnique({ where: { tenantId } });
    if (!sub) return null;

    const tenantStatus = mapSubscriptionStatusToTenantStatus(sub.status);
    return this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: {
        plan: sub.plan,
        status: tenantStatus,
        mrr: sub.mrr,
        renewalDate: sub.currentPeriodEnd,
      },
    });
  }

  async getTenantSubscription(tenantId: string) {
    const sub = await this.ensureForTenant(tenantId);
    const entry = planCatalogEntry(sub.plan);
    return {
      id: sub.id,
      plan: sub.plan,
      planDisplayName: entry.displayName,
      billingInterval: sub.billingInterval,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt?.toISOString().slice(0, 10) ?? null,
      currentPeriodStart: sub.currentPeriodStart.toISOString().slice(0, 10),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString().slice(0, 10),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      cancelledAt: sub.cancelledAt?.toISOString() ?? null,
      mrr: Number(sub.mrr),
      monthlyPrice: entry.monthlyPrice,
      seatLimit: entry.seatLimit,
      provider: sub.provider,
    };
  }

  async listInvoices(tenantId: string, limit = 20) {
    await this.ensureForTenant(tenantId);
    try {
      const rows = await this.prisma.client.subscriptionInvoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        amount: Number(row.amount),
        currency: row.currency,
        status: row.status,
        periodStart: row.periodStart.toISOString().slice(0, 10),
        periodEnd: row.periodEnd.toISOString().slice(0, 10),
        dueDate: row.dueDate.toISOString().slice(0, 10),
        paidAt: row.paidAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch (err) {
      if (isMissingSubscriptionTableError(err)) return [];
      throw err;
    }
  }

  async listPayments(tenantId: string, limit = 20) {
    await this.ensureForTenant(tenantId);
    try {
      const rows = await this.prisma.client.subscriptionPayment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        currency: row.currency,
        status: row.status,
        provider: row.provider,
        providerPaymentId: row.providerPaymentId,
        providerOrderId: row.providerOrderId,
        verifiedAt: row.verifiedAt?.toISOString() ?? null,
        failureReason: row.failureReason,
        approvedAt: row.approvedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch (err) {
      if (isMissingSubscriptionTableError(err)) return [];
      throw err;
    }
  }

  async changePlan(
    tenantId: string,
    plan: TenantPlan,
    billingInterval: BillingInterval = BillingInterval.MONTHLY,
  ) {
    const sub = await this.ensureForTenant(tenantId);
    const mrr = mrrForPlan(plan, billingInterval);
    if (sub.id.startsWith("legacy-")) {
      await this.prisma.client.tenant.update({
        where: { id: tenantId },
        data: { plan, mrr },
      });
      return sub;
    }
    const updated = await this.prisma.client.subscription.update({
      where: { id: sub.id },
      data: { plan, billingInterval, mrr },
    });
    await this.syncTenantFromSubscription(tenantId);
    return updated;
  }

  async cancelAtPeriodEnd(tenantId: string) {
    const sub = await this.ensureForTenant(tenantId);
    return this.prisma.client.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
  }

  async resumeSubscription(tenantId: string) {
    const sub = await this.ensureForTenant(tenantId);
    const updated = await this.prisma.client.subscription.update({
      where: { id: sub.id },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        status:
          sub.status === SubscriptionBillingStatus.CANCELLED
            ? SubscriptionBillingStatus.ACTIVE
            : sub.status,
      },
    });
    await this.syncTenantFromSubscription(tenantId);
    return updated;
  }

  async platformActivate(tenantId: string) {
    const sub = await this.ensureForTenant(tenantId);
    const updated = await this.prisma.client.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionBillingStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });
    await this.syncTenantFromSubscription(tenantId);
    return updated;
  }

  async platformSuspend(tenantId: string) {
    const sub = await this.ensureForTenant(tenantId);
    const updated = await this.prisma.client.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionBillingStatus.SUSPENDED },
    });
    await this.syncTenantFromSubscription(tenantId);
    return updated;
  }

  async platformGrantTrial(tenantId: string, days = TRIAL_DAYS_DEFAULT) {
    const sub = await this.ensureForTenant(tenantId);
    const trialEndsAt = addDays(new Date(), days);
    const updated = await this.prisma.client.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionBillingStatus.TRIAL,
        trialEndsAt: toDateOnly(trialEndsAt),
        currentPeriodEnd: toDateOnly(trialEndsAt),
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });
    await this.syncTenantFromSubscription(tenantId);
    return updated;
  }

  async platformExtendTrial(tenantId: string, days: number) {
    const sub = await this.ensureForTenant(tenantId);
    const base = sub.trialEndsAt ?? sub.currentPeriodEnd;
    const trialEndsAt = addDays(base, days);
    const updated = await this.prisma.client.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionBillingStatus.TRIAL,
        trialEndsAt: toDateOnly(trialEndsAt),
        currentPeriodEnd: toDateOnly(trialEndsAt),
      },
    });
    await this.syncTenantFromSubscription(tenantId);
    return updated;
  }

  async approveBankTransferPayment(paymentId: string, actorId: string) {
    const payment = await this.prisma.client.subscriptionPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new BadRequestException("Payment not found");
    if (payment.provider !== PaymentProvider.BANK_TRANSFER) {
      throw new BadRequestException("Only bank transfer payments can be manually approved");
    }
    if (payment.status !== SubscriptionPaymentStatus.PENDING) {
      throw new BadRequestException("Payment is not pending approval");
    }

    const result = await this.activateFromVerifiedPayment(paymentId, {
      actorId,
      approvedAt: new Date(),
    });
    return { id: paymentId, status: result.status };
  }

  async rejectBankTransferPayment(paymentId: string, actorId: string, reason?: string) {
    const payment = await this.prisma.client.subscriptionPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new BadRequestException("Payment not found");
    if (payment.provider !== PaymentProvider.BANK_TRANSFER) {
      throw new BadRequestException("Only bank transfer payments can be manually rejected");
    }
    if (payment.status !== SubscriptionPaymentStatus.PENDING) {
      throw new BadRequestException("Payment is not pending approval");
    }

    await this.prisma.client.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: SubscriptionPaymentStatus.FAILED,
        approvedBy: actorId,
        approvedAt: new Date(),
      },
    });

    return {
      id: paymentId,
      status: SubscriptionPaymentStatus.FAILED,
      reason: reason?.trim() || null,
    };
  }

  async activateFromVerifiedPayment(
    paymentId: string,
    opts?: {
      providerPaymentId?: string;
      actorId?: string;
      verifiedAt?: Date;
      approvedAt?: Date;
    },
  ): Promise<{ id: string; status: SubscriptionPaymentStatus; alreadyVerified: boolean }> {
    const payment = await this.prisma.client.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });
    if (!payment) throw new BadRequestException("Payment not found");

    if (payment.status === SubscriptionPaymentStatus.SUCCEEDED) {
      return { id: paymentId, status: payment.status, alreadyVerified: true };
    }
    if (payment.status !== SubscriptionPaymentStatus.PENDING) {
      throw new BadRequestException("Payment cannot be activated");
    }

    const periodDays =
      payment.subscription.billingInterval === BillingInterval.YEARLY ? 365 : 30;
    const renewal = addDays(new Date(), periodDays);
    const verifiedAt = opts?.verifiedAt ?? new Date();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: SubscriptionPaymentStatus.SUCCEEDED,
          providerPaymentId: opts?.providerPaymentId ?? payment.providerPaymentId,
          verifiedAt,
          approvedBy: opts?.actorId ?? payment.approvedBy,
          approvedAt: opts?.approvedAt ?? (opts?.actorId ? new Date() : payment.approvedAt),
        },
      });

      if (payment.invoiceId) {
        await tx.subscriptionInvoice.update({
          where: { id: payment.invoiceId },
          data: { status: SubscriptionInvoiceStatus.PAID, paidAt: verifiedAt },
        });
      }

      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: SubscriptionBillingStatus.ACTIVE,
          plan: payment.subscription.plan,
          provider: payment.provider,
          currentPeriodStart: toDateOnly(new Date()),
          currentPeriodEnd: toDateOnly(renewal),
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      });
    });

    await this.syncTenantFromSubscription(payment.tenantId);
    return { id: paymentId, status: SubscriptionPaymentStatus.SUCCEEDED, alreadyVerified: false };
  }

  async createCheckout(
    tenantId: string,
    plan: TenantPlan,
    billingInterval: BillingInterval,
    provider: PaymentProvider,
    customerEmail: string,
    idempotencyKey: string,
  ) {
    if (
      provider !== PaymentProvider.BANK_TRANSFER &&
      provider !== PaymentProvider.RAZORPAY
    ) {
      throw new BadRequestException(
        "This payment gateway is not available. Use bank transfer or Razorpay when enabled.",
      );
    }

    if (provider === PaymentProvider.RAZORPAY) {
      const { getRazorpaySecrets } = await import("../config/razorpay.env");
      if (!getRazorpaySecrets()) {
        throw new BadRequestException(
          "Razorpay is not configured. Use bank transfer or contact support.",
        );
      }
    }

    const existingByKey = await this.prisma.client.subscriptionPayment.findUnique({
      where: { idempotencyKey },
      include: { invoice: true },
    });
    if (existingByKey) {
      return this.buildCheckoutResponse(existingByKey, existingByKey.invoice);
    }

    const pending = await this.prisma.client.subscriptionPayment.findFirst({
      where: { tenantId, status: SubscriptionPaymentStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException(
        "A payment is already pending. Complete or wait for approval before starting another checkout.",
      );
    }

    await this.changePlan(tenantId, plan, billingInterval);
    const sub = await this.ensureForTenant(tenantId);
    const entry = planCatalogEntry(plan);
    const isRazorpay = provider === PaymentProvider.RAZORPAY;

    let amount: number;
    let currency: string;
    if (isRazorpay) {
      const { planCheckoutAmountMinorUnits, planCheckoutCurrency } = await import(
        "./providers/razorpay.util"
      );
      currency = planCheckoutCurrency();
      amount = planCheckoutAmountMinorUnits(plan, billingInterval, currency) / 100;
    } else {
      currency = "USD";
      amount =
        billingInterval === BillingInterval.YEARLY
          ? entry.monthlyPrice * 10
          : entry.monthlyPrice;
    }

    const invoiceNumber = `VEL-${tenantId.slice(0, 6).toUpperCase()}-${Date.now()}`;
    const dueDate = addDays(new Date(), 7);

    const invoice = await this.prisma.client.subscriptionInvoice.create({
      data: {
        subscriptionId: sub.id,
        tenantId,
        invoiceNumber,
        amount,
        currency,
        status: SubscriptionInvoiceStatus.OPEN,
        periodStart: toDateOnly(new Date()),
        periodEnd: toDateOnly(
          addDays(new Date(), billingInterval === BillingInterval.YEARLY ? 365 : 30),
        ),
        dueDate: toDateOnly(dueDate),
      },
    });

    const { getPaymentProvider } = await import("./providers");
    const adapter = getPaymentProvider(provider);
    const session = await adapter.createCheckoutSession({
      tenantId,
      subscriptionId: sub.id,
      plan,
      billingInterval,
      amount,
      currency,
      customerEmail,
      successUrl: "/app/settings/billing?checkout=success",
      cancelUrl: "/app/settings/billing?checkout=cancelled",
      idempotencyKey,
    });

    const payment = await this.prisma.client.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        tenantId,
        invoiceId: invoice.id,
        amount,
        currency,
        status: SubscriptionPaymentStatus.PENDING,
        provider,
        providerOrderId: isRazorpay ? session.sessionId : null,
        providerPaymentId: isRazorpay ? null : session.sessionId,
        idempotencyKey,
      },
    });

    return {
      invoice,
      session,
      payment: { id: payment.id },
      razorpay: session.razorpay ?? undefined,
    };
  }

  private async buildCheckoutResponse(
    payment: {
      id: string;
      amount: unknown;
      currency: string;
      provider: PaymentProvider;
      providerOrderId: string | null;
      providerPaymentId: string | null;
      status: SubscriptionPaymentStatus;
    },
    invoice: { id: string; invoiceNumber: string; amount: unknown } | null,
  ) {
    const { getRazorpayPublicConfig } = await import("../config/razorpay.env");
    const sessionId = payment.providerOrderId ?? payment.providerPaymentId ?? payment.id;

    let razorpay: CheckoutSession["razorpay"];
    if (payment.provider === PaymentProvider.RAZORPAY && payment.providerOrderId) {
      const pub = getRazorpayPublicConfig();
      razorpay = {
        keyId: pub.keyId!,
        orderId: payment.providerOrderId,
        amount: Math.round(Number(payment.amount) * 100),
        currency: payment.currency,
      };
    }

    return {
      invoice: invoice ?? { id: payment.id, invoiceNumber: "", amount: Number(payment.amount) },
      session: {
        provider: payment.provider,
        sessionId,
        checkoutUrl: null,
        clientSecret: null,
        instructions:
          payment.provider === PaymentProvider.BANK_TRANSFER
            ? "Transfer the invoice amount to Velon ERP (IBAN on file). Include your workspace code in the reference."
            : null,
        expiresAt: null,
        razorpay,
      },
      payment: { id: payment.id },
      razorpay,
    };
  }

  async evaluateExpiredSubscriptions() {
    const today = toDateOnly(new Date());
    const expired = await this.prisma.client.subscription.findMany({
      where: {
        status: { in: [SubscriptionBillingStatus.TRIAL, SubscriptionBillingStatus.ACTIVE] },
        currentPeriodEnd: { lt: today },
      },
    });

    for (const sub of expired) {
      const nextStatus =
        sub.status === SubscriptionBillingStatus.TRIAL
          ? SubscriptionBillingStatus.PAST_DUE
          : SubscriptionBillingStatus.PAST_DUE;
      await this.prisma.client.subscription.update({
        where: { id: sub.id },
        data: { status: nextStatus },
      });
      await this.syncTenantFromSubscription(sub.tenantId);
    }

    return { processed: expired.length };
  }
}
