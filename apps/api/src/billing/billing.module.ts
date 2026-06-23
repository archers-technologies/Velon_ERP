import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { PlanDefinitionService } from "./plan-definition.service";
import { RazorpayBillingService } from "./razorpay-billing.service";
import { RazorpayWebhookController } from "./razorpay-webhook.controller";
import { SubscriptionAccessService } from "./subscription-access.service";
import { SubscriptionService } from "./subscription.service";

@Module({
  imports: [AuditModule],
  controllers: [BillingController, RazorpayWebhookController],
  providers: [
    BillingService,
    PlanDefinitionService,
    SubscriptionService,
    SubscriptionAccessService,
    RazorpayBillingService,
  ],
  exports: [BillingService, PlanDefinitionService, SubscriptionService, SubscriptionAccessService, RazorpayBillingService],
})
export class BillingModule {}
