import { apiFetch } from '@/lib/api/client';

export type EmailTemplateCategory =
  | 'TRANSACTIONAL'
  | 'MARKETING'
  | 'ONBOARDING'
  | 'BILLING'
  | 'SECURITY'
  | 'SUPPORT';

export type EmailLogStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'FAILED'
  | 'SKIPPED';

export type EmailTemplateRecord = {
  id: string;
  key: string;
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  previewText: string | null;
  htmlBody: string;
  textBody: string;
  isActive: boolean;
  version: number;
};

export type EmailLogRecord = {
  id: string;
  tenantId: string | null;
  userId: string | null;
  customerId: string | null;
  templateKey: string;
  toEmail: string;
  subject: string;
  status: EmailLogStatus;
  provider: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type EmailPreferenceRecord = {
  id: string;
  billingAlertsEnabled: boolean;
  securityAlertsEnabled: boolean;
  productUpdatesOptIn: boolean;
  marketingOptIn: boolean;
  trainingAnnouncementsOptIn: boolean;
  preferenceToken: string;
};

export async function loadPlatformEmailTemplates() {
  return apiFetch<EmailTemplateRecord[]>('/email/platform/templates');
}

export async function updatePlatformEmailTemplate(
  key: string,
  data: Partial<
    Pick<
      EmailTemplateRecord,
      'name' | 'subject' | 'previewText' | 'htmlBody' | 'textBody' | 'isActive'
    >
  >,
) {
  return apiFetch<EmailTemplateRecord>(`/email/platform/templates/${key}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function sendTestPlatformEmail(key: string, toEmail: string) {
  return apiFetch<{ sent: boolean; logId?: string }>(`/email/platform/templates/${key}/test`, {
    method: 'POST',
    body: JSON.stringify({ toEmail }),
  });
}

export type MailConfigurationStatus = {
  configured: boolean;
  provider: string;
  smtpConfigured: boolean;
  resendConfigured: boolean;
  sendgridConfigured: boolean;
  redisQueue: boolean;
  warnings: string[];
};

export async function loadPlatformMailStatus() {
  return apiFetch<MailConfigurationStatus>('/email/platform/status');
}

export async function sendPlatformConnectivityTest(toEmail: string) {
  return apiFetch<{ sent: boolean; skipped?: boolean; reason?: string; status: MailConfigurationStatus }>(
    '/email/platform/test',
    {
      method: 'POST',
      body: JSON.stringify({ toEmail }),
    },
  );
}

export async function loadPlatformEmailLogs(params?: { tenantId?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.tenantId) qs.set('tenantId', params.tenantId);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiFetch<EmailLogRecord[]>(`/email/platform/logs${query ? `?${query}` : ''}`);
}

export async function resendPlatformEmailLog(id: string) {
  return apiFetch<{ resent: boolean }>(`/email/platform/logs/${id}/resend`, { method: 'POST' });
}

export async function loadEmailPreferences() {
  return apiFetch<EmailPreferenceRecord>('/email/preferences');
}

export async function updateEmailPreferences(
  data: Partial<
    Pick<
      EmailPreferenceRecord,
      | 'billingAlertsEnabled'
      | 'securityAlertsEnabled'
      | 'productUpdatesOptIn'
      | 'marketingOptIn'
      | 'trainingAnnouncementsOptIn'
    >
  >,
) {
  return apiFetch<EmailPreferenceRecord>('/email/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function loadTenantEmailLogs(limit = 50) {
  return apiFetch<EmailLogRecord[]>(`/email/logs?limit=${limit}`);
}

export async function loadCustomerEmailTimeline(customerId: string) {
  return apiFetch<EmailLogRecord[]>(`/email/crm/customers/${customerId}/timeline`);
}

export async function loadSupportReplyTemplates() {
  return apiFetch<Array<{ key: string; name: string; subject: string }>>(
    '/email/support/templates',
  );
}

export async function previewSupportReplyTemplate(key: string) {
  return apiFetch<{ subject: string; body: string }>(`/email/support/templates/${key}/preview`);
}
