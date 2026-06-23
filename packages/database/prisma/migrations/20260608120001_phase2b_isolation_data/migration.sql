-- Phase 2B (continued): apply new role values and tenant isolation fixtures.

UPDATE "TenantMembership" SET role = 'TENANT_OWNER' WHERE role = 'TENANT_ADMIN';
UPDATE "TenantMembership" SET role = 'USER' WHERE role = 'TENANT_USER';
UPDATE "User" SET role = 'USER' WHERE role = 'TENANT_USER';

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
ALTER TABLE "TenantMembership" ALTER COLUMN "role" SET DEFAULT 'USER';

CREATE TABLE "TenantCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCustomer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantCustomer_tenantId_idx" ON "TenantCustomer"("tenantId");

ALTER TABLE "TenantCustomer" ADD CONSTRAINT "TenantCustomer_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TenantProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantProject_tenantId_idx" ON "TenantProject"("tenantId");

ALTER TABLE "TenantProject" ADD CONSTRAINT "TenantProject_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
