import { Injectable, Logger } from '@nestjs/common';
import { EMAIL_EVENT_TYPES, EMAIL_TEMPLATE_KEYS, type EmailMergeContext } from '@velon/shared';
import { PrismaService } from '../prisma/prisma.service';
import { getAppBaseUrl, getBillingEmail, getSupportEmail } from './email-env.util';
import { EmailEventService } from './email-event.service';
import { EmailLogService } from './email-log.service';
import { EmailPreferenceService } from './email-preference.service';
import { EmailProviderService } from './email-provider.service';
import { EmailQueueService } from './email-queue.service';
import type { EmailQueueJobData } from './email-queue.types';
import { renderEmailTemplate, wrapEmailHtml } from './email-template-renderer.util';
import { EmailTemplateService } from './email-template.service';

export type SendLifecycleEmailInput = {
  templateKey: string;
  toEmail: string;
  userId?: string | null;
  tenantId?: string | null;
  customerId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  subscriptionId?: string | null;
  idempotencyKey?: string;
  context: EmailMergeContext;
  cta?: { label: string; urlVar: string };
  delayMs?: number;
  skipPreferenceCheck?: boolean;
};

const DUNNING_DELAYS_MS = [
  0,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  6 * 24 * 60 * 60 * 1000,
] as const;

const ONBOARDING_DELAYS_MS = [
  0,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  5 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
] as const;

const ONBOARDING_TEMPLATES = [
  EMAIL_TEMPLATE_KEYS.ONBOARDING_1_WELCOME,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_2_PROFILE,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_3_TEAM,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_4_INVOICE,
  EMAIL_TEMPLATE_KEYS.ONBOARDING_5_INACTIVE,
] as const;

@Injectable()
export class EmailLifecycleService {
  private readonly log = new Logger(EmailLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: EmailTemplateService,
    private readonly logs: EmailLogService,
    private readonly preferences: EmailPreferenceService,
    private readonly events: EmailEventService,
    private readonly provider: EmailProviderService,
    private readonly queue: EmailQueueService,
  ) {}

  buildBaseContext(partial: EmailMergeContext = {}): EmailMergeContext {
    const base = getAppBaseUrl();
    return {
      companyName: 'Velon ERP',
      supportEmail: getSupportEmail(),
      billingEmail: getBillingEmail(),
      loginUrl: `${base}/login`,
      billingUrl: `${base}/app/settings/billing`,
      invoiceUrl: `${base}/app/settings/billing`,
      preferencesUrl: `${base}/app/settings?tab=email`,
      ...partial,
    };
  }

  async emit(
    eventType: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    const { event, duplicate } = await this.events.record(eventType, entityType, entityId, payload);
    if (duplicate) {
      this.log.debug(`Skipping duplicate email event ${eventType}:${entityId}`);
      return { processed: false, duplicate: true };
    }

    try {
      await this.handleEvent(eventType, payload);
      await this.events.markProcessed(event.id);
      return { processed: true, duplicate: false };
    } catch (err) {
      this.log.error(`Email event handler failed ${eventType}: ${String(err)}`);
      throw err;
    }
  }

