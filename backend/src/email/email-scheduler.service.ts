import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SubscriptionBillingStatus, TenantStatus } from '@velon/database';
import { EMAIL_EVENT_TYPES } from '@velon/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailLifecycleService } from './email-lifecycle.service';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class EmailSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(EmailSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: EmailLifecycleService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    void this.runScheduledChecks();
    this.timer = setInterval(() => void this.runScheduledChecks(), CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runScheduledChecks() {
    try {
      await Promise.all([
        this.checkRenewalReminders(),
        this.checkTrialEndingSoon(),
        this.checkSuspendedTenants(),
      ]);
    } catch (err) {
      this.log.warn(`Scheduled email check failed: ${String(err)}`);
    }
  }

  private async checkRenewalReminders() {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    const in1Day = new Date(now);
    in1Day.setDate(in1Day.getDate() + 1);

    const subscriptions = await this.prisma.client.subscription.findMany({
      where: {
        status: { in: [SubscriptionBillingStatus.ACTIVE, SubscriptionBillingStatus.TRIAL] },
        cancelAtPeriodEnd: false,
        currentPeriodEnd: {
          gte: now,
          lte: in7Days,
        },
      },
    });

    for (const sub of subscriptions) {
      const daysUntil = Math.ceil(
        (sub.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      const daysBefore = daysUntil <= 1 ? 1 : 7;
      const owner = await this.lifecycle.getTenantOwnerEmail(sub.tenantId);
      if (!owner?.user) continue;

      const renewalDate = sub.currentPeriodEnd.toISOString().slice(0, 10);
      await this.lifecycle.emit(
        EMAIL_EVENT_TYPES.SUBSCRIPTION_RENEWAL_REMINDER,
        'subscription',
        `${sub.id}:${renewalDate}:${daysBefore}d`,
        {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          userId: owner.user.id,
          email: owner.user.email,
          daysBefore,
          renewalDate,
          context: this.lifecycle.buildBaseContext({
            user: { name: owner.user.name ?? owner.user.email, email: owner.user.email },
            workspace: { name: owner.tenant.workspace?.name ?? owner.tenant.name },
            plan: { name: sub.plan },
            subscription: { status: sub.status, renewalDate },
          }),
        },
      );
    }
  }

  private async checkTrialEndingSoon() {
    const now = new Date();
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    const trials = await this.prisma.client.subscription.findMany({
      where: {
        status: SubscriptionBillingStatus.TRIAL,
        trialEndsAt: { gte: now, lte: in3Days },
      },
    });

    for (const sub of trials) {
      const owner = await this.lifecycle.getTenantOwnerEmail(sub.tenantId);
      if (!owner?.user) continue;

      await this.lifecycle.emit(
        EMAIL_EVENT_TYPES.TRIAL_ENDING_SOON,
        'subscription',
        `${sub.id}:trial_ending`,
        {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          userId: owner.user.id,
          email: owner.user.email,
          context: this.lifecycle.buildBaseContext({
            user: { name: owner.user.name ?? owner.user.email, email: owner.user.email },
            workspace: { name: owner.tenant.workspace?.name ?? owner.tenant.name },
            plan: { name: sub.plan },
          }),
        },
      );
    }
  }

  private async checkSuspendedTenants() {
    const suspended = await this.prisma.client.tenant.findMany({
      where: { status: TenantStatus.SUSPENDED },
      take: 50,
    });

    for (const tenant of suspended) {
      const owner = await this.lifecycle.getTenantOwnerEmail(tenant.id);
      if (!owner?.user) continue;

      await this.lifecycle.emit(EMAIL_EVENT_TYPES.SUBSCRIPTION_SUSPENDED, 'tenant', tenant.id, {
        tenantId: tenant.id,
        userId: owner.user.id,
        email: owner.user.email,
        context: this.lifecycle.buildBaseContext({
          user: { name: owner.user.name ?? owner.user.email, email: owner.user.email },
          workspace: { name: owner.tenant.workspace?.name ?? tenant.name },
          plan: { name: tenant.plan },
        }),
      });
    }
  }
}
