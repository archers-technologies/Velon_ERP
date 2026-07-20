/** Flat nav labels for workspace sidebar — used in tests to prevent duplicate entries. */
export const WORKSPACE_SIDEBAR_LABELS = [
  'Dashboard',
  'Sales',
  'Purchases',
  'Inventory',
  'Customers',
  'Vendors',
  'Accounting',
  'HR & Payroll',
  'Reports',
  'Settings',
] as const;

export function workspaceNavHasDuplicateCrm(labels: readonly string[]): boolean {
  const salesLike = labels.filter((l) => l === 'CRM' || l === 'Sales CRM' || l === 'Sales');
  return salesLike.length > 1;
}

export function normalizeWorkspacePath(pathname: string): string {
  if (pathname !== '/' && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isWorkspaceNavItemActive(pathname: string, to: string, label: string): boolean {
  const path = normalizeWorkspacePath(pathname);

  if (to === '/app') {
    return path === '/app';
  }

  if (label === 'Sales') {
    return path.startsWith('/app/sales-crm') || path.startsWith('/app/crm');
  }

  if (label === 'Customers') {
    return path.startsWith('/app/customers');
  }

  if (label === 'Purchases') {
    return path === '/app/procurement' || path.startsWith('/app/procurement/');
  }

  if (label === 'Vendors') {
    return path === '/app/suppliers' || path.startsWith('/app/suppliers/');
  }

  if (label === 'HR & Payroll') {
    return path === '/app/hr' || path.startsWith('/app/hr/');
  }

  if (label === 'Settings') {
    if (path === '/app/settings/billing' || path.startsWith('/app/settings/billing/')) {
      return false;
    }
    if (path === '/app/hr' || path.startsWith('/app/hr/')) {
      return false;
    }
    return (
      path === '/app/settings' || path === '/app/settings/' || path.startsWith('/app/settings/')
    );
  }

  return path === to || path.startsWith(`${to}/`);
}

export type DashboardErrorKind = 'api_config' | 'auth' | 'connection' | 'unknown';

export function classifyDashboardLoaderError(message: string): DashboardErrorKind {
  const m = message.toLowerCase();
  if (m.includes('vite_api_url') || m.includes('api url is not configured')) {
    return 'api_config';
  }
  if (
    m.includes('unauthorized') ||
    m.includes('401') ||
    m.includes('session expired') ||
    m.includes('sign in')
  ) {
    return 'auth';
  }
  if (
    m.includes('failed to fetch') ||
    m.includes('network') ||
    m.includes('cannot reach the api') ||
    m.includes('connection')
  ) {
    return 'connection';
  }
  return 'unknown';
}
