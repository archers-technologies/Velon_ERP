import { VELON_CONTACT_EMAIL } from '@velon/shared';

export type EmailProviderId = 'smtp' | 'resend' | 'sendgrid' | 'ses' | 'mailgun' | 'none';

export function getAppBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'https://velonerp.com' : 'http://localhost:8080')
  ).replace(/\/$/, '');
}

export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || VELON_CONTACT_EMAIL;
}

export function getBillingEmail(): string {
  return process.env.BILLING_EMAIL?.trim() || getSupportEmail();
}

export function getFromName(): string {
  return process.env.SMTP_FROM_NAME?.trim() || 'Velon ERP';
}

export function getFromEmail(): string {
  return (
    process.env.SMTP_FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    getSupportEmail()
  );
}

export function resolveEmailProvider(): EmailProviderId {
  const explicit = (
    process.env.EMAIL_PROVIDER?.trim() ||
    process.env.MAIL_PROVIDER?.trim() ||
    ''
  ).toLowerCase();

  if (explicit === 'smtp' || explicit === 'resend' || explicit === 'sendgrid') {
    return explicit as EmailProviderId;
  }
  if (explicit === 'ses' || explicit === 'mailgun') {
    return explicit as EmailProviderId;
  }

  if (process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()) return 'resend';
  if (
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    (process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim()) &&
    (process.env.SMTP_FROM?.trim() || process.env.SMTP_FROM_EMAIL?.trim())
  ) {
    return 'smtp';
  }
  if (process.env.SENDGRID_API_KEY?.trim()) return 'sendgrid';
  return 'none';
}
