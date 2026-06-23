-- Phase 3A: CRM foundation (customers, contacts, notes, activities)

CREATE TYPE "CrmCustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT');
CREATE TYPE "CrmNoteTargetType" AS ENUM ('CUSTOMER', 'CONTACT');
CREATE TYPE "CrmActivityType" AS ENUM ('CALL', 'MEETING', 'EMAIL', 'VISIT', 'TASK', 'FOLLOW_UP');
CREATE TYPE "CrmActivityStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

CREATE TABLE "CrmCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "status" "CrmCustomerStatus" NOT NULL DEFAULT 'PROSPECT',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "CrmCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetType" "CrmNoteTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" "CrmActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "CrmActivityStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmCustomer_tenantId_customerCode_key" ON "CrmCustomer"("tenantId", "customerCode");
CREATE INDEX "CrmCustomer_tenantId_idx" ON "CrmCustomer"("tenantId");
CREATE INDEX "CrmCustomer_tenantId_status_idx" ON "CrmCustomer"("tenantId", "status");
CREATE INDEX "CrmCustomer_tenantId_archivedAt_idx" ON "CrmCustomer"("tenantId", "archivedAt");

CREATE INDEX "CrmContact_tenantId_idx" ON "CrmContact"("tenantId");
CREATE INDEX "CrmContact_tenantId_customerId_idx" ON "CrmContact"("tenantId", "customerId");
CREATE INDEX "CrmContact_tenantId_archivedAt_idx" ON "CrmContact"("tenantId", "archivedAt");

CREATE INDEX "CrmNote_tenantId_idx" ON "CrmNote"("tenantId");
CREATE INDEX "CrmNote_tenantId_targetType_targetId_idx" ON "CrmNote"("tenantId", "targetType", "targetId");

CREATE INDEX "CrmActivity_tenantId_idx" ON "CrmActivity"("tenantId");
CREATE INDEX "CrmActivity_tenantId_customerId_idx" ON "CrmActivity"("tenantId", "customerId");
CREATE INDEX "CrmActivity_tenantId_ownerId_idx" ON "CrmActivity"("tenantId", "ownerId");
CREATE INDEX "CrmActivity_tenantId_status_idx" ON "CrmActivity"("tenantId", "status");
CREATE INDEX "CrmActivity_tenantId_activityDate_idx" ON "CrmActivity"("tenantId", "activityDate");

ALTER TABLE "CrmCustomer" ADD CONSTRAINT "CrmCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmCustomer" ADD CONSTRAINT "CrmCustomer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmCustomer" ADD CONSTRAINT "CrmCustomer_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
