import { Injectable, Logger } from '@nestjs/common';
import { sendTransactionalMail, type TransactionalMail } from '../common/mail-delivery.util';
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
      return this.sendViaSendGrid({
        ...input,
        from: input.from ?? this.formatFromAddress(),
      });
    }

    if (provider === 'none') {
      return {
        delivered: false,
        provider,
        skippedReason: 'mail_not_configured',
        errorMessage: 'mail_not_configured',
      };
    }

    const result = await sendTransactionalMail({
      ...input,
      from: input.from ?? this.formatFromAddress(),
    });
    if (result.delivered) {
      return {
        delivered: true,
        // Resend may fall back to SMTP on quota/API errors.
        provider: result.resendFailureDetail ? 'smtp' : provider,
      };
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
