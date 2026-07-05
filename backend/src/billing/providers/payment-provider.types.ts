import type { BillingInterval, PaymentProviderId } from '@velon/shared';

export type CheckoutInput = {
  tenantId: string;
  subscriptionId: string;
  plan: string;
  billingInterval: BillingInterval;
  amount: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
};

export type CheckoutSession = {
  provider: PaymentProviderId;
  sessionId: string;
  checkoutUrl: string | null;
  clientSecret: string | null;
  instructions: string | null;
  expiresAt: string | null;
  razorpay?: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  };
};

export type WebhookResult = {
  provider: PaymentProviderId;
  eventType: string;
  paymentId?: string;
  subscriptionId?: string;
  tenantId?: string;
  amount?: number;
  currency?: string;
  status?: 'succeeded' | 'failed' | 'pending';
};

export type OfflinePaymentInput = {
  tenantId: string;
  subscriptionId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  reference: string;
  idempotencyKey: string;
};

export type PaymentRecord = {
  provider: PaymentProviderId;
  providerPaymentId: string;
  status: 'pending' | 'succeeded' | 'failed';
};

export interface PaymentProviderAdapter {
  readonly id: PaymentProviderId;
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession>;
  handleWebhook(payload: unknown, signature?: string): Promise<WebhookResult | null>;
  recordOfflinePayment?(input: OfflinePaymentInput): Promise<PaymentRecord>;
}
