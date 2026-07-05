import { normalizeVelonRole, VelonRole } from './velon-role';

export function canReadSales(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER ||
    r === VelonRole.TENANT_ADMIN ||
    r === VelonRole.DEPARTMENT_ADMIN ||
    r === VelonRole.USER ||
    r === VelonRole.TENANT_USER
  );
}

export function canWriteSales(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER || r === VelonRole.TENANT_ADMIN || r === VelonRole.DEPARTMENT_ADMIN
  );
}
