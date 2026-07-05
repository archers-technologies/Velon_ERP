"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReadCrm = canReadCrm;
exports.canWriteCrmRecords = canWriteCrmRecords;
exports.canManageCrmCustomers = canManageCrmCustomers;
exports.canWriteCrmNotes = canWriteCrmNotes;
exports.canWriteCrmActivities = canWriteCrmActivities;
exports.canManageCrmActivities = canManageCrmActivities;
const velon_role_1 = require("./velon-role");
function canReadCrm(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER ||
        r === velon_role_1.VelonRole.TENANT_ADMIN ||
        r === velon_role_1.VelonRole.DEPARTMENT_ADMIN ||
        r === velon_role_1.VelonRole.USER);
}
function canWriteCrmRecords(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER || r === velon_role_1.VelonRole.TENANT_ADMIN || r === velon_role_1.VelonRole.DEPARTMENT_ADMIN);
}
function canManageCrmCustomers(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return r === velon_role_1.VelonRole.TENANT_OWNER || r === velon_role_1.VelonRole.TENANT_ADMIN;
}
function canWriteCrmNotes(role) {
    return canReadCrm(role);
}
function canWriteCrmActivities(role) {
    return canWriteCrmRecords(role);
}
function canManageCrmActivities(role) {
    return canWriteCrmRecords(role);
}
//# sourceMappingURL=crm-permissions.js.map