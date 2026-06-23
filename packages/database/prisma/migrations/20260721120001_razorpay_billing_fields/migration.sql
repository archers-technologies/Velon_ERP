-- AlterTable
ALTER TABLE "SubscriptionPayment" ADD COLUMN "providerOrderId" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "SubscriptionPayment" ADD COLUMN "failureReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_provider_providerOrderId_key" ON "SubscriptionPayment"("provider", "providerOrderId");

-- AlterTable
ALTER TABLE "BillingWebhookEvent" ADD COLUMN "providerEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");
