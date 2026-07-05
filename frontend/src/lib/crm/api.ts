import { apiFetch } from '@/lib/api/client';

export type CrmCustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
export type CrmActivityType = 'CALL' | 'MEETING' | 'EMAIL' | 'VISIT' | 'TASK' | 'FOLLOW_UP';
export type CrmActivityStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';
export type CrmNoteTargetType = 'CUSTOMER' | 'CONTACT';

export type CrmCustomer = {
  id: string;
  tenantId: string;
  customerCode: string;
  companyName: string;
  legalName: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  status: CrmCustomerStatus;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmContact = {
  id: string;
  tenantId: string;
  customerId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  department: string | null;
  notes: string | null;
  archivedAt: string | null;
  customer?: { id: string; companyName: string; customerCode?: string };
  createdAt: string;
  updatedAt: string;
};

export type CrmNote = {
  id: string;
  tenantId: string;
  targetType: CrmNoteTargetType;
  targetId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; email: string };
};

export type CrmActivity = {
  id: string;
  tenantId: string;
  customerId: string;
  contactId: string | null;
  type: CrmActivityType;
  title: string;
  description: string | null;
  activityDate: string;
  ownerId: string;
  status: CrmActivityStatus;
  customer?: { id: string; companyName: string };
  contact?: { id: string; firstName: string; lastName: string } | null;
  owner?: { id: string; name: string | null; email: string };
  createdAt: string;
};

function q(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function loadCrmCustomers(search?: string, includeArchived?: boolean) {
  return apiFetch<CrmCustomer[]>(
    `/crm/customers${q({ search, includeArchived: includeArchived ? 'true' : undefined })}`,
  );
}

export async function createCrmCustomer(data: Partial<CrmCustomer> & { companyName: string }) {
  return apiFetch<CrmCustomer>('/crm/customers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCrmCustomer(id: string, data: Partial<CrmCustomer>) {
  return apiFetch<CrmCustomer>(`/crm/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function archiveCrmCustomer(id: string) {
  return apiFetch(`/crm/customers/${id}/archive`, { method: 'POST' });
}

export async function restoreCrmCustomer(id: string) {
  return apiFetch(`/crm/customers/${id}/restore`, { method: 'POST' });
}

export async function deleteCrmCustomer(id: string) {
  return apiFetch(`/crm/customers/${id}`, { method: 'DELETE' });
}

export async function loadCrmContacts(search?: string, customerId?: string) {
  return apiFetch<CrmContact[]>(`/crm/contacts${q({ search, customerId })}`);
}

export async function createCrmContact(data: {
  customerId: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
}) {
  return apiFetch<CrmContact>('/crm/contacts', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCrmContact(id: string, data: Partial<CrmContact>) {
  return apiFetch<CrmContact>(`/crm/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function archiveCrmContact(id: string) {
  return apiFetch(`/crm/contacts/${id}/archive`, { method: 'POST' });
}

export async function loadCrmNotes(targetType?: CrmNoteTargetType, targetId?: string) {
  return apiFetch<CrmNote[]>(`/crm/notes${q({ targetType, targetId })}`);
}

export async function createCrmNote(data: {
  targetType: CrmNoteTargetType;
  targetId: string;
  content: string;
}) {
  return apiFetch<CrmNote>('/crm/notes', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteCrmNote(id: string) {
  return apiFetch(`/crm/notes/${id}`, { method: 'DELETE' });
}

export async function loadCrmActivities(filters?: {
  customerId?: string;
  status?: CrmActivityStatus;
  type?: CrmActivityType;
}) {
  return apiFetch<CrmActivity[]>(
    `/crm/activities${q({
      customerId: filters?.customerId,
      status: filters?.status,
      type: filters?.type,
    })}`,
  );
}

export async function createCrmActivity(data: {
  customerId: string;
  type: CrmActivityType;
  title: string;
  activityDate: string;
  description?: string;
  contactId?: string;
}) {
  return apiFetch<CrmActivity>('/crm/activities', { method: 'POST', body: JSON.stringify(data) });
}

export async function completeCrmActivity(id: string) {
  return apiFetch<CrmActivity>(`/crm/activities/${id}/complete`, { method: 'POST' });
}

export async function cancelCrmActivity(id: string) {
  return apiFetch<CrmActivity>(`/crm/activities/${id}/cancel`, { method: 'POST' });
}
