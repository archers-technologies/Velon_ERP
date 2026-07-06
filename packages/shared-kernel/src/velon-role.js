'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.VelonRole = void 0;
exports.normalizeVelonRole = normalizeVelonRole;
var VelonRole;
(function (VelonRole) {
  VelonRole['SUPER_ADMIN'] = 'SUPER_ADMIN';
  VelonRole['PLATFORM_SUPPORT'] = 'PLATFORM_SUPPORT';
  VelonRole['TENANT_OWNER'] = 'TENANT_OWNER';
  VelonRole['TENANT_ADMIN'] = 'TENANT_ADMIN';
  VelonRole['DEPARTMENT_ADMIN'] = 'DEPARTMENT_ADMIN';
  VelonRole['USER'] = 'USER';
  VelonRole['TENANT_USER'] = 'TENANT_USER';
})(VelonRole || (exports.VelonRole = VelonRole = {}));
function normalizeVelonRole(role) {
  if (role === VelonRole.TENANT_ADMIN) return VelonRole.TENANT_OWNER;
  if (role === VelonRole.TENANT_USER) return VelonRole.USER;
  return role;
}
//# sourceMappingURL=velon-role.js.map
