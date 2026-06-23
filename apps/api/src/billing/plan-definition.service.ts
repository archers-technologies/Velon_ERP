import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantPlan } from "@velon/database";
import { PLAN_CATALOG } from "@velon/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdatePlanDefinitionDto } from "./dto/billing.dto";

export type PlanDefinitionView = {
  id: TenantPlan;
  name: string;
  displayName: string;
  seatLimit: number | null;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
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
    return {
      id: entry.id,
      name: entry.name,
      displayName: entry.displayName,
      seatLimit: entry.seatLimit,
      monthlyPrice: entry.monthlyPrice,
      annualPrice: entry.monthlyPrice * 10,
      currency: "INR",
      storageLimitGb: plan === "STARTER" ? 10 : plan === "GROWTH" ? 50 : 500,
      invoiceLimitMo: plan === "STARTER" ? 500 : plan === "GROWTH" ? 5000 : null,
      branchLimit: plan === "STARTER" ? 1 : plan === "GROWTH" ? 5 : null,
      trialDays: 14,
      isEnabled: true,
      description: entry.description,
      features: entry.features,
      modules: {
        hrm: true,
        crm: true,
        finance: plan !== "STARTER",
        inventory: true,
        manufacturing: plan === "ENTERPRISE",
      },
    };
  }

  private mapRow(row: {
    plan: TenantPlan;
    displayName: string;
    monthlyPrice: unknown;
    annualPrice: unknown;
    currency: string;
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
    return {
      id: row.plan,
      name: row.plan,
      displayName: row.displayName,
      seatLimit: row.seatLimit,
      monthlyPrice: Number(row.monthlyPrice),
      annualPrice: Number(row.annualPrice),
      currency: row.currency,
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
      orderBy: { plan: "asc" },
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
    if (!existing) throw new NotFoundException("Plan not found.");

    const updated = await this.prisma.client.planDefinition.update({
      where: { plan },
      data: {
        displayName: dto.displayName?.trim() ?? undefined,
        monthlyPrice: dto.monthlyPrice,
        annualPrice: dto.annualPrice,
        currency: dto.currency?.trim().toUpperCase(),
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
        action: "billing.plan_definition_updated",
        entityType: "plan",
        entityId: plan,
        metadata: dto as object,
      },
    });

    return this.mapRow(updated);
  }
}
