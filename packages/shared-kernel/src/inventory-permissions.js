"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReadInventory = canReadInventory;
exports.canManageInventory = canManageInventory;
const velon_role_1 = require("./velon-role");
function canReadInventory(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER ||
        r === velon_role_1.VelonRole.TENANT_ADMIN ||
        r === velon_role_1.VelonRole.DEPARTMENT_ADMIN ||
        r === velon_role_1.VelonRole.USER);
}
function canManageInventory(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER || r === velon_role_1.VelonRole.TENANT_ADMIN || r === velon_role_1.VelonRole.DEPARTMENT_ADMIN);
}
//# sourceMappingURL=inventory-permissions.js.map