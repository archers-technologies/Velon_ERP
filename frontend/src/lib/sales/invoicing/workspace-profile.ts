import { apiFetch } from '@/lib/api/client';
import type { InvoiceCompanyProfile } from './types';

type WorkspaceContextResponse = {
  workspace: { name: string; currency: string };
  tenant: { name: string };
  companyProfile: {
    legalName: string;
    email: string;
    phone: string;
    address: string | null;
    taxId: string | null;
    logoDataUrl: string | null;
  } | null;
};

export async function loadInvoiceCompanyProfile(): Promise<InvoiceCompanyProfile> {
  const ctx = await apiFetch<WorkspaceContextResponse>('/workspace/context');
  const p = ctx.companyProfile;
  return {
    legalName: p?.legalName ?? ctx.tenant.name ?? ctx.workspace.name,
    email: p?.email ?? null,
    phone: p?.phone ?? null,
    address: p?.address ?? null,
    taxId: p?.taxId ?? null,
    logoDataUrl: p?.logoDataUrl ?? null,
  };
}
