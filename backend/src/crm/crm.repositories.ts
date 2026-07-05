import { Injectable } from '@nestjs/common';
import {
  CrmActivityStatus,
  CrmActivityType,
  CrmCustomerStatus,
  CrmNoteTargetType,
  Prisma,
} from '@velon/database';
import { TenantScopedRepository } from '../common/repositories/tenant-scoped.repository';
import { PrismaService } from '../prisma/prisma.service';

function searchOr(fields: Prisma.CrmCustomerWhereInput[], term: string) {
  const q = term.trim();
  if (!q) return;
  fields.push(
    { companyName: { contains: q, mode: 'insensitive' } },
    { email: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q, mode: 'insensitive' } },
    { customerCode: { contains: q, mode: 'insensitive' } },
  );
}

@Injectable()
export class CrmCustomerRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { search?: string; status?: CrmCustomerStatus; includeArchived?: boolean }) {
    const OR: Prisma.CrmCustomerWhereInput[] = [];
    searchOr(OR, opts.search ?? '');
    return this.prisma.client.crmCustomer.findMany({
      where: {
        ...this.where({
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.includeArchived ? {} : { archivedAt: null }),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string, includeArchived = false) {
    return this.prisma.client.crmCustomer.findFirst({
      where: this.where({
        id,
        ...(includeArchived ? {} : { archivedAt: null }),
      }),
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findByIdAny(id: string) {
    return this.prisma.client.crmCustomer.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.CrmCustomerUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.crmCustomer.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  update(id: string, data: Prisma.CrmCustomerUncheckedUpdateInput) {
    return this.prisma.client.crmCustomer.update({
      where: { id },
      data,
      include: {
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.client.crmCustomer.delete({ where: { id } });
  }
}

@Injectable()
export class CrmContactRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { search?: string; customerId?: string; includeArchived?: boolean }) {
    const OR: Prisma.CrmContactWhereInput[] = [];
    const q = opts.search?.trim();
    if (q) {
      OR.push(
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
      );
    }
    return this.prisma.client.crmContact.findMany({
      where: {
        ...this.where({
          ...(opts.customerId ? { customerId: opts.customerId } : {}),
          ...(opts.includeArchived ? {} : { archivedAt: null }),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string, includeArchived = false) {
    return this.prisma.client.crmContact.findFirst({
      where: this.where({
        id,
        ...(includeArchived ? {} : { archivedAt: null }),
      }),
      include: {
        customer: { select: { id: true, companyName: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findByIdAny(id: string) {
    return this.prisma.client.crmContact.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.CrmContactUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.crmContact.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    });
  }

  update(id: string, data: Prisma.CrmContactUncheckedUpdateInput) {
    return this.prisma.client.crmContact.update({ where: { id }, data });
  }
}

@Injectable()
export class CrmNoteRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { targetType?: CrmNoteTargetType; targetId?: string }) {
    return this.prisma.client.crmNote.findMany({
      where: this.where({
        ...(opts.targetType ? { targetType: opts.targetType } : {}),
        ...(opts.targetId ? { targetId: opts.targetId } : {}),
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmNote.findFirst({
      where: this.where({ id }),
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  create(data: Omit<Prisma.CrmNoteUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.crmNote.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  update(id: string, content: string) {
    return this.prisma.client.crmNote.update({
      where: { id },
      data: { content },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.client.crmNote.delete({ where: { id } });
  }
}

@Injectable()
export class CrmActivityRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: {
    customerId?: string;
    ownerId?: string;
    status?: CrmActivityStatus;
    type?: CrmActivityType;
    from?: Date;
    to?: Date;
  }) {
    return this.prisma.client.crmActivity.findMany({
      where: this.where({
        ...(opts.customerId ? { customerId: opts.customerId } : {}),
        ...(opts.ownerId ? { ownerId: opts.ownerId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.type ? { type: opts.type } : {}),
        ...(opts.from || opts.to
          ? {
              activityDate: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lte: opts.to } : {}),
              },
            }
          : {}),
      }),
      orderBy: { activityDate: 'desc' },
      include: {
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.crmActivity.findFirst({
      where: this.where({ id }),
      include: {
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  create(data: Omit<Prisma.CrmActivityUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.crmActivity.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        customer: { select: { id: true, companyName: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  update(id: string, data: Prisma.CrmActivityUncheckedUpdateInput) {
    return this.prisma.client.crmActivity.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const CRM_REPOSITORIES = [
  CrmCustomerRepository,
  CrmContactRepository,
  CrmNoteRepository,
  CrmActivityRepository,
];
