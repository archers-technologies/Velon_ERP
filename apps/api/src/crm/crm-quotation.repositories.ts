import { Injectable } from "@nestjs/common";
import { CrmQuotationApprovalAction, CrmQuotationStatus, Prisma } from "@velon/database";
import { PrismaService } from "../prisma/prisma.service";
import { TenantScopedRepository } from "../common/repositories/tenant-scoped.repository";

const quotationInclude = {
  customer: { select: { id: true, companyName: true, email: true, phone: true, address: true } },
  opportunity: { select: { id: true, title: true, opportunityCode: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  items: { orderBy: { position: "asc" as const } },
  approvalHistory: { orderBy: { createdAt: "desc" as const }, take: 20 },
  _count: { select: { proposals: true, revisions: true } },
};

@Injectable()
export class CrmQuotationRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: {
    search?: string;
    status?: CrmQuotationStatus;
    customerId?: string;
    opportunityId?: string;
  }) {
    const OR: Prisma.CrmQuotationWhereInput[] = [];
    const q = opts.search?.trim();
    if (q) {
      OR.push(
        { quotationNumber: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      );
    }
    return this.prisma.client.crmQuotation.findMany({
      where: {
        ...this.where({
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.customerId ? { customerId: opts.customerId } : {}),
          ...(opts.opportunityId ? { opportunityId: opts.opportunityId } : {}),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: quotationInclude,
    });
  }

  findById(id: string) {
    return this.prisma.client.crmQuotation.findFirst({
      where: this.where({ id }),
      include: {
        ...quotationInclude,
        proposals: { orderBy: { version: "desc" }, take: 10, select: { id: true, version: true, generatedAt: true } },
        revisions: { select: { id: true, quotationNumber: true, revisionNumber: true, status: true, createdAt: true } },
      },
    });
  }

  findByIdAny(id: string) {
    return this.prisma.client.crmQuotation.findFirst({ where: this.where({ id }) });
  }

  create(data: Omit<Prisma.CrmQuotationUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmQuotation.create({
      data: { ...data, tenantId: this.tenantId },
      include: quotationInclude,
    });
  }

  update(id: string, data: Prisma.CrmQuotationUncheckedUpdateInput) {
    return this.prisma.client.crmQuotation.update({
      where: { id },
      data,
      include: quotationInclude,
    });
  }

  count(where: Prisma.CrmQuotationWhereInput) {
    return this.prisma.client.crmQuotation.count({ where: this.where(where) });
  }

  aggregateByStatus() {
    return this.prisma.client.crmQuotation.groupBy({
      by: ["status"],
      where: this.where(),
      _count: true,
      _sum: { total: true },
    });
  }

  nextQuotationNumber(year: number) {
    return this.prisma.client.$transaction(async (tx) => {
      const seq = await tx.crmQuotationNumberSequence.upsert({
        where: { tenantId_year: { tenantId: this.tenantId, year } },
        create: { tenantId: this.tenantId, year, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      const num = String(seq.lastNumber).padStart(5, "0");
      return `QTN-${year}-${num}`;
    });
  }

  findByPortalTokenHash(hash: string) {
    return this.prisma.client.crmQuotation.findFirst({
      where: { portalTokenHash: hash },
      include: {
        customer: true,
        items: { orderBy: { position: "asc" } },
        tenant: { include: { companyProfile: true, workspace: true } },
      },
    });
  }
}

@Injectable()
export class CrmQuotationItemRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByQuotation(quotationId: string) {
    return this.prisma.client.crmQuotationItem.findMany({
      where: this.where({ quotationId }),
      orderBy: { position: "asc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmQuotationItem.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.CrmQuotationItemUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmQuotationItem.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  createMany(items: Omit<Prisma.CrmQuotationItemUncheckedCreateInput, "tenantId">[]) {
    return this.prisma.client.crmQuotationItem.createMany({
      data: items.map((i) => ({ ...i, tenantId: this.tenantId })),
    });
  }

  update(id: string, data: Prisma.CrmQuotationItemUncheckedUpdateInput) {
    return this.prisma.client.crmQuotationItem.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.crmQuotationItem.delete({ where: { id } });
  }

  deleteByQuotation(quotationId: string) {
    return this.prisma.client.crmQuotationItem.deleteMany({
      where: this.where({ quotationId }),
    });
  }

  maxPosition(quotationId: string) {
    return this.prisma.client.crmQuotationItem.aggregate({
      where: this.where({ quotationId }),
      _max: { position: true },
    });
  }
}

@Injectable()
export class CrmQuotationApprovalRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  create(data: Omit<Prisma.CrmQuotationApprovalHistoryUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmQuotationApprovalHistory.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  findByQuotation(quotationId: string) {
    return this.prisma.client.crmQuotationApprovalHistory.findMany({
      where: this.where({ quotationId }),
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
  }
}

@Injectable()
export class CrmProposalDocumentRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByQuotation(quotationId: string) {
    return this.prisma.client.crmProposalDocument.findMany({
      where: this.where({ quotationId }),
      orderBy: { version: "desc" },
      select: { id: true, version: true, generatedAt: true, generatedById: true },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmProposalDocument.findFirst({
      where: this.where({ id }),
    });
  }

  findLatest(quotationId: string) {
    return this.prisma.client.crmProposalDocument.findFirst({
      where: this.where({ quotationId }),
      orderBy: { version: "desc" },
    });
  }

  maxVersion(quotationId: string) {
    return this.prisma.client.crmProposalDocument.aggregate({
      where: this.where({ quotationId }),
      _max: { version: true },
    });
  }

  create(data: Omit<Prisma.CrmProposalDocumentUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmProposalDocument.create({
      data: { ...data, tenantId: this.tenantId },
      select: { id: true, version: true, generatedAt: true },
    });
  }
}

@Injectable()
export class CrmProposalTemplateRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.crmProposalTemplate.findMany({
      where: this.where(),
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  findById(id: string) {
    return this.prisma.client.crmProposalTemplate.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.CrmProposalTemplateUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.crmProposalTemplate.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.CrmProposalTemplateUncheckedUpdateInput) {
    return this.prisma.client.crmProposalTemplate.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.crmProposalTemplate.delete({ where: { id } });
  }

  clearDefaultFlag() {
    return this.prisma.client.crmProposalTemplate.updateMany({
      where: this.where({ isDefault: true }),
      data: { isDefault: false },
    });
  }
}

export const CRM_QUOTATION_REPOSITORIES = [
  CrmQuotationRepository,
  CrmQuotationItemRepository,
  CrmQuotationApprovalRepository,
  CrmProposalDocumentRepository,
  CrmProposalTemplateRepository,
];

export { CrmQuotationApprovalAction };
