import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, PurchaseOrderStatus, PurchaseRequestStatus } from "@velon/database";
import {
  canApproveProcurement,
  canManageProcurement,
  canReadProcurement,
  normalizeVelonRole,
} from "@velon/shared";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  ApproveDto,
  CreatePurchaseOrderDto,
  CreatePurchaseRequestDto,
  ReceivePurchaseOrderDto,
  RejectDto,
} from "./dto/procurement.dto";
import { PurchaseOrderRepository, PurchaseRequestRepository } from "./procurement.repositories";

type AuditMeta = { ip?: string; ua?: string };

@Injectable()
export class ProcurementService {
  constructor(
    private readonly requests: PurchaseRequestRepository,
    private readonly orders: PurchaseOrderRepository,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  private role(user: AuthenticatedUser) {
    return normalizeVelonRole(user.role);
  }

  private assertRead(user: AuthenticatedUser) {
    if (!canReadProcurement(this.role(user))) {
      throw new ForbiddenException("Procurement access denied.");
    }
  }

  private assertManage(user: AuthenticatedUser) {
    if (!canManageProcurement(this.role(user))) {
      throw new ForbiddenException("Insufficient permissions to manage procurement.");
    }
  }

  private assertApprove(user: AuthenticatedUser) {
    if (!canApproveProcurement(this.role(user))) {
      throw new ForbiddenException("Approval requires Tenant Owner or Admin.");
    }
  }

  private async nextRequestNumber(tenantId: string) {
    const count = await this.prisma.client.purchaseRequest.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `PR-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  private async nextPoNumber(tenantId: string) {
    const count = await this.prisma.client.purchaseOrder.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  private calcOrderTotals(items: { quantity: number; unitPrice: number; taxRate?: number }[]) {
    let subtotal = 0;
    let taxAmount = 0;
    for (const item of items) {
      const line = item.quantity * item.unitPrice;
      const tax = line * ((item.taxRate ?? 0) / 100);
      subtotal += line;
      taxAmount += tax;
    }
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }

  // ─── Purchase Requests ─────────────────────────────────────

  listRequests(user: AuthenticatedUser) {
    this.assertRead(user);
    return this.requests.findMany();
  }

  async getRequest(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.requests.findById(id);
    if (!row) throw new NotFoundException("Purchase request not found.");
    return row;
  }

  async createRequest(
    user: AuthenticatedUser,
    dto: CreatePurchaseRequestDto,
    meta: AuditMeta,
  ) {
    this.assertManage(user);
    if (!dto.items?.length) throw new BadRequestException("At least one line item is required.");

    const requestNumber = await this.nextRequestNumber(user.tenantId!);
    const row = await this.prisma.client.purchaseRequest.create({
      data: {
        tenantId: user.tenantId!,
        requestNumber,
        status: PurchaseRequestStatus.DRAFT,
        requestedById: user.id,
        notes: dto.notes?.trim() || null,
        items: {
          create: dto.items.map((item, i) => ({
            tenantId: user.tenantId!,
            description: item.description.trim(),
            productId: item.productId || null,
            quantity: item.quantity,
            uom: item.uom,
            estimatedUnitPrice: item.estimatedUnitPrice ?? null,
            position: i,
          })),
        },
      },
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.request_created",
      entityType: "purchase_request",
      entityId: row.id,
      metadata: { requestNumber },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return row;
  }

  async submitRequest(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertManage(user);
    const row = await this.requests.findById(id);
    if (!row) throw new NotFoundException("Purchase request not found.");
    if (row.status !== PurchaseRequestStatus.DRAFT) {
      throw new BadRequestException("Only draft requests can be submitted.");
    }
    return this.requests.update(id, { status: PurchaseRequestStatus.PENDING_APPROVAL });
  }

  async approveRequest(
    user: AuthenticatedUser,
    id: string,
    dto: ApproveDto,
    meta: AuditMeta,
  ) {
    this.assertApprove(user);
    const row = await this.requests.findById(id);
    if (!row) throw new NotFoundException("Purchase request not found.");
    if (row.status !== PurchaseRequestStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Request is not pending approval.");
    }

    const updated = await this.requests.update(id, {
      status: PurchaseRequestStatus.APPROVED,
      approvedById: user.id,
      approvedAt: new Date(),
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.request_approved",
      entityType: "purchase_request",
      entityId: id,
      metadata: { comments: dto.comments },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return updated;
  }

  async rejectRequest(user: AuthenticatedUser, id: string, dto: RejectDto) {
    this.assertApprove(user);
    const row = await this.requests.findById(id);
    if (!row) throw new NotFoundException("Purchase request not found.");
    if (row.status !== PurchaseRequestStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Request is not pending approval.");
    }
    return this.requests.update(id, { status: PurchaseRequestStatus.REJECTED });
  }

  // ─── Purchase Orders ─────────────────────────────────────────

  listOrders(user: AuthenticatedUser) {
    this.assertRead(user);
    return this.orders.findMany();
  }

  async getOrder(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.orders.findById(id);
    if (!row) throw new NotFoundException("Purchase order not found.");
    return row;
  }

  async createOrder(user: AuthenticatedUser, dto: CreatePurchaseOrderDto, meta: AuditMeta) {
    this.assertManage(user);
    if (!dto.items?.length) throw new BadRequestException("At least one line item is required.");

    const supplier = await this.prisma.client.supplier.findFirst({
      where: { id: dto.supplierId, tenantId: user.tenantId },
    });
    if (!supplier) throw new NotFoundException("Supplier not found.");

    const poNumber = await this.nextPoNumber(user.tenantId!);
    const totals = this.calcOrderTotals(dto.items);

    const row = await this.prisma.client.purchaseOrder.create({
      data: {
        tenantId: user.tenantId!,
        poNumber,
        supplierId: dto.supplierId,
        requestId: dto.requestId || null,
        status: PurchaseOrderStatus.DRAFT,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: dto.notes?.trim() || null,
        items: {
          create: dto.items.map((item, i) => {
            const line = item.quantity * item.unitPrice;
            const tax = line * ((item.taxRate ?? 0) / 100);
            return {
              tenantId: user.tenantId!,
              description: item.description.trim(),
              productId: item.productId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate ?? 0,
              lineTotal: line + tax,
              position: i,
            };
          }),
        },
      },
      include: {
        items: { orderBy: { position: "asc" }, include: { product: true } },
        supplier: true,
      },
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.po_created",
      entityType: "purchase_order",
      entityId: row.id,
      metadata: { poNumber, supplierId: dto.supplierId },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return row;
  }

  async approveOrder(user: AuthenticatedUser, id: string, dto: ApproveDto, meta: AuditMeta) {
    this.assertApprove(user);
    const row = await this.orders.findById(id);
    if (!row) throw new NotFoundException("Purchase order not found.");
    if (
      row.status !== PurchaseOrderStatus.DRAFT &&
      row.status !== PurchaseOrderStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException("Order cannot be approved in current status.");
    }

    const updated = await this.orders.update(id, {
      status: PurchaseOrderStatus.APPROVED,
      approvedById: user.id,
      approvedAt: new Date(),
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.po_approved",
      entityType: "purchase_order",
      entityId: id,
      metadata: { comments: dto.comments },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return updated;
  }

  async submitOrder(user: AuthenticatedUser, id: string) {
    this.assertManage(user);
    const row = await this.orders.findById(id);
    if (!row) throw new NotFoundException("Purchase order not found.");
    if (row.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException("Only approved orders can be sent.");
    }
    return this.orders.update(id, { status: PurchaseOrderStatus.SENT });
  }

  async receiveOrder(
    user: AuthenticatedUser,
    id: string,
    dto: ReceivePurchaseOrderDto,
    meta: AuditMeta,
  ) {
    this.assertManage(user);
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException("Purchase order not found.");

    const receivable = new Set<PurchaseOrderStatus>([
      PurchaseOrderStatus.SENT,
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
    ]);
    if (!receivable.has(order.status)) {
      throw new BadRequestException("Purchase order cannot be received in its current status.");
    }

    const warehouse = await this.prisma.client.inventoryWarehouse.findFirst({
      where: { id: dto.warehouseId, tenantId: user.tenantId },
    });
    if (!warehouse) throw new NotFoundException("Warehouse not found.");

    const itemMap = new Map(order.items.map((i) => [i.id, i]));

    await this.prisma.client.$transaction(async (tx) => {
      for (const line of dto.lines) {
        const item = itemMap.get(line.orderItemId);
        if (!item) throw new NotFoundException(`Order line ${line.orderItemId} not found.`);

        const remaining = item.quantity - item.receivedQty;
        if (line.quantity > remaining) {
          throw new BadRequestException(
            `Cannot receive ${line.quantity} for "${item.description}" — only ${remaining} remaining.`,
          );
        }

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: item.receivedQty + line.quantity },
        });

        if (item.productId) {
          const existing = await tx.inventoryStock.findFirst({
            where: {
              tenantId: user.tenantId!,
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          });
          if (existing) {
            await tx.inventoryStock.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + line.quantity },
            });
          } else {
            await tx.inventoryStock.create({
              data: {
                tenantId: user.tenantId!,
                productId: item.productId,
                warehouseId: dto.warehouseId,
                quantity: line.quantity,
              },
            });
          }
        }
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { orderId: id, tenantId: user.tenantId! },
      });
      const allReceived = refreshedItems.every((i) => i.receivedQty >= i.quantity);
      const anyReceived = refreshedItems.some((i) => i.receivedQty > 0);
      const nextStatus = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : anyReceived
          ? PurchaseOrderStatus.PARTIALLY_RECEIVED
          : order.status;

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: nextStatus },
      });
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.po_received",
      entityType: "purchase_order",
      entityId: id,
      metadata: {
        warehouseId: dto.warehouseId,
        lines: dto.lines.map((l) => ({ orderItemId: l.orderItemId, quantity: l.quantity })),
      } satisfies Prisma.InputJsonObject,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    const updated = await this.orders.findById(id);
    if (!updated) throw new NotFoundException("Purchase order not found.");
    return updated;
  }
}
