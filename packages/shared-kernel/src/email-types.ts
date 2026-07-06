/** Email template keys — stable identifiers for lifecycle emails. */
export const EMAIL_TEMPLATE_KEYS = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  WORKSPACE_CREATED: 'workspace_created',
  TENANT_OWNER_WELCOME: 'tenant_owner_welcome',
  USER_INVITED: 'user_invited',
  USER_ROLE_UPDATED: 'user_role_updated',
  ONBOARDING_1_WELCOME: 'onboarding_1_welcome',
  ONBOARDING_2_PROFILE: 'onboarding_2_profile',
  ONBOARDING_3_TEAM: 'onboarding_3_team',
  ONBOARDING_4_INVOICE: 'onboarding_4_invoice',
  ONBOARDING_5_INACTIVE: 'onboarding_5_inactive',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_FAILED_DUNNING_2: 'payment_failed_dunning_2',
  PAYMENT_FAILED_DUNNING_3: 'payment_failed_dunning_3',
  PAYMENT_FAILED_DUNNING_4: 'payment_failed_dunning_4',
  PAYMENT_RECOVERED: 'payment_recovered',
  INVOICE_GENERATED: 'invoice_generated',
  RECEIPT_GENERATED: 'receipt_generated',
  REFUND_PROCESSED: 'refund_processed',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_RENEWAL_REMINDER: 'subscription_renewal_reminder',
  SUBSCRIPTION_RENEWAL_REMINDER_1D: 'subscription_renewal_reminder_1d',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  SUBSCRIPTION_REACTIVATED: 'subscription_reactivated',
  TRIAL_STARTED: 'trial_started',
  TRIAL_ENDING_SOON: 'trial_ending_soon',
  TRIAL_EXPIRED: 'trial_expired',
  PLAN_ACTIVATED: 'plan_activated',
  PLAN_RENEWED: 'plan_renewed',
  PLAN_CHANGED: 'plan_changed',
  GRACE_PERIOD_STARTED: 'grace_period_started',
  ACCOUNT_SUSPENDED_BILLING: 'account_suspended_billing',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  LOGIN_ALERT: 'login_alert',
  QUOTATION_CREATED: 'quotation_created',
  QUOTATION_SENT: 'quotation_sent',
  QUOTATION_APPROVED: 'quotation_approved',
  QUOTATION_REJECTED: 'quotation_rejected',
  SALES_ORDER_CREATED: 'sales_order_created',
  SALES_ORDER_UPDATED: 'sales_order_updated',
  INVENTORY_PRODUCT_MAJOR_UPDATE: 'inventory_product_major_update',
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REGENERATED: 'api_key_regenerated',
  API_KEY_DISABLED: 'api_key_disabled',
  ADMIN_SETTINGS_CHANGED: 'admin_settings_changed',
} as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[keyof typeof EMAIL_TEMPLATE_KEYS];

export const EMAIL_EVENT_TYPES = {
  USER_REGISTERED: 'user.registered',
  USER_EMAIL_VERIFICATION_REQUESTED: 'user.email_verification_requested',
  TENANT_WORKSPACE_CREATED: 'tenant.workspace_created',
  TENANT_USER_INVITED: 'tenant.user_invited',
  TENANT_USER_ROLE_UPDATED: 'tenant.user_role_updated',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_RECOVERED: 'payment.recovered',
  INVOICE_CREATED: 'invoice.created',
  RECEIPT_CREATED: 'receipt.created',
  REFUND_PROCESSED: 'refund.processed',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_RENEWAL_REMINDER: 'subscription.renewal_reminder',
  SUBSCRIPTION_REACTIVATED: 'subscription.reactivated',
  SUBSCRIPTION_SUSPENDED: 'subscription.suspended',
  TRIAL_STARTED: 'trial.started',
  TRIAL_ENDING_SOON: 'trial.ending_soon',
  TRIAL_EXPIRED: 'trial.expired',
  ONBOARDING_STEP: 'onboarding.step',
  DUNNING_REMINDER: 'dunning.reminder',
  USER_LOGGED_IN: 'user.logged_in',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  CRM_QUOTATION_CREATED: 'crm.quotation_created',
  CRM_QUOTATION_SENT: 'crm.quotation_sent',
  CRM_QUOTATION_APPROVED: 'crm.quotation_approved',
  CRM_QUOTATION_REJECTED: 'crm.quotation_rejected',
  SALES_ORDER_CREATED: 'sales.order_created',
  SALES_ORDER_UPDATED: 'sales.order_updated',
  INVENTORY_PRODUCT_MAJOR_UPDATE: 'inventory.product_major_update',
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REGENERATED: 'api_key.regenerated',
  API_KEY_DISABLED: 'api_key.disabled',
  ADMIN_SETTINGS_CHANGED: 'admin.settings_changed',
} as const;

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[keyof typeof EMAIL_EVENT_TYPES];

export type EmailTemplateCategory =
  | 'TRANSACTIONAL'
  | 'MARKETING'
  | 'ONBOARDING'
  | 'BILLING'
  | 'SECURITY'
  | 'SUPPORT';

