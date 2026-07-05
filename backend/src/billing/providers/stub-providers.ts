import { Injectable } from '@nestjs/common';
import type { PaymentProviderId } from '@velon/shared';
import type {
  CheckoutInput,
  CheckoutSession,
  OfflinePaymentInput,
  PaymentRecord,
  WebhookResult,
} from './payment-provider.types';

/** Stub adapter — connect live credentials after gateway approval. */
@Injectable()
export abstract class StubPaymentProvider {
  abstract readonly id: PaymentProviderId;

  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
    return {
      provider: this.id,
      sessionId: `stub_${this.id.toLowerCase()}_${input.idempotencyKey}`,
      checkoutUrl: null,
      clientSecret: null,
      instructions: `${this.id} checkout is not yet connected. Use bank transfer or contact support.`,
      expiresAt: null,
    };
  }

  async handleWebhook(_payload: unknown, _signature?: string): Promise<WebhookResult | null> {
    return null;
  }

  async recordOfflinePayment(_input: OfflinePaymentInput): Promise<PaymentRecord> {
    throw new Error(`${this.id} does not support offline payments`);
  }
}

@Injectable()
export class StripeProvider extends StubPaymentProvider {
  readonly id = 'STRIPE' as const;
}

@Injectable()
export class RazorpayProvider extends StubPaymentProvider {
  readonly id = 'RAZORPAY' as const;
}

@Injectable()
export class StcPayProvider extends StubPaymentProvider {
  readonly id = 'STC_PAY' as const;
}

@Injectable()
export class HyperPayProvider extends StubPaymentProvider {
  readonly id = 'HYPERPAY' as const;
}

@Injectable()
export class BankTransferProvider extends StubPaymentProvider {
  readonly id = 'BANK_TRANSFER' as const;

  override async createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
    return {
      provider: this.id,
      sessionId: `bank_${input.idempotencyKey}`,
      checkoutUrl: null,
      clientSecret: null,
      instructions:
        'Transfer the invoice amount to Velon ERP (IBAN on file). Include your workspace code in the reference. A platform admin will activate your subscription after confirmation.',
      expiresAt: null,
    };
  }

  override async recordOfflinePayment(input: OfflinePaymentInput): Promise<PaymentRecord> {
    return {
      provider: this.id,
      providerPaymentId: `bank_ref_${input.reference}`,
      status: 'pending',
    };
  }
}
