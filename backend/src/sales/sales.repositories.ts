import { Injectable } from '@nestjs/common';
import { Prisma } from '@velon/database';
import { TenantScopedRepository } from '../common/repositories/tenant-scoped.repository';
import { PrismaService } from '../prisma/prisma.service';

const orderInclude = {
  customer: { select: { id: true, companyName: true, email: true } },
  quotation: { select: { id: true, quotationNumber: true, status: true, salesOrderId: true } },
  opportunity: { select: { id: true, title: true, opportunityCode: true } },
  items: { orderBy: { description: 'asc' as const } },
};

@Injectable()
export class SalesOrderRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.salesOrder.findMany({
      where: this.where(),
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.salesOrder.findFirst({
      where: this.where({ id }),
      include: orderInclude,
    });
  }

  create(data: Prisma.SalesOrderUncheckedCreateInput) {
    return this.prisma.client.salesOrder.create({
      data: { ...data, tenantId: this.tenantId },
      include: orderInclude,
    });
  }

  nextOrderNumber(year: number) {
    return this.prisma.client.$transaction(async (tx) => {
      const seq = await tx.salesOrderNumberSequence.upsert({
        where: { tenantId_year: { tenantId: this.tenantId, year } },
        create: { tenantId: this.tenantId, year, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      const num = String(seq.lastNumber).padStart(6, '0');
      return `SO-${year}-${num}`;
    });
  }
}

export const SALES_REPOSITORIES = [SalesOrderRepository];
