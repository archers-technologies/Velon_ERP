export declare enum VelonRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_SUPPORT = 'PLATFORM_SUPPORT',
  TENANT_OWNER = 'TENANT_OWNER',
  TENANT_ADMIN = 'TENANT_ADMIN',
  DEPARTMENT_ADMIN = 'DEPARTMENT_ADMIN',
  USER = 'USER',
  TENANT_USER = 'TENANT_USER',
}
export declare function normalizeVelonRole(role: string): VelonRole;
