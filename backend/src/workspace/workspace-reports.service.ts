import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ReportsQueryDto } from './dto/reports-query.dto';
import { resolveReportPeriod, type ResolvedReportPeriod } from './report-date-range.util';

export type PosSaleLineMeta = {
  name: string;
  qty: number;
  unitPrice: number;
  unitCost?: number;
  discount?: number;
  inventoryId?: string;
  warehouseId?: string;
  batchAllocations?: Array<{
    batchId: string;
    qty: number;
    mfgDate: string;
    expiryDate: string;
    unitCost: number;
  }>;
};

export type PosSaleAuditMeta = {
  total?: number;
  grossTotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  cogsTotal?: number;
  returnsTotal?: number;
  lineCount?: number;
  inventoryRowsTouched?: number;
  customerName?: string;
  warehouseId?: string;
  status?: 'paid' | 'due' | 'voided' | 'cancelled';
  lines?: PosSaleLineMeta[];
};

export type SalesReportTotals = {
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  taxTotal: number;
  ticketCount: number;
};

@Injectable()
export class WorkspaceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  parsePosMeta(metadata: unknown): PosSaleAuditMeta {
    if (!metadata || typeof metadata !== 'object') return {};
    return metadata as PosSaleAuditMeta;
  }

  resolvePeriod(timezone: string, query?: ReportsQueryDto): ResolvedReportPeriod {
    try {
      return resolveReportPeriod({
        preset: query?.preset,
        startDate: query?.startDate,
        endDate: query?.endDate,
        timeZone: timezone,
      });
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid report period.');
    }
  }

  async posSalesInPeriod(tenantId: string, period: ResolvedReportPeriod, warehouseId?: string) {
    const rows = await this.prisma.client.auditLog.findMany({
      where: {
        tenantId,
        action: { in: ['pos.sale_paid', 'pos.sale_due', 'pos.sale_return'] },
        createdAt: { gte: period.start, lte: period.end },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!warehouseId) return rows;

    return rows.filter((row) => {
      const meta = this.parsePosMeta(row.metadata);
      if (meta.warehouseId === warehouseId) return true;
      return meta.lines?.some((l) => l.warehouseId === warehouseId) ?? false;
    });
  }

  summarizePosSales(
    rows: Awaited<ReturnType<WorkspaceReportsService['posSalesInPeriod']>>,
    expenses = 0,
  ): SalesReportTotals & {
    paidTotal: number;
    dueTotal: number;
    invoices: Array<{
      id: string;
      customer: string;
      amount: number;
      status: 'paid' | 'due' | 'return';
      date: string;
      at: string;
      lineCount: number;
      grossAmount: number;
      discount: number;
      cogs: number;
    }>;
    productSales: Array<{ name: string; qty: number; revenue: number; cogs: number }>;
    customerSales: Array<{ customer: string; revenue: number }>;
    paymentMethods: Array<{ method: string; amount: number }>;
    dailyTrend: Array<{ period: string; revenue: number; netSales: number }>;
  } {
    let grossSales = 0;
    let discounts = 0;
    let returns = 0;
    let cogs = 0;
    let taxTotal = 0;
    let paidTotal = 0;
    let dueTotal = 0;

    const productMap = new Map<string, { qty: number; revenue: number; cogs: number }>();
    const customerMap = new Map<string, number>();
    const dailyMap = new Map<string, { revenue: number; netSales: number }>();

    const invoices = rows
      .filter((row) => {
        const meta = this.parsePosMeta(row.metadata);
        return meta.status !== 'voided' && meta.status !== 'cancelled';
      })
      .map((row) => {
        const meta = this.parsePosMeta(row.metadata);
        const isReturn = row.action === 'pos.sale_return';
        const lines = meta.lines ?? [];

        let lineGross = 0;
        let lineDiscount = 0;
        let lineCogs = 0;

        for (const line of lines) {
          const gross = line.qty * line.unitPrice;
          const disc = line.discount ?? 0;
          const cost = (line.unitCost ?? 0) * line.qty;
          lineGross += gross;
          lineDiscount += disc;
          lineCogs += cost;

          const key = line.name;
          const cur = productMap.get(key) ?? { qty: 0, revenue: 0, cogs: 0 };
          cur.qty += line.qty;
          cur.revenue += gross - disc;
          cur.cogs += cost;
          productMap.set(key, cur);
        }

        const ticketGross = meta.grossTotal ?? lineGross ?? Number(meta.total ?? 0);
        const ticketDiscount = meta.discountTotal ?? lineDiscount;
        const ticketCogs = meta.cogsTotal ?? lineCogs;
        const ticketTax = meta.taxTotal ?? 0;
        const netTicket = isReturn ? -(ticketGross - ticketDiscount) : ticketGross - ticketDiscount;

        if (isReturn) {
          returns += ticketGross - ticketDiscount;
        } else {
          grossSales += ticketGross;
          discounts += ticketDiscount;
          cogs += ticketCogs;
          taxTotal += ticketTax;
        }

        const paid = row.action === 'pos.sale_paid';
        if (paid && !isReturn) paidTotal += netTicket;
        else if (!isReturn) dueTotal += netTicket;

        const customer = meta.customerName ?? 'Walk-in';
        customerMap.set(customer, (customerMap.get(customer) ?? 0) + netTicket);

        const day = row.createdAt.toISOString().slice(0, 10);
        const dayCur = dailyMap.get(day) ?? { revenue: 0, netSales: 0 };
        dayCur.revenue += ticketGross;
        dayCur.netSales += netTicket;
        dailyMap.set(day, dayCur);

        return {
          id: row.entityId ?? row.id,
          customer,
          amount: Math.round(netTicket * 100) / 100,
          status: isReturn ? ('return' as const) : paid ? ('paid' as const) : ('due' as const),
          date: day,
          at: row.createdAt.toISOString(),
          lineCount: meta.lineCount ?? lines.length,
          grossAmount: Math.round(ticketGross * 100) / 100,
          discount: Math.round(ticketDiscount * 100) / 100,
          cogs: Math.round(ticketCogs * 100) / 100,
        };
      });

    const netSales = Math.round((grossSales - discounts - returns) * 100) / 100;
    const grossProfit = Math.round((netSales - cogs) * 100) / 100;
    const netProfit = Math.round((grossProfit - expenses) * 100) / 100;

    return {
      grossSales: Math.round(grossSales * 100) / 100,
      discounts: Math.round(discounts * 100) / 100,
      returns: Math.round(returns * 100) / 100,
      netSales,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit,
      expenses: Math.round(expenses * 100) / 100,
      netProfit,
      taxTotal: Math.round(taxTotal * 100) / 100,
      ticketCount: invoices.length,
      paidTotal: Math.round(paidTotal * 100) / 100,
      dueTotal: Math.round(dueTotal * 100) / 100,
      invoices,
      productSales: [...productMap.entries()].map(([name, v]) => ({
        name,
        qty: v.qty,
        revenue: Math.round(v.revenue * 100) / 100,
        cogs: Math.round(v.cogs * 100) / 100,
      })),
      customerSales: [...customerMap.entries()].map(([customer, revenue]) => ({
        customer,
        revenue: Math.round(revenue * 100) / 100,
      })),
      paymentMethods: [
        { method: 'Cash / Paid', amount: Math.round(paidTotal * 100) / 100 },
        { method: 'Due / Credit', amount: Math.round(dueTotal * 100) / 100 },
      ].filter((p) => p.amount > 0),
      dailyTrend: [...dailyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, v]) => ({
          period,
          revenue: Math.round(v.revenue * 100) / 100,
          netSales: Math.round(v.netSales * 100) / 100,
        })),
    };
  }

  buildExportPayload(input: {
    companyName: string;
    reportName: string;
    period: ResolvedReportPeriod;
    currency: string;
    branchName?: string;
    totals: SalesReportTotals;
    rows: Array<Record<string, string | number>>;
    filters: Record<string, string>;
  }) {
    return {
      header: {
        companyName: input.companyName,
        reportName: input.reportName,
        periodLabel: input.period.label,
        startDate: input.period.startDate,
        endDate: input.period.endDate,
        generatedAt: new Date().toISOString(),
        branch: input.branchName,
        currency: input.currency,
        filters: input.filters,
      },
      totals: input.totals,
      rows: input.rows,
    };
  }
}