  private async handleEvent(eventType: string, payload: Record<string, unknown>) {
    switch (eventType) {
      case EMAIL_EVENT_TYPES.USER_REGISTERED:
        await this.onUserRegistered(payload);
        break;
      case EMAIL_EVENT_TYPES.TENANT_WORKSPACE_CREATED:
        await this.onWorkspaceCreated(payload);
        break;
      case EMAIL_EVENT_TYPES.TENANT_USER_INVITED:
        await this.onUserInvited(payload);
        break;
      case EMAIL_EVENT_TYPES.TENANT_USER_ROLE_UPDATED:
        await this.onRoleUpdated(payload);
        break;
      case EMAIL_EVENT_TYPES.PAYMENT_SUCCEEDED:
        await this.onPaymentSucceeded(payload);
        break;
      case EMAIL_EVENT_TYPES.PAYMENT_FAILED:
        await this.onPaymentFailed(payload);
        break;
      case EMAIL_EVENT_TYPES.PAYMENT_RECOVERED:
        await this.onPaymentRecovered(payload);
        break;
      case EMAIL_EVENT_TYPES.INVOICE_CREATED:
        await this.onInvoiceCreated(payload);
        break;
      case EMAIL_EVENT_TYPES.SUBSCRIPTION_CANCELLED:
        await this.onSubscriptionCancelled(payload);
        break;
      case EMAIL_EVENT_TYPES.SUBSCRIPTION_RENEWAL_REMINDER:
        await this.onRenewalReminder(payload);
        break;
      case EMAIL_EVENT_TYPES.TRIAL_STARTED:
        await this.onTrialStarted(payload);
        break;
      case EMAIL_EVENT_TYPES.TRIAL_ENDING_SOON:
        await this.onTrialEndingSoon(payload);
        break;
      case EMAIL_EVENT_TYPES.SUBSCRIPTION_REACTIVATED:
        await this.onSubscriptionReactivated(payload);
        break;
      case EMAIL_EVENT_TYPES.SUBSCRIPTION_SUSPENDED:
        await this.onAccountSuspended(payload);
        break;
      case EMAIL_EVENT_TYPES.ONBOARDING_STEP:
        await this.onOnboardingStep(payload);
        break;
      case EMAIL_EVENT_TYPES.DUNNING_REMINDER:
        await this.onDunningReminder(payload);
        break;
      default:
        this.log.warn(`Unhandled email event: ${eventType}`);
    }
  }

  async sendLifecycleEmail(input: SendLifecycleEmailInput) {
    const ctx = this.buildBaseContext(input.context);

    if (input.userId && !input.skipPreferenceCheck) {
      const pref = await this.preferences.getOrCreate(input.userId, input.tenantId);
      const check = this.preferences.canSendTemplate(input.templateKey, pref);
      if (!check.allowed) {
        const { log } = await this.logs.createQueued({
          ...input,
          fromEmail: this.provider.formatFromAddress(),
          subject: input.templateKey,
          metadata: { skipped: check.reason },
          idempotencyKey: input.idempotencyKey,
        });
        await this.logs.markSkipped(log.id, check.reason ?? 'preference_blocked');
        return { sent: false, skipped: true, reason: check.reason, logId: log.id };
      }
    }

    const template = await this.templates.getActiveByKey(input.templateKey);
    const subject = renderEmailTemplate(template.subject, ctx);
    const textBody = renderEmailTemplate(template.textBody, ctx);
    let htmlBody = renderEmailTemplate(template.htmlBody, ctx);

    if (input.cta) {
      const ctaUrl = renderEmailTemplate(`{{${input.cta.urlVar}}}`, ctx);
      htmlBody = wrapEmailHtml(htmlBody, { label: input.cta.label, url: ctaUrl });
    } else {
      htmlBody = wrapEmailHtml(htmlBody);
    }

    const { log, duplicate } = await this.logs.createQueued({
      tenantId: input.tenantId,
      userId: input.userId,
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      paymentId: input.paymentId,
      subscriptionId: input.subscriptionId,
      templateKey: input.templateKey,
      idempotencyKey: input.idempotencyKey,
      toEmail: input.toEmail,
      fromEmail: this.provider.formatFromAddress(),
      subject,
      metadata: { eventContext: input.context },
    });

    if (duplicate) {
      return { sent: false, duplicate: true, logId: log.id };
    }

    const job: EmailQueueJobData = {
      logId: log.id,
      templateKey: input.templateKey,
      toEmail: input.toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    };

    await this.queue.enqueue(job, input.delayMs ?? 0);
    return { sent: true, queued: true, logId: log.id };
  }
  async resendFailed(logId: string) {
    const log = await this.logs.getById(logId);
    if (!log || log.status !== 'FAILED') return { resent: false };

    const template = await this.templates.getByKey(log.templateKey);
    const ctx = (log.metadata as { eventContext?: EmailMergeContext })?.eventContext ?? {};
    const mergedCtx = this.buildBaseContext(ctx);
    const subject = renderEmailTemplate(template.subject, mergedCtx);
    const text = renderEmailTemplate(template.textBody, mergedCtx);
    const html = wrapEmailHtml(renderEmailTemplate(template.htmlBody, mergedCtx));

    await this.queue.enqueue({
      logId: log.id,
      templateKey: log.templateKey,
      toEmail: log.toEmail,
      subject,
      text,
      html,
    });
    return { resent: true };
  }

