import { planCatalogEntry } from "./plans";

export type BillingInterval = "MONTHLY" | "YEARLY";

export type SubscriptionBillingStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELLED";

export type PaymentProviderId =
  | "STRIPE"
  | "RAZORPAY"
  | "STC_PAY"
  | "HYPERPAY"
  | "BANK_TRANSFER";

export const PAYMENT_PROVIDERS: {
  id: PaymentProviderId;
  name: string;
  description: string;
  supportsRecurring: boolean;
  requiresManualApproval: boolean;
}[] = [
  {
    id: "STRIPE",
    name: "Stripe",
    description: "Card and subscription billing (global).",
    supportsRecurring: true,
    requiresManualApproval: false,
  },
  {
    id: "RAZORPAY",
    name: "Razorpay",
    description: "Cards, UPI, and netbanking (India).",
    supportsRecurring: true,
    requiresManualApproval: false,
  },
  {
    id: "STC_PAY",
    name: "STC Pay",
    description: "Mobile wallet checkout (Saudi Arabia).",
    supportsRecurring: false,
    requiresManualApproval: false,
  },
  {
    id: "HYPERPAY",
    name: "HyperPay",
    description: "Regional card gateway (MENA).",
    supportsRecurring: true,
    requiresManualApproval: false,
  },
  {
    id: "BANK_TRANSFER",
    name: "Bank Transfer",
    description: "Manual wire transfer with admin approval.",
    supportsRecurring: false,
    requiresManualApproval: true,
  },
];

export const TRIAL_DAYS_DEFAULT = 30;

export function yearlyPriceFromMonthly(monthlyPrice: number): number {
  return monthlyPrice * 10;
}

export function mrrForPlan(plan: string, interval: BillingInterval): number {
  const entry = planCatalogEntry(plan);
  if (interval === "YEARLY") {
    return Math.round((yearlyPriceFromMonthly(entry.monthlyPrice) / 12) * 100) / 100;
  }
  return entry.monthlyPrice;
}

/** Tenant workspace routes always allowed regardless of billing status. */
export const BILLING_PORTAL_PATH_PREFIXES = [
  "/billing/subscription",
  "/billing/invoices",
  "/billing/payments",
  "/billing/checkout",
  "/billing/plans",
  "/billing/payment-config",
  "/billing/razorpay/verify",
  "/billing/providers",
  "/workspace/context",
  "/workspace/dashboard",
  "/tenant-admin/seats",
  "/auth/",
];

export function normalizeApiPath(path: string): string {
  const trimmed = path.split("?")[0] ?? path;
  const withoutPrefix = trimmed.replace(/^\/api\/v\d+\//, "/");
  return withoutPrefix.startsWith("/") ? withoutPrefix : `/${withoutPrefix}`;
}

export function isBillingPortalPath(path: string): boolean {
  const normalized = normalizeApiPath(path);
  return BILLING_PORTAL_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function subscriptionAllowsWorkspaceAccess(status: SubscriptionBillingStatus): boolean {
  return status === "TRIAL" || status === "ACTIVE" || status === "PAST_DUE";
}

export function subscriptionAllowsBillingPortal(status: SubscriptionBillingStatus): boolean {
  return (
    status === "TRIAL" ||
    status === "ACTIVE" ||
    status === "PAST_DUE" ||
    status === "SUSPENDED" ||
    status === "CANCELLED"
  );
}

export function mapSubscriptionStatusToTenantStatus(
  status: SubscriptionBillingStatus,
): "ACTIVE" | "TRIAL" | "PAST_DUE" | "SUSPENDED" {
  switch (status) {
    case "TRIAL":
      return "TRIAL";
    case "ACTIVE":
      return "ACTIVE";
    case "PAST_DUE":
      return "PAST_DUE";
    case "SUSPENDED":
    case "CANCELLED":
      return "SUSPENDED";
    default:
      return "SUSPENDED";
  }
}
