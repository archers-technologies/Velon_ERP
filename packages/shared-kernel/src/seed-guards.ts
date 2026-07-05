/** Values stored in `User.seedSource` / `Tenant.seedSource` for non-production rows. */
export const DEMO_SEED_SOURCES = ['demo', 'e2e', 'seed'] as const;
export type DemoSeedSource = (typeof DEMO_SEED_SOURCES)[number];

export function isDemoSeedSource(value: string | null | undefined): boolean {
  if (!value) return false;
  return (DEMO_SEED_SOURCES as readonly string[]).includes(value);
}

/** Whether optional demo tenants may be created by `db:seed`. */
export function canSeedDemoTenants(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') return false;
  if (env.NODE_ENV === 'test') return true;
  if (env.NODE_ENV === 'development' && env.SEED_DEMO_DATA === 'true') return true;
  if (env.VELON_SEED_DEMO_TENANTS === 'true' && env.NODE_ENV !== 'production') {
    return env.SEED_DEMO_DATA !== 'false';
  }
  return false;
}

/** Heuristic for legacy rows created by e2e before seedSource existed. */
export function inferDemoSeedSourceFromEmail(email: string): DemoSeedSource | null {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith('@platform.test')) return 'e2e';
  if (normalized.endsWith('@demo-retail.local')) return 'demo';
  return null;
}

/** Heuristic for legacy tenant names from automated tests. */
export function inferDemoSeedSourceFromTenantName(name: string): DemoSeedSource | null {
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
