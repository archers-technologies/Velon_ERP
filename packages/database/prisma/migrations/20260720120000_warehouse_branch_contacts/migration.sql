-- Branch contact fields on inventory warehouses (tenant-scoped locations)
ALTER TABLE "InventoryWarehouse" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "InventoryWarehouse" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "InventoryWarehouse" ADD COLUMN IF NOT EXISTS "managerName" TEXT;
