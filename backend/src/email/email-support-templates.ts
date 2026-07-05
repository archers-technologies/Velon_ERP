/** CRM support reply templates for admin/support use. */
export const EMAIL_SUPPORT_REPLY_TEMPLATES = [
  {
    key: 'support_welcome',
    name: 'Welcome / Onboarding Help',
    subject: 'Re: Getting started with VelonERP',
    body: `Hi {{user.name}},

Thanks for reaching out. I'd be happy to help you get started with VelonERP.

A good first step is to complete your business profile in workspace settings, then add a few products and customers so invoices reflect your real data.

If you'd like, we can walk through this together — just reply with a time that works for you.

Best,
Velon Support
{{supportEmail}}`,
  },
  {
    key: 'support_payment_success',
    name: 'Payment Successful',
    subject: 'Re: Your VelonERP payment',
    body: `Hi {{user.name}},

Thank you for your payment. We've confirmed receipt for {{plan.name}}.

Your invoice/receipt is available in billing settings: {{billingUrl}}

Let us know if you need anything else.

Best,
Velon Support`,
  },
  {
    key: 'support_payment_failed',
    name: 'Payment Failed Assistance',
    subject: 'Re: Payment could not be completed',
    body: `Hi {{user.name}},

We couldn't complete your VelonERP payment for {{plan.name}}. This can happen if a card expired or the bank declined the transaction.

Please update your billing details here: {{billingUrl}}

If the issue persists, reply to this email and we'll help you directly — no blame, just a fix.

Best,
Velon Support`,
  },
  {
    key: 'support_invoice_request',
    name: 'Invoice Request',
    subject: 'Re: Your invoice',
    body: `Hi {{user.name}},

Your invoice {{invoice.number}} is ready.

Amount: {{invoice.currency}} {{invoice.amount}}
View/download: {{invoiceUrl}}

Best,
Velon Support`,
  },
  {
    key: 'support_renewal_reminder',
    name: 'Subscription Renewal Reminder',
    subject: 'Re: Upcoming subscription renewal',
    body: `Hi {{user.name}},

Your {{plan.name}} subscription renews on {{subscription.renewalDate}}.

You can review billing anytime: {{billingUrl}}

Best,
Velon Support`,
  },
  {
    key: 'support_cancellation',
    name: 'Subscription Cancellation Confirmation',
    subject: 'Re: Subscription cancelled',
    body: `Hi {{user.name}},

We've confirmed your subscription cancellation. Your workspace remains available until the end of the current billing period, if applicable.

If you have feedback on what we could improve, we'd genuinely appreciate it.

Best,
Velon Support`,
  },
  {
    key: 'support_refund',
    name: 'Refund Confirmation',
    subject: 'Re: Refund processed',
    body: `Hi {{user.name}},

We've processed your refund. It may take a few business days to appear on your statement depending on your bank.

Best,
Velon Support`,
  },
  {
    key: 'support_trial_ending',
    name: 'Trial Ending Soon',
    subject: 'Re: Your VelonERP trial',
    body: `Hi {{user.name}},

Your VelonERP trial is ending soon. To continue without interruption, choose a plan here: {{billingUrl}}

Happy to answer any questions about plans.

Best,
Velon Support`,
  },
  {
    key: 'support_account_suspended',
    name: 'Account Suspended (Billing)',
    subject: 'Re: Workspace suspended',
    body: `Hi {{user.name}},

Your workspace {{workspace.name}} was suspended because we couldn't process payment for {{plan.name}}.

Update billing to restore access: {{billingUrl}}

We're here to help if you need assistance.

Best,
Velon Support`,
  },
  {
    key: 'support_account_reactivated',
    name: 'Account Reactivated',
    subject: 'Re: Workspace active again',
    body: `Hi {{user.name}},

Good news — {{workspace.name}} is active again. Welcome back.

Best,
Velon Support`,
  },
  {
    key: 'support_user_invitation',
    name: 'User Invitation Help',
    subject: 'Re: Workspace invitation',
    body: `Hi,

You were invited to {{workspace.name}} on VelonERP.

Accept here: {{inviteUrl}}

If the link expired, ask your workspace admin to resend the invitation.

Best,
Velon Support`,
  },
  {
    key: 'support_workspace_setup',
    name: 'Workspace Setup Help',
    subject: 'Re: Workspace setup',
    body: `Hi {{user.name}},

Happy to help with {{workspace.name}} setup.

Recommended order:
1. Business profile & regional settings
2. Products and customers
3. Team invitations
4. First quotation or invoice

Open your workspace: {{loginUrl}}

Best,
Velon Support`,
  },
] as const;
