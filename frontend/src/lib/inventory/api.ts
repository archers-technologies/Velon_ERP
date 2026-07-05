import { apiFetch } from "@/lib/api/client";

export type InventoryCategory = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
};

export type InventoryProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  status: string;
  uom: string;
  unitPrice: number;
  abcClass: string;
  velocity: string;
  batchTracked: boolean;
  barcode: string | null;
  imageDataUrl: string | null;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
};

export type InventoryWarehouse = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  managerName: string | null;
  isActive: boolean;
};

export type InventoryStockRow = {
  id: string;
  sku: string;
  name: string;
  site: string;
  quantity: number;
  stockLevel: "healthy" | "low" | "critical";
  safetyStock: number;
  reorderPoint: number;
  abcClass: "A" | "B" | "C";
  velocity: "fast" | "medium" | "slow";
  batchTracked: boolean;
  variantParent?: string;
  unitPrice: number;
};

function mapProduct(row: Record<string, unknown>): InventoryProduct {
  const price = row.unitPrice;
  const unitPrice =
    price && typeof price === "object" && "toNumber" in price
      ? (price as { toNumber(): number }).toNumber()
      : Number(price ?? 0);
  return { ...row, unitPrice } as InventoryProduct;
}

export async function listInventoryCategories() {
  return apiFetch<InventoryCategory[]>("/inventory/categories");
}

export async function createInventoryCategory(body: {
  name: string;
  description?: string;
  parentId?: string;
}) {
  return apiFetch<InventoryCategory>("/inventory/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateInventoryCategory(
  id: string,
  body: { name?: string; description?: string; parentId?: string },
) {
  return apiFetch<InventoryCategory>(`/inventory/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteInventoryCategory(id: string) {
  return apiFetch<{ ok: boolean }>(`/inventory/categories/${id}`, { method: "DELETE" });
}

export async function listInventoryStock() {
  return apiFetch<InventoryStockRow[]>("/inventory/stock");
}

export async function listInventoryProducts(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const rows = await apiFetch<Record<string, unknown>[]>(`/inventory/products${q}`);
  return rows.map(mapProduct);
}

export async function getInventoryProduct(id: string) {
  const row = await apiFetch<Record<string, unknown>>(`/inventory/products/${id}`);
  return mapProduct(row);
}

export async function listInventoryWarehouses() {
  return apiFetch<InventoryWarehouse[]>("/inventory/warehouses");
}

export async function createInventoryProduct(body: Record<string, unknown>) {
  const row = await apiFetch<Record<string, unknown>>("/inventory/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapProduct(row);
}

export async function updateInventoryProduct(id: string, body: Record<string, unknown>) {
  const row = await apiFetch<Record<string, unknown>>(`/inventory/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return mapProduct(row);
}

export async function createInventoryWarehouse(body: {
  name: string;
  code?: string;
  location?: string;
  phone?: string;
  email?: string;
  managerName?: string;
}) {
  return apiFetch<InventoryWarehouse>("/inventory/warehouses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateInventoryWarehouse(
  id: string,
  body: {
    name?: string;
    code?: string;
    location?: string;
    phone?: string;
    email?: string;
    managerName?: string;
    isActive?: boolean;
  },
) {
  return apiFetch<InventoryWarehouse>(`/inventory/warehouses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateInventoryStock(id: string, body: Record<string, unknown>) {
  return apiFetch<InventoryStockRow>(`/inventory/stock/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
