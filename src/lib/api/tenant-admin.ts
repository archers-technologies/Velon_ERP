import { apiFetch, authFetch } from "@/lib/api/client";

export type TenantAdminOverview = {
  companyProfile: {
    legalName: string;
    email: string;
    phone: string;
    country: string;
    industry: string;
    address?: string | null;
    website?: string | null;
    taxId?: string | null;
    logoDataUrl?: string | null;
  } | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    countryCode: string;
    currency: string;
    currencySymbol: string | null;
    dateFormat: string;
    numberFormat: string;
    language: string;
    isActive: boolean;
  } | null;
  seats: {
    plan: string;
    limit: number | null;
    activeSeats: number;
    remaining: number | null;
    unlimited: boolean;
  };
  departmentCount: number;
  pendingInvitations: number;
  memberCount: number;
  auditLogs: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    at: string;
    actorEmail: string | null;
  }[];
};

export type TenantMember = {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  lastLoginAt: string | null;
  joinedAt: string;
};

export type TenantDepartment = {
  id: string;
  name: string;
  description: string | null;
  managerId: string | null;
  managerName: string | null;
  memberCount: number;
};

export type TenantInvitation = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  status: string;
  expiresAt: string;
  invitedBy: string;
};

export async function loadTenantAdminOverview() {
  return apiFetch<TenantAdminOverview>("/tenant-admin/overview");
}

export async function loadTenantMembers(search?: string) {
  const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiFetch<TenantMember[]>(`/tenant-admin/members${q}`);
}

export async function loadTenantDepartments() {
  return apiFetch<TenantDepartment[]>("/tenant-admin/departments");
}

export async function loadTenantInvitations() {
  return apiFetch<TenantInvitation[]>("/tenant-admin/invitations");
}

export async function loadTenantAuditLogs() {
  return apiFetch<TenantAdminOverview["auditLogs"]>("/tenant-admin/audit-logs");
}

export async function createTenantInvitation(body: {
  fullName: string;
  email: string;
  departmentId?: string;
  role: string;
}) {
  return apiFetch<{ id: string; devInviteUrl?: string }>("/tenant-admin/invitations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCompanyProfile(body: {
  legalName?: string;
  email?: string;
  phone?: string;
  country?: string;
  industry?: string;
  address?: string;
  website?: string;
  taxId?: string;
  logoDataUrl?: string;
}) {
  return apiFetch<TenantAdminOverview["companyProfile"]>("/tenant-admin/company-profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateWorkspaceSettings(body: {
  name?: string;
  timezone?: string;
  countryCode?: string;
  currency?: string;
  currencySymbol?: string;
  dateFormat?: string;
  numberFormat?: string;
  language?: string;
}) {
  return apiFetch<{
    id: string;
    name: string;
    slug: string;
    timezone: string;
    countryCode: string;
    currency: string;
    currencySymbol: string | null;
    dateFormat: string;
    numberFormat: string;
    language: string;
    isActive: boolean;
  }>(
    "/tenant-admin/workspace",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function updateTenantDepartment(
  id: string,
  body: { name?: string; description?: string; managerId?: string | null },
) {
  return apiFetch<TenantDepartment>(`/tenant-admin/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function assignMemberDepartment(memberId: string, departmentId: string | null) {
  return apiFetch(`/tenant-admin/members/${memberId}/department`, {
    method: "PATCH",
    body: JSON.stringify({ departmentId }),
  });
}

export async function deleteWorkspaceAccount(body: { password: string; confirmPhrase: string }) {
  return apiFetch<{ id: string; deleted: true }>("/tenant-admin/workspace", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export async function createTenantDepartment(body: {
  name: string;
  description?: string;
  managerId?: string;
}) {
  return apiFetch<TenantDepartment>("/tenant-admin/departments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteTenantDepartment(id: string) {
  return apiFetch(`/tenant-admin/departments/${id}`, { method: "DELETE" });
}

export async function updateMemberRole(id: string, role: string) {
  return apiFetch(`/tenant-admin/members/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function disableTenantMember(id: string) {
  return apiFetch(`/tenant-admin/members/${id}/disable`, { method: "POST" });
}

export async function enableTenantMember(id: string) {
  return apiFetch(`/tenant-admin/members/${id}/enable`, { method: "POST" });
}

export async function removeTenantMember(id: string) {
  return apiFetch(`/tenant-admin/members/${id}`, { method: "DELETE" });
}

export async function revokeTenantInvitation(id: string) {
  return apiFetch(`/tenant-admin/invitations/${id}/revoke`, { method: "POST" });
}

export async function resendTenantInvitation(id: string) {
  return apiFetch<{ devInviteUrl?: string }>(`/tenant-admin/invitations/${id}/resend`, {
    method: "POST",
  });
}

export async function previewInvitation(token: string) {
  return authFetch<{
    email: string;
    fullName: string;
    role: string;
    workspaceName: string;
    inviterName: string;
    expiresAt: string;
  }>(`/invitations/${encodeURIComponent(token)}`);
}

export async function acceptInvitation(token: string, password: string) {
  return authFetch<{
    accessToken: string;
    refreshToken: string;
    route: string;
    email: string;
    scope: string;
    tenantId: string;
    workspaceId: string;
  }>("/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
