"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReadSales = canReadSales;
exports.canWriteSales = canWriteSales;
const velon_role_1 = require("./velon-role");
function canReadSales(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER ||
        r === velon_role_1.VelonRole.TENANT_ADMIN ||
        r === velon_role_1.VelonRole.DEPARTMENT_ADMIN ||
        r === velon_role_1.VelonRole.USER ||
        r === velon_role_1.VelonRole.TENANT_USER);
}
function canWriteSales(role) {
    const r = (0, velon_role_1.normalizeVelonRole)(role);
    return (r === velon_role_1.VelonRole.TENANT_OWNER || r === velon_role_1.VelonRole.TENANT_ADMIN || r === velon_role_1.VelonRole.DEPARTMENT_ADMIN);
}
//# sourceMappingURL=sales-permissions.js.map