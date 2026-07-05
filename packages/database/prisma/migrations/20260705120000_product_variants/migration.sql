-- Product variants: optional multi-attribute variant support

-- AlterTable: InventoryProduct
ALTER TABLE "InventoryProduct" ADD COLUMN "hasVariants" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "InventoryProduct_tenantId_hasVariants_idx" ON "InventoryProduct"("tenantId", "hasVariants");

-- CreateTable: InventoryProductVariantAttribute
CREATE TABLE "InventoryProductVariantAttribute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryProductVariantAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InventoryProductVariantAttributeValue
CREATE TABLE "InventoryProductVariantAttributeValue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryProductVariantAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InventoryProductVariant
CREATE TABLE "InventoryProductVariant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(12,2),
    "imageDataUrl" TEXT,
    "status" "InventoryProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InventoryProductVariantOption
CREATE TABLE "InventoryProductVariantOption" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "attributeValueId" TEXT NOT NULL,

    CONSTRAINT "InventoryProductVariantOption_pkey" PRIMARY KEY ("id")
);

-- AlterTable: InventoryStock - add variantId, replace unique constraint
ALTER TABLE "InventoryStock" ADD COLUMN "variantId" TEXT;

-- Drop old unique constraint on stock (simple product rows)
DROP INDEX IF EXISTS "InventoryStock_tenantId_productId_warehouseId_key";

CREATE INDEX "InventoryStock_tenantId_productId_warehouseId_idx" ON "InventoryStock"("tenantId", "productId", "warehouseId");
CREATE INDEX "InventoryStock_tenantId_variantId_warehouseId_idx" ON "InventoryStock"("tenantId", "variantId", "warehouseId");

-- Partial unique: one stock row per simple product per warehouse
CREATE UNIQUE INDEX "InventoryStock_simple_product_warehouse_key"
ON "InventoryStock"("tenantId", "productId", "warehouseId")
WHERE "variantId" IS NULL;

-- Partial unique: one stock row per variant per warehouse
CREATE UNIQUE INDEX "InventoryStock_variant_warehouse_key"
ON "InventoryStock"("tenantId", "variantId", "warehouseId")
WHERE "variantId" IS NOT NULL;

-- AlterTable: CrmQuotationItem
ALTER TABLE "CrmQuotationItem" ADD COLUMN "variantId" TEXT;

-- AlterTable: SalesOrderItem
ALTER TABLE "SalesOrderItem" ADD COLUMN "variantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryProductVariantAttribute_tenantId_productId_name_key" ON "InventoryProductVariantAttribute"("tenantId", "productId", "name");
CREATE INDEX "InventoryProductVariantAttribute_tenantId_idx" ON "InventoryProductVariantAttribute"("tenantId");
CREATE INDEX "InventoryProductVariantAttribute_tenantId_productId_idx" ON "InventoryProductVariantAttribute"("tenantId", "productId");

CREATE UNIQUE INDEX "InventoryProductVariantAttributeValue_tenantId_attributeId_value_key" ON "InventoryProductVariantAttributeValue"("tenantId", "attributeId", "value");
CREATE INDEX "InventoryProductVariantAttributeValue_tenantId_idx" ON "InventoryProductVariantAttributeValue"("tenantId");
CREATE INDEX "InventoryProductVariantAttributeValue_tenantId_attributeId_idx" ON "InventoryProductVariantAttributeValue"("tenantId", "attributeId");

CREATE UNIQUE INDEX "InventoryProductVariant_tenantId_sku_key" ON "InventoryProductVariant"("tenantId", "sku");
CREATE INDEX "InventoryProductVariant_tenantId_idx" ON "InventoryProductVariant"("tenantId");
CREATE INDEX "InventoryProductVariant_tenantId_productId_idx" ON "InventoryProductVariant"("tenantId", "productId");
CREATE INDEX "InventoryProductVariant_tenantId_status_idx" ON "InventoryProductVariant"("tenantId", "status");
CREATE INDEX "InventoryProductVariant_tenantId_barcode_idx" ON "InventoryProductVariant"("tenantId", "barcode");

CREATE UNIQUE INDEX "InventoryProductVariantOption_variantId_attributeValueId_key" ON "InventoryProductVariantOption"("variantId", "attributeValueId");
CREATE INDEX "InventoryProductVariantOption_variantId_idx" ON "InventoryProductVariantOption"("variantId");
CREATE INDEX "InventoryProductVariantOption_attributeValueId_idx" ON "InventoryProductVariantOption"("attributeValueId");

-- Partial unique: barcode per tenant for variants (when set)
CREATE UNIQUE INDEX "InventoryProductVariant_tenantId_barcode_unique"
ON "InventoryProductVariant"("tenantId", "barcode")
WHERE "barcode" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "InventoryProductVariantAttribute" ADD CONSTRAINT "InventoryProductVariantAttribute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryProductVariantAttribute" ADD CONSTRAINT "InventoryProductVariantAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryProductVariantAttributeValue" ADD CONSTRAINT "InventoryProductVariantAttributeValue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryProductVariantAttributeValue" ADD CONSTRAINT "InventoryProductVariantAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "InventoryProductVariantAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryProductVariant" ADD CONSTRAINT "InventoryProductVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryProductVariant" ADD CONSTRAINT "InventoryProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryProductVariantOption" ADD CONSTRAINT "InventoryProductVariantOption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "InventoryProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryProductVariantOption" ADD CONSTRAINT "InventoryProductVariantOption_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "InventoryProductVariantAttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "InventoryProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmQuotationItem" ADD CONSTRAINT "CrmQuotationItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "InventoryProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "InventoryProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
