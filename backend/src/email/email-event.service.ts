import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailEventService {
  constructor(private readonly prisma: PrismaService) {}

  async record(eventType: string, entityType: string, entityId: string, payload: unknown) {
    const tenantId =
      payload && typeof payload === 'object' && 'tenantId' in payload
        ? String((payload as { tenantId?: string }).tenantId ?? '')
        : null;

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
    } catch {
      const existing = await this.prisma.client.emailEvent.findUnique({
        where: { eventType_entityId: { eventType, entityId } },
      });
      if (existing) return { event: existing, duplicate: true as const };
      throw new Error('email_event_record_failed');
    }
  }

  async markProcessed(id: string) {
    return this.prisma.client.emailEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }
}
