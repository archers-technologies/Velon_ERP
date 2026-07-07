import { WorkspaceReportsService } from './workspace-reports.service';

describe('WorkspaceReportsService', () => {
  const service = new WorkspaceReportsService({} as never);

  it('calculates net sales, COGS, and gross profit from POS audit metadata', () => {
    const rows = [
      {
        id: '1',
        entityId: 'POS-1',
        action: 'pos.sale_paid',
        createdAt: new Date('2026-06-15T12:00:00Z'),
        metadata: {
          grossTotal: 100,
          discountTotal: 10,
          cogsTotal: 40,
          customerName: 'Walk-in',
          lines: [{ name: 'Widget', qty: 2, unitPrice: 50, unitCost: 20, discount: 10 }],
        },
      },
    ] as never;

    const summary = service.summarizePosSales(rows, 5);
    expect(summary.grossSales).toBe(100);
    expect(summary.discounts).toBe(10);
    expect(summary.netSales).toBe(90);
    expect(summary.cogs).toBe(40);
    expect(summary.grossProfit).toBe(50);
    expect(summary.netProfit).toBe(45);
  });
});
