"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SETTINGS_PATHS = exports.WORKSPACE_ADMIN_SECTIONS = exports.SETTINGS_USER_TABS = void 0;
exports.parseSettingsUserTab = parseSettingsUserTab;
exports.parseWorkspaceAdminSection = parseWorkspaceAdminSection;
exports.workspaceAdminSearch = workspaceAdminSearch;
exports.settingsBillingSearch = settingsBillingSearch;
exports.canManageWorkspaceSettings = canManageWorkspaceSettings;
exports.canManageWorkspaceBilling = canManageWorkspaceBilling;
exports.SETTINGS_USER_TABS = [
    'general',
    'regional',
    'printers',
    'profile',
    'security',
];
exports.WORKSPACE_ADMIN_SECTIONS = [
    'company',
    'workspace',
    'users',
    'departments',
    'seats',
    'invitations',
    'security',
    'audit',
];
exports.SETTINGS_PATHS = {
    user: '/app/settings',
    billing: '/app/settings/billing',
    admin: '/app/settings/admin',
    billingPos: '/app/billing-pos',
};
function parseSettingsUserTab(value) {
    if (typeof value === 'string' && exports.SETTINGS_USER_TABS.includes(value)) {
        return value;
    }
    return 'general';
}
function parseWorkspaceAdminSection(value) {
    if (typeof value === 'string' &&
        exports.WORKSPACE_ADMIN_SECTIONS.includes(value)) {
        return value;
    }
    return 'users';
}
function workspaceAdminSearch(section = 'users') {
    return { tab: 'general', section };
}
function settingsBillingSearch() {
    return { tab: 'general' };
}
function canManageWorkspaceSettings(role) {
    return role === 'TENANT_OWNER' || role === 'TENANT_ADMIN';
}
function canManageWorkspaceBilling(role) {
    return role === 'TENANT_OWNER' || role === 'TENANT_ADMIN';
}
//# sourceMappingURL=settings-routes.js.map