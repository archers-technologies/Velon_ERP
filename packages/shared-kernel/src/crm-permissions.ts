import { normalizeVelonRole, VelonRole } from './velon-role';

export function canReadCrm(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER ||
    r === VelonRole.TENANT_ADMIN ||
    r === VelonRole.DEPARTMENT_ADMIN ||
    r === VelonRole.USER
  );
}

/** Create / edit customers and contacts */
export function canWriteCrmRecords(role: string): boolean {
  const r = normalizeVelonRole(role);
  return (
    r === VelonRole.TENANT_OWNER || r === VelonRole.TENANT_ADMIN || r === VelonRole.DEPARTMENT_ADMIN
  );
}

/** Archive, restore, delete customers */
export function canManageCrmCustomers(role: string): boolean {
  const r = normalizeVelonRole(role);
  return r === VelonRole.TENANT_OWNER || r === VelonRole.TENANT_ADMIN;
}

export function canWriteCrmNotes(role: string): boolean {
  return canReadCrm(role);
}

export function canWriteCrmActivities(role: string): boolean {
  return canWriteCrmRecords(role);
}

export function canManageCrmActivities(role: string): boolean {
  return canWriteCrmRecords(role);
}
