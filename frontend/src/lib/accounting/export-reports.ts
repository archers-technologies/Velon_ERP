import { emptyAccountingWorkspace } from '@/lib/workspace/empty-states';

type AccountingData = ReturnType<typeof emptyAccountingWorkspace>;

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBalanceSheetCsv(data: AccountingData) {
  downloadCsv('velon-balance-sheet.csv', [
    ['Account', 'Amount'],
    ['Cashbook', String(data.kpis.cashbook)],
    ['Receivables', String(data.kpis.receivables)],
    ['Payables', String(data.kpis.payables)],
    ['Inventory (implied)', String(data.kpis.cogsMtd)],
    ['Net operating', String(data.kpis.netOperating ?? 0)],
  ]);
}

export function exportPlCsv(data: AccountingData) {
  downloadCsv('velon-pl-detail.csv', [
    ['Line', 'Amount'],
    ['Revenue (MTD)', String(data.kpis.recognizedRevenueMtd)],
    ['COGS (MTD)', String(data.kpis.cogsMtd)],
    ['OpEx (MTD)', String(data.kpis.expensesMtd)],
    ['Net operating', String(data.kpis.netOperating ?? 0)],
  ]);
}

export function exportTrialBalanceCsv(data: AccountingData) {
  const rows: string[][] = [['Account', 'Debit', 'Credit']];
  for (const je of data.journalEntries) {
    for (const line of je.lines ?? []) {
      rows.push([line.account, String(line.debit), String(line.credit)]);
    }
  }
  downloadCsv('velon-trial-balance.csv', rows);
}

export function exportConsolidationCsv(data: AccountingData) {
  downloadCsv('velon-consolidation.csv', [
    ['Metric', 'Value'],
    ['Cashbook', String(data.kpis.cashbook)],
    ['Receivables', String(data.kpis.receivables)],
    ['Payables', String(data.kpis.payables)],
    ['Revenue MTD', String(data.kpis.recognizedRevenueMtd)],
    ['Open invoices', String(data.invoices.length)],
    ['Journal entries', String(data.journalEntries.length)],
  ]);
}
