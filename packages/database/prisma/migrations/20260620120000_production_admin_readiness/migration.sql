-- Production admin readiness: demo markers, soft delete, plan catalog

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "seedSource" TEXT;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "seedSource" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Tenant_seedSource_idx" ON "Tenant"("seedSource");
CREATE INDEX IF NOT EXISTS "Tenant_deletedAt_idx" ON "Tenant"("deletedAt");

CREATE TABLE IF NOT EXISTS "PlanDefinition" (
    "plan" "TenantPlan" NOT NULL,
    "displayName" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(12,2) NOT NULL,
    "annualPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "seatLimit" INTEGER,
    "storageLimitGb" INTEGER NOT NULL DEFAULT 10,
    "invoiceLimitMo" INTEGER,
    "branchLimit" INTEGER,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "moduleHrm" BOOLEAN NOT NULL DEFAULT true,
    "moduleCrm" BOOLEAN NOT NULL DEFAULT true,
    "moduleFinance" BOOLEAN NOT NULL DEFAULT true,
    "moduleInventory" BOOLEAN NOT NULL DEFAULT true,
    "moduleManufacturing" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanDefinition_pkey" PRIMARY KEY ("plan")
);

INSERT INTO "PlanDefinition" (
  "plan", "displayName", "monthlyPrice", "annualPrice", "currency",
  "seatLimit", "storageLimitGb", "invoiceLimitMo", "branchLimit", "trialDays",
  "isEnabled", "moduleHrm", "moduleCrm", "moduleFinance", "moduleInventory", "moduleManufacturing",
  "description", "updatedAt"
) VALUES
  ('STARTER', 'Starter', 49, 490, 'INR', 5, 10, 500, 1, 14, true, true, true, false, true, false,
   'For small teams getting started with Velon ERP.', CURRENT_TIMESTAMP),
  ('GROWTH', 'Professional', 149, 1490, 'INR', 25, 50, 5000, 5, 14, true, true, true, true, true, false,
   'For growing companies that need more seats and control.', CURRENT_TIMESTAMP),
  ('ENTERPRISE', 'Enterprise', 499, 4990, 'INR', NULL, 500, NULL, NULL, 14, true, true, true, true, true, true,
   'Unlimited scale with dedicated support.', CURRENT_TIMESTAMP)
ON CONFLICT ("plan") DO NOTHING;
