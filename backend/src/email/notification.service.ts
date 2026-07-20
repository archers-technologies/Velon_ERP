import { Injectable, Logger } from '@nestjs/common';
import { EMAIL_EVENT_TYPES, EMAIL_TEMPLATE_KEYS, type EmailMergeContext } from '@velon/shared';
import {
  formatMailProviderForLog,
  resendConfigured,
  resolveMailProvider,
  sendTransactionalMail,
  smtpConfigured,
} from '../common/mail-delivery.util';
import {
  formatDeviceFromUserAgent,
  formatLoginTime,
  securityLoginWarningText,
  type RequestMeta,
} from '../common/request-meta.util';
import { EmailLifecycleService } from './email-lifecycle.service';
import { EmailLogService } from './email-log.service';
import { EmailProviderService } from './email-provider.service';
import { renderEmailTemplate, wrapEmailHtml } from './email-template-renderer.util';
import { EmailTemplateService } from './email-template.service';

export type MailConfigurationStatus = {
  configured: boolean;
  provider: string;
  smtpConfigured: boolean;
  resendConfigured: boolean;
  sendgridConfigured: boolean;
  redisQueue: boolean;
  warnings: string[];
};

export type LoginNotificationInput = {
  userId: string;
  email: string;
  userName: string;
  tenantId?: string | null;
  workspaceName: string;
  meta?: RequestMeta;
  loginAt?: Date;
};

