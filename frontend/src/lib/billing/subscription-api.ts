import { apiFetch } from '@/lib/api/client';

export type TenantSubscriptionView = {
  id: string;
  plan: string;
  planDisplayName: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  mrr: number;
  monthlyPrice: number;
  currency: string;
  regionApplied?: string;
  seatLimit: number | null;
  provider: string | null;
};

export type SubscriptionInvoiceView = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
};

export type SubscriptionPaymentView = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId: string | null;
  providerOrderId?: string | null;
  verifiedAt?: string | null;
  failureReason?: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type BillingPaymentConfig = {
  bankTransfer: boolean;
  razorpay: {
    enabled: boolean;
    keyId: string | null;
    currency: string;
  };
};

export async function loadTenantSubscription() {
  return apiFetch<TenantSubscriptionView>('/billing/subscription');
}

export async function loadTenantInvoices() {
  return apiFetch<SubscriptionInvoiceView[]>('/billing/invoices');
}

export async function loadTenantPayments() {
  return apiFetch<SubscriptionPaymentView[]>('/billing/payments');
}

export async function loadBillingPaymentConfig() {
  return apiFetch<BillingPaymentConfig>('/billing/payment-config');
}

export async function loadPlatformBillingPayments() {
  return apiFetch<
    Array<{
      id: string;
      tenantId: string;
      tenantName: string;
      tenantCode: string;
      plan: string;
      amount: number;
      currency: string;
      status: string;
      provider: string;
      providerOrderId: string | null;
      providerPaymentId: string | null;
      verifiedAt: string | null;
      failureReason: string | null;
      approvedAt: string | null;
      invoiceNumber: string | null;
      createdAt: string;
      manualApprovalOnly: boolean;
    }>
  >('/billing/platform/payments');
}

export async function verifyRazorpayPayment(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiFetch<{
    payment: { id: string; status: string; alreadyVerified?: boolean };
    subscription: TenantSubscriptionView;
  }>('/billing/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loadBillingAccess() {
  return apiFetch<{
    status: string;
    allowsWorkspace: boolean;
    allowsBillingPortal: boolean;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
  }>('/billing/access');
}

export async function changeTenantSubscriptionPlan(
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE',
  billingInterval: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
) {
  return apiFetch('/billing/subscription/plan', {
    method: 'PATCH',
    body: JSON.stringify({ plan, billingInterval }),
  });
}

export async function cancelTenantSubscription() {
  return apiFetch('/billing/subscription/cancel', { method: 'POST' });
}

export async function resumeTenantSubscription() {
  return apiFetch('/billing/subscription/resume', { method: 'POST' });
}

export async function loadBillingPlans() {
  return apiFetch<
    Array<{
      id: string;
      displayName: string;
      monthlyPrice: number;
      annualPrice?: number;
      currency: string;
      regionApplied?: string;
      seatLimit: number | null;
      description: string;
    }>
  >('/billing/plans/for-workspace');
}

export async function cancelBillingCheckout(orderId?: string) {
  return apiFetch<{ cancelled: boolean; paymentId?: string }>('/billing/checkout/cancel', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

export async function loadPendingBillingPayments() {
  return apiFetch<
    Array<{
      id: string;
      tenantId: string;
      tenantName: string;
      tenantCode: string;
      amount: number;
      currency: string;
      status: string;
      provider: string;
      invoiceNumber: string | null;
      createdAt: string;
    }>
  >('/billing/platform/payments/pending');
}

export async function approveBillingPayment(paymentId: string) {
  return apiFetch<{ id: string; status: string }>(
    `/billing/platform/payments/${paymentId}/approve`,
    { method: 'POST' },
  );
}

export async function rejectBillingPayment(paymentId: string, reason?: string) {
  return apiFetch<{ id: string; status: string; reason: string | null }>(
    `/billing/platform/payments/${paymentId}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export async function extendTenantTrial(tenantId: string, days = 14) {
  return apiFetch(`/billing/platform/tenants/${tenantId}/trial/extend`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

export async function startBillingCheckout(input: {
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  billingInterval: 'MONTHLY' | 'YEARLY';
  provider: 'STRIPE' | 'RAZORPAY' | 'STC_PAY' | 'HYPERPAY' | 'BANK_TRANSFER';
  idempotencyKey: string;
}) {
  return apiFetch<{
    invoice: { id: string; invoiceNumber: string; amount: number };
    session: {
      provider: string;
      sessionId: string;
      instructions: string | null;
      checkoutUrl: string | null;
      razorpay?: { keyId: string; orderId: string; amount: number; currency: string };
    };
    razorpay?: { keyId: string; orderId: string; amount: number; currency: string };
  }>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loadBillingProviders() {
  return apiFetch<{ id: string }[]>('/billing/providers');
}
