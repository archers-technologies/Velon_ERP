-- CreateTable
CREATE TABLE "SupplierThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierThread_tenantId_idx" ON "SupplierThread"("tenantId");

-- CreateIndex
CREATE INDEX "SupplierThread_tenantId_supplierId_idx" ON "SupplierThread"("tenantId", "supplierId");

-- AddForeignKey
ALTER TABLE "SupplierThread" ADD CONSTRAINT "SupplierThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierThread" ADD CONSTRAINT "SupplierThread_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierThread" ADD CONSTRAINT "SupplierThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
