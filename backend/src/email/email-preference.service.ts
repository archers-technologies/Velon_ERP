import { Injectable } from '@nestjs/common';
import {
  MARKETING_TEMPLATE_KEYS,
  SECURITY_TEMPLATE_KEYS,
  TRANSACTIONAL_TEMPLATE_KEYS,
} from '@velon/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string, tenantId?: string | null) {
    const existing = await this.prisma.client.emailPreference.findFirst({
      where: { userId, tenantId: tenantId ?? null },
    });
    if (existing) return existing;

    return this.prisma.client.emailPreference.create({
      data: { userId, tenantId: tenantId ?? null },
    });
  }

  async update(
    userId: string,
    tenantId: string | null | undefined,
    data: {
      billingAlertsEnabled?: boolean;
      securityAlertsEnabled?: boolean;
      productUpdatesOptIn?: boolean;
      marketingOptIn?: boolean;
      trainingAnnouncementsOptIn?: boolean;
    },
  ) {
    const pref = await this.getOrCreate(userId, tenantId);
    return this.prisma.client.emailPreference.update({
      where: { id: pref.id },
      data: {
        ...data,
        unsubscribedAt:
          data.marketingOptIn === false &&
          data.productUpdatesOptIn === false &&
          data.trainingAnnouncementsOptIn === false
            ? new Date()
            : pref.unsubscribedAt,
      },
    });
  }

  async getByToken(token: string) {
    return this.prisma.client.emailPreference.findUnique({
      where: { preferenceToken: token },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async unsubscribeMarketing(token: string) {
    const pref = await this.getByToken(token);
    if (!pref) return null;
    return this.prisma.client.emailPreference.update({
      where: { id: pref.id },
      data: {
        marketingOptIn: false,
        productUpdatesOptIn: false,
        trainingAnnouncementsOptIn: false,
        unsubscribedAt: new Date(),
      },
    });
  }

  canSendTemplate(
    templateKey: string,
    pref: {
      transactionalEnabled: boolean;
      billingAlertsEnabled: boolean;
      securityAlertsEnabled: boolean;
      productUpdatesOptIn: boolean;
      marketingOptIn: boolean;
      trainingAnnouncementsOptIn: boolean;
    },
  ): { allowed: boolean; reason?: string } {
    if (SECURITY_TEMPLATE_KEYS.has(templateKey)) {
      return { allowed: true };
    }

    if (TRANSACTIONAL_TEMPLATE_KEYS.has(templateKey)) {
      if (!pref.transactionalEnabled) {
        return { allowed: false, reason: 'transactional_disabled' };
      }
      if (
        templateKey.includes('payment') ||
        templateKey.includes('invoice') ||
        templateKey.includes('subscription') ||
        templateKey.includes('trial') ||
        templateKey.includes('billing') ||
        templateKey.includes('dunning')
      ) {
        if (!pref.billingAlertsEnabled) {
          return { allowed: false, reason: 'billing_alerts_disabled' };
        }
      }
      return { allowed: true };
    }

    if (MARKETING_TEMPLATE_KEYS.has(templateKey)) {
      if (templateKey.startsWith('onboarding_')) {
        if (!pref.productUpdatesOptIn && !pref.marketingOptIn) {
          return { allowed: false, reason: 'marketing_opt_out' };
        }
        return { allowed: true };
      }
      if (!pref.marketingOptIn) {
        return { allowed: false, reason: 'marketing_opt_out' };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }
}