@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);

  constructor(
    private readonly lifecycle: EmailLifecycleService,
    private readonly logs: EmailLogService,
    private readonly provider: EmailProviderService,
    private readonly templates: EmailTemplateService,
  ) {}

  getMailConfigurationStatus(): MailConfigurationStatus {
    const provider = resolveMailProvider();
    const warnings: string[] = [];

    if (provider === 'none') {
      warnings.push(
        'No mail provider configured. Set RESEND_API_KEY + RESEND_FROM or SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
      );
    }
    if (smtpConfigured() && provider !== 'smtp' && resendConfigured()) {
      warnings.push('SMTP credentials are present but Resend is the active provider.');
    }
    if (!process.env.REDIS_URL?.trim() && process.env.NODE_ENV !== 'test') {
      warnings.push(
        'REDIS_URL is not set — emails are sent inline instead of via background queue.',
      );
    }

    return {
      configured: provider !== 'none',
      provider,
      smtpConfigured: smtpConfigured(),
      resendConfigured: resendConfigured(),
      sendgridConfigured: Boolean(process.env.SENDGRID_API_KEY?.trim()),
      redisQueue: Boolean(process.env.REDIS_URL?.trim()),
      warnings,
    };
  }

  logStartupMailStatus(): void {
    this.log.warn(formatMailProviderForLog());
    const status = this.getMailConfigurationStatus();
    if (!status.configured) {
      this.log.warn(
        'EMAIL NOT CONFIGURED — transactional and lifecycle emails will be skipped until mail env vars are set.',
      );
      for (const warning of status.warnings) {
        this.log.warn(warning);
      }
    } else {
      this.log.log(`Email provider ready: ${status.provider}`);
    }
  }

  async sendConnectivityTest(toEmail: string) {
    const status = this.getMailConfigurationStatus();
    if (!status.configured) {
      return {
        sent: false,
        skipped: true,
        reason: 'mail_not_configured',
        status,
      };
    }

    const context = this.lifecycle.buildBaseContext({
      user: { name: 'Velon Admin', email: toEmail },
      workspace: { name: 'Velon ERP Platform' },
    });

    return this.sendTemplated({
      templateKey: EMAIL_TEMPLATE_KEYS.WELCOME,
      toEmail,
      context,
      skipPreferenceCheck: true,
      idempotencyKey: `connectivity-test:${toEmail}:${Date.now()}`,
    });
  }

  async notifyLogin(input: LoginNotificationInput) {
    const loginAt = input.loginAt ?? new Date();
    const idempotencyKey = `login:${input.userId}:${loginAt.toISOString()}`;
    const context = this.lifecycle.buildBaseContext({
      user: { name: input.userName, email: input.email },
      workspace: { name: input.workspaceName },
      tenant: input.tenantId ? { name: input.workspaceName } : undefined,
      security: {
        loginTime: formatLoginTime(loginAt),
        ipAddress: input.meta?.ip?.trim() || 'Unknown',
        device: formatDeviceFromUserAgent(input.meta?.ua),
        warning: securityLoginWarningText(),
      },
    });

    // One event per login — not per user (EmailEvent dedupes on eventType + entityId).
    return this.emitSecurityEvent(EMAIL_EVENT_TYPES.USER_LOGGED_IN, 'user', idempotencyKey, {
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      email: input.email,
      context,
      idempotencyKey,
    });
  }

  async notifyPasswordChanged(input: {
    userId: string;
    email: string;
    userName: string;
    tenantId?: string | null;
    workspaceName?: string;
  }) {
    const context = this.lifecycle.buildBaseContext({
      user: { name: input.userName, email: input.email },
      workspace: { name: input.workspaceName ?? 'Velon ERP' },
    });

    return this.emitSecurityEvent(
      EMAIL_EVENT_TYPES.USER_PASSWORD_CHANGED,
      'user',
      `${input.userId}:${Date.now()}`,
      {
        userId: input.userId,
        tenantId: input.tenantId ?? null,
        email: input.email,
        context,
        idempotencyKey: `password_changed:${input.userId}:${Date.now()}`,
      },
    );
  }

  async notifyPasswordResetOtp(input: { email: string; userName: string; code: string }) {
    const context = this.lifecycle.buildBaseContext({
      user: { name: input.userName, email: input.email },
      otpCode: input.code,
    });

    return this.sendSecurityOtpImmediate({
      templateKey: EMAIL_TEMPLATE_KEYS.PASSWORD_RESET,
      toEmail: input.email,
      context,
      idempotencyKey: `password_reset_otp:${input.email}:${Date.now()}`,
    });
  }

  private async sendSecurityOtpImmediate(input: {
    templateKey: string;
    toEmail: string;
    context: EmailMergeContext;
    idempotencyKey: string;
  }) {
    const template = await this.templates.getActiveByKey(input.templateKey);
    const subject = renderEmailTemplate(template.subject, input.context);
    const text = renderEmailTemplate(template.textBody, input.context);
    const html = wrapEmailHtml(renderEmailTemplate(template.htmlBody, input.context));

    const { log, duplicate } = await this.logs.createQueued({
      templateKey: input.templateKey,
      toEmail: input.toEmail,
      fromEmail: this.provider.formatFromAddress(),
      subject,
      idempotencyKey: input.idempotencyKey,
      metadata: { otp: true, eventContext: input.context },
    });

    if (duplicate) {
      return { sent: false, duplicate: true, delivered: false, logId: log.id };
    }

    const mail = await sendTransactionalMail({ to: input.toEmail, subject, text, html });
    if (mail.delivered) {
      await this.logs.markSent(log.id, { provider: resolveMailProvider() });
      return { sent: true, delivered: true, logId: log.id };
    }

    const errorMessage =
      mail.resendFailureDetail?.message ??
      mail.failureDetail?.message ??
      mail.skippedReason ??
      'delivery_failed';
    await this.logs.markFailed(log.id, errorMessage);
    return {
      sent: false,
      delivered: false,
      skippedReason: mail.skippedReason,
      logId: log.id,
    };
  }

  async notifyQuotationCreated(input: {
    tenantId: string;
    quotationId: string;
    quotationNumber: string;
    userId: string;
    email: string;
    userName: string;
    workspaceName: string;
    status: string;
  }) {
    return this.emitBusinessEvent(
      EMAIL_EVENT_TYPES.CRM_QUOTATION_CREATED,
      'crm_quotation',
      input.quotationId,
      {
        templateKey: EMAIL_TEMPLATE_KEYS.QUOTATION_CREATED,
        ...input,
        context: this.lifecycle.buildBaseContext({
          user: { name: input.userName, email: input.email },
          workspace: { name: input.workspaceName },
          quotation: { number: input.quotationNumber, status: input.status },
        }),
      },
    );
  }

  async notifyQuotationSent(input: {
    tenantId: string;
    quotationId: string;
    quotationNumber: string;
    userId: string;
    email: string;
    userName: string;
    workspaceName: string;
    total: string;
    currency: string;
  }) {
    return this.emitBusinessEvent(
      EMAIL_EVENT_TYPES.CRM_QUOTATION_SENT,
      'crm_quotation',
      input.quotationId,
      {
        templateKey: EMAIL_TEMPLATE_KEYS.QUOTATION_SENT,
        ...input,
        context: this.lifecycle.buildBaseContext({
          user: { name: input.userName, email: input.email },
          workspace: { name: input.workspaceName },
          quotation: {
            number: input.quotationNumber,
            status: 'SENT',
            total: input.total,
            currency: input.currency,
          },
        }),
      },
    );
  }

  async notifyQuotationApproved(input: {
    tenantId: string;
    quotationId: string;
    quotationNumber: string;
    userId: string;
    email: string;
    userName: string;
    workspaceName: string;
  }) {
    return this.emitBusinessEvent(
      EMAIL_EVENT_TYPES.CRM_QUOTATION_APPROVED,
      'crm_quotation',
      input.quotationId,
      {
        templateKey: EMAIL_TEMPLATE_KEYS.QUOTATION_APPROVED,
        ...input,
        context: this.lifecycle.buildBaseContext({
          user: { name: input.userName, email: input.email },
          workspace: { name: input.workspaceName },
          quotation: { number: input.quotationNumber, status: 'APPROVED' },
        }),
      },
    );
  }

  async notifyQuotationRejected(input: {
    tenantId: string;
    quotationId: string;
    quotationNumber: string;
    userId: string;
    email: string;
    userName: string;
    workspaceName: string;
  }) {
    return this.emitBusinessEvent(
      EMAIL_EVENT_TYPES.CRM_QUOTATION_REJECTED,
      'crm_quotation',
      input.quotationId,
      {
        templateKey: EMAIL_TEMPLATE_KEYS.QUOTATION_REJECTED,
        ...input,
        context: this.lifecycle.buildBaseContext({
          user: { name: input.userName, email: input.email },
          workspace: { name: input.workspaceName },
          quotation: { number: input.quotationNumber, status: 'REJECTED' },
        }),
      },
    );
  }

  async notifySalesOrderCreated(input: {
    tenantId: string;
    salesOrderId: string;
    orderNumber: string;
    userId: string;
    email: string;
    userName: string;
    workspaceName: string;
    status: string;
    total: string;
    currency: string;
  }) {
    return this.emitBusinessEvent(
      EMAIL_EVENT_TYPES.SALES_ORDER_CREATED,
      'sales_order',
      input.salesOrderId,
      {
        templateKey: EMAIL_TEMPLATE_KEYS.SALES_ORDER_CREATED,
        ...input,
        context: this.lifecycle.buildBaseContext({
          user: { name: input.userName, email: input.email },
          workspace: { name: input.workspaceName },
          salesOrder: {
            number: input.orderNumber,
            status: input.status,
            total: input.total,
            currency: input.currency,
          },
        }),
      },
    );
  }

  async notifyInventoryProductMajorUpdate(input: {
    tenantId: string;
    productId: string;
    userId: string;
    email: string;
    userName: string;
    workspaceName: string;
    productName: string;
    sku: string;
    action: 'created' | 'updated' | 'archived';
  }) {
    return this.emitBusinessEvent(
      EMAIL_EVENT_TYPES.INVENTORY_PRODUCT_MAJOR_UPDATE,
      'inventory_product',
      `${input.productId}:${input.action}`,
      {
        templateKey: EMAIL_TEMPLATE_KEYS.INVENTORY_PRODUCT_MAJOR_UPDATE,
        ...input,
        context: this.lifecycle.buildBaseContext({
          user: { name: input.userName, email: input.email },
          workspace: { name: input.workspaceName },
          product: { name: input.productName, sku: input.sku, action: input.action },
        }),
      },
    );
  }

  /** Delegate signup/billing lifecycle notifications to the existing service. */
  notifySignup(...args: Parameters<EmailLifecycleService['notifySignup']>) {
    return this.lifecycle.notifySignup(...args);
  }

  notifyTrialStarted(...args: Parameters<EmailLifecycleService['notifyTrialStarted']>) {
    return this.lifecycle.notifyTrialStarted(...args);
  }

  notifyPaymentSucceeded(...args: Parameters<EmailLifecycleService['notifyPaymentSucceeded']>) {
    return this.lifecycle.notifyPaymentSucceeded(...args);
  }

  notifyPaymentFailed(...args: Parameters<EmailLifecycleService['notifyPaymentFailed']>) {
    return this.lifecycle.notifyPaymentFailed(...args);
  }

  notifySubscriptionCancelled(
    ...args: Parameters<EmailLifecycleService['notifySubscriptionCancelled']>
  ) {
    return this.lifecycle.notifySubscriptionCancelled(...args);
  }

  emit(...args: Parameters<EmailLifecycleService['emit']>) {
    return this.lifecycle.emit(...args);
  }

  private async emitSecurityEvent(
    eventType: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    try {
      return await this.lifecycle.emit(eventType, entityType, entityId, payload);
    } catch (err) {
      this.log.error(`Security notification failed (${eventType}): ${String(err)}`);
      return { processed: false, duplicate: false };
    }
  }

  private async emitBusinessEvent(
    eventType: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    try {
      return await this.lifecycle.emit(eventType, entityType, entityId, payload);
    } catch (err) {
      this.log.warn(`Business notification failed (${eventType}): ${String(err)}`);
      return { processed: false, duplicate: false };
    }
  }

  private async sendTemplated(input: {
    templateKey: string;
    toEmail: string;
    userId?: string | null;
    tenantId?: string | null;
    context: EmailMergeContext;
    skipPreferenceCheck?: boolean;
    idempotencyKey?: string;
  }) {
    return this.lifecycle.sendLifecycleEmail({
      templateKey: input.templateKey,
      toEmail: input.toEmail,
      userId: input.userId,
      tenantId: input.tenantId,
      context: input.context,
      skipPreferenceCheck: input.skipPreferenceCheck,
      idempotencyKey: input.idempotencyKey,
    });
  }
}
