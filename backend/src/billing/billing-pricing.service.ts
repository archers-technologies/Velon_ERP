import { Injectable } from '@nestjs/common';
import { BillingInterval, TenantPlan } from '@velon/database';
import {
  planRegionalPricesFromDefinition,
  resolvePlanPrice,
  type PlanRegionalPrices,
  type ResolvedPlanPrice,
} from '@velon/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PlanDefinitionService } from './plan-definition.service';

export type TenantBillingContext = {
  billingCountry: string;
  billingCurrency: string;
};

@Injectable()
export class BillingPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planDefinitions: PlanDefinitionService,
  ) {}

  async getTenantBillingContext(tenantId: string): Promise<TenantBillingContext> {
    const workspace = await this.prisma.client.workspace.findFirst({
      where: { tenantId },
      select: { countryCode: true, currency: true },
    });
    return {
      billingCountry: workspace?.countryCode ?? 'SA',
      billingCurrency: workspace?.currency ?? 'SAR',
    };
  }

  async getRegionalPricesForPlan(plan: TenantPlan): Promise<PlanRegionalPrices> {
    const row = await this.prisma.client.planDefinition.findUnique({ where: { plan } });
    if (row) {
      return planRegionalPricesFromDefinition({
        saudiMonthlyPrice: row.saudiMonthlyPrice != null ? Number(row.saudiMonthlyPrice) : null,
        saudiAnnualPrice: row.saudiAnnualPrice != null ? Number(row.saudiAnnualPrice) : null,
        globalMonthlyPrice: row.globalMonthlyPrice != null ? Number(row.globalMonthlyPrice) : null,
        globalAnnualPrice: row.globalAnnualPrice != null ? Number(row.globalAnnualPrice) : null,
        monthlyPrice: Number(row.monthlyPrice),
        annualPrice: Number(row.annualPrice),
        currency: row.currency,
      });
    }
    const fallback = await this.planDefinitions.getForTenantPlan(plan);
    return planRegionalPricesFromDefinition(fallback);
  }

  async resolveForTenant(
    tenantId: string,
    plan: TenantPlan,
    billingInterval: BillingInterval,
  ): Promise<ResolvedPlanPrice> {
    const [ctx, regionalPrices] = await Promise.all([
      this.getTenantBillingContext(tenantId),
      this.getRegionalPricesForPlan(plan),
    ]);
    return resolvePlanPrice({
      planId: plan,
      billingCountry: ctx.billingCountry,
      billingCurrency: ctx.billingCurrency,
      billingInterval,
      regionalPrices,
    });
  }
}
