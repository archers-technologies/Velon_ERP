/** Super Admin tenant lifecycle status explanations (billing/access — not demo detection). */
export const TENANT_STATUS_DESCRIPTIONS: Record<string, string> = {
  Trial: 'Tenant is in trial billing lifecycle. Trial does not mean demo/test data.',
  Active: 'Tenant has active workspace access.',
  'Past due': 'Subscription payment is overdue; access may be restricted.',
  Suspended: 'Tenant workspace access is blocked.',
  Cancelled: 'Subscription or access has been cancelled.',
};

export const TENANT_STATUS_COLUMN_HELP =
  'Status reflects billing and access lifecycle only. Demo/test tenants are filtered separately using database seedSource (demo/e2e), not Trial status.';
