import { roleHasPermission, VelonRole } from './index';

describe('roleHasPermission', () => {
  it('grants super admin wildcard', () => {
    expect(roleHasPermission(VelonRole.SUPER_ADMIN, 'inventory:write')).toBe(true);
  });

  it('grants tenant owner inventory wildcard', () => {
    expect(roleHasPermission(VelonRole.TENANT_OWNER, 'inventory:read')).toBe(true);
    expect(roleHasPermission(VelonRole.TENANT_OWNER, 'procurement:write')).toBe(true);
  });

  it('grants user read-only inventory', () => {
    expect(roleHasPermission(VelonRole.USER, 'inventory:read')).toBe(true);
    expect(roleHasPermission(VelonRole.USER, 'inventory:write')).toBe(false);
  });

  it('grants department admin write access', () => {
    expect(roleHasPermission(VelonRole.DEPARTMENT_ADMIN, 'inventory:write')).toBe(true);
    expect(roleHasPermission(VelonRole.DEPARTMENT_ADMIN, 'procurement:*')).toBe(false);
  });
});
