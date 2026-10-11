import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPlan } from '@velon/database';
import {
  PLAN_CATALOG,
  planRegionalPricesFromDefinition,
  yearlyPriceFromMonthly,
} from '@velon/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdatePlanDefinitionDto } from './dto/billing.dto';

export type PlanDefinitionView = {
  id: TenantPlan;
  name: string;
  displayName: string;
  seatLimit: number | null;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  indiaMonthlyPrice: number;
  indiaAnnualPrice: number;
  globalMonthlyPrice: number;
  globalAnnualPrice: number;
  regionalPrices: {
    india: { monthlyPrice: number; annualPrice: number; currency: 'INR' };
    global: { monthlyPrice: number; annualPrice: number; currency: 'USD' };
  };
  storageLimitGb: number;
  invoiceLimitMo: number | null;
  branchLimit: number | null;
  trialDays: number;
  isEnabled: boolean;
  description: string;
  features: string[];
  modules: {
    hrm: boolean;
    crm: boolean;
    finance: boolean;
    inventory: boolean;
    manufacturing: boolean;
  };
};

@Injectable()
export class PlanDefinitionService {
  constructor(private readonly prisma: PrismaService) {}

  private fallbackFromShared(plan: TenantPlan): PlanDefinitionView {
    const entry = PLAN_CATALOG.find((p) => p.id === plan) ?? PLAN_CATALOG[0];
    const regionalPrices = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: entry.monthlyPrice,
      indiaAnnualPrice: yearlyPriceFromMonthly(entry.monthlyPrice),
      globalMonthlyPrice: entry.monthlyPrice,
      globalAnnualPrice: yearlyPriceFromMonthly(entry.monthlyPrice),
    });
    return {
      id: entry.id,
      name: entry.name,
      displayName: entry.displayName,
      seatLimit: entry.seatLimit,
      monthlyPrice: regionalPrices.india.monthlyPrice,
      annualPrice: regionalPrices.india.annualPrice,
      currency: 'INR',
      indiaMonthlyPrice: regionalPrices.india.monthlyPrice,
      indiaAnnualPrice: regionalPrices.india.annualPrice,
      globalMonthlyPrice: regionalPrices.global.monthlyPrice,
      globalAnnualPrice: regionalPrices.global.annualPrice,
      regionalPrices,
      storageLimitGb: plan === 'STARTER' ? 10 : plan === 'GROWTH' ? 50 : 500,
      invoiceLimitMo: plan === 'STARTER' ? 500 : plan === 'GROWTH' ? 5000 : null,
      branchLimit: plan === 'STARTER' ? 1 : plan === 'GROWTH' ? 5 : null,
      trialDays: 14,
      isEnabled: true,
      description: entry.description,
      features: entry.features,
      modules: {
        hrm: true,
        crm: true,
        finance: plan !== 'STARTER',
        inventory: true,
        manufacturing: plan === 'ENTERPRISE',
      },
    };
  }

  private mapRow(row: {
    plan: TenantPlan;
    displayName: string;
    monthlyPrice: unknown;
    annualPrice: unknown;
    currency: string;
    indiaMonthlyPrice: unknown | null;
    indiaAnnualPrice: unknown | null;
    globalMonthlyPrice: unknown | null;
    globalAnnualPrice: unknown | null;
    seatLimit: number | null;
    storageLimitGb: number;
    invoiceLimitMo: number | null;
    branchLimit: number | null;
    trialDays: number;
    isEnabled: boolean;
    description: string | null;
    moduleHrm: boolean;
    moduleCrm: boolean;
    moduleFinance: boolean;
    moduleInventory: boolean;
    moduleManufacturing: boolean;
  }): PlanDefinitionView {
    const fallback = this.fallbackFromShared(row.plan);
    const regionalPrices = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: row.indiaMonthlyPrice != null ? Number(row.indiaMonthlyPrice) : null,
      indiaAnnualPrice: row.indiaAnnualPrice != null ? Number(row.indiaAnnualPrice) : null,
      globalMonthlyPrice: row.globalMonthlyPrice != null ? Number(row.globalMonthlyPrice) : null,
      globalAnnualPrice: row.globalAnnualPrice != null ? Number(row.globalAnnualPrice) : null,
      monthlyPrice: Number(row.monthlyPrice),
      annualPrice: Number(row.annualPrice),
      currency: row.currency,
    });
    return {
      id: row.plan,
      name: row.plan,
      displayName: row.displayName,
      seatLimit: row.seatLimit,
      monthlyPrice: regionalPrices.india.monthlyPrice,
      annualPrice: regionalPrices.india.annualPrice,
      currency: row.currency,
      indiaMonthlyPrice: regionalPrices.india.monthlyPrice,
      indiaAnnualPrice: regionalPrices.india.annualPrice,
      globalMonthlyPrice: regionalPrices.global.monthlyPrice,
      globalAnnualPrice: regionalPrices.global.annualPrice,
      regionalPrices,
      storageLimitGb: row.storageLimitGb,
      invoiceLimitMo: row.invoiceLimitMo,
      branchLimit: row.branchLimit,
      trialDays: row.trialDays,
      isEnabled: row.isEnabled,
      description: row.description ?? fallback.description,
      features: fallback.features,
      modules: {
        hrm: row.moduleHrm,
        crm: row.moduleCrm,
        finance: row.moduleFinance,
        inventory: row.moduleInventory,
        manufacturing: row.moduleManufacturing,
      },
    };
  }

  async listCatalog(): Promise<PlanDefinitionView[]> {
    const rows = await this.prisma.client.planDefinition.findMany({
      orderBy: { plan: 'asc' },
    });
    if (rows.length === 0) {
      return (Object.values(TenantPlan) as TenantPlan[]).map((p) => this.fallbackFromShared(p));
    }
    return rows.map((row) => this.mapRow(row));
  }

  async getForTenantPlan(plan: TenantPlan): Promise<PlanDefinitionView> {
    const row = await this.prisma.client.planDefinition.findUnique({ where: { plan } });
    return row ? this.mapRow(row) : this.fallbackFromShared(plan);
  }

  async updatePlan(plan: TenantPlan, dto: UpdatePlanDefinitionDto, actorId: string) {
    const existing = await this.prisma.client.planDefinition.findUnique({ where: { plan } });
    if (!existing) throw new NotFoundException('Plan not found.');

    const updated = await this.prisma.client.planDefinition.update({
      where: { plan },
      data: {
        displayName: dto.displayName?.trim() ?? undefined,
        monthlyPrice: dto.indiaMonthlyPrice ?? dto.monthlyPrice,
        annualPrice: dto.indiaAnnualPrice ?? dto.annualPrice,
        currency: dto.currency?.trim().toUpperCase() ?? 'INR',
        indiaMonthlyPrice: dto.indiaMonthlyPrice ?? dto.monthlyPrice,
        indiaAnnualPrice: dto.indiaAnnualPrice ?? dto.annualPrice,
        globalMonthlyPrice: dto.globalMonthlyPrice,
        globalAnnualPrice: dto.globalAnnualPrice,
        seatLimit: dto.seatLimit,
        storageLimitGb: dto.storageLimitGb,
        invoiceLimitMo: dto.invoiceLimitMo,
        branchLimit: dto.branchLimit,
        trialDays: dto.trialDays,
        isEnabled: dto.isEnabled,
        moduleHrm: dto.modules?.hrm,
        moduleCrm: dto.modules?.crm,
        moduleFinance: dto.modules?.finance,
        moduleInventory: dto.modules?.inventory,
        moduleManufacturing: dto.modules?.manufacturing,
      },
    });

    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action: 'billing.plan_definition_updated',
        entityType: 'plan',
        entityId: plan,
        metadata: dto as object,
      },
    });

    return this.mapRow(updated);
  }
}