export type EmailLogStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'FAILED'
  | 'SKIPPED';

/** Merge variables available in email templates. */
export type EmailMergeContext = {
  user?: { name?: string; email?: string };
  tenant?: { name?: string };
  workspace?: { name?: string };
  plan?: { name?: string };
  subscription?: { status?: string; renewalDate?: string };
  invoice?: { number?: string; amount?: string; currency?: string };
  payment?: { status?: string; date?: string };
  quotation?: { number?: string; status?: string; total?: string; currency?: string };
  salesOrder?: { number?: string; status?: string; total?: string; currency?: string };
  product?: { name?: string; sku?: string; action?: string };
  security?: {
    loginTime?: string;
    ipAddress?: string;
    device?: string;
    warning?: string;
  };
  loginUrl?: string;
  billingUrl?: string;
  invoiceUrl?: string;
  inviteUrl?: string;
  supportEmail?: string;
  billingEmail?: string;
  companyName?: string;
  preferencesUrl?: string;
  [key: string]: unknown;
};

export const TRANSACTIONAL_TEMPLATE_KEYS = new Set<string>([
  EMAIL_TEMPLATE_KEYS.WELCOME,
  EMAIL_TEMPLATE_KEYS.EMAIL_VERIFICATION,
  EMAIL_TEMPLATE_KEYS.WORKSPACE_CREATED,
  EMAIL_TEMPLATE_KEYS.TENANT_OWNER_WELCOME,
  EMAIL_TEMPLATE_KEYS.USER_INVITED,
  EMAIL_TEMPLATE_KEYS.USER_ROLE_UPDATED,
  EMAIL_TEMPLATE_KEYS.PAYMENT_SUCCESS,
  EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED,
  EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_2,
  EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_3,
  EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_4,
  EMAIL_TEMPLATE_KEYS.PAYMENT_RECOVERED,
  EMAIL_TEMPLATE_KEYS.INVOICE_GENERATED,
  EMAIL_TEMPLATE_KEYS.RECEIPT_GENERATED,
  EMAIL_TEMPLATE_KEYS.REFUND_PROCESSED,
  EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_CANCELLED,
  EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_RENEWAL_REMINDER,
  EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_RENEWAL_REMINDER_1D,
  EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_EXPIRED,
  EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_REACTIVATED,
  EMAIL_TEMPLATE_KEYS.TRIAL_STARTED,
  EMAIL_TEMPLATE_KEYS.TRIAL_ENDING_SOON,
  EMAIL_TEMPLATE_KEYS.TRIAL_EXPIRED,
  EMAIL_TEMPLATE_KEYS.PLAN_ACTIVATED,
  EMAIL_TEMPLATE_KEYS.PLAN_RENEWED,
  EMAIL_TEMPLATE_KEYS.PLAN_CHANGED,
  EMAIL_TEMPLATE_KEYS.GRACE_PERIOD_STARTED,
  EMAIL_TEMPLATE_KEYS.ACCOUNT_SUSPENDED_BILLING,
  EMAIL_TEMPLATE_KEYS.PASSWORD_RESET,
  EMAIL_TEMPLATE_KEYS.PASSWORD_CHANGED,
  EMAIL_TEMPLATE_KEYS.QUOTATION_CREATED,
  EMAIL_TEMPLATE_KEYS.QUOTATION_SENT,
  EMAIL_TEMPLATE_KEYS.QUOTATION_APPROVED,
  EMAIL_TEMPLATE_KEYS.QUOTATION_REJECTED,
  EMAIL_TEMPLATE_KEYS.SALES_ORDER_CREATED,
  EMAIL_TEMPLATE_KEYS.SALES_ORDER_UPDATED,
  EMAIL_TEMPLATE_KEYS.INVENTORY_PRODUCT_MAJOR_UPDATE,
  EMAIL_TEMPLATE_KEYS.ADMIN_SETTINGS_CHANGED,
]);

/** Security-sensitive emails — always delivered; not user-configurable. */
export const SECURITY_TEMPLATE_KEYS = new Set<string>([
  EMAIL_TEMPLATE_KEYS.LOGIN_ALERT,
  EMAIL_TEMPLATE_KEYS.PASSWORD_RESET,
  EMAIL_TEMPLATE_KEYS.PASSWORD_CHANGED,
  EMAIL_TEMPLATE_KEYS.API_KEY_CREATED,
  EMAIL_TEMPLATE_KEYS.API_KEY_REGENERATED,
  EMAIL_TEMPLATE_KEYS.API_KEY_DISABLED,
  EMAIL_TEMPLATE_KEYS.ADMIN_SETTINGS_CHANGED,
]);

export const MARKETING_TEMPLATE_KEYS = new Set<string>([
  EMAIL_TEMPLATE_KEYS.ONBOARDING_1_WELCOME,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_2_PROFILE,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_3_TEAM,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_4_INVOICE,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_5_INACTIVE,
  EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_UPGRADED,
  EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_DOWNGRADED,
]);
