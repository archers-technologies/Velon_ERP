import { apiFetch } from "@/lib/api/client";

export type Supplier = {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  crNumber: string | null;
  status: string;
  country: string | null;
  address: string | null;
};

export type PurchaseRequest = {
  id: string;
  requestNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    estimatedUnitPrice: number | null;
  }[];
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  supplier: { id: string; name: string; code: string };
  items: {
    id: string;
    description: string;
    quantity: number;
    receivedQty: number;
    unitPrice: number;
    lineTotal: number;
    productId: string | null;
  }[];
};

export async function listSuppliers(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<Supplier[]>(`/suppliers${q}`);
}

export async function createSupplier(body: Record<string, unknown>) {
  return apiFetch<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(body) });
}

export type SupplierThread = {
  id: string;
  supplierId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export async function listSupplierThreads(supplierId: string) {
  return apiFetch<SupplierThread[]>(`/suppliers/${supplierId}/threads`);
}

export async function createSupplierThread(
  supplierId: string,
  body: { body: string; authorName?: string },
) {
  return apiFetch<SupplierThread>(`/suppliers/${supplierId}/threads`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listPurchaseRequests() {
  return apiFetch<PurchaseRequest[]>("/procurement/requests");
}

export async function createPurchaseRequest(body: Record<string, unknown>) {
  return apiFetch<PurchaseRequest>("/procurement/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function submitPurchaseRequest(id: string) {
  return apiFetch<PurchaseRequest>(`/procurement/requests/${id}/submit`, { method: "POST" });
}

export async function approvePurchaseRequest(id: string) {
  return apiFetch<PurchaseRequest>(`/procurement/requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listPurchaseOrders() {
  return apiFetch<PurchaseOrder[]>("/procurement/orders");
}

export async function createPurchaseOrder(body: Record<string, unknown>) {
  return apiFetch<PurchaseOrder>("/procurement/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function approvePurchaseOrder(id: string) {
  return apiFetch<PurchaseOrder>(`/procurement/orders/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function receivePurchaseOrder(
  id: string,
  body: { warehouseId: string; lines: { orderItemId: string; quantity: number }[] },
) {
  return apiFetch<PurchaseOrder>(`/procurement/orders/${id}/receive`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
