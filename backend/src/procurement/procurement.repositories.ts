import { Injectable } from "@nestjs/common";
import { Prisma, PurchaseOrderStatus, PurchaseRequestStatus } from "@velon/database";
import { PrismaService } from "../prisma/prisma.service";
import { TenantScopedRepository } from "../common/repositories/tenant-scoped.repository";

@Injectable()
export class PurchaseRequestRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(status?: PurchaseRequestStatus) {
    return this.prisma.client.purchaseRequest.findMany({
      where: this.where(status ? { status } : {}),
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.purchaseRequest.findFirst({
      where: this.where({ id }),
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  create(data: Omit<Prisma.PurchaseRequestUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.purchaseRequest.create({
      data: { ...data, tenantId: this.tenantId },
      include: { items: true },
    });
  }

  update(id: string, data: Prisma.PurchaseRequestUncheckedUpdateInput) {
    return this.prisma.client.purchaseRequest.update({
      where: { id },
      data,
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

@Injectable()
export class PurchaseOrderRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(status?: PurchaseOrderStatus) {
    return this.prisma.client.purchaseOrder.findMany({
      where: this.where(status ? { status } : {}),
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        supplier: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.purchaseOrder.findFirst({
      where: this.where({ id }),
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        supplier: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  create(data: Omit<Prisma.PurchaseOrderUncheckedCreateInput, "tenantId">) {
    return this.prisma.client.purchaseOrder.create({
      data: { ...data, tenantId: this.tenantId },
      include: { items: true, supplier: true },
    });
  }

  update(id: string, data: Prisma.PurchaseOrderUncheckedUpdateInput) {
    return this.prisma.client.purchaseOrder.update({
      where: { id },
      data,
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        supplier: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const PROCUREMENT_REPOSITORIES = [PurchaseRequestRepository, PurchaseOrderRepository];
