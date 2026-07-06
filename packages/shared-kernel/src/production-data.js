'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.productionTenantWhere = productionTenantWhere;
exports.productionPlatformUserWhere = productionPlatformUserWhere;
exports.isProductionTenant = isProductionTenant;
exports.isProductionPlatformUser = isProductionPlatformUser;
const seed_guards_1 = require('./seed-guards');
function productionTenantWhere() {
  return {
    deletedAt: null,
    OR: [{ seedSource: null }, { seedSource: { notIn: ['demo', 'e2e'] } }],
  };
}
function productionPlatformUserWhere() {
  return {
    OR: [{ seedSource: null }, { seedSource: { notIn: ['demo', 'e2e'] } }],
  };
}
function isProductionTenant(row) {
  if (row.deletedAt) return false;
  return !(0, seed_guards_1.isDemoSeedSource)(row.seedSource ?? null);
}
function isProductionPlatformUser(row) {
  return !(0, seed_guards_1.isDemoSeedSource)(row.seedSource ?? null);
}
//# sourceMappingURL=production-data.js.map
