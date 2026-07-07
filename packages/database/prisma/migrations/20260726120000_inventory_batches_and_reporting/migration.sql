-- Batch-level inventory with MFG/EXP dates, cost snapshots, and report settings.

ALTER TABLE "Workspace" ADD COLUMN "expiringSoonDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "InventoryProduct" ADD COLUMN "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "InventoryStockBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "mfgDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStockBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryStockBatch_tenantId_idx" ON "InventoryStockBatch"("tenantId");
CREATE INDEX "InventoryStockBatch_tenantId_stockId_idx" ON "InventoryStockBatch"("tenantId", "stockId");
CREATE INDEX "InventoryStockBatch_tenantId_expiryDate_idx" ON "InventoryStockBatch"("tenantId", "expiryDate");

ALTER TABLE "InventoryStockBatch" ADD CONSTRAINT "InventoryStockBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryStockBatch" ADD CONSTRAINT "InventoryStockBatch_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "InventoryStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesOrderItem" ADD COLUMN "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "SalesOrderItem" ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;
