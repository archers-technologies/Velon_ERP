import { isDemoSeedSource } from "./seed-guards";

/** Prisma-compatible filter: production tenants visible in Super Admin. */
export function productionTenantWhere() {
  return {
    deletedAt: null,
    OR: [{ seedSource: null }, { seedSource: { notIn: ["demo", "e2e"] } }],
  };
}

/** Prisma-compatible filter: real platform staff (excludes seedSource demo/e2e only). */
export function productionPlatformUserWhere() {
  return {
    OR: [{ seedSource: null }, { seedSource: { notIn: ["demo", "e2e"] } }],
  };
}

/** Demo/test detection uses seedSource only — never hostname or Trial status. */
export function isProductionTenant(row: {
  seedSource?: string | null;
  deletedAt?: Date | null;
}): boolean {
  if (row.deletedAt) return false;
  return !isDemoSeedSource(row.seedSource ?? null);
}

export function isProductionPlatformUser(row: { seedSource?: string | null }): boolean {
  return !isDemoSeedSource(row.seedSource ?? null);
}
