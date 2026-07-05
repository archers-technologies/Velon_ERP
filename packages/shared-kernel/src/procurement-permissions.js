"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReadProcurement = canReadProcurement;
exports.canManageProcurement = canManageProcurement;
exports.canApproveProcurement = canApproveProcurement;
const velon_role_1 = require("./velon-role");
function canReadProcurement(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER ||
        r === velon_role_1.VelonRole.TENANT_ADMIN ||
        r === velon_role_1.VelonRole.DEPARTMENT_ADMIN ||
        r === velon_role_1.VelonRole.USER);
}
function canManageProcurement(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER || r === velon_role_1.VelonRole.TENANT_ADMIN || r === velon_role_1.VelonRole.DEPARTMENT_ADMIN);
}
function canApproveProcurement(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return r === velon_role_1.VelonRole.TENANT_OWNER || r === velon_role_1.VelonRole.TENANT_ADMIN;
}
//# sourceMappingURL=procurement-permissions.js.map