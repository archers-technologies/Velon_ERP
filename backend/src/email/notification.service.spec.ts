import { EMAIL_EVENT_TYPES, EMAIL_TEMPLATE_KEYS, SECURITY_TEMPLATE_KEYS } from '@velon/shared';
import { EmailLifecycleService } from './email-lifecycle.service';
import { EmailLogService } from './email-log.service';
import { EmailProviderService } from './email-provider.service';
import { EmailTemplateService } from './email-template.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const lifecycle = {
    emit: jest.fn().mockResolvedValue({ processed: true, duplicate: false }),
    sendLifecycleEmail: jest.fn().mockResolvedValue({ sent: true, queued: true, logId: 'log-1' }),
    buildBaseContext: jest.fn((partial = {}) => ({
      companyName: 'Velon ERP',
      supportEmail: 'support@velonerp.com',
      loginUrl: 'http://localhost:8080/login',
      ...partial,
    })),
    notifySignup: jest.fn(),
  } as unknown as EmailLifecycleService;

  const logs = {
    createQueued: jest.fn().mockResolvedValue({
      log: { id: 'log-otp' },
      duplicate: false,
    }),
    markSent: jest.fn(),
    markFailed: jest.fn(),
  } as unknown as EmailLogService;

  const provider = {
    formatFromAddress: jest.fn().mockReturnValue('Velon ERP <noreply@velonerp.com>'),
  } as unknown as EmailProviderService;

  const templates = {
    getActiveByKey: jest.fn().mockResolvedValue({
      subject: 'Reset code',
      textBody: 'Code {{otpCode}}',
      htmlBody: '<p>{{otpCode}}</p>',
    }),
  } as unknown as EmailTemplateService;

  const service = new NotificationService(lifecycle, logs, provider, templates);

  beforeEach(() => jest.clearAllMocks());

  it('reports mail configuration status with warnings when unconfigured', () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;

    const status = service.getMailConfigurationStatus();
    expect(status.configured).toBe(false);
    expect(status.warnings.length).toBeGreaterThan(0);

    if (original) process.env.RESEND_API_KEY = original;
  });

  it('triggers login notification with tenant context', async () => {
    await service.notifyLogin({
      userId: 'user-1',
      email: 'alex@velonerp.com',
      userName: 'Alex',
      tenantId: 'tenant-1',
      workspaceName: 'Acme Workspace',
      meta: { ip: '203.0.113.10', ua: 'Mozilla/5.0' },
    });

    expect(lifecycle.emit).toHaveBeenCalledWith(
      EMAIL_EVENT_TYPES.USER_LOGGED_IN,
      'user',
      expect.stringMatching(/^login:user-1:/),
      expect.objectContaining({
        email: 'alex@velonerp.com',
        tenantId: 'tenant-1',
        idempotencyKey: expect.stringMatching(/^login:user-1:/),
        context: expect.objectContaining({
          workspace: { name: 'Acme Workspace' },
          security: expect.objectContaining({
            ipAddress: '203.0.113.10',
            warning: expect.stringContaining("wasn't you"),
          }),
        }),
      }),
    );
  });

  it('triggers password changed notification', async () => {
    await service.notifyPasswordChanged({
      userId: 'user-1',
      email: 'alex@velonerp.com',
      userName: 'Alex',
      tenantId: 'tenant-1',
      workspaceName: 'Acme Workspace',
    });

    expect(lifecycle.emit).toHaveBeenCalledWith(
      EMAIL_EVENT_TYPES.USER_PASSWORD_CHANGED,
      'user',
      expect.any(String),
      expect.objectContaining({
        email: 'alex@velonerp.com',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('triggers user invitation through lifecycle emit delegate', async () => {
    await service.emit(EMAIL_EVENT_TYPES.TENANT_USER_INVITED, 'invite', 'inv-1', {
      email: 'new@velonerp.com',
    });
    expect(lifecycle.emit).toHaveBeenCalled();
  });

  it('triggers payment notification helper', async () => {
    const notifyPaymentSucceeded = jest.fn().mockResolvedValue(undefined);
    const lifecycleWithPayment = {
      ...lifecycle,
      notifyPaymentSucceeded,
    } as unknown as EmailLifecycleService;
    const paymentService = new NotificationService(
      lifecycleWithPayment,
      logs,
      provider,
      templates,
    );

    await paymentService.notifyPaymentSucceeded('pay-1');
    expect(notifyPaymentSucceeded).toHaveBeenCalledWith('pay-1');
  });

  it('logs failed OTP delivery', async () => {
    const mailUtil = await import('../common/mail-delivery.util');
    jest.spyOn(mailUtil, 'sendTransactionalMail').mockResolvedValue({
      delivered: false,
      skippedReason: 'smtp_not_configured',
    });

    const result = await service.notifyPasswordResetOtp({
      email: 'alex@velonerp.com',
      userName: 'Alex',
      code: '123456',
    });

    expect(result.delivered).toBe(false);
    expect(logs.markFailed).toHaveBeenCalledWith('log-otp', 'smtp_not_configured');
  });

  it('keeps security templates in mandatory set', () => {
    expect(SECURITY_TEMPLATE_KEYS.has(EMAIL_TEMPLATE_KEYS.LOGIN_ALERT)).toBe(true);
    expect(SECURITY_TEMPLATE_KEYS.has(EMAIL_TEMPLATE_KEYS.PASSWORD_CHANGED)).toBe(true);
  });
});
