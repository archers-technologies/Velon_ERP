/**
 * Every tenant-scoped Prisma query must include tenantId from the authenticated JWT.
 * Use this helper to enforce consistent filtering as ERP modules migrate to Postgres.
 */
export function withTenantScope<T extends Record<string, unknown>>(
  tenantId: string,
  where: T = {} as T,
): T & { tenantId: string } {
  return { ...where, tenantId };
}

export function assertTenantAccess(recordTenantId: string, requestTenantId: string): void {
  if (recordTenantId !== requestTenantId) {
    throw new Error("Cross-tenant access denied.");
  }
}
