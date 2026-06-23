import { apiFetch } from "@/lib/api/client";
import {
  createCrmActivity,
  createCrmCustomer,
  loadCrmCustomers,
  type CrmActivityType,
} from "@/lib/api/crm";
import {
  createCrmLead as createCrmLeadApi,
  updateCrmLead,
  type CrmLeadStatus,
} from "@/lib/api/crm-pipeline";
import {
  sendQuotation,
} from "@/lib/api/crm-quotation";
import { createInventoryProduct, updateInventoryStock } from "@/lib/api/inventory";
import { createSupplier as createSupplierApi, createSupplierThread } from "@/lib/api/procurement";
import type {
  CreateCustomerInput,
  CreateCrmLeadInput,
  CrmDealActivityKind,
  CrmQuoteStatus,
  CrmStage,
} from "@/lib/types/workspace-ui";

export async function markNotificationRead(id: string) {
  return apiFetch<{ ok: boolean }>(`/workspace/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead() {
  return apiFetch<{ ok: boolean }>("/workspace/notifications/read-all", { method: "POST" });
}

/** @deprecated Use markNotificationRead */
export async function dismissWorkspaceAlert(id: string) {
  return markNotificationRead(id);
}

type InventoryItemInput = {
  name: string;
  site: string;
  quantity?: number;
  sku?: string;
  safetyStock?: number;
  reorderPoint?: number;
  abcClass?: "A" | "B" | "C";
  velocity?: "fast" | "medium" | "slow";
  batchTracked?: boolean;
  variantParent?: string;
  unitPrice?: number;
};

function mapVelocity(v?: "fast" | "medium" | "slow") {
  if (!v) return undefined;
  return v.toUpperCase();
}

const CRM_STAGE_TO_LEAD_STATUS: Record<CrmStage, CrmLeadStatus> = {
  New: "NEW",
  Qualified: "QUALIFIED",
  Proposal: "CONTACTED",
  Won: "CONVERTED",
};

const DEAL_ACTIVITY_TO_CRM_TYPE: Record<CrmDealActivityKind, CrmActivityType> = {
  call: "CALL",
  email: "EMAIL",
  meeting: "MEETING",
  note: "TASK",
  task: "TASK",
};

export async function createInventoryItem(input: InventoryItemInput) {
  await createInventoryProduct({
    name: input.name,
    site: input.site,
    quantity: input.quantity ?? 0,
    sku: input.sku,
    safetyStock: input.safetyStock,
    reorderPoint: input.reorderPoint,
    abcClass: input.abcClass,
    velocity: mapVelocity(input.velocity),
    batchTracked: input.batchTracked,
    variantParent: input.variantParent,
    unitPrice: input.unitPrice,
  });
}

export async function updateInventoryItem(id: string, patch: InventoryItemInput) {
  await updateInventoryStock(id, {
    name: patch.name,
    site: patch.site,
    quantity: patch.quantity,
    safetyStock: patch.safetyStock,
    reorderPoint: patch.reorderPoint,
    abcClass: patch.abcClass,
    velocity: mapVelocity(patch.velocity),
    batchTracked: patch.batchTracked,
    variantParent: patch.variantParent,
    unitPrice: patch.unitPrice,
  });
}

type PosSaleInput = {
  lines: Array<{
    inventoryId?: string;
    name: string;
    qty: number;
    unitPrice: number;
  }>;
  kind: "paid" | "due";
  customerName?: string;
};

export async function commitPosSale(input: PosSaleInput): Promise<{
  invoiceId: string;
  total: number;
  inventoryRowsTouched: number;
}> {
  return apiFetch("/workspace/pos/sales", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createCustomer(input: CreateCustomerInput) {
  const customer = await createCrmCustomer({
    companyName: input.name,
    email: input.email || undefined,
    phone: input.phone || undefined,
    status: input.status === "active" ? "ACTIVE" : "PROSPECT",
  });
  return { id: customer.id, name: customer.companyName };
}

export async function logCustomerActivity(input: {
  customerId: string;
  type?: CrmActivityType;
  title: string;
  description?: string;
  activityDate?: string;
  contactId?: string;
}) {
  return createCrmActivity({
    customerId: input.customerId,
    type: input.type ?? "TASK",
    title: input.title,
    description: input.description,
    activityDate: input.activityDate ?? new Date().toISOString(),
    contactId: input.contactId,
  });
}

export async function createSupplier(input: {
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  legalName?: string;
}) {
  return createSupplierApi({
    name: input.name,
    email: input.email,
    phone: input.phone,
    country: input.country,
    legalName: input.legalName,
  });
}

export async function logSupplierThread(input: {
  supplierId: string;
  author: string;
  body: string;
}) {
  const row = await createSupplierThread(input.supplierId, {
    body: input.body,
    authorName: input.author,
  });
  return {
    id: row.id,
    supplierId: row.supplierId,
    at: row.createdAt,
    author: row.authorName,
    body: row.body,
  };
}

export async function createCrmLead(input: CreateCrmLeadInput) {
  const lead = await createCrmLeadApi({
    companyName: input.company,
    contactName: input.title,
    status: CRM_STAGE_TO_LEAD_STATUS[input.stage] ?? "NEW",
    notes: input.nextStep ? `${input.nextStep}${input.nextStepDue ? ` (due ${input.nextStepDue})` : ""}` : undefined,
  });
  return lead;
}

export async function updateCrmLeadStage(input: { leadId: string; stage: CrmStage }) {
  return updateCrmLead(input.leadId, {
    status: CRM_STAGE_TO_LEAD_STATUS[input.stage],
  });
}

export async function updateCrmLeadQuoteStatus(input: {
  quotationId: string;
  status: CrmQuoteStatus;
}) {
  const { quotationId, status } = input;
  if (status === "sent" || status === "viewed") {
    return sendQuotation(quotationId);
  }
  if (status === "draft") {
    return apiFetch(`/crm/quotations/${quotationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "DRAFT" }),
    });
  }
  throw new Error(`Quote status "${status}" must be updated via quotation approval endpoints.`);
}

export async function logCrmDealActivity(input: {
  leadId: string;
  customerId?: string;
  kind: CrmDealActivityKind;
  title: string;
  at?: string;
}) {
  if (input.customerId) {
    return createCrmActivity({
      customerId: input.customerId,
      type: DEAL_ACTIVITY_TO_CRM_TYPE[input.kind],
      title: input.title,
      activityDate: input.at ?? new Date().toISOString(),
      description: `Lead ${input.leadId}`,
    });
  }

  const leads = await apiFetch<Array<{ id: string; notes: string | null }>>("/crm/leads");
  const lead = leads.find((l) => l.id === input.leadId);
  const stamp = input.at ?? new Date().toISOString();
  const line = `[${stamp.slice(0, 10)}] ${input.title}`;
  const notes = lead?.notes ? `${lead.notes}\n${line}` : line;
  return updateCrmLead(input.leadId, { notes });
}

export async function getCustomers() {
  const customers = await loadCrmCustomers();
  return customers.map((c) => ({ id: c.id, name: c.companyName }));
}
