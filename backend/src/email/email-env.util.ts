import { VELON_CONTACT_EMAIL } from '@velon/shared';
import {
  getPlatformFromRaw,
  resendConfigured,
  resolveMailProvider,
  smtpConfigured,
} from '../common/mail-delivery.util';

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
  const platformRaw = getPlatformFromRaw();
  if (platformRaw) {
    const match = platformRaw.match(/<([^>]+)>/);
    return (match ? match[1] : platformRaw).trim();
  }

  const raw =
    process.env.RESEND_FROM?.trim() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    getSupportEmail();
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

/**
 * Status/reporting resolver — stays aligned with actual delivery (`resolveMailProvider`)
 * and only reports providers that can actually send.
 */
export function resolveEmailProvider(): EmailProviderId {
  const explicit = (
    process.env.EMAIL_PROVIDER?.trim() ||
    process.env.MAIL_PROVIDER?.trim() ||
    ''
  ).toLowerCase();

  if (explicit === 'sendgrid') {
    return process.env.SENDGRID_API_KEY?.trim() ? 'sendgrid' : 'none';
  }
  if (explicit === 'ses' || explicit === 'mailgun') {
    // Named in env docs but not implemented — fall through to working transports.
    if (resendConfigured()) return 'resend';
    if (smtpConfigured()) return 'smtp';
    return 'none';
  }

  const mail = resolveMailProvider();
  if (mail !== 'none') return mail;

  if (process.env.SENDGRID_API_KEY?.trim()) return 'sendgrid';
  return 'none';
}
