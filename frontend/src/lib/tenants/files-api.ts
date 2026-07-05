import { apiFetch } from '@/lib/api/client';

export type TenantFileRecord = {
  id: string;
  tenantId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export async function listTenantFiles() {
  return apiFetch<TenantFileRecord[]>('/tenant-resources/files');
}

export async function registerTenantFile(input: {
  name: string;
  mimeType?: string;
  sizeBytes?: number;
}) {
  return apiFetch<TenantFileRecord>('/tenant-resources/files', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
