-- Phase 2C: tenant partitioning fixtures + required notification tenantId

CREATE TABLE "TenantAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantFile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantAsset_tenantId_idx" ON "TenantAsset"("tenantId");
CREATE INDEX "TenantFile_tenantId_idx" ON "TenantFile"("tenantId");

ALTER TABLE "TenantAsset" ADD CONSTRAINT "TenantAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantFile" ADD CONSTRAINT "TenantFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification.tenantId becomes required with FK (platform rows use a sentinel tenant or remain in AuditLog only)
DELETE FROM "Notification" WHERE "tenantId" IS NULL;

ALTER TABLE "Notification" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Notification_tenantId_userId_idx" ON "Notification"("tenantId", "userId");
