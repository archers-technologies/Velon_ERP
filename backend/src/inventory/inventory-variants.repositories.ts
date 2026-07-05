import { Injectable } from '@nestjs/common';
import { InventoryProductStatus, Prisma } from '@velon/database';
import { TenantScopedRepository } from '../common/repositories/tenant-scoped.repository';
import { PrismaService } from '../prisma/prisma.service';

const variantInclude = {
  options: {
    include: {
      attributeValue: {
        include: { attribute: true },
      },
    },
  },
  stock: { include: { warehouse: true } },
} satisfies Prisma.InventoryProductVariantInclude;

@Injectable()
export class InventoryVariantAttributeRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByProduct(productId: string) {
    return this.prisma.client.inventoryProductVariantAttribute.findMany({
      where: this.where({ productId }),
      include: {
        values: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  deleteByProduct(productId: string) {
    return this.prisma.client.inventoryProductVariantAttribute.deleteMany({
      where: this.where({ productId }),
    });
  }
}

@Injectable()
export class InventoryVariantRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByProduct(productId: string) {
    return this.prisma.client.inventoryProductVariant.findMany({
      where: this.where({ productId }),
      include: variantInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.inventoryProductVariant.findFirst({
      where: this.where({ id }),
      include: variantInclude,
    });
  }

  findBySku(sku: string, excludeId?: string) {
    return this.prisma.client.inventoryProductVariant.findFirst({
      where: this.where({
        sku,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
    });
  }

  findByBarcode(barcode: string, excludeId?: string) {
    return this.prisma.client.inventoryProductVariant.findFirst({
      where: this.where({
        barcode,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
    });
  }

  search(query: string, limit = 48) {
    const q = query.trim();
    if (!q) return Promise.resolve([]);
    return this.prisma.client.inventoryProductVariant.findMany({
      where: this.where({
        status: InventoryProductStatus.ACTIVE,
        OR: [
          { label: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { sku: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { barcode: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { product: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } },
        ],
      }),
      include: {
        product: { select: { id: true, name: true, hasVariants: true, imageDataUrl: true } },
        stock: { include: { warehouse: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }) as Promise<
      Array<
        Prisma.InventoryProductVariantGetPayload<{
          include: {
            product: { select: { id: true; name: true; hasVariants: true; imageDataUrl: true } };
            stock: { include: { warehouse: true } };
          };
        }>
      >
    >;
  }

  countByProduct(productId: string) {
    return this.prisma.client.inventoryProductVariant.count({
      where: this.where({ productId }),
    });
  }

  deleteByProduct(productId: string) {
    return this.prisma.client.inventoryProductVariant.deleteMany({
      where: this.where({ productId }),
    });
  }
}

export const INVENTORY_VARIANT_REPOSITORIES = [
  InventoryVariantAttributeRepository,
  InventoryVariantRepository,
];
