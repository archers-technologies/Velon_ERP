import { Injectable } from '@nestjs/common';
import { EmailLogService } from './email-log.service';
import { EmailProviderService } from './email-provider.service';
import type { EmailQueueJobData } from './email-queue.types';

@Injectable()
export class EmailDeliveryService {
  constructor(
    private readonly logs: EmailLogService,
    private readonly provider: EmailProviderService,
  ) {}

  async deliverQueuedEmail(job: EmailQueueJobData) {
    const result = await this.provider.send({
      to: job.toEmail,
      subject: job.subject,
      text: job.text,
      html: job.html,
    });

    if (result.delivered) {
      await this.logs.markSent(job.logId, {
        provider: result.provider,
        providerMessageId: result.providerMessageId,
      });
      return;
    }

    await this.logs.markFailed(
      job.logId,
      result.errorMessage ?? result.skippedReason ?? 'delivery_failed',
    );
  }
}
