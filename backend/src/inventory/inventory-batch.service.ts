import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@velon/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  allocateFefo,
  assertExpiryOnOrAfterMfg,
  batchExpiryStatus,
  parseIsoDate,
  toIsoDate,
  type BatchExpiryStatus,
  type FefoAllocation,
} from './inventory-batch.util';

export type StockBatchInput = {
  quantity: number;
  mfgDate: string;
  expiryDate: string;
  unitCost?: number;
  batchNumber?: string;
};

@Injectable()
export class InventoryBatchService {
  constructor(private readonly prisma: PrismaService) {}

  validateBatchDates(mfgDate: string, expiryDate: string): { mfg: Date; expiry: Date } {
    try {
      const mfg = parseIsoDate(mfgDate);
      const expiry = parseIsoDate(expiryDate);
      assertExpiryOnOrAfterMfg(mfg, expiry);
      return { mfg, expiry };
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid batch dates.');
    }
  }

  async listBatchesForStock(tenantId: string, stockId: string) {
    return this.prisma.client.inventoryStockBatch.findMany({
      where: { tenantId, stockId, quantity: { gt: 0 } },
      orderBy: [{ expiryDate: 'asc' }, { mfgDate: 'asc' }],
    });
  }

  async addBatch(
    tenantId: string,
    stockId: string,
    input: StockBatchInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (input.quantity <= 0) {
      throw new BadRequestException('Batch quantity must be positive.');
    }
    const { mfg, expiry } = this.validateBatchDates(input.mfgDate, input.expiryDate);
    const db = tx ?? this.prisma.client;

    const stock = await db.inventoryStock.findFirst({
      where: { id: stockId, tenantId },
      include: { product: true, variant: true },
    });
    if (!stock) throw new NotFoundException('Stock record not found.');

    const unitCost =
      input.unitCost ??
      (stock.variant ? Number(stock.variant.costPrice) : Number(stock.product.costPrice ?? 0));

    const batch = await db.inventoryStockBatch.create({
      data: {
        tenantId,
        stockId,
        quantity: input.quantity,
        mfgDate: mfg,
        expiryDate: expiry,
        unitCost,
        batchNumber: input.batchNumber?.trim() || null,
      },
    });

    await db.inventoryStock.update({
      where: { id: stockId },
      data: { quantity: stock.quantity + input.quantity },
    });

    return batch;
  }

  async allocateAndDeduct(
    tenantId: string,
    stockId: string,
    requestedQty: number,
    tx?: Prisma.TransactionClient,
  ): Promise<{ allocations: FefoAllocation[]; totalCost: number }> {
    const db = tx ?? this.prisma.client;
    const stock = await db.inventoryStock.findFirst({
      where: { id: stockId, tenantId },
      include: { product: true },
    });
    if (!stock) throw new NotFoundException('Stock record not found.');

    if (!stock.product.batchTracked) {
      const unitCost = Number(stock.product.costPrice ?? 0);
      if (stock.quantity - stock.reservedQty < requestedQty) {
        throw new BadRequestException(`Insufficient stock.`);
      }
      await db.inventoryStock.update({
        where: { id: stockId },
        data: { quantity: { decrement: requestedQty } },
      });
      return {
        allocations: [],
        totalCost: Math.round(unitCost * requestedQty * 100) / 100,
      };
    }

    const batches = await db.inventoryStockBatch.findMany({
      where: { tenantId, stockId, quantity: { gt: 0 } },
      orderBy: [{ expiryDate: 'asc' }, { mfgDate: 'asc' }],
    });

    let allocations: FefoAllocation[];
    try {
      allocations = allocateFefo(
        batches.map((b) => ({
          id: b.id,
          quantity: b.quantity,
          mfgDate: b.mfgDate,
          expiryDate: b.expiryDate,
          unitCost: Number(b.unitCost),
        })),
        requestedQty,
      );
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Stock allocation failed.',
      );
    }

    let totalCost = 0;
    for (const alloc of allocations) {
      totalCost += alloc.qty * alloc.unitCost;
      await db.inventoryStockBatch.update({
        where: { id: alloc.batchId },
        data: { quantity: { decrement: alloc.qty } },
      });
    }

    await db.inventoryStock.update({
      where: { id: stockId },
      data: { quantity: { decrement: requestedQty } },
    });

    return { allocations, totalCost: Math.round(totalCost * 100) / 100 };
  }

  async restoreDeduction(
    tenantId: string,
    stockId: string,
    qty: number,
    allocations: Array<{ batchId: string; qty: number }>,
    tx?: Prisma.TransactionClient,
  ) {
    if (qty <= 0) return;
    const db = tx ?? this.prisma.client;
    const stock = await db.inventoryStock.findFirst({
      where: { id: stockId, tenantId },
      include: { product: true },
    });
    if (!stock) throw new NotFoundException('Stock record not found.');

    if (stock.product.batchTracked && allocations.length) {
      for (const alloc of allocations) {
        await db.inventoryStockBatch.update({
          where: { id: alloc.batchId },
          data: { quantity: { increment: alloc.qty } },
        });
      }
    }

    await db.inventoryStock.update({
      where: { id: stockId },
      data: { quantity: { increment: qty } },
    });
  }

  resolveBatchFilterStatus(
    batches: Array<{ expiryDate: Date; quantity: number }>,
    expiringSoonDays: number,
    filter?: string,
  ): boolean {
    if (!filter || filter === 'all') return true;
    const active = batches.filter((b) => b.quantity > 0);
    if (filter === 'no_expiry') return active.length === 0;
    if (active.length === 0) return false;

    const statuses = active.map((b) => batchExpiryStatus(b.expiryDate, expiringSoonDays));
    if (filter === 'expired') return statuses.some((s) => s === 'expired');
    if (filter === 'expiring_soon') return statuses.some((s) => s === 'expiring_soon');
    return true;
  }

  mapBatchForApi(
    batch: {
      id: string;
      quantity: number;
      mfgDate: Date;
      expiryDate: Date;
      unitCost: { toNumber(): number } | number;
      batchNumber: string | null;
    },
    expiringSoonDays: number,
  ) {
    const status: BatchExpiryStatus = batchExpiryStatus(batch.expiryDate, expiringSoonDays);
    return {
      id: batch.id,
      quantity: batch.quantity,
      mfgDate: toIsoDate(batch.mfgDate),
      expiryDate: toIsoDate(batch.expiryDate),
      unitCost: typeof batch.unitCost === 'number' ? batch.unitCost : batch.unitCost.toNumber(),
      batchNumber: batch.batchNumber ?? undefined,
      expiryStatus: status,
    };
  }
}
