import { EMAIL_TEMPLATE_KEYS } from '@velon/shared';
import { EmailEventService } from './email-event.service';
import { EmailLifecycleService } from './email-lifecycle.service';
import { EmailLogService } from './email-log.service';
import { EmailPreferenceService } from './email-preference.service';
import { EmailProviderService } from './email-provider.service';
import { EmailQueueService } from './email-queue.service';
import { EmailTemplateService } from './email-template.service';

describe('EmailLifecycleService security events', () => {
  const templates = {
    getActiveByKey: jest.fn().mockResolvedValue({
      subject: 'Alert',
      textBody: 'text',
      htmlBody: '<p>html</p>',
    }),
  } as unknown as EmailTemplateService;

  const logs = {
    createQueued: jest.fn().mockResolvedValue({ log: { id: 'log-1' }, duplicate: false }),
    markSkipped: jest.fn(),
  } as unknown as EmailLogService;

  const preferences = {
    getOrCreate: jest.fn(),
    canSendTemplate: jest
      .fn()
      .mockReturnValue({ allowed: false, reason: 'transactional_disabled' }),
  } as unknown as EmailPreferenceService;

  const events = {
    record: jest.fn().mockResolvedValue({ event: { id: 'evt-1' }, duplicate: false }),
    markProcessed: jest.fn(),
    releaseForRetry: jest.fn(),
  } as unknown as EmailEventService;

  const provider = {
    formatFromAddress: jest.fn().mockReturnValue('Velon ERP <noreply@velonerp.com>'),
  } as unknown as EmailProviderService;

  const queue = {
    enqueue: jest.fn(),
  } as unknown as EmailQueueService;

  const service = new EmailLifecycleService(
    { client: {} } as never,
    templates,
    logs,
    preferences,
    events,
    provider,
    queue,
  );

  beforeEach(() => jest.clearAllMocks());

  it('sends login alert without preference check', async () => {
    await service.emit('user.logged_in', 'user', 'user-1', {
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'alex@velonerp.com',
      idempotencyKey: 'login:user-1',
      context: {
        user: { name: 'Alex', email: 'alex@velonerp.com' },
        workspace: { name: 'Acme' },
      },
    });

    expect(logs.createQueued).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: EMAIL_TEMPLATE_KEYS.LOGIN_ALERT,
        toEmail: 'alex@velonerp.com',
      }),
    );
    expect(preferences.canSendTemplate).not.toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalled();
  });
});
