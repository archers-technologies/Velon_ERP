"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminNavItemActive = isAdminNavItemActive;
const workspace_navigation_1 = require("./workspace-navigation");
function isAdminNavItemActive(pathname, to, label) {
    const path = (0, workspace_navigation_1.normalizeWorkspacePath)(pathname);
    if (label === 'Overview') {
        return path === '/admin' || path === '/admin/overview';
    }
    if (label === 'Alerts & Logs') {
        return path === '/admin/alerts-logs' || path === '/admin/alerts';
    }
    const routeMap = {
        Tenants: '/admin/tenants',
        Users: '/admin/users',
        Subscriptions: '/admin/subscriptions',
        Website: '/admin/website',
        Infrastructure: '/admin/infrastructure',
    };
    const exact = routeMap[label] ?? to;
    return path === exact;
}
//# sourceMappingURL=admin-navigation.js.map