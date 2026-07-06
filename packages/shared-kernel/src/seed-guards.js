'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DEMO_SEED_SOURCES = void 0;
exports.isDemoSeedSource = isDemoSeedSource;
exports.canSeedDemoTenants = canSeedDemoTenants;
exports.inferDemoSeedSourceFromEmail = inferDemoSeedSourceFromEmail;
exports.inferDemoSeedSourceFromTenantName = inferDemoSeedSourceFromTenantName;
exports.DEMO_SEED_SOURCES = ['demo', 'e2e', 'seed'];
function isDemoSeedSource(value) {
  if (!value) return false;
  return exports.DEMO_SEED_SOURCES.includes(value);
}
function canSeedDemoTenants(env = process.env) {
  if (env.NODE_ENV === 'production') return false;
  if (env.NODE_ENV === 'test') return true;
  if (env.NODE_ENV === 'development' && env.SEED_DEMO_DATA === 'true') return true;
  if (env.VELON_SEED_DEMO_TENANTS === 'true' && env.NODE_ENV !== 'production') {
    return env.SEED_DEMO_DATA !== 'false';
  }
  return false;
}
function inferDemoSeedSourceFromEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith('@platform.test')) return 'e2e';
  if (normalized.endsWith('@demo-retail.local')) return 'demo';
  return null;
}
function inferDemoSeedSourceFromTenantName(name) {
  const n = name.trim();
  if (/^Demo Retail Co\.?$/i.test(n)) return 'demo';
  if (
    /^(Release Flow Corp|Reactivation Co|Isolation Corp|CRM Corp|Perm Matrix Corp|Billing Corp|Submit Corp|Audit Co|Admin Corp|Quote Corp|Sales Corp)\b/i.test(
      n,
    )
  ) {
    return 'e2e';
  }
  if (/\b(Corp A|Corp B)\b/.test(n) && /\d{10,}/.test(n)) return 'e2e';
  return null;
}
//# sourceMappingURL=seed-guards.js.map
