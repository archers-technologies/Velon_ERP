import { Injectable } from "@nestjs/common";
import type { PaymentProviderId } from "@velon/shared";
import { assertRazorpayConfigured } from "../../config/razorpay.env";
import { createRazorpayOrder } from "./razorpay.client";
import type { CheckoutInput, CheckoutSession } from "./payment-provider.types";
import { StubPaymentProvider } from "./stub-providers";

@Injectable()
export class RazorpayPaymentProvider extends StubPaymentProvider {
  readonly id = "RAZORPAY" as const;

  override async createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
    const secrets = assertRazorpayConfigured();
    const amountMinor = Math.round(input.amount * 100);
    const order = await createRazorpayOrder({
      amountMinor,
      currency: input.currency,
      receipt: input.idempotencyKey.slice(0, 40),
      notes: {
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId,
        plan: input.plan,
        billingInterval: input.billingInterval,
      },
    });

    return {
      provider: this.id,
      sessionId: order.id,
      checkoutUrl: null,
      clientSecret: null,
      instructions: null,
      expiresAt: null,
      razorpay: {
        keyId: secrets.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  }
}
