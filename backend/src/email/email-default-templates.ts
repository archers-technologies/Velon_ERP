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
];