  async sendTestEmail(templateKey: string, toEmail: string) {
    const sample = this.buildBaseContext({
      user: { name: 'Alex Morgan', email: toEmail },
      tenant: { name: 'Acme Trading Co.' },
      workspace: { name: 'Acme Workspace' },
      plan: { name: 'Professional' },
      subscription: { status: 'ACTIVE', renewalDate: '2026-08-01' },
      invoice: { number: 'INV-2026-001', amount: '149.00', currency: 'USD' },
      payment: { status: 'SUCCEEDED', date: '2026-07-05' },
      inviteUrl: `${getAppBaseUrl()}/invite/sample-token`,
    });

    return this.sendLifecycleEmail({
      templateKey,
      toEmail,
      context: sample,
      skipPreferenceCheck: true,
      idempotencyKey: `test:${templateKey}:${toEmail}:${Date.now()}`,
    });
  }

  scheduleOnboardingSequence(input: {
    userId: string;
    tenantId: string;
    email: string;
    userName: string;
    workspaceName: string;
  }) {
    const base = this.buildBaseContext({
      user: { name: input.userName, email: input.email },
      workspace: { name: input.workspaceName },
      tenant: { name: input.workspaceName },
    });

    return Promise.all(
      ONBOARDING_TEMPLATES.map((templateKey, index) =>
        this.emit(EMAIL_EVENT_TYPES.ONBOARDING_STEP, 'user', `${input.userId}:${templateKey}`, {
          ...input,
          templateKey,
          delayMs: ONBOARDING_DELAYS_MS[index],
          context: base,
          idempotencyKey: `onboarding:${input.userId}:${templateKey}`,
        }),
      ),
    );
  }

  scheduleDunningSequence(input: {
    userId: string;
    tenantId: string;
    paymentId: string;
    subscriptionId: string;
    email: string;
    userName: string;
    workspaceName: string;
    planName: string;
  }) {
    const templates = [
      EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED,
      EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_2,
      EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_3,
      EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED_DUNNING_4,
    ] as const;

    const base = this.buildBaseContext({
      user: { name: input.userName, email: input.email },
      workspace: { name: input.workspaceName },
      plan: { name: input.planName },
    });

    return Promise.all(
      templates.map((templateKey, index) =>
        this.emit(EMAIL_EVENT_TYPES.DUNNING_REMINDER, 'payment', `${input.paymentId}:${index}`, {
          ...input,
          templateKey,
          attempt: index + 1,
          delayMs: DUNNING_DELAYS_MS[index],
          context: base,
          idempotencyKey: `dunning:${input.paymentId}:${index}`,
        }),
      ),
    );
  }

