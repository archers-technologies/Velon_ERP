export type RolePresetId =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'accountant'
  | 'sales'
  | 'inventory'
  | 'viewer';
export type RolePreset = {
  id: RolePresetId;
  label: string;
  description: string;
  backendRole: 'USER' | 'DEPARTMENT_ADMIN';
  highlights: string[];
};
export declare const WORKSPACE_ROLE_PRESETS: RolePreset[];
export declare function rolePresetById(id: RolePresetId): RolePreset | undefined;
export declare function backendRoleToPresetLabel(role: string): string;
