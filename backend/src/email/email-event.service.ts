import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@velon/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailEventService {
  private readonly log = new Logger(EmailEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(eventType: string, entityType: string, entityId: string, payload: unknown) {
    const tenantId =
      payload && typeof payload === 'object' && 'tenantId' in payload
        ? String((payload as { tenantId?: string }).tenantId ?? '')
        : null;

    const existing = await this.prisma.client.emailEvent.findUnique({
      where: { eventType_entityId: { eventType, entityId } },
    });
    if (existing) {
      return { event: existing, duplicate: true as const };
    }

    try {
      const event = await this.prisma.client.emailEvent.create({
        data: {
          eventType,
          entityType,
          entityId,
          tenantId: tenantId || null,
          payloadJson: payload as object,
        },
      });
      return { event, duplicate: false as const };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.client.emailEvent.findUnique({
          where: { eventType_entityId: { eventType, entityId } },
        });
        if (raced) return { event: raced, duplicate: true as const };
      }
      this.log.error(`email_event_record_failed: ${String(err)}`);
      throw new Error('email_event_record_failed');
    }
  }

  async markProcessed(id: string) {
    return this.prisma.client.emailEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  /** Allow scheduler/login retries after a failed provider delivery. */
  async releaseForRetry(eventType: string, entityId: string) {
    try {
      await this.prisma.client.emailEvent.delete({
        where: { eventType_entityId: { eventType, entityId } },
      });
      return true;
    } catch {
      return false;
    }
  }
}
