export enum VelonRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  PLATFORM_SUPPORT = "PLATFORM_SUPPORT",
  TENANT_OWNER = "TENANT_OWNER",
  /** @deprecated Use TENANT_OWNER — kept for legacy JWT compatibility */
  TENANT_ADMIN = "TENANT_ADMIN",
  DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN",
  USER = "USER",
  /** @deprecated Use USER — kept for legacy JWT compatibility */
  TENANT_USER = "TENANT_USER",
}

/** Normalize legacy role strings to canonical Phase 2B roles. */
export function normalizeVelonRole(role: string): VelonRole {
  if (role === VelonRole.TENANT_ADMIN) return VelonRole.TENANT_OWNER;
  if (role === VelonRole.TENANT_USER) return VelonRole.USER;
  return role as VelonRole;
}
