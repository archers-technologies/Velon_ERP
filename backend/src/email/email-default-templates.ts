import { EMAIL_TEMPLATE_KEYS, type EmailTemplateCategory } from '@velon/shared';

export type DefaultEmailTemplate = {
  key: string;
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  previewText?: string;
  htmlBody: string;
  textBody: string;
};

const cta = (label: string, urlVar: string) => `<p><a href="{{${urlVar}}}">${label}</a></p>`;

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    key: EMAIL_TEMPLATE_KEYS.WELCOME,
    name: 'Welcome Email',
    category: 'TRANSACTIONAL',
    subject: 'Welcome to VelonERP',
    previewText: 'Your account is ready.',
    htmlBody: `<p>Hi {{user.name}},</p><p>Welcome to VelonERP. Your account has been created successfully.</p><p>You can now set up your workspace, add your business details, and start managing your operations from one place.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nWelcome to VelonERP. Your account has been created successfully.\n\nOpen Workspace: {{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.WORKSPACE_CREATED,
    name: 'Workspace Created',
    category: 'TRANSACTIONAL',
    subject: 'Your VelonERP workspace is ready',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your workspace <strong>{{workspace.name}}</strong> has been created successfully.</p><p>Next step: complete your business profile and invite your team.</p>${cta('Complete Setup', 'loginUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nYour workspace {{workspace.name}} has been created successfully.\n\nComplete Setup: {{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.TENANT_OWNER_WELCOME,
    name: 'Tenant Owner Welcome',
    category: 'ONBOARDING',
    subject: 'Welcome to VelonERP — let’s get started',
    htmlBody: `<p>Hi {{user.name}},</p><p>You’re the owner of <strong>{{workspace.name}}</strong>. Here’s how to get the most from VelonERP:</p><ol><li>Complete your business profile</li><li>Add products and customers</li><li>Invite your team</li></ol>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nYou own {{workspace.name}}. Open Workspace: {{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.USER_INVITED,
    name: 'User Invitation',
    category: 'TRANSACTIONAL',
    subject: 'You have been invited to {{workspace.name}} on VelonERP',
    htmlBody: `<p>Hi,</p><p>You have been invited to join <strong>{{workspace.name}}</strong> on VelonERP.</p><p>Accept the invitation to access your workspace.</p>${cta('Accept Invitation', 'inviteUrl')}`,
    textBody: 'You have been invited to {{workspace.name}} on VelonERP.\n\nAccept: {{inviteUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.USER_ROLE_UPDATED,
    name: 'Role Updated',
    category: 'TRANSACTIONAL',
    subject: 'Your VelonERP role has been updated',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your role in <strong>{{workspace.name}}</strong> has been updated.</p><p>Sign in to see your updated permissions.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nYour role in {{workspace.name}} was updated.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ONBOARDING_1_WELCOME,
    name: 'Onboarding 1 — Welcome',
    category: 'ONBOARDING',
    subject: 'Welcome to VelonERP',
    htmlBody: `<p>Hi {{user.name}},</p><p>Welcome aboard. Your VelonERP workspace is ready — let’s get you set up.</p>${cta('Log in to VelonERP', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nWelcome to VelonERP.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ONBOARDING_2_PROFILE,
    name: 'Onboarding 2 — Business Profile',
    category: 'ONBOARDING',
    subject: 'Complete your business profile',
    htmlBody: `<p>Hi {{user.name}},</p><p>A quick business profile helps VelonERP tailor invoices, taxes, and reports for {{workspace.name}}.</p>${cta('Complete Business Profile', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nComplete your business profile: {{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ONBOARDING_3_TEAM,
    name: 'Onboarding 3 — Team & Catalog',
    category: 'ONBOARDING',
    subject: 'Add products, customers, and team members',
    htmlBody: `<p>Hi {{user.name}},</p><p>Bring your catalog and team into VelonERP so everyone works from the same source of truth.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nAdd products, customers, and team: {{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ONBOARDING_4_INVOICE,
    name: 'Onboarding 4 — First Invoice',
    category: 'ONBOARDING',
    subject: 'Create your first invoice or quotation',
    htmlBody: `<p>Hi {{user.name}},</p><p>Ready to send your first invoice? VelonERP makes quotations and billing straightforward.</p>${cta('Create Invoice', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nCreate your first invoice: {{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ONBOARDING_5_INACTIVE,
    name: 'Onboarding 5 — Need Help',
    category: 'ONBOARDING',
    subject: 'Need help getting started with VelonERP?',
    htmlBody: `<p>Hi {{user.name}},</p><p>We noticed you haven’t been active in {{workspace.name}} lately. Our team is here if you need a hand.</p><p>Reply to this email or contact us at {{supportEmail}}.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nNeed help? Contact {{supportEmail}}\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PAYMENT_SUCCESS,
    name: 'Payment Successful',
    category: 'BILLING',
    subject: 'Payment received — {{invoice.number}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>Thank you. We have received your payment of <strong>{{invoice.currency}} {{invoice.amount}}</strong> for {{plan.name}}.</p><p>Your invoice/receipt is ready.</p>${cta('Download Invoice', 'invoiceUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nPayment received: {{invoice.currency}} {{invoice.amount}} for {{plan.name}}.\n\nInvoice: {{invoiceUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED,
    name: 'Payment Failed',
    category: 'BILLING',
    subject: 'Action needed: payment could not be completed',
    htmlBody: `<p>Hi {{user.name}},</p><p>We couldn’t complete your VelonERP payment for {{plan.name}}. This can happen if a card expired or the bank declined the transaction.</p><p>Please update your billing details to keep your workspace active.</p>${cta('Update Billing', 'billingUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nWe could not complete your payment for {{plan.name}}.\n\nUpdate billing: {{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_2,
    name: 'Payment Failed — Reminder (24h)',
    category: 'BILLING',
    subject: 'Reminder: update your VelonERP billing details',
    htmlBody: `<p>Hi {{user.name}},</p><p>This is a friendly reminder that your payment for {{plan.name}} still needs attention.</p><p>Update your billing details to avoid any interruption to {{workspace.name}}.</p>${cta('Update Billing', 'billingUrl')}`,
    textBody: 'Hi {{user.name}},\n\nReminder: update billing for {{plan.name}}.\n\n{{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_3,
    name: 'Payment Failed — Reminder (3 days)',
    category: 'BILLING',
    subject: 'Your VelonERP payment is still pending',
    htmlBody: `<p>Hi {{user.name}},</p><p>We still haven’t been able to process your payment for {{plan.name}}.</p><p>Please update your payment method soon to keep your workspace running smoothly.</p>${cta('Update Billing', 'billingUrl')}`,
    textBody: 'Hi {{user.name}},\n\nPayment still pending for {{plan.name}}.\n\n{{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_4,
    name: 'Payment Failed — Final Reminder',
    category: 'BILLING',
    subject: 'Final reminder before service interruption',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your payment for {{plan.name}} is overdue. Without an updated payment method, {{workspace.name}} may be suspended soon.</p><p>We’re here to help if you have questions — contact {{supportEmail}}.</p>${cta('Update Billing', 'billingUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nFinal reminder: update billing for {{plan.name}}.\n\n{{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PAYMENT_RECOVERED,
    name: 'Payment Recovered',
    category: 'BILLING',
    subject: 'Payment received — your workspace is active',
    htmlBody: `<p>Hi {{user.name}},</p><p>Great news — your payment for {{plan.name}} went through successfully. {{workspace.name}} is fully active again.</p>${cta('View Billing', 'billingUrl')}`,
    textBody: 'Hi {{user.name}},\n\nPayment recovered for {{plan.name}}.\n\n{{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.INVOICE_GENERATED,
    name: 'Invoice Generated',
    category: 'BILLING',
    subject: 'Invoice {{invoice.number}} from VelonERP',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your invoice <strong>{{invoice.number}}</strong> for {{invoice.currency}} {{invoice.amount}} is ready.</p>${cta('View Invoice', 'invoiceUrl')}`,
    textBody: 'Hi {{user.name}},\n\nInvoice {{invoice.number}}: {{invoiceUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_RENEWAL_REMINDER,
    name: 'Renewal Reminder (7 days)',
    category: 'BILLING',
    subject: 'Your VelonERP subscription renews on {{subscription.renewalDate}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your {{plan.name}} subscription is scheduled to renew on {{subscription.renewalDate}}.</p><p>You can review your billing details anytime from your workspace.</p>${cta('Manage Billing', 'billingUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nYour {{plan.name}} subscription renews on {{subscription.renewalDate}}.\n\n{{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_RENEWAL_REMINDER_1D,
    name: 'Renewal Reminder (1 day)',
    category: 'BILLING',
    subject: 'Your VelonERP subscription renews tomorrow',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your {{plan.name}} plan renews tomorrow ({{subscription.renewalDate}}).</p>${cta('Manage Billing', 'billingUrl')}`,
    textBody: 'Hi {{user.name}},\n\nRenewal tomorrow for {{plan.name}}.\n\n{{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_CANCELLED,
    name: 'Subscription Cancelled',
    category: 'BILLING',
    subject: 'Your VelonERP subscription has been cancelled',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your subscription has been cancelled successfully.</p><p>Your workspace access will remain available until the end of your current billing period, if applicable.</p><p>If you have a moment, we’d appreciate your feedback.</p>${cta('View Subscription', 'billingUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nYour subscription has been cancelled.\n\nView details: {{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.TRIAL_ENDING_SOON,
    name: 'Trial Ending Soon',
    category: 'BILLING',
    subject: 'Your VelonERP trial is ending soon',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your VelonERP trial will end soon. To continue using {{workspace.name}} without interruption, please choose a plan.</p>${cta('Choose Plan', 'billingUrl')}`,
    textBody: 'Hi {{user.name}},\n\nYour trial is ending soon.\n\nChoose a plan: {{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.TRIAL_STARTED,
    name: 'Trial Started',
    category: 'BILLING',
    subject: 'Your VelonERP trial has started',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your {{plan.name}} trial for {{workspace.name}} is now active. Explore VelonERP and see how it fits your business.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nYour trial for {{plan.name}} has started.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ACCOUNT_SUSPENDED_BILLING,
    name: 'Account Suspended (Billing)',
    category: 'BILLING',
    subject: 'Your VelonERP workspace has been suspended',
    htmlBody: `<p>Hi {{user.name}},</p><p>We suspended {{workspace.name}} because we couldn’t process your payment for {{plan.name}}.</p><p>Update your billing details to restore access. Contact {{supportEmail}} if you need assistance.</p>${cta('Update Billing', 'billingUrl')}`,
    textBody:
      'Hi {{user.name}},\n\n{{workspace.name}} was suspended due to billing.\n\n{{billingUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_REACTIVATED,
    name: 'Subscription Reactivated',
    category: 'BILLING',
    subject: 'Your VelonERP subscription is active again',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your {{plan.name}} subscription for {{workspace.name}} is active again. Welcome back.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nSubscription reactivated.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.LOGIN_ALERT,
    name: 'New Login Alert',
    category: 'SECURITY',
    subject: 'New sign-in to your VelonERP account',
    previewText: 'A new sign-in was detected on your account.',
    htmlBody: `<p>Hi {{user.name}},</p><p>We detected a new sign-in to your VelonERP account.</p><ul><li><strong>Time:</strong> {{security.loginTime}}</li><li><strong>Workspace:</strong> {{workspace.name}}</li><li><strong>IP address:</strong> {{security.ipAddress}}</li><li><strong>Device:</strong> {{security.device}}</li></ul><p><strong>{{security.warning}}</strong></p>`,
    textBody:
      'Hi {{user.name}},\n\nNew sign-in detected.\nTime: {{security.loginTime}}\nWorkspace: {{workspace.name}}\nIP: {{security.ipAddress}}\nDevice: {{security.device}}\n\n{{security.warning}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PASSWORD_CHANGED,
    name: 'Password Changed',
    category: 'SECURITY',
    subject: 'Your VelonERP password was changed',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your VelonERP password for <strong>{{workspace.name}}</strong> was changed successfully.</p><p><strong>If this wasn't you, please reset your password or contact support immediately.</strong></p><p>Contact: {{supportEmail}}</p>`,
    textBody:
      "Hi {{user.name}},\n\nYour VelonERP password was changed.\n\nIf this wasn't you, please reset your password or contact support immediately.\n\n{{supportEmail}}",
  },
  {
    key: EMAIL_TEMPLATE_KEYS.PASSWORD_RESET,
    name: 'Password Reset OTP',
    category: 'SECURITY',
    subject: 'Your VelonERP password reset code',
    htmlBody: `<p>Hi {{user.name}},</p><p>Your VelonERP password reset verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">{{otpCode}}</p><p>This code expires in 10 minutes.</p>`,
    textBody:
      'Hi {{user.name}},\n\nYour password reset code is {{otpCode}}. It expires in 10 minutes.',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.QUOTATION_CREATED,
    name: 'Quotation Created',
    category: 'TRANSACTIONAL',
    subject: 'Quotation {{quotation.number}} created in {{workspace.name}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>A new quotation <strong>{{quotation.number}}</strong> was created in <strong>{{workspace.name}}</strong>.</p><p>Status: {{quotation.status}}</p>${cta('View Quotation', 'loginUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nQuotation {{quotation.number}} was created in {{workspace.name}}.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.QUOTATION_SENT,
    name: 'Quotation Sent',
    category: 'TRANSACTIONAL',
    subject: 'Quotation {{quotation.number}} sent to customer',
    htmlBody: `<p>Hi {{user.name}},</p><p>Quotation <strong>{{quotation.number}}</strong> was sent from <strong>{{workspace.name}}</strong>.</p><p>Total: {{quotation.currency}} {{quotation.total}}</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nQuotation {{quotation.number}} was sent.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.QUOTATION_APPROVED,
    name: 'Quotation Approved',
    category: 'TRANSACTIONAL',
    subject: 'Quotation {{quotation.number}} approved',
    htmlBody: `<p>Hi {{user.name}},</p><p>Quotation <strong>{{quotation.number}}</strong> in <strong>{{workspace.name}}</strong> was approved.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nQuotation {{quotation.number}} was approved.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.QUOTATION_REJECTED,
    name: 'Quotation Rejected',
    category: 'TRANSACTIONAL',
    subject: 'Quotation {{quotation.number}} rejected',
    htmlBody: `<p>Hi {{user.name}},</p><p>Quotation <strong>{{quotation.number}}</strong> in <strong>{{workspace.name}}</strong> was rejected.</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nQuotation {{quotation.number}} was rejected.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.SALES_ORDER_CREATED,
    name: 'Sales Order Created',
    category: 'TRANSACTIONAL',
    subject: 'Sales order {{salesOrder.number}} created',
    htmlBody: `<p>Hi {{user.name}},</p><p>Sales order <strong>{{salesOrder.number}}</strong> was created in <strong>{{workspace.name}}</strong>.</p><p>Status: {{salesOrder.status}}</p><p>Total: {{salesOrder.currency}} {{salesOrder.total}}</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nSales order {{salesOrder.number}} was created.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.SALES_ORDER_UPDATED,
    name: 'Sales Order Updated',
    category: 'TRANSACTIONAL',
    subject: 'Sales order {{salesOrder.number}} updated',
    htmlBody: `<p>Hi {{user.name}},</p><p>Sales order <strong>{{salesOrder.number}}</strong> in <strong>{{workspace.name}}</strong> was updated.</p><p>Status: {{salesOrder.status}}</p>${cta('Open Workspace', 'loginUrl')}`,
    textBody: 'Hi {{user.name}},\n\nSales order {{salesOrder.number}} was updated.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.INVENTORY_PRODUCT_MAJOR_UPDATE,
    name: 'Inventory Product Update',
    category: 'TRANSACTIONAL',
    subject: 'Product {{product.name}} updated in {{workspace.name}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>Product <strong>{{product.name}}</strong> (SKU: {{product.sku}}) was {{product.action}} in <strong>{{workspace.name}}</strong>.</p>${cta('Open Inventory', 'loginUrl')}`,
    textBody:
      'Hi {{user.name}},\n\nProduct {{product.name}} ({{product.sku}}) was {{product.action}}.\n\n{{loginUrl}}',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.API_KEY_CREATED,
    name: 'API Key Created',
    category: 'SECURITY',
    subject: 'New API key created for {{workspace.name}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>A new API key was created for <strong>{{workspace.name}}</strong>.</p><p><strong>If you did not authorize this, disable the key and contact support immediately.</strong></p>`,
    textBody:
      'Hi {{user.name}},\n\nA new API key was created for {{workspace.name}}.\n\nIf unauthorized, disable the key and contact support.',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.API_KEY_REGENERATED,
    name: 'API Key Regenerated',
    category: 'SECURITY',
    subject: 'API key regenerated for {{workspace.name}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>An API key was regenerated for <strong>{{workspace.name}}</strong>.</p><p><strong>If you did not authorize this, disable the key and contact support immediately.</strong></p>`,
    textBody:
      'Hi {{user.name}},\n\nAn API key was regenerated for {{workspace.name}}.\n\nIf unauthorized, disable the key and contact support.',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.API_KEY_DISABLED,
    name: 'API Key Disabled',
    category: 'SECURITY',
    subject: 'API key disabled for {{workspace.name}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>An API key was disabled for <strong>{{workspace.name}}</strong>.</p>`,
    textBody: 'Hi {{user.name}},\n\nAn API key was disabled for {{workspace.name}}.',
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ADMIN_SETTINGS_CHANGED,
    name: 'Admin Settings Changed',
    category: 'SECURITY',
    subject: 'Security-sensitive settings changed in {{workspace.name}}',
    htmlBody: `<p>Hi {{user.name}},</p><p>Security-sensitive settings were changed in <strong>{{workspace.name}}</strong>.</p><p><strong>If you did not make this change, contact support immediately.</strong></p>`,
    textBody:
      'Hi {{user.name}},\n\nSecurity-sensitive settings were changed in {{workspace.name}}.\n\nIf unauthorized, contact support.',
  },
];
