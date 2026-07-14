import {
  classifySmtpSendError,
  deliverViaResend,
  extractEmailAddress,
  getSmtpPassword,
  isNonDeliverableEmail,
  parseResendSendFailure,
  parseSmtpSecure,
  resendConfigured,
  resolveMailProvider,
  resolveSmtpPortAndSecure,
  resolveTenantCustomerFrom,
  sendTransactionalMail,
  shouldSendViaResend,
  shouldSendViaSmtp,
  smtpConfigured,
} from './mail-delivery.util';

const mockCreateTransport = jest.fn(() => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
}));

jest.mock('nodemailer', () => ({
  createTransport: () => mockCreateTransport(),
}));

describe('mail-delivery.util', () => {
  const env = process.env;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...env,
      NODE_ENV: 'development',
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'test@example.com',
      SMTP_USER: 'test@example.com',
      SMTP_PASS: 'secret',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
    };
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    delete process.env.MAIL_PROVIDER;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    process.env = env;
  });

  it('blocks *.test recipients', () => {
    expect(isNonDeliverableEmail('user@reactivation.test')).toBe(true);
    expect(isNonDeliverableEmail('user@gmail.com')).toBe(false);
  });

  it('never sends SMTP during test runs', () => {
    process.env.NODE_ENV = 'test';
    expect(shouldSendViaSmtp('user@gmail.com')).toBe(false);
  });

  it('blocks test domains even outside test env', () => {
    process.env.NODE_ENV = 'development';
    expect(shouldSendViaSmtp('self-delete@reactivation.test')).toBe(false);
    expect(shouldSendViaSmtp('user@gmail.com')).toBe(true);
  });

  it('parses SMTP_SECURE="false" as boolean false', () => {
    process.env.SMTP_SECURE = 'false';
    expect(parseSmtpSecure()).toBe(false);
  });

  it('parses SMTP_SECURE="true" as boolean true', () => {
    process.env.SMTP_SECURE = 'true';
    expect(parseSmtpSecure()).toBe(true);
  });

  it('does not force secure=true when port is 465 and SMTP_SECURE=false', () => {
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'false';
    expect(resolveSmtpPortAndSecure()).toEqual({ port: 465, secure: true });
  });

  it('forces secure=false when port is 587', () => {
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'true';
    expect(resolveSmtpPortAndSecure()).toEqual({ port: 587, secure: false });
  });

  it('accepts SMTP_PASSWORD as fallback for SMTP_PASS', () => {
    delete process.env.SMTP_PASS;
    process.env.SMTP_PASSWORD = 'fallback-secret';
    expect(getSmtpPassword()).toBe('fallback-secret');
    expect(smtpConfigured()).toBe(true);
  });

  it('marks Resend as configured when key and sender are provided', () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    expect(resendConfigured()).toBe(true);
  });

  it('does not use Resend in test environment', () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    process.env.NODE_ENV = 'test';
    expect(shouldSendViaResend('user@gmail.com')).toBe(false);
  });

  it('prefers Resend when both Resend and SMTP are configured', () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    expect(resolveMailProvider()).toBe('resend');
    expect(shouldSendViaResend('user@gmail.com')).toBe(true);
    expect(shouldSendViaSmtp('user@gmail.com')).toBe(false);
  });

  it('uses SMTP only when MAIL_PROVIDER=smtp', () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    process.env.MAIL_PROVIDER = 'smtp';
    expect(resolveMailProvider()).toBe('smtp');
    expect(shouldSendViaSmtp('user@gmail.com')).toBe(true);
    expect(shouldSendViaResend('user@gmail.com')).toBe(false);
  });

  it('does not create an SMTP transport when Resend is configured', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"id":"email_123"}',
    });

    const result = await sendTransactionalMail({
      to: 'user@gmail.com',
      subject: 'Test',
      text: 'hello',
      html: '<p>hello</p>',
    });

    expect(result.delivered).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('does not fall back to SMTP when Resend fails', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => '{"message":"Invalid API key"}',
    });

    const result = await sendTransactionalMail({
      to: 'user@gmail.com',
      subject: 'Test',
      text: 'hello',
      html: '<p>hello</p>',
    });

    expect(result.delivered).toBe(false);
    expect(result.skippedReason).toBe('resend_send_failed');
    expect(result.resendFailureDetail).toEqual({
      statusCode: 403,
      body: '{"message":"Invalid API key"}',
      message: 'Invalid API key',
    });
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('uses SMTP when Resend is not configured', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    const result = await sendTransactionalMail({
      to: 'user@gmail.com',
      subject: 'Test',
      text: 'hello',
      html: '<p>hello</p>',
    });

    expect(result.delivered).toBe(true);
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses Resend failure with full HTTP status and body', () => {
    const detail = parseResendSendFailure(422, '{"message":"Invalid from address"}');
    expect(detail.statusCode).toBe(422);
    expect(detail.body).toBe('{"message":"Invalid from address"}');
    expect(detail.message).toBe('Invalid from address');
  });

  it('classifies auth failures', () => {
    const detail = classifySmtpSendError({ code: 'EAUTH', message: 'Invalid login' });
    expect(detail.category).toBe('auth_failed');
  });

  it('classifies TLS mismatches', () => {
    const detail = classifySmtpSendError({
      message: 'wrong version number',
    });
    expect(detail.category).toBe('tls_mismatch');
  });

  it('throws resend_not_configured when Resend env vars are missing', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    await expect(
      deliverViaResend({
        to: 'user@gmail.com',
        subject: 'Test',
        text: 'hello',
        html: '<p>hello</p>',
      }),
    ).rejects.toThrow('resend_not_configured');
  });

  it('extracts address from Name <email> form', () => {
    expect(extractEmailAddress('Velon ERP <noreply@velonerp.com>')).toBe('noreply@velonerp.com');
    expect(extractEmailAddress('noreply@velonerp.com')).toBe('noreply@velonerp.com');
  });

  it('uses company email as From when it shares the platform domain', () => {
    process.env.MAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    expect(
      resolveTenantCustomerFrom({
        companyName: 'Acme Corp',
        companyEmail: 'billing@velonerp.com',
      }),
    ).toEqual({
      from: '"Acme Corp" <billing@velonerp.com>',
      replyTo: 'billing@velonerp.com',
    });
  });

  it('uses company email as From when it matches the SMTP mailbox', () => {
    process.env.MAIL_PROVIDER = 'smtp';
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    process.env.SMTP_FROM = 'Velon ERP <info@velonerp.com>';
    process.env.SMTP_USER = 'info@velonerp.com';
    expect(
      resolveTenantCustomerFrom({
        companyName: 'Acme Corp',
        companyEmail: 'info@velonerp.com',
      }),
    ).toEqual({
      from: '"Acme Corp" <info@velonerp.com>',
      replyTo: 'info@velonerp.com',
    });
  });

  it('uses company email as From on SMTP when it shares the platform domain', () => {
    process.env.MAIL_PROVIDER = 'smtp';
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    process.env.SMTP_FROM = 'Velon ERP <info@velonerp.com>';
    process.env.SMTP_USER = 'info@velonerp.com';
    expect(
      resolveTenantCustomerFrom({
        companyName: 'Acme Corp',
        companyEmail: 'billing@velonerp.com',
      }),
    ).toEqual({
      from: '"Acme Corp" <billing@velonerp.com>',
      replyTo: 'billing@velonerp.com',
    });
  });

  it('keeps platform envelope with tenant display name when domains differ', () => {
    process.env.MAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    expect(
      resolveTenantCustomerFrom({
        companyName: 'Acme Corp',
        companyEmail: 'owner@acme.com',
      }),
    ).toEqual({
      from: '"Acme Corp" <noreply@velonerp.com>',
      replyTo: 'owner@acme.com',
    });
  });

  it('forwards custom from and replyTo via Resend', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.RESEND_FROM = 'Velon ERP <noreply@velonerp.com>';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"id":"email_123"}',
    });

    await deliverViaResend({
      to: 'customer@gmail.com',
      from: '"Acme Corp" <billing@velonerp.com>',
      replyTo: 'billing@velonerp.com',
      subject: 'Invoice',
      text: 'attached',
      html: '<p>attached</p>',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(body.from).toBe('"Acme Corp" <billing@velonerp.com>');
    expect(body.reply_to).toBe('billing@velonerp.com');
  });
});
