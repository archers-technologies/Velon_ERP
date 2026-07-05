import { Injectable, Logger } from '@nestjs/common';
import {
  deliverViaResend,
  deliverViaSmtp,
  sendTransactionalMail,
  type TransactionalMail,
} from '../common/mail-delivery.util';
import {
  getFromEmail,
  getFromName,
  resolveEmailProvider,
  type EmailProviderId,
} from './email-env.util';

export type SendEmailResult = {
  delivered: boolean;
  provider: EmailProviderId;
  providerMessageId?: string;
  errorMessage?: string;
  skippedReason?: string;
};

@Injectable()
export class EmailProviderService {
  private readonly log = new Logger(EmailProviderService.name);

  resolveProvider(): EmailProviderId {
    return resolveEmailProvider();
  }

  formatFromAddress(): string {
    const email = getFromEmail();
    const name = getFromName();
    return name ? `${name} <${email}>` : email;
  }

  async send(input: TransactionalMail): Promise<SendEmailResult> {
    const provider = this.resolveProvider();

    if (provider === 'sendgrid') {
      return this.sendViaSendGrid(input);
    }

    const result = await sendTransactionalMail(input);
    if (result.delivered) {
      return { delivered: true, provider };
    }
    return {
      delivered: false,
      provider,
      skippedReason: result.skippedReason,
      errorMessage:
        result.failureDetail?.message ??
        result.resendFailureDetail?.message ??
        result.skippedReason,
    };
  }

  private async sendViaSendGrid(input: TransactionalMail): Promise<SendEmailResult> {
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    const from = this.formatFromAddress();
    if (!apiKey) {
      return { delivered: false, provider: 'sendgrid', skippedReason: 'sendgrid_not_configured' };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.to }] }],
          from: { email: getFromEmail(), name: getFromName() },
          subject: input.subject,
          content: [
            { type: 'text/plain', value: input.text },
            { type: 'text/html', value: input.html },
          ],
        }),
      });

      if (response.ok) {
        const messageId = response.headers.get('x-message-id') ?? undefined;
        return { delivered: true, provider: 'sendgrid', providerMessageId: messageId };
      }

      const body = await response.text();
      this.log.error(`SendGrid failed: ${response.status} ${body}`);
      return {
        delivered: false,
        provider: 'sendgrid',
        errorMessage: `SendGrid HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        delivered: false,
        provider: 'sendgrid',
        errorMessage: String(err),
      };
    }
  }
}

/** Direct delivery helpers for tests and provider diagnostics. */
export async function deliverEmailDirect(
  provider: EmailProviderId,
  input: TransactionalMail,
): Promise<void> {
  if (provider === 'resend') {
    await deliverViaResend(input);
    return;
  }
  if (provider === 'smtp') {
    await deliverViaSmtp(input);
  }
}
