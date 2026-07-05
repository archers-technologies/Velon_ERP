-- CreateEnum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('TRANSACTIONAL', 'MARKETING', 'ONBOARDING', 'BILLING', 'SECURITY', 'SUPPORT');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EmailTemplateCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "customerId" TEXT,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "subscriptionId" TEXT,
    "templateKey" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "transactionalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "billingAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "securityAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "productUpdatesOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "trainingAnnouncementsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferenceToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "tenantId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_idempotencyKey_key" ON "EmailLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_idx" ON "EmailLog"("tenantId");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_customerId_idx" ON "EmailLog"("customerId");

-- CreateIndex
CREATE INDEX "EmailLog_templateKey_idx" ON "EmailLog"("templateKey");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_preferenceToken_key" ON "EmailPreference"("preferenceToken");

-- CreateIndex
CREATE INDEX "EmailPreference_userId_idx" ON "EmailPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_userId_tenantId_key" ON "EmailPreference"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_eventType_entityId_key" ON "EmailEvent"("eventType", "entityId");

-- CreateIndex
CREATE INDEX "EmailEvent_processedAt_idx" ON "EmailEvent"("processedAt");

-- CreateIndex
CREATE INDEX "EmailEvent_tenantId_idx" ON "EmailEvent"("tenantId");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
