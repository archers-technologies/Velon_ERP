import { Injectable } from '@nestjs/common';
import { EmailLogStatus } from '@velon/database';
import { PrismaService } from '../prisma/prisma.service';

export type CreateEmailLogInput = {
  tenantId?: string | null;
  userId?: string | null;
  customerId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  subscriptionId?: string | null;
  templateKey: string;
  idempotencyKey?: string | null;
  toEmail: string;
  fromEmail: string;
  subject: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class EmailLogService {
  constructor(private readonly prisma: PrismaService) {}

  async createQueued(input: CreateEmailLogInput) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.client.emailLog.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        // Allow provider-outage retries for the same logical email.
        if (
          existing.status === EmailLogStatus.FAILED ||
          existing.status === EmailLogStatus.SKIPPED
        ) {
          const log = await this.prisma.client.emailLog.update({
            where: { id: existing.id },
            data: {
              status: EmailLogStatus.QUEUED,
              errorMessage: null,
              subject: input.subject,
              toEmail: input.toEmail,
              fromEmail: input.fromEmail,
              metadata: (input.metadata ?? undefined) as object | undefined,
            },
          });
          return { log, duplicate: false as const };
        }
        return { log: existing, duplicate: true as const };
      }
    }

    const log = await this.prisma.client.emailLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        customerId: input.customerId ?? null,
        invoiceId: input.invoiceId ?? null,
        paymentId: input.paymentId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        templateKey: input.templateKey,
        idempotencyKey: input.idempotencyKey ?? null,
        toEmail: input.toEmail,
        fromEmail: input.fromEmail,
        subject: input.subject,
        status: EmailLogStatus.QUEUED,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
    return { log, duplicate: false as const };
  }

  async markSent(
    id: string,
    opts: { provider?: string; providerMessageId?: string; sentAt?: Date },
  ) {
    return this.prisma.client.emailLog.update({
      where: { id },
      data: {
        status: EmailLogStatus.SENT,
        provider: opts.provider ?? null,
        providerMessageId: opts.providerMessageId ?? null,
        sentAt: opts.sentAt ?? new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(id: string, errorMessage: string) {
    return this.prisma.client.emailLog.update({
      where: { id },
      data: {
        status: EmailLogStatus.FAILED,
        errorMessage,
      },
    });
  }

  async markSkipped(id: string, reason: string) {
    return this.prisma.client.emailLog.update({
      where: { id },
      data: {
        status: EmailLogStatus.SKIPPED,
        errorMessage: reason,
      },
    });
  }

  async list(filters: {
    tenantId?: string;
    userId?: string;
    customerId?: string;
    templateKey?: string;
    status?: EmailLogStatus;
    limit?: number;
  }) {
    return this.prisma.client.emailLog.findMany({
      where: {
        ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.templateKey ? { templateKey: filters.templateKey } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
    });
  }

  async getById(id: string) {
    return this.prisma.client.emailLog.findUnique({ where: { id } });
  }
}
