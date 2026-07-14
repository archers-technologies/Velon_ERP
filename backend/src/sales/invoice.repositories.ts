import { Injectable } from '@nestjs/common';
import { Prisma, SalesInvoiceStatus } from '@velon/database';
import { TenantScopedRepository } from '../common/repositories/tenant-scoped.repository';
import { PrismaService } from '../prisma/prisma.service';

const invoiceInclude = {
  customer: {
    select: {
      id: true,
      companyName: true,
      email: true,
      phone: true,
      address: true,
      taxId: true,
      notes: true,
    },
  },
  warehouse: { select: { id: true, name: true, code: true } },
  salesperson: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  items: { orderBy: { position: 'asc' as const } },
  payments: { orderBy: { paidAt: 'desc' as const } },
};

@Injectable()
export class SalesInvoiceRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts?: { search?: string; status?: SalesInvoiceStatus }) {
    const q = opts?.search?.trim();
    const OR: Prisma.SalesInvoiceWhereInput[] = [];
    if (q) {
      OR.push(
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
      );
    }
    return this.prisma.client.salesInvoice.findMany({
      where: {
        ...this.where({
          ...(opts?.status ? { status: opts.status } : {}),
        }),
        ...(OR.length ? { OR } : {}),
      },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.salesInvoice.findFirst({
      where: this.where({ id }),
      include: invoiceInclude,
    });
  }

  findByIdempotencyKey(key: string) {
    return this.prisma.client.salesInvoice.findFirst({
      where: this.where({ idempotencyKey: key }),
      include: invoiceInclude,
    });
  }

  nextInvoiceNumber(year: number) {
    return this.prisma.client.$transaction(async (tx) => {
      const seq = await tx.salesInvoiceNumberSequence.upsert({
        where: { tenantId_year: { tenantId: this.tenantId, year } },
        create: { tenantId: this.tenantId, year, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      const num = String(seq.lastNumber).padStart(6, '0');
      return `INV-${year}-${num}`;
    });
  }
}

export const INVOICE_REPOSITORIES = [SalesInvoiceRepository];
