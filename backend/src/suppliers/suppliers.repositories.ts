import { Injectable } from '@nestjs/common';
import { Prisma } from '@velon/database';
import { TenantScopedRepository } from '../common/repositories/tenant-scoped.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts?: { search?: string; status?: string }) {
    const OR: Prisma.SupplierWhereInput[] = [];
    const q = opts?.search?.trim();
    if (q) {
      OR.push(
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      );
    }
    return this.prisma.client.supplier.findMany({
      where: {
        ...this.where(opts?.status ? { status: opts.status as never } : {}),
        ...(OR.length ? { OR } : {}),
      },
      include: { contacts: { orderBy: { isPrimary: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.supplier.findFirst({
      where: this.where({ id }),
      include: { contacts: { orderBy: { isPrimary: 'desc' } } },
    });
  }

  findByCode(code: string) {
    return this.prisma.client.supplier.findFirst({ where: this.where({ code }) });
  }

  create(data: Omit<Prisma.SupplierUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.supplier.create({
      data: { ...data, tenantId: this.tenantId },
      include: { contacts: true },
    });
  }

  update(id: string, data: Prisma.SupplierUncheckedUpdateInput) {
    return this.prisma.client.supplier.update({
      where: { id },
      data,
      include: { contacts: true },
    });
  }
}

@Injectable()
export class SupplierContactRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findBySupplier(supplierId: string) {
    return this.prisma.client.supplierContact.findMany({
      where: this.where({ supplierId }),
      orderBy: { isPrimary: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.supplierContact.findFirst({ where: this.where({ id }) });
  }

  create(data: Omit<Prisma.SupplierContactUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.supplierContact.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.SupplierContactUncheckedUpdateInput) {
    return this.prisma.client.supplierContact.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.supplierContact.delete({ where: { id } });
  }
}

@Injectable()
export class SupplierThreadRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findBySupplier(supplierId: string) {
    return this.prisma.client.supplierThread.findMany({
      where: this.where({ supplierId }),
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  findManyForTenant() {
    return this.prisma.client.supplierThread.findMany({
      where: this.where(),
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  create(data: Omit<Prisma.SupplierThreadUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.supplierThread.create({
      data: { ...data, tenantId: this.tenantId },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }
}

export const SUPPLIER_REPOSITORIES = [
  SupplierRepository,
  SupplierContactRepository,
  SupplierThreadRepository,
];