  private async onUserRegistered(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.WELCOME,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
      idempotencyKey: `welcome:${payload.userId}`,
      context: ctx,
      cta: { label: 'Open Workspace', urlVar: 'loginUrl' },
    });
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.TENANT_OWNER_WELCOME,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
      idempotencyKey: `tenant_owner_welcome:${payload.userId}`,
      context: ctx,
      cta: { label: 'Open Workspace', urlVar: 'loginUrl' },
    });
    if (payload.tenantId && payload.userId) {
      await this.scheduleOnboardingSequence({
        userId: String(payload.userId),
        tenantId: String(payload.tenantId),
        email: String(payload.email),
        userName: String((ctx.user as { name?: string })?.name ?? 'there'),
        workspaceName: String((ctx.workspace as { name?: string })?.name ?? 'your workspace'),
      });
    }
  }

  private async onWorkspaceCreated(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.WORKSPACE_CREATED,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      idempotencyKey: `workspace_created:${payload.workspaceId}`,
      context: ctx,
      cta: { label: 'Complete Setup', urlVar: 'loginUrl' },
    });
  }

  private async onUserInvited(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext({
      ...(payload.context as EmailMergeContext),
      inviteUrl: String(payload.inviteUrl),
    });
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.USER_INVITED,
      toEmail: String(payload.email),
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
      idempotencyKey: `user_invited:${payload.inviteId}`,
      context: ctx,
      cta: { label: 'Accept Invitation', urlVar: 'inviteUrl' },
      skipPreferenceCheck: true,
    });
  }

  private async onRoleUpdated(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.USER_ROLE_UPDATED,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      idempotencyKey: `role_updated:${payload.membershipId}:${payload.newRole}`,
      context: ctx,
      cta: { label: 'Open Workspace', urlVar: 'loginUrl' },
    });
  }

  private async onPaymentSucceeded(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.PAYMENT_SUCCESS,
      toEmail: String(payload.email),
      userId: payload.userId ? String(payload.userId) : null,
      tenantId: String(payload.tenantId),
      paymentId: String(payload.paymentId),
      invoiceId: payload.invoiceId ? String(payload.invoiceId) : null,
      subscriptionId: payload.subscriptionId ? String(payload.subscriptionId) : null,
      idempotencyKey: `payment_success:${payload.paymentId}`,
      context: ctx,
      cta: { label: 'Download Invoice', urlVar: 'invoiceUrl' },
    });
  }

  private async onPaymentFailed(payload: Record<string, unknown>) {
    await this.scheduleDunningSequence({
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      paymentId: String(payload.paymentId),
      subscriptionId: String(payload.subscriptionId),
      email: String(payload.email),
      userName: String(payload.userName ?? 'there'),
      workspaceName: String(payload.workspaceName ?? 'your workspace'),
      planName: String(payload.planName ?? 'your plan'),
    });
  }

  private async onPaymentRecovered(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.PAYMENT_RECOVERED,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      paymentId: String(payload.paymentId),
      idempotencyKey: `payment_recovered:${payload.paymentId}`,
      context: ctx,
      cta: { label: 'View Billing', urlVar: 'billingUrl' },
    });
  }

  private async onInvoiceCreated(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.INVOICE_GENERATED,
      toEmail: String(payload.email),
      userId: payload.userId ? String(payload.userId) : null,
      tenantId: String(payload.tenantId),
      invoiceId: String(payload.invoiceId),
      idempotencyKey: `invoice_created:${payload.invoiceId}`,
      context: ctx,
      cta: { label: 'View Invoice', urlVar: 'invoiceUrl' },
    });
  }

  private async onSubscriptionCancelled(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_CANCELLED,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      subscriptionId: String(payload.subscriptionId),
      idempotencyKey: `subscription_cancelled:${payload.subscriptionId}`,
      context: ctx,
      cta: { label: 'View Subscription', urlVar: 'billingUrl' },
    });
  }

  private async onRenewalReminder(payload: Record<string, unknown>) {
    const daysBefore = Number(payload.daysBefore ?? 7);
    const templateKey =
      daysBefore <= 1
        ? EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_RENEWAL_REMINDER_1D
        : EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_RENEWAL_REMINDER;
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      subscriptionId: String(payload.subscriptionId),
      idempotencyKey: `subscription_renewal:${payload.subscriptionId}:${payload.renewalDate}:${daysBefore}d`,
      context: ctx,
      cta: { label: 'Manage Billing', urlVar: 'billingUrl' },
    });
  }

  private async onTrialStarted(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.TRIAL_STARTED,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      idempotencyKey: `trial_started:${payload.subscriptionId}`,
      context: ctx,
      cta: { label: 'Open Workspace', urlVar: 'loginUrl' },
    });
  }

  private async onTrialEndingSoon(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.TRIAL_ENDING_SOON,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      idempotencyKey: `trial_ending:${payload.subscriptionId}`,
      context: ctx,
      cta: { label: 'Choose Plan', urlVar: 'billingUrl' },
    });
  }

  private async onSubscriptionReactivated(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.SUBSCRIPTION_REACTIVATED,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      idempotencyKey: `subscription_reactivated:${payload.subscriptionId}`,
      context: ctx,
      cta: { label: 'Open Workspace', urlVar: 'loginUrl' },
    });
  }

  private async onAccountSuspended(payload: Record<string, unknown>) {
    const ctx = this.buildBaseContext(payload.context as EmailMergeContext);
    await this.sendLifecycleEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.ACCOUNT_SUSPENDED_BILLING,
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      idempotencyKey: `account_suspended:${payload.tenantId}`,
      context: ctx,
      cta: { label: 'Update Billing', urlVar: 'billingUrl' },
    });
  }

  private async onOnboardingStep(payload: Record<string, unknown>) {
    const tenantId = String(payload.tenantId);
    const userId = String(payload.userId);
    const templateKey = String(payload.templateKey);

    if (await this.shouldSkipOnboardingStep(tenantId, userId, templateKey)) {
      return;
    }

    await this.sendLifecycleEmail({
      templateKey,
      toEmail: String(payload.email),
      userId,
      tenantId,
      idempotencyKey: String(payload.idempotencyKey),
      context: payload.context as EmailMergeContext,
      delayMs: Number(payload.delayMs ?? 0),
      cta: { label: 'Open Workspace', urlVar: 'loginUrl' },
    });
  }

  private async onDunningReminder(payload: Record<string, unknown>) {
    await this.sendLifecycleEmail({
      templateKey: String(payload.templateKey),
      toEmail: String(payload.email),
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      paymentId: String(payload.paymentId),
      subscriptionId: String(payload.subscriptionId),
      idempotencyKey: String(payload.idempotencyKey),
      context: payload.context as EmailMergeContext,
      delayMs: Number(payload.delayMs ?? 0),
      cta: { label: 'Update Billing', urlVar: 'billingUrl' },
    });
  }

  private async shouldSkipOnboardingStep(
    tenantId: string,
    userId: string,
    templateKey: string,
  ): Promise<boolean> {
    const workspace = await this.prisma.client.workspace.findFirst({
      where: { tenantId },
      include: {
        tenant: {
          include: {
            crmCustomers: { take: 1 },
            inventoryProducts: { take: 1 },
            memberships: { where: { isActive: true } },
          },
        },
      },
    });
    if (!workspace) return true;

    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (user?.lastLoginAt && templateKey === EMAIL_TEMPLATE_KEYS.ONBOARDING_5_INACTIVE) {
      const daysSinceLogin = (Date.now() - user.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceLogin < 3) return true;
    }

    if (templateKey === EMAIL_TEMPLATE_KEYS.ONBOARDING_2_PROFILE) {
      const profileComplete = Boolean(workspace.countryCode && workspace.currency);
      if (profileComplete) return true;
    }
    if (templateKey === EMAIL_TEMPLATE_KEYS.ONBOARDING_3_TEAM) {
      const hasTeam = (workspace.tenant.memberships?.length ?? 0) > 1;
      const hasProducts = (workspace.tenant.inventoryProducts?.length ?? 0) > 0;
      const hasCustomers = (workspace.tenant.crmCustomers?.length ?? 0) > 0;
      if (hasTeam && hasProducts && hasCustomers) return true;
    }
    if (templateKey === EMAIL_TEMPLATE_KEYS.ONBOARDING_4_INVOICE) {
      const quotationCount = await this.prisma.client.crmQuotation.count({
        where: { tenantId },
      });
      if (quotationCount > 0) return true;
    }

    return false;
  }

  async getTenantOwnerEmail(tenantId: string) {
    const membership = await this.prisma.client.tenantMembership.findFirst({
      where: { tenantId, role: 'TENANT_OWNER', isActive: true },
      include: { user: true, tenant: { include: { workspace: true } } },
    });
    return membership;
  }

  async notifySignup(result: {
    user: { id: string; email: string; name: string | null };
    tenant: { id: string; name: string };
    workspace: { id: string; name: string };
  }) {
    const context = this.buildBaseContext({
      user: { name: result.user.name ?? result.user.email, email: result.user.email },
      tenant: { name: result.tenant.name },
      workspace: { name: result.workspace.name },
    });

    await this.emit(EMAIL_EVENT_TYPES.USER_REGISTERED, 'user', result.user.id, {
      userId: result.user.id,
      tenantId: result.tenant.id,
      workspaceId: result.workspace.id,
      email: result.user.email,
      context,
    });

    await this.emit(EMAIL_EVENT_TYPES.TENANT_WORKSPACE_CREATED, 'workspace', result.workspace.id, {
      userId: result.user.id,
      tenantId: result.tenant.id,
      workspaceId: result.workspace.id,
      email: result.user.email,
      context,
    });
  }

  async notifyPaymentSucceeded(paymentId: string) {
    const payment = await this.prisma.client.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: true,
        invoice: true,
      },
    });
    if (!payment) return;

    const owner = await this.getTenantOwnerEmail(payment.tenantId);
    if (!owner?.user) return;

    const context = this.buildBaseContext({
      user: { name: owner.user.name ?? owner.user.email, email: owner.user.email },
      workspace: { name: owner.tenant.workspace?.name ?? owner.tenant.name },
      plan: { name: payment.subscription.plan },
      invoice: {
        number: payment.invoice?.invoiceNumber ?? payment.id.slice(0, 8).toUpperCase(),
        amount: String(payment.amount),
        currency: payment.currency,
      },
      payment: {
        status: payment.status,
        date: new Date().toISOString().slice(0, 10),
      },
      invoiceUrl: `${getAppBaseUrl()}/app/settings/billing?invoice=${payment.invoiceId ?? payment.id}`,
    });

    await this.emit(EMAIL_EVENT_TYPES.PAYMENT_SUCCEEDED, 'payment', paymentId, {
      tenantId: payment.tenantId,
      paymentId,
      invoiceId: payment.invoiceId,
      subscriptionId: payment.subscriptionId,
      userId: owner.user.id,
      email: owner.user.email,
      context,
    });

    if (payment.invoiceId) {
      await this.emit(EMAIL_EVENT_TYPES.INVOICE_CREATED, 'invoice', payment.invoiceId, {
        tenantId: payment.tenantId,
        invoiceId: payment.invoiceId,
        userId: owner.user.id,
        email: owner.user.email,
        context,
      });
    }
  }

  async notifyPaymentFailed(paymentId: string) {
    const payment = await this.prisma.client.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });
    if (!payment) return;

    const owner = await this.getTenantOwnerEmail(payment.tenantId);
    if (!owner?.user) return;

    await this.emit(EMAIL_EVENT_TYPES.PAYMENT_FAILED, 'payment', paymentId, {
      tenantId: payment.tenantId,
      paymentId,
      subscriptionId: payment.subscriptionId,
      userId: owner.user.id,
      email: owner.user.email,
      userName: owner.user.name ?? owner.user.email,
      workspaceName: owner.tenant.workspace?.name ?? owner.tenant.name,
      planName: payment.subscription.plan,
    });
  }

  async notifySubscriptionCancelled(tenantId: string, subscriptionId: string) {
    const owner = await this.getTenantOwnerEmail(tenantId);
    if (!owner?.user) return;

    await this.emit(EMAIL_EVENT_TYPES.SUBSCRIPTION_CANCELLED, 'subscription', subscriptionId, {
      tenantId,
      subscriptionId,
      userId: owner.user.id,
      email: owner.user.email,
      context: this.buildBaseContext({
        user: { name: owner.user.name ?? owner.user.email, email: owner.user.email },
        workspace: { name: owner.tenant.workspace?.name ?? owner.tenant.name },
      }),
    });
  }

  async notifyTrialStarted(tenantId: string, subscriptionId: string, planName: string) {
    const owner = await this.getTenantOwnerEmail(tenantId);
    if (!owner?.user) return;

    await this.emit(EMAIL_EVENT_TYPES.TRIAL_STARTED, 'subscription', subscriptionId, {
      tenantId,
      subscriptionId,
      userId: owner.user.id,
      email: owner.user.email,
      context: this.buildBaseContext({
        user: { name: owner.user.name ?? owner.user.email, email: owner.user.email },
        workspace: { name: owner.tenant.workspace?.name ?? owner.tenant.name },
        plan: { name: planName },
      }),
    });
  }
}
