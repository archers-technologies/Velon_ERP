import { normalizeVelonRole, VelonRole } from './velon-role';

export function canReadProcurement(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER ||
    r === VelonRole.TENANT_ADMIN ||
    r === VelonRole.DEPARTMENT_ADMIN ||
    r === VelonRole.USER
  );
}

/** Manage suppliers, purchase requests, and purchase orders */
export function canManageProcurement(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER || r === VelonRole.TENANT_ADMIN || r === VelonRole.DEPARTMENT_ADMIN
  );
}

/** Approve purchase requests and purchase orders */
export function canApproveProcurement(role: string): boolean {
  const r = normalizeVelonRole(role);
  return r === VelonRole.TENANT_OWNER || r === VelonRole.TENANT_ADMIN;
}
