"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKSPACE_SIDEBAR_LABELS = void 0;
exports.workspaceNavHasDuplicateCrm = workspaceNavHasDuplicateCrm;
exports.normalizeWorkspacePath = normalizeWorkspacePath;
exports.isWorkspaceNavItemActive = isWorkspaceNavItemActive;
exports.classifyDashboardLoaderError = classifyDashboardLoaderError;
exports.WORKSPACE_SIDEBAR_LABELS = [
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
];
function workspaceNavHasDuplicateCrm(labels) {
    const salesLike = labels.filter((l) => l === 'CRM' || l === 'Sales CRM' || l === 'Sales');
    return salesLike.length > 1;
}
function normalizeWorkspacePath(pathname) {
    if (pathname !== '/' && pathname.endsWith('/')) {
        return pathname.slice(0, -1);
    }
    return pathname;
}
function isWorkspaceNavItemActive(pathname, to, label) {
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
        return path === '/app/hr-payroll' || path.startsWith('/app/hr-payroll/');
    }
    if (label === 'Settings') {
        if (path === '/app/settings/billing' || path.startsWith('/app/settings/billing/')) {
            return false;
        }
        if (path === '/app/hr-payroll' || path.startsWith('/app/hr-payroll/')) {
            return false;
        }
        return (path === '/app/settings' || path === '/app/settings/' || path.startsWith('/app/settings/'));
    }
    return path === to || path.startsWith(`${to}/`);
}
function classifyDashboardLoaderError(message) {
    const m = message.toLowerCase();
    if (m.includes('vite_api_url') || m.includes('api url is not configured')) {
        return 'api_config';
    }
    if (m.includes('unauthorized') ||
        m.includes('401') ||
        m.includes('session expired') ||
        m.includes('sign in')) {
        return 'auth';
    }
    if (m.includes('failed to fetch') ||
        m.includes('network') ||
        m.includes('cannot reach the api') ||
        m.includes('connection')) {
        return 'connection';
    }
    return 'unknown';
}
//# sourceMappingURL=workspace-navigation.js.map