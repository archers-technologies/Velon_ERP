"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WORKSPACE_PUBLIC_DOMAIN = void 0;
exports.resolveWorkspacePublicDomain = resolveWorkspacePublicDomain;
exports.tenantWorkspaceHost = tenantWorkspaceHost;
exports.DEFAULT_WORKSPACE_PUBLIC_DOMAIN = 'app.velonerp.com';
const WORKSPACE_DOMAIN_ENV_KEYS = [
    'APP_PUBLIC_WORKSPACE_DOMAIN',
    'NEXT_PUBLIC_WORKSPACE_DOMAIN',
    'PUBLIC_WORKSPACE_DOMAIN',
    'VITE_PUBLIC_WORKSPACE_DOMAIN',
];
function resolveWorkspacePublicDomain(env = typeof process !== 'undefined'
    ? process.env
    : {}) {
    for (const key of WORKSPACE_DOMAIN_ENV_KEYS) {
        const value = env[key]?.trim();
        if (value) {
            return value.replace(/^\.+/, '').replace(/\/+$/, '');
        }
    }
    return exports.DEFAULT_WORKSPACE_PUBLIC_DOMAIN;
}
function normalizeTenantSlug(slug) {
    const clean = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'workspace';
    return clean;
}
function tenantWorkspaceHost(slug, domain = resolveWorkspacePublicDomain()) {
    const parent = domain.trim().replace(/^\.+/, '').replace(/\/+$/, '');
    return `${normalizeTenantSlug(slug)}.${parent}`;
}
//# sourceMappingURL=workspace-host.js.map