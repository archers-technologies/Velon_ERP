import { Injectable } from '@nestjs/common';
import { CompanyLibraryAssetCategory, Prisma } from '@velon/database';
import { TenantScopedRepository } from '../common/repositories/tenant-scoped.repository';
import { PrismaService } from '../prisma/prisma.service';

const assetListSelect = {
  id: true,
  tenantId: true,
  name: true,
  category: true,
  description: true,
  mimeType: true,
  fileName: true,
  sizeBytes: true,
  contentJson: true,
  uploadedById: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.CompanyLibraryAssetSelect;

@Injectable()
export class CompanyLibraryAssetRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { category?: CompanyLibraryAssetCategory; search?: string }) {
    const OR: Prisma.CompanyLibraryAssetWhereInput[] = [];
    const q = opts.search?.trim();
    if (q) {
      OR.push(
        { name: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      );
    }
    return this.prisma.client.companyLibraryAsset.findMany({
      where: {
        ...this.where({
          ...(opts.category ? { category: opts.category } : {}),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      select: assetListSelect,
    });
  }

  findById(id: string) {
    return this.prisma.client.companyLibraryAsset.findFirst({
      where: this.where({ id }),
      select: assetListSelect,
    });
  }

  findByIdWithContent(id: string) {
    return this.prisma.client.companyLibraryAsset.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.CompanyLibraryAssetUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.companyLibraryAsset.create({
      data: { ...data, tenantId: this.tenantId },
      select: assetListSelect,
    });
  }

  delete(id: string) {
    return this.prisma.client.companyLibraryAsset.delete({ where: { id } });
  }
}

@Injectable()
export class CrmContentBlockRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { category?: string; search?: string }) {
    const OR: Prisma.CrmContentBlockWhereInput[] = [];
    const q = opts.search?.trim();
    if (q) {
      OR.push(
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      );
    }
    return this.prisma.client.crmContentBlock.findMany({
      where: {
        ...this.where({
          ...(opts.category ? { category: opts.category } : {}),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmContentBlock.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.CrmContentBlockUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.crmContentBlock.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  delete(id: string) {
    return this.prisma.client.crmContentBlock.delete({ where: { id } });
  }
}

export const CRM_COMPANY_ASSETS_REPOSITORIES = [
  CompanyLibraryAssetRepository,
  CrmContentBlockRepository,
];
