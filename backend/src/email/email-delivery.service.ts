import { Injectable, Logger } from '@nestjs/common';
import { EmailEventService } from './email-event.service';
import { EmailLogService } from './email-log.service';
import { EmailProviderService } from './email-provider.service';
import type { EmailQueueJobData } from './email-queue.types';

@Injectable()
export class EmailDeliveryService {
  private readonly log = new Logger(EmailDeliveryService.name);

  constructor(
    private readonly logs: EmailLogService,
    private readonly provider: EmailProviderService,
    private readonly events: EmailEventService,
  ) {}

  async deliverQueuedEmail(job: EmailQueueJobData) {
    const result = await this.provider.send({
      to: job.toEmail,
      subject: job.subject,
      text: job.text,
      html: job.html,
      from: job.from,
    });

    if (result.delivered) {
      await this.logs.markSent(job.logId, {
        provider: result.provider,
        providerMessageId: result.providerMessageId,
      });
      return;
    }

    const errorMessage = result.errorMessage ?? result.skippedReason ?? 'delivery_failed';
    await this.logs.markFailed(job.logId, errorMessage);
    this.log.warn(`Email delivery failed for ${job.templateKey} → ${job.toEmail}: ${errorMessage}`);

    // Free the lifecycle event so schedulers / next login can retry after provider outages.
    if (job.eventType && job.entityId) {
      await this.events.releaseForRetry(job.eventType, job.entityId);
    }
  }
}
