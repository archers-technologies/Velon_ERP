import { normalizeVelonRole, VelonRole } from "./velon-role";

export function canReadInventory(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER ||
    r === VelonRole.TENANT_ADMIN ||
    r === VelonRole.DEPARTMENT_ADMIN ||
    r === VelonRole.USER
  );
}

/** Create / edit products, categories, warehouses, stock adjustments */
export function canManageInventory(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER ||
    r === VelonRole.TENANT_ADMIN ||
    r === VelonRole.DEPARTMENT_ADMIN
  );
}
