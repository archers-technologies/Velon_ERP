import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { EmailTemplateCategory } from '@velon/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_EMAIL_TEMPLATES } from './email-default-templates';

@Injectable()
export class EmailTemplateService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      await this.seedDefaults();
    } catch (err) {
      console.error(`Email template seed failed: ${String(err)}`);
    }
  }

  async seedDefaults() {
    for (const tpl of DEFAULT_EMAIL_TEMPLATES) {
      await this.prisma.client.emailTemplate.upsert({
        where: { key: tpl.key },
        update: {},
        create: {
          key: tpl.key,
          name: tpl.name,
          category: tpl.category,
          subject: tpl.subject,
          previewText: tpl.previewText ?? null,
          htmlBody: tpl.htmlBody,
          textBody: tpl.textBody,
          isActive: true,
        },
      });
    }
  }

  async list(filters?: { category?: EmailTemplateCategory; activeOnly?: boolean }) {
    return this.prisma.client.emailTemplate.findMany({
      where: {
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getByKey(key: string) {
    const tpl = await this.prisma.client.emailTemplate.findUnique({ where: { key } });
    if (!tpl) throw new NotFoundException(`Email template not found: ${key}`);
    return tpl;
  }

  async getActiveByKey(key: string) {
    const tpl = await this.prisma.client.emailTemplate.findFirst({
      where: { key, isActive: true },
    });
    if (!tpl) throw new NotFoundException(`Active email template not found: ${key}`);
    return tpl;
  }

  async update(
    key: string,
    data: {
      name?: string;
      subject?: string;
      previewText?: string | null;
      htmlBody?: string;
      textBody?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.getByKey(key);
    return this.prisma.client.emailTemplate.update({
      where: { key },
      data: {
        ...data,
        version: existing.version + 1,
      },
    });
  }
}
