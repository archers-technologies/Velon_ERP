export type BillingInterval = 'MONTHLY' | 'YEARLY';
export type SubscriptionBillingStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type PaymentProviderId = 'STRIPE' | 'RAZORPAY' | 'STC_PAY' | 'HYPERPAY' | 'BANK_TRANSFER';
export declare const PAYMENT_PROVIDERS: {
  id: PaymentProviderId;
  name: string;
  description: string;
  supportsRecurring: boolean;
  requiresManualApproval: boolean;
}[];
export declare const TRIAL_DAYS_DEFAULT = 30;
export declare const ANNUAL_BILLING_MONTHS = 11;
export declare function yearlyPriceFromMonthly(monthlyPrice: number): number;
export declare function mrrForPlan(plan: string, interval: BillingInterval): number;
export declare const BILLING_PORTAL_PATH_PREFIXES: string[];
export declare function normalizeApiPath(path: string): string;
export declare function isBillingPortalPath(path: string): boolean;
export declare function subscriptionAllowsWorkspaceAccess(
  status: SubscriptionBillingStatus,
): boolean;
export declare function subscriptionAllowsBillingPortal(status: SubscriptionBillingStatus): boolean;
export declare function mapSubscriptionStatusToTenantStatus(
  status: SubscriptionBillingStatus,
): 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED';
