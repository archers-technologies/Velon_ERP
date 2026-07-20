import { apiFetch } from '@/lib/api/client';
import { API_V1_BASE } from '@/lib/api/config';
import { getAccessToken } from '@/lib/auth/session';
import type { DocumentBody } from '@/lib/crm/document-types';

export type CrmQuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type CrmQuotation = {
  id: string;
  tenantId: string;
  quotationNumber: string;
  opportunityId: string | null;
  customerId: string;
  issueDate: string;
  expiryDate: string | null;
  status: CrmQuotationStatus;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  notes: string | null;
  terms: string | null;
  scopeOfWork: string | null;
  deliverables: string | null;
  coverTitle?: string | null;
  executiveSummary?: string | null;
  timeline?: string | null;
  assumptions?: string | null;
  exclusions?: string | null;
  documentJson?: DocumentBody | Record<string, unknown> | null;
  currency?: string;
  revisionNumber: number;
  revisionReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; companyName: string; email: string | null };
  opportunity?: { id: string; title: string; opportunityCode: string } | null;
  items?: CrmQuotationItem[];
  _count?: { proposals: number; revisions: number };
};

export type CrmQuotationItem = {
  id: string;
  quotationId: string;
  itemName: string;
  description: string | null;
  quantity: string | number;
  unitPrice: string | number;
  discount: string | number;
  taxRate: string | number;
  lineTotal: string | number;
  position: number;
};

export type CrmQuotationMetrics = {
  totalQuotations: number;
  approvedQuotations: number;
  rejectedQuotations: number;
  expiredQuotations: number;
  pendingQuotations: number;
  conversionRate: number;
  quotationValue: number;
  wonRevenue: number;
};

export type CrmProposalTemplate = {
  id: string;
  name: string;
  description: string | null;
  coverTitle: string | null;
  scopeTemplate: string | null;
  deliverablesTemplate: string | null;
  termsTemplate: string | null;
  isDefault: boolean;
};

export type CrmProposalSummary = {
  id: string;
  version: number;
  generatedAt: string;
};

function q(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function loadQuotationMetrics() {
  return apiFetch<CrmQuotationMetrics>('/crm/quotation-metrics');
}

export function loadQuotations(filters?: {
  search?: string;
  status?: CrmQuotationStatus;
  customerId?: string;
  opportunityId?: string;
}) {
  return apiFetch<CrmQuotation[]>(
    `/crm/quotations${q({
      search: filters?.search,
      status: filters?.status,
      customerId: filters?.customerId,
      opportunityId: filters?.opportunityId,
    })}`,
  );
}

export function getQuotation(id: string) {
  return apiFetch<CrmQuotation>(`/crm/quotations/${id}`);
}

export function updateQuotation(
  id: string,
  data: {
    notes?: string;
    terms?: string;
    scopeOfWork?: string;
    deliverables?: string;
    coverTitle?: string;
    executiveSummary?: string;
    timeline?: string;
    assumptions?: string;
    exclusions?: string;
    documentJson?: DocumentBody;
  },
) {
  return apiFetch<CrmQuotation>(`/crm/quotations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function quotationPdfUrl(id: string) {
  return `${API_V1_BASE}/crm/quotations/${id}/pdf`;
}

export async function downloadQuotationPdf(id: string) {
  const token = getAccessToken();
  const res = await fetch(quotationPdfUrl(id), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to download quotation PDF');
  return res.blob();
}

export function createQuotation(data: {
  customerId: string;
  opportunityId?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  terms?: string;
  scopeOfWork?: string;
  deliverables?: string;
}) {
  return apiFetch<CrmQuotation>('/crm/quotations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createQuotationFromOpportunity(opportunityId: string) {
  return apiFetch<CrmQuotation>(`/crm/quotations/from-opportunity/${opportunityId}`, {
    method: 'POST',
  });
}

export function sendQuotation(id: string, comments?: string) {
  return apiFetch<CrmQuotation & { portalToken?: string }>(`/crm/quotations/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function approveQuotation(id: string, comments?: string) {
  return apiFetch<CrmQuotation>(`/crm/quotations/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function rejectQuotation(id: string, comments?: string) {
  return apiFetch<CrmQuotation>(`/crm/quotations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function cancelQuotation(id: string, comments?: string) {
  return apiFetch<CrmQuotation>(`/crm/quotations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function cloneQuotation(id: string) {
  return apiFetch<CrmQuotation>(`/crm/quotations/${id}/clone`, { method: 'POST' });
}

export function createQuotationRevision(id: string, revisionReason: string) {
  return apiFetch<CrmQuotation>(`/crm/quotations/${id}/revision`, {
    method: 'POST',
    body: JSON.stringify({ revisionReason }),
  });
}

export function addQuotationItem(
  quotationId: string,
  data: {
    itemName: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    taxRate?: number;
  },
) {
  return apiFetch<CrmQuotationItem>(`/crm/quotation-items${q({ quotationId })}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function removeQuotationItem(itemId: string) {
  return apiFetch(`/crm/quotation-items/${itemId}`, { method: 'DELETE' });
}

export function generateProposal(quotationId: string) {
  return apiFetch<CrmProposalSummary>(`/crm/proposals/generate/${quotationId}`, {
    method: 'POST',
  });
}

export function loadProposals(quotationId: string) {
  return apiFetch<CrmProposalSummary[]>(`/crm/proposals${q({ quotationId })}`);
}

export function proposalPdfUrl(proposalId: string) {
  return `${API_V1_BASE}/crm/proposals/${proposalId}/pdf`;
}

export function loadProposalTemplates() {
  return apiFetch<CrmProposalTemplate[]>('/crm/templates');
}

export function createProposalTemplate(data: {
  name: string;
  description?: string;
  coverTitle?: string;
  scopeTemplate?: string;
  deliverablesTemplate?: string;
  termsTemplate?: string;
}) {
  return apiFetch<CrmProposalTemplate>('/crm/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteProposalTemplate(id: string) {
  return apiFetch(`/crm/templates/${id}`, { method: 'DELETE' });
}

export function customerViewUrl(token: string) {
  return `${API_V1_BASE}/crm/customer-view/${token}`;
}

export function customerViewPdfUrl(token: string) {
  return `${API_V1_BASE}/crm/customer-view/${token}/pdf`;
}
