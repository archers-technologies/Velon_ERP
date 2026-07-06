'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WORKSPACE_ROLE_PRESETS = void 0;
exports.rolePresetById = rolePresetById;
exports.backendRoleToPresetLabel = backendRoleToPresetLabel;
exports.WORKSPACE_ROLE_PRESETS = [
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
function rolePresetById(id) {
  return exports.WORKSPACE_ROLE_PRESETS.find((p) => p.id === id);
}
function backendRoleToPresetLabel(role) {
  if (role === 'TENANT_OWNER' || role === 'TENANT_ADMIN') return 'Owner';
  if (role === 'DEPARTMENT_ADMIN') return 'Admin';
  return 'Team member';
}
//# sourceMappingURL=role-presets.js.map
