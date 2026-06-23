import { AsyncLocalStorage } from "node:async_hooks";

export type ActiveTenantContext = {
  tenantId: string;
  workspaceId: string;
  membershipId: string;
  userId: string;
};

export const tenantContextStorage = new AsyncLocalStorage<ActiveTenantContext>();

export function getActiveTenantContext(): ActiveTenantContext {
  const ctx = tenantContextStorage.getStore();
  if (!ctx) {
    throw new Error("Tenant context is not available on this request.");
  }
  return ctx;
}

export function runWithTenantContext<T>(ctx: ActiveTenantContext, fn: () => T): T {
  return tenantContextStorage.run(ctx, fn);
}
