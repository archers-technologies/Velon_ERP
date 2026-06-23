import { Injectable } from "@nestjs/common";
import {
  CrmLeadSource,
  CrmLeadStatus,
  CrmOpportunityStatus,
  Prisma,
} from "@velon/database";
import { PrismaService } from "../prisma/prisma.service";
import { TenantScopedRepository } from "../common/repositories/tenant-scoped.repository";

@Injectable()
export class CrmLeadRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: {
    search?: string;
    status?: CrmLeadStatus;
    source?: CrmLeadSource;
    assignedToId?: string;
    includeArchived?: boolean;
  }) {
    const OR: Prisma.CrmLeadWhereInput[] = [];
    const q = opts.search?.trim();
    if (q) {
      OR.push(
        { companyName: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { leadCode: { contains: q, mode: "insensitive" } },
      );
    }
    return this.prisma.client.crmLead.findMany({
      where: {
        ...this.where({
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.source ? { source: opts.source } : {}),
          ...(opts.assignedToId ? { assignedToId: opts.assignedToId } : {}),
          ...(opts.includeArchived ? {} : { archivedAt: null }),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string, includeArchived = false) {
    return this.prisma.client.crmLead.findFirst({
      where: this.where({
        id,
        ...(includeArchived ? {} : { archivedAt: null }),
      }),
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findByIdAny(id: string) {
    return this.prisma.client.crmLead.findFirst({ where: this.where({ id }) });
  }

  create(data: Omit<Prisma.CrmLeadUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmLead.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  update(id: string, data: Prisma.CrmLeadUncheckedUpdateInput) {
    return this.prisma.client.crmLead.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  count(where: Prisma.CrmLeadWhereInput) {
    return this.prisma.client.crmLead.count({ where: this.where(where) });
  }
}

@Injectable()
export class CrmPipelineRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.crmPipeline.findMany({
      where: this.where(),
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: {
        stages: { orderBy: { position: "asc" } },
        _count: { select: { opportunities: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmPipeline.findFirst({
      where: this.where({ id }),
      include: { stages: { orderBy: { position: "asc" } } },
    });
  }

  findDefault() {
    return this.prisma.client.crmPipeline.findFirst({
      where: this.where({ isDefault: true }),
      include: { stages: { orderBy: { position: "asc" } } },
    });
  }

  count() {
    return this.prisma.client.crmPipeline.count({ where: this.where() });
  }

  create(data: Omit<Prisma.CrmPipelineUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmPipeline.create({
      data: { ...data, tenantId: this.tenantId },
      include: { stages: { orderBy: { position: "asc" } } },
    });
  }

  update(id: string, data: Prisma.CrmPipelineUncheckedUpdateInput) {
    return this.prisma.client.crmPipeline.update({
      where: { id },
      data,
      include: { stages: { orderBy: { position: "asc" } } },
    });
  }

  delete(id: string) {
    return this.prisma.client.crmPipeline.delete({ where: { id } });
  }

  clearDefaultFlag() {
    return this.prisma.client.crmPipeline.updateMany({
      where: this.where({ isDefault: true }),
      data: { isDefault: false },
    });
  }
}

@Injectable()
export class CrmPipelineStageRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByPipeline(pipelineId: string) {
    return this.prisma.client.crmPipelineStage.findMany({
      where: this.where({ pipelineId }),
      orderBy: { position: "asc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmPipelineStage.findFirst({
      where: this.where({ id }),
    });
  }

  findByName(pipelineId: string, name: string) {
    return this.prisma.client.crmPipelineStage.findFirst({
      where: this.where({ pipelineId, name }),
    });
  }

  create(data: Omit<Prisma.CrmPipelineStageUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmPipelineStage.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.CrmPipelineStageUncheckedUpdateInput) {
    return this.prisma.client.crmPipelineStage.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.crmPipelineStage.delete({ where: { id } });
  }

  maxPosition(pipelineId: string) {
    return this.prisma.client.crmPipelineStage.aggregate({
      where: this.where({ pipelineId }),
      _max: { position: true },
    });
  }
}

@Injectable()
export class CrmOpportunityRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: {
    search?: string;
    pipelineId?: string;
    stageId?: string;
    status?: CrmOpportunityStatus;
    ownerId?: string;
    includeArchived?: boolean;
  }) {
    const OR: Prisma.CrmOpportunityWhereInput[] = [];
    const q = opts.search?.trim();
    if (q) {
      OR.push(
        { title: { contains: q, mode: "insensitive" } },
        { opportunityCode: { contains: q, mode: "insensitive" } },
      );
    }
    return this.prisma.client.crmOpportunity.findMany({
      where: {
        ...this.where({
          ...(opts.pipelineId ? { pipelineId: opts.pipelineId } : {}),
          ...(opts.stageId ? { stageId: opts.stageId } : {}),
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.ownerId ? { ownerId: opts.ownerId } : {}),
          ...(opts.includeArchived ? {} : { archivedAt: null }),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, companyName: true } },
        lead: { select: { id: true, companyName: true, leadCode: true } },
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, probability: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmOpportunity.findFirst({
      where: this.where({ id }),
      include: {
        customer: { select: { id: true, companyName: true } },
        lead: { select: { id: true, companyName: true } },
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, probability: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findByIdAny(id: string) {
    return this.prisma.client.crmOpportunity.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.CrmOpportunityUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmOpportunity.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        stage: true,
        pipeline: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  update(id: string, data: Prisma.CrmOpportunityUncheckedUpdateInput) {
    return this.prisma.client.crmOpportunity.update({
      where: { id },
      data,
      include: {
        stage: true,
        pipeline: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  count(where: Prisma.CrmOpportunityWhereInput) {
    return this.prisma.client.crmOpportunity.count({ where: this.where(where) });
  }

  aggregateOpenValue() {
    return this.prisma.client.crmOpportunity.aggregate({
      where: this.where({ status: CrmOpportunityStatus.OPEN, archivedAt: null }),
      _sum: { value: true },
    });
  }

  expectedRevenue() {
    return this.prisma.client.crmOpportunity.findMany({
      where: this.where({ status: CrmOpportunityStatus.OPEN, archivedAt: null }),
      select: { value: true, probability: true },
    });
  }
}

export const CRM_PIPELINE_REPOSITORIES = [
  CrmLeadRepository,
  CrmPipelineRepository,
  CrmPipelineStageRepository,
  CrmOpportunityRepository,
];
