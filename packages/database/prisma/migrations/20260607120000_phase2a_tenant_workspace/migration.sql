-- Phase 2A: Tenant architecture — CompanyProfile, Workspace, membership roles

-- Add DEPARTMENT_ADMIN to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DEPARTMENT_ADMIN';

-- CompanyProfile (1:1 with Tenant)
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL,
    "industry" "IndustryTemplate" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyProfile_tenantId_key" ON "CompanyProfile"("tenantId");
CREATE INDEX "CompanyProfile_email_idx" ON "CompanyProfile"("email");

ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Workspace (1:1 with Tenant)
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_tenantId_key" ON "Workspace"("tenantId");
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TenantMembership: isActive + updatedAt
ALTER TABLE "TenantMembership" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TenantMembership" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "TenantMembership_userId_idx" ON "TenantMembership"("userId");

-- Notification tenant index
CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx" ON "Notification"("tenantId");

-- Backfill CompanyProfile + Workspace for existing tenants
INSERT INTO "CompanyProfile" ("id", "tenantId", "legalName", "email", "phone", "country", "industry", "updatedAt")
SELECT
    'cp_' || t."id",
    t."id",
    t."name",
    COALESCE(u."email", 'unknown@tenant.local'),
    '',
    t."country",
    t."industryTemplate",
    CURRENT_TIMESTAMP
FROM "Tenant" t
LEFT JOIN LATERAL (
    SELECT u2."email"
    FROM "TenantMembership" tm
    JOIN "User" u2 ON u2."id" = tm."userId"
    WHERE tm."tenantId" = t."id"
    ORDER BY tm."createdAt" ASC
    LIMIT 1
) u ON true
WHERE NOT EXISTS (SELECT 1 FROM "CompanyProfile" cp WHERE cp."tenantId" = t."id");

INSERT INTO "Workspace" ("id", "tenantId", "name", "slug", "updatedAt")
SELECT
    'ws_' || t."id",
    t."id",
    t."name",
    t."slug",
    CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "Workspace" w WHERE w."tenantId" = t."id");
