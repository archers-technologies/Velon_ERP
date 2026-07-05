import { VelonRole } from "@velon/shared";
import type { AuthenticatedUser } from "../../src/auth/auth.types";

/** Stable test IDs — used only in unit tests, never in runtime or the database. */
export const IDS = {
  tenant: "tenant-test-001",
  workspace: "workspace-test-001",
  membership: "membership-test-001",
  user: "user-test-001",
  owner: "user-owner-001",
  product: "product-test-001",
  warehouse: "warehouse-test-001",
  warehouseB: "warehouse-test-002",
  stock: "stock-test-001",
  category: "category-test-001",
  customer: "customer-test-001",
  lead: "lead-test-001",
  opportunity: "opportunity-test-001",
  pipeline: "pipeline-test-001",
  stage: "stage-test-001",
  quotation: "quotation-test-001",
  supplier: "supplier-test-001",
  salesOrder: "sales-order-test-001",
  purchaseRequest: "pr-test-001",
  purchaseOrder: "po-test-001",
} as const;

export function tenantOwner(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: IDS.owner,
    email: "owner@example.test",
    scope: "tenant",
    role: VelonRole.TENANT_OWNER,
    tenantId: IDS.tenant,
    workspaceId: IDS.workspace,
    membershipId: IDS.membership,
    ...overrides,
  };
}

export function tenantUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: IDS.user,
    email: "user@example.test",
    scope: "tenant",
    role: VelonRole.USER,
    tenantId: IDS.tenant,
    workspaceId: IDS.workspace,
    membershipId: IDS.membership,
    ...overrides,
  };
}

export function platformAdmin(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "platform-admin-001",
    email: "admin@velon.test",
    scope: "platform",
    role: VelonRole.SUPER_ADMIN,
    ...overrides,
  };
}

export const META = { ip: "127.0.0.1", ua: "jest-unit" };
