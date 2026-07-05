export const SETTINGS_USER_TABS = [
  'general',
  'regional',
  'printers',
  'profile',
  'security',
] as const;

export type SettingsUserTab = (typeof SETTINGS_USER_TABS)[number];

export const WORKSPACE_ADMIN_SECTIONS = [
  'company',
  'workspace',
  'users',
  'departments',
  'seats',
  'invitations',
  'security',
  'audit',
] as const;

export type WorkspaceAdminSection = (typeof WORKSPACE_ADMIN_SECTIONS)[number];

export const SETTINGS_PATHS = {
  user: '/app/settings',
  billing: '/app/settings/billing',
  admin: '/app/settings/admin',
  billingPos: '/app/billing-pos',
} as const;

export function parseSettingsUserTab(value: unknown): SettingsUserTab {
  if (typeof value === 'string' && SETTINGS_USER_TABS.includes(value as SettingsUserTab)) {
    return value as SettingsUserTab;
  }
  return 'general';
}

export function parseWorkspaceAdminSection(value: unknown): WorkspaceAdminSection {
  if (
    typeof value === 'string' &&
    WORKSPACE_ADMIN_SECTIONS.includes(value as WorkspaceAdminSection)
  ) {
    return value as WorkspaceAdminSection;
  }
  return 'users';
}

export function workspaceAdminSearch(section: WorkspaceAdminSection = 'users') {
  return { tab: 'general' as SettingsUserTab, section };
}

export function settingsBillingSearch() {
  return { tab: 'general' as SettingsUserTab };
}

export function canManageWorkspaceSettings(role: string): boolean {
  return role === 'TENANT_OWNER' || role === 'TENANT_ADMIN';
}

export function canManageWorkspaceBilling(role: string): boolean {
  return role === 'TENANT_OWNER' || role === 'TENANT_ADMIN';
}
