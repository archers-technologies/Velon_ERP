import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmailDeliveryService } from './email-delivery.service';
import { EmailEventService } from './email-event.service';
import { EmailLifecycleService } from './email-lifecycle.service';
import { EmailLogService } from './email-log.service';
import { EmailPreferenceService } from './email-preference.service';
import { EmailProviderService } from './email-provider.service';
import { EmailQueueService } from './email-queue.service';
import { EmailSchedulerService } from './email-scheduler.service';
import { EmailTemplateService } from './email-template.service';
import { NotificationService } from './notification.service';
import { EmailController } from './email.controller';

@Module({
  imports: [AuditModule],
  controllers: [EmailController],
  providers: [
    EmailTemplateService,
    EmailLogService,
    EmailPreferenceService,
    EmailEventService,
    EmailProviderService,
    EmailDeliveryService,
    EmailQueueService,
    EmailLifecycleService,
    EmailSchedulerService,
    NotificationService,
  ],
  exports: [
    EmailLifecycleService,
    EmailLogService,
    EmailPreferenceService,
    EmailTemplateService,
    NotificationService,
  ],
})
export class EmailModule {}
