import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InventoryAbcClass, InventoryVelocity } from "@velon/database";
import { InventoryService } from "./inventory.service";
import { IDS, META, tenantOwner, tenantUser } from "../test-utils/fixtures";
import { createMockAudit, createMockPrisma, createMockPrismaClient, createRepoMock } from "../test-utils/mocks";

function stockRow(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.stock,
    quantity: 10,
    reservedQty: 2,
    minStock: 2,
    reorderLevel: 5,
    productId: IDS.product,
    warehouseId: IDS.warehouse,
    product: {
      sku: "SKU-00001",
      name: "Widget",
      unitPrice: { toNumber: () => 12.5 },
      abcClass: InventoryAbcClass.A,
      velocity: InventoryVelocity.FAST,
      batchTracked: false,
      variantParent: null,
    },
    warehouse: { name: "Main" },
    ...overrides,
  };
}

describe("InventoryService", () => {
  const categories = createRepoMock();
  const products = createRepoMock(["findMany", "findById", "findBySku", "create", "update", "count"]);
  const warehouses = createRepoMock(["findMany", "findById", "findByName", "create", "update"]);
  const stock = createRepoMock([
    "findMany",
    "findById",
    "findByProductWarehouse",
    "create",
    "update",
  ]);
  const audit = createMockAudit();
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);

  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(
      categories as never,
      products as never,
      warehouses as never,
      stock as never,
      audit as never,
      prisma,
    );
  });

  describe("permissions", () => {
    it("denies manage actions for read-only users", async () => {
      await expect(
        service.createCategory(tenantUser(), { name: "Parts" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows tenant owner to list categories", async () => {
      categories.findMany.mockResolvedValue([{ id: IDS.category, name: "Parts" }]);
      await expect(service.listCategories(tenantOwner())).resolves.toHaveLength(1);
    });
  });

  describe("categories", () => {
    it("creates a category with trimmed fields", async () => {
      categories.create.mockResolvedValue({ id: IDS.category, name: "Parts" });
      const row = await service.createCategory(tenantOwner(), {
        name: "  Parts  ",
        description: "  hardware ",
      });
      expect(categories.create).toHaveBeenCalledWith({
        name: "Parts",
        description: "hardware",
        parentId: null,
      });
      expect(row.name).toBe("Parts");
    });

    it("refuses to delete a category that still has products", async () => {
      categories.findById.mockResolvedValue({ id: IDS.category });
      client.inventoryProduct.count.mockResolvedValue(3);
      await expect(service.deleteCategory(tenantOwner(), IDS.category)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("products", () => {
    it("rejects duplicate SKU", async () => {
      products.count.mockResolvedValue(0);
      products.findBySku.mockResolvedValue({ id: "existing" });
      await expect(
        service.createProduct(tenantOwner(), { name: "Widget", sku: "SKU-1" }, META),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates product and writes audit entry", async () => {
      products.findBySku.mockResolvedValue(null);
      products.create.mockResolvedValue({ id: IDS.product, sku: "SKU-00001", name: "Widget" });
      const product = await service.createProduct(
        tenantOwner(),
        { name: "Widget", sku: "SKU-00001" },
        META,
      );
      expect(product.id).toBe(IDS.product);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "inventory.product_created" }),
      );
    });

    it("returns not found for missing product", async () => {
      products.findById.mockResolvedValue(null);
      await expect(service.getProduct(tenantOwner(), "missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("stock", () => {
    it("maps stock levels to healthy / low / critical", () => {
      const healthy = service.mapStockRow(stockRow({ quantity: 20, reservedQty: 0, minStock: 2, reorderLevel: 5 }));
      const low = service.mapStockRow(stockRow({ quantity: 5, reservedQty: 0, minStock: 2, reorderLevel: 5 }));
      const critical = service.mapStockRow(stockRow({ quantity: 2, reservedQty: 0, minStock: 2, reorderLevel: 5 }));
      expect(healthy.stockLevel).toBe("healthy");
      expect(low.stockLevel).toBe("low");
      expect(critical.stockLevel).toBe("critical");
      expect(healthy.quantity).toBe(20);
    });

    it("adjusts stock and rejects negative resulting quantity", async () => {
      stock.findByProductWarehouse.mockResolvedValue(stockRow({ quantity: 3 }));
      await expect(
        service.adjustStock(
          tenantOwner(),
          { productId: IDS.product, warehouseId: IDS.warehouse, delta: -10 },
          META,
        ),
      ).rejects.toThrow(BadRequestException);

      stock.update.mockResolvedValue(stockRow({ quantity: 5, reservedQty: 0 }));
      stock.findByProductWarehouse.mockResolvedValue(stockRow({ quantity: 3 }));
      const updated = await service.adjustStock(
        tenantOwner(),
        { productId: IDS.product, warehouseId: IDS.warehouse, delta: 2 },
        META,
      );
      expect(stock.update).toHaveBeenCalledWith(IDS.stock, { quantity: 5 });
      expect(updated?.stockLevel).toBeDefined();
    });

    it("rejects transfer to the same warehouse", async () => {
      await expect(
        service.transferStock(
          tenantOwner(),
          {
            productId: IDS.product,
            fromWarehouseId: IDS.warehouse,
            toWarehouseId: IDS.warehouse,
            quantity: 1,
          },
          META,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
