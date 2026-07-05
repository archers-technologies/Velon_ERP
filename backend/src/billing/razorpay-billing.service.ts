import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentProvider, SubscriptionPaymentStatus } from '@velon/database';
import { AuditService } from '../audit/audit.service';
import { assertRazorpayConfigured, assertRazorpayWebhookConfigured } from '../config/razorpay.env';
import { PrismaService } from '../prisma/prisma.service';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from './providers/razorpay.util';
import { SubscriptionService } from './subscription.service';

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
  };
};

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  error_description?: string;
};

@Injectable()
export class RazorpayBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly audit: AuditService,
  ) {}

  async verifyCheckoutPayment(
    tenantId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    actorId?: string,
  ) {
    const secrets = assertRazorpayConfigured();
    if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature, secrets.keySecret)) {
      const payment = await this.prisma.client.subscriptionPayment.findFirst({
        where: { tenantId, provider: PaymentProvider.RAZORPAY, providerOrderId: orderId },
      });
      if (payment && payment.status === SubscriptionPaymentStatus.PENDING) {
        await this.prisma.client.subscriptionPayment.update({
          where: { id: payment.id },
          data: {
            status: SubscriptionPaymentStatus.FAILED,
            failureReason: 'Signature verification failed',
          },
        });
      }
      throw new BadRequestException('Invalid Razorpay payment signature');
    }

    const payment = await this.prisma.client.subscriptionPayment.findFirst({
      where: {
        tenantId,
        provider: PaymentProvider.RAZORPAY,
        providerOrderId: orderId,
      },
      include: { subscription: true },
    });

    if (!payment) {
      throw new BadRequestException('Payment order not found for this workspace');
    }
    if (payment.tenantId !== tenantId) {
      throw new ForbiddenException('Payment does not belong to this workspace');
    }

    const result = await this.subscriptions.activateFromVerifiedPayment(payment.id, {
      providerPaymentId: paymentId,
      actorId,
      verifiedAt: new Date(),
    });

    if (!result.alreadyVerified) {
      await this.audit.log({
        actorId: actorId,
        tenantId,
        action: 'billing.razorpay_payment_verified',
        entityType: 'subscription_payment',
        entityId: payment.id,
        metadata: { orderId, paymentId, provider: PaymentProvider.RAZORPAY },
      });
    }

    const subscription = await this.subscriptions.getTenantSubscription(tenantId);
    return { payment: result, subscription };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined, eventId: string | undefined) {
    const secrets = assertRazorpayWebhookConfigured();
    if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature, secrets.webhookSecret)) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const eventType = payload.event ?? 'unknown';
    const providerEventId = eventId ?? `${eventType}:${JSON.stringify(payload).slice(0, 64)}`;

    const existingEvent = await this.prisma.client.billingWebhookEvent.findUnique({
      where: { providerEventId },
    });
    if (existingEvent?.processed) {
      return { received: true, duplicate: true };
    }

    const webhookRecord =
      existingEvent ??
      (await this.prisma.client.billingWebhookEvent.create({
        data: {
          provider: PaymentProvider.RAZORPAY,
          providerEventId,
          eventType,
          payload: payload as object,
        },
      }));

    const entity = payload.payload?.payment?.entity;
    if (!entity?.order_id || !entity.id) {
      await this.markWebhookProcessed(webhookRecord.id);
      return { received: true, ignored: true };
    }

    const payment = await this.prisma.client.subscriptionPayment.findFirst({
      where: {
        provider: PaymentProvider.RAZORPAY,
        providerOrderId: entity.order_id,
      },
    });

    if (!payment) {
      await this.markWebhookProcessed(webhookRecord.id);
      return { received: true, ignored: true, reason: 'unknown_order' };
    }

    const normalizedStatus = (entity.status ?? '').toLowerCase();
    if (normalizedStatus === 'captured' || normalizedStatus === 'authorized') {
      await this.subscriptions.activateFromVerifiedPayment(payment.id, {
        providerPaymentId: entity.id,
        verifiedAt: new Date(),
      });
      await this.audit.log({
        tenantId: payment.tenantId,
        action: 'billing.razorpay_webhook_payment_confirmed',
        entityType: 'subscription_payment',
        entityId: payment.id,
        metadata: { eventType, paymentId: entity.id, orderId: entity.order_id },
      });
    } else if (normalizedStatus === 'failed') {
      if (payment.status === SubscriptionPaymentStatus.PENDING) {
        await this.prisma.client.subscriptionPayment.update({
          where: { id: payment.id },
          data: {
            status: SubscriptionPaymentStatus.FAILED,
            providerPaymentId: entity.id,
            failureReason: entity.error_description ?? 'Payment failed',
          },
        });
      }
      await this.audit.log({
        tenantId: payment.tenantId,
        action: 'billing.razorpay_webhook_payment_failed',
        entityType: 'subscription_payment',
        entityId: payment.id,
        metadata: { eventType, paymentId: entity.id, orderId: entity.order_id },
      });
    }

    await this.markWebhookProcessed(webhookRecord.id);
    return { received: true, eventType };
  }

  private async markWebhookProcessed(id: string) {
    await this.prisma.client.billingWebhookEvent.update({
      where: { id },
      data: { processed: true, processedAt: new Date() },
    });
  }
}
