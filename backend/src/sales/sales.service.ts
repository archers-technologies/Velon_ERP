import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CrmQuotationStatus, Prisma, SalesOrderStatus } from '@velon/database';
import { canReadSales, canWriteSales, normalizeVelonRole } from '@velon/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { SalesOrderRepository } from './sales.repositories';

type AuditMeta = { ip?: string; ua?: string };

@Injectable()
export class SalesService {
  constructor(
    private readonly orders: SalesOrderRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private assertRead(user: AuthenticatedUser) {
    if (!canReadSales(normalizeVelonRole(user.role))) {
      throw new ForbiddenException('Insufficient permissions.');
    }
  }

  private assertWrite(user: AuthenticatedUser) {
    if (!canWriteSales(normalizeVelonRole(user.role))) {
      throw new ForbiddenException('Insufficient permissions.');
    }
  }

  async listOrders(user: AuthenticatedUser) {
    this.assertRead(user);
    return this.orders.findMany();
  }

  async getOrder(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.orders.findById(id);
    if (!row) throw new NotFoundException('Sales order not found.');
    return row;
  }

  async createFromQuotation(user: AuthenticatedUser, quotationId: string, meta: AuditMeta) {
    this.assertWrite(user);
    if (!user.tenantId || !user.workspaceId) {
      throw new BadRequestException('Tenant workspace context is required.');
    }

    const quotation = await this.prisma.client.crmQuotation.findFirst({
      where: { id: quotationId, tenantId: user.tenantId },
      include: { items: { orderBy: { position: 'asc' } } },
    });

    if (!quotation) throw new NotFoundException('Quotation not found.');
    if (quotation.status !== CrmQuotationStatus.APPROVED) {
      throw new BadRequestException('Only approved quotations can be converted to sales orders.');
    }
    if (quotation.salesOrderId) {
      throw new BadRequestException('Quotation has already been converted to a sales order.');
    }

    const workspace = await this.prisma.client.workspace.findFirst({
      where: { id: user.workspaceId, tenantId: user.tenantId },
    });
    if (!workspace) {
      throw new BadRequestException('Workspace does not match tenant context.');
    }

    const year = new Date().getFullYear();
    const orderNumber = await this.orders.nextOrderNumber(year);

    const lineItems = quotation.items.map((item) => {
      const qty = Math.max(1, Math.round(Number(item.quantity)));
      const unitPrice = Number(item.unitPrice);
      const discount = Number(item.discount);
      const lineTotal = Number(item.lineTotal);
      const net = qty * unitPrice - discount;
      const taxAmount = Math.max(0, Math.round((lineTotal - net) * 100) / 100);

      return {
        tenantId: user.tenantId!,
        productId: item.productId,
        description: item.description?.trim()
          ? `${item.itemName} — ${item.description.trim()}`
          : item.itemName,
        quantity: qty,
        unitPrice,
        taxAmount,
        lineTotal,
      };
    });

    const created = await this.prisma.client.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          tenantId: user.tenantId!,
          workspaceId: user.workspaceId!,
          quotationId: quotation.id,
          opportunityId: quotation.opportunityId,
          customerId: quotation.customerId,
          orderNumber,
          status: SalesOrderStatus.DRAFT,
          subtotal: quotation.subtotal,
          taxAmount: quotation.tax,
          total: quotation.total,
          items: { create: lineItems },
        },
        include: {
          customer: { select: { id: true, companyName: true, email: true } },
          quotation: {
            select: { id: true, quotationNumber: true, status: true, salesOrderId: true },
          },
          opportunity: { select: { id: true, title: true, opportunityCode: true } },
          items: true,
        },
      });

      await tx.crmQuotation.update({
        where: { id: quotation.id },
        data: { salesOrderId: order.id },
      });

      return order;
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'sales.order_created_from_quotation',
      entityType: 'sales_order',
      entityId: created.id,
      metadata: {
        quotationId: quotation.id,
        salesOrderId: created.id,
        customerId: quotation.customerId,
      } satisfies Prisma.InputJsonObject,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return created;
  }
}
