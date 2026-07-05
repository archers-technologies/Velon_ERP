import { apiFetch } from "@/lib/api/client";

export type CrmLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "DISQUALIFIED"
  | "CONVERTED";
export type CrmLeadSource =
  | "MANUAL"
  | "WEBSITE"
  | "REFERRAL"
  | "EMAIL"
  | "TRADE_SHOW"
  | "IMPORT"
  | "OTHER";
export type CrmOpportunityStatus = "OPEN" | "WON" | "LOST";

export type CrmLead = {
  id: string;
  tenantId: string;
  leadCode: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  source: CrmLeadSource;
  industry: string | null;
  status: CrmLeadStatus;
  assignedToId: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; name: string | null; email: string };
  createdBy?: { id: string; name: string | null; email: string };
};

export type CrmPipelineStage = {
  id: string;
  tenantId: string;
  pipelineId: string;
  name: string;
  position: number;
  probability: number;
};

export type CrmPipeline = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: CrmPipelineStage[];
  _count?: { opportunities: number };
};

export type CrmOpportunity = {
  id: string;
  tenantId: string;
  opportunityCode: string;
  title: string;
  customerId: string | null;
  leadId: string | null;
  pipelineId: string;
  stageId: string;
  value: string | number;
  expectedCloseDate: string | null;
  probability: number;
  ownerId: string;
  description: string | null;
  status: CrmOpportunityStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; companyName: string } | null;
  lead?: { id: string; companyName: string; leadCode: string } | null;
  pipeline?: { id: string; name: string };
  stage?: { id: string; name: string; probability: number };
  owner?: { id: string; name: string | null; email: string };
};

export type CrmDashboardMetrics = {
  totalLeads: number;
  qualifiedLeads: number;
  openOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  pipelineValue: number;
  expectedRevenue: number;
};

function q(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function loadCrmDashboardMetrics() {
  return apiFetch<CrmDashboardMetrics>("/crm/dashboard-metrics");
}

export function loadCrmLeads(filters?: {
  search?: string;
  status?: CrmLeadStatus;
  source?: CrmLeadSource;
  assignedToId?: string;
}) {
  return apiFetch<CrmLead[]>(
    `/crm/leads${q({
      search: filters?.search,
      status: filters?.status,
      source: filters?.source,
      assignedToId: filters?.assignedToId,
    })}`,
  );
}

export function createCrmLead(data: {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  source?: CrmLeadSource;
  industry?: string;
  status?: CrmLeadStatus;
  assignedToId?: string;
  notes?: string;
}) {
  return apiFetch<CrmLead>("/crm/leads", { method: "POST", body: JSON.stringify(data) });
}

export function updateCrmLead(id: string, data: Partial<CrmLead>) {
  return apiFetch<CrmLead>(`/crm/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function assignCrmLead(id: string, assignedToId: string) {
  return apiFetch<CrmLead>(`/crm/leads/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ assignedToId }),
  });
}

export function convertCrmLead(
  id: string,
  data?: { title?: string; value?: number; expectedCloseDate?: string; pipelineId?: string },
) {
  return apiFetch<{ customer: { id: string }; opportunity: CrmOpportunity }>(
    `/crm/leads/${id}/convert`,
    { method: "POST", body: JSON.stringify(data ?? {}) },
  );
}

export function archiveCrmLead(id: string) {
  return apiFetch(`/crm/leads/${id}/archive`, { method: "POST" });
}

export function loadCrmPipelines() {
  return apiFetch<CrmPipeline[]>("/crm/pipelines");
}

export function createCrmPipeline(data: { name: string; description?: string; isDefault?: boolean }) {
  return apiFetch<CrmPipeline>("/crm/pipelines", { method: "POST", body: JSON.stringify(data) });
}

export function updateCrmPipeline(id: string, data: { name?: string; description?: string }) {
  return apiFetch<CrmPipeline>(`/crm/pipelines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function setDefaultCrmPipeline(id: string) {
  return apiFetch<CrmPipeline>(`/crm/pipelines/${id}/default`, { method: "POST" });
}

export function deleteCrmPipeline(id: string) {
  return apiFetch(`/crm/pipelines/${id}`, { method: "DELETE" });
}

export function loadCrmStages(pipelineId: string) {
  return apiFetch<CrmPipelineStage[]>(`/crm/stages${q({ pipelineId })}`);
}

export function createCrmStage(data: {
  pipelineId: string;
  name: string;
  position?: number;
  probability?: number;
}) {
  return apiFetch<CrmPipelineStage>("/crm/stages", { method: "POST", body: JSON.stringify(data) });
}

export function updateCrmStage(id: string, data: { name?: string; probability?: number }) {
  return apiFetch<CrmPipelineStage>(`/crm/stages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function reorderCrmStages(pipelineId: string, stageIds: string[]) {
  return apiFetch<CrmPipelineStage[]>("/crm/stages/reorder", {
    method: "POST",
    body: JSON.stringify({ pipelineId, stageIds }),
  });
}

export function deleteCrmStage(id: string) {
  return apiFetch(`/crm/stages/${id}`, { method: "DELETE" });
}

export function loadCrmOpportunities(filters?: {
  search?: string;
  pipelineId?: string;
  stageId?: string;
  status?: CrmOpportunityStatus;
  ownerId?: string;
}) {
  return apiFetch<CrmOpportunity[]>(
    `/crm/opportunities${q({
      search: filters?.search,
      pipelineId: filters?.pipelineId,
      stageId: filters?.stageId,
      status: filters?.status,
      ownerId: filters?.ownerId,
    })}`,
  );
}

export function createCrmOpportunity(data: {
  title: string;
  pipelineId: string;
  stageId: string;
  customerId?: string;
  leadId?: string;
  value?: number;
  expectedCloseDate?: string;
  probability?: number;
  ownerId?: string;
  description?: string;
}) {
  return apiFetch<CrmOpportunity>("/crm/opportunities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCrmOpportunity(id: string, data: Partial<CrmOpportunity>) {
  return apiFetch<CrmOpportunity>(`/crm/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function moveCrmOpportunityStage(id: string, stageId: string) {
  return apiFetch<CrmOpportunity>(`/crm/opportunities/${id}/move-stage`, {
    method: "POST",
    body: JSON.stringify({ stageId }),
  });
}

export function closeCrmOpportunityWon(id: string) {
  return apiFetch<CrmOpportunity>(`/crm/opportunities/${id}/won`, { method: "POST" });
}

export function closeCrmOpportunityLost(id: string) {
  return apiFetch<CrmOpportunity>(`/crm/opportunities/${id}/lost`, { method: "POST" });
}

export function archiveCrmOpportunity(id: string) {
  return apiFetch(`/crm/opportunities/${id}/archive`, { method: "POST" });
}
