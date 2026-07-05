import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { getRedisUrl } from '../config/env';
import { EmailDeliveryService } from './email-delivery.service';
import type { EmailQueueJobData } from './email-queue.types';

const QUEUE_NAME = 'velon-email-send';
const MAX_RETRIES = 3;

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(EmailQueueService.name);
  private queue: Queue<EmailQueueJobData> | null = null;
  private worker: Worker<EmailQueueJobData> | null = null;

  constructor(private readonly delivery: EmailDeliveryService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    if (!process.env.REDIS_URL?.trim()) return;

    try {
      const connection = { url: getRedisUrl() };
      this.queue = new Queue<EmailQueueJobData>(QUEUE_NAME, { connection });

      this.worker = new Worker<EmailQueueJobData>(QUEUE_NAME, async (job) => this.processJob(job), {
        connection,
        concurrency: 5,
      });

      this.worker.on('failed', (job, err) => {
        this.log.warn(`Email job ${job?.id} failed: ${String(err)}`);
      });
    } catch (err) {
      this.log.error(`Email queue failed to start: ${String(err)}`);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(data: EmailQueueJobData, delayMs = 0) {
    if (!this.queue || process.env.NODE_ENV === 'test') {
      await this.delivery.deliverQueuedEmail(data);
      return { queued: false as const, immediate: true as const };
    }

    await this.queue.add('send', data, {
      delay: delayMs,
      attempts: MAX_RETRIES,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
    return { queued: true as const, immediate: false as const };
  }

  private async processJob(job: Job<EmailQueueJobData>) {
    await this.delivery.deliverQueuedEmail(job.data);
  }
}
