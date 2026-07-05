/** Friendly role presets for workspace admin — mapped to backend membership roles. */
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
  /** Backend role sent to the API when inviting or updating members */
  backendRole: 'USER' | 'DEPARTMENT_ADMIN';
  highlights: string[];
};

export const WORKSPACE_ROLE_PRESETS: RolePreset[] = [
  {
    id: 'owner',
    label: 'Owner',
    description: 'Full control of the business workspace',
    backendRole: 'DEPARTMENT_ADMIN',
    highlights: ['Billing', 'Users', 'All modules'],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Manage team, settings, and daily operations',
    backendRole: 'DEPARTMENT_ADMIN',
    highlights: ['Users', 'Settings', 'Reports'],
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Oversee sales, purchases, and inventory',
    backendRole: 'DEPARTMENT_ADMIN',
    highlights: ['Sales', 'Purchases', 'Inventory'],
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Handle money in and out, taxes, and reports',
    backendRole: 'USER',
    highlights: ['Accounting', 'Reports', 'Payments'],
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Customers, quotes, and invoices',
    backendRole: 'USER',
    highlights: ['Customers', 'Quotations', 'Invoices'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Products, stock, and purchases',
    backendRole: 'USER',
    highlights: ['Products', 'Stock', 'Purchases'],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to reports and records',
    backendRole: 'USER',
    highlights: ['View only'],
  },
];

export function rolePresetById(id: RolePresetId): RolePreset | undefined {
  return WORKSPACE_ROLE_PRESETS.find((p) => p.id === id);
}

export function backendRoleToPresetLabel(role: string): string {
  if (role === 'TENANT_OWNER' || role === 'TENANT_ADMIN') return 'Owner';
  if (role === 'DEPARTMENT_ADMIN') return 'Admin';
  return 'Team member';
}
