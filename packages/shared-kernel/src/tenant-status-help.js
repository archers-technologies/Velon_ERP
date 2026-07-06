'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TENANT_STATUS_COLUMN_HELP = exports.TENANT_STATUS_DESCRIPTIONS = void 0;
exports.TENANT_STATUS_DESCRIPTIONS = {
  Trial: 'Tenant is in trial billing lifecycle. Trial does not mean demo/test data.',
  Active: 'Tenant has active workspace access.',
  'Past due': 'Subscription payment is overdue; access may be restricted.',
  Suspended: 'Tenant workspace access is blocked.',
  Cancelled: 'Subscription or access has been cancelled.',
};
exports.TENANT_STATUS_COLUMN_HELP =
  'Status reflects billing and access lifecycle only. Demo/test tenants are filtered separately using database seedSource (demo/e2e), not Trial status.';
//# sourceMappingURL=tenant-status-help.js.map
