import type {
  AccountingAuditRecord,
  ApBillRecord,
  ApBillStage,
  BankFeedRecord,
  CrmDealActivityRecord,
  CrmLeadRecord,
  CrmStage,
  CustomerRecord,
  InvoiceRecord,
  JournalEntryRecord,
} from '@/lib/types/workspace-ui';
import {
  emptyAccountingWorkspace,
  emptyBranchesWorkspace,
  emptySalesCrmWorkspace,
} from './empty-states';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapInvoiceStatus(status: unknown): InvoiceRecord['status'] {
  const s = String(status ?? '').toLowerCase();
  if (s === 'paid') return 'Paid';
  if (s === 'overdue') return 'Overdue';
  return 'Pending';
}

function normalizeInvoice(raw: Record<string, unknown>): InvoiceRecord {
  const id = String(raw.id ?? '');
  const customer = String(raw.customer ?? 'Walk-in');
  const amt = Number(raw.amt ?? raw.amount ?? 0);
  const postedDate = String(raw.postedDate ?? raw.date ?? new Date().toISOString().slice(0, 10));
  const status = mapInvoiceStatus(raw.status);
  return {
    id,
    customer,
    amt,
    status,
    postedDate,
    label: String(raw.label ?? `${id} · ${customer}`),
    customerId: typeof raw.customerId === 'string' ? raw.customerId : undefined,
  };
}

function journalFromSale(raw: Record<string, unknown>): JournalEntryRecord {
  const id = String(raw.id ?? '');
  const customer = String(raw.customer ?? 'Walk-in');
  const amount = Number(raw.amount ?? raw.amt ?? 0);
  const date = String(raw.date ?? raw.postedDate ?? new Date().toISOString().slice(0, 10));
  const status = String(raw.status ?? 'paid').toLowerCase();
  const paid = status === 'paid';
  const memo = String(raw.memo ?? `POS ${status} · ${customer}`);

  if (Array.isArray(raw.lines) && raw.lines.length > 0) {
    return {
      id,
      postedDate: date,
      memo,
      sourceModule: (raw.sourceModule as JournalEntryRecord['sourceModule']) ?? 'sales',
      sourceDocId: typeof raw.sourceDocId === 'string' ? raw.sourceDocId : id,
      postedBy: String(raw.postedBy ?? 'POS'),
      lines: raw.lines as JournalEntryRecord['lines'],
    };
  }

  return {
    id,
    postedDate: date,
    memo,
    sourceModule: 'sales',
    sourceDocId: id,
    postedBy: 'POS',
    lines: paid
      ? [
          { account: '1000 · Cash', debit: amount, credit: 0 },
          { account: '4000 · Sales revenue', debit: 0, credit: amount },
        ]
      : [
          { account: '1200 · Accounts receivable', debit: amount, credit: 0 },
          { account: '4000 · Sales revenue', debit: 0, credit: amount },
        ],
  };
}

function normalizeAuditRow(raw: Record<string, unknown>): AccountingAuditRecord {
  const actorName = raw.actorName ?? raw.actor;
  const actorEmail = raw.actorEmail;
  const actor =
    typeof actorName === 'string' && actorName
      ? actorName
      : typeof actorEmail === 'string' && actorEmail
        ? actorEmail
        : 'System';
  return {
    id: String(raw.id ?? ''),
    at: String(raw.at ?? new Date().toISOString()),
    actor,
    action: String(raw.action ?? ''),
    entityRef: String(raw.entityRef ?? raw.entityId ?? raw.entityType ?? '—'),
  };
}

function normalizeApBill(raw: Record<string, unknown>): ApBillRecord {
  const stage = String(raw.stage ?? 'pending_review') as ApBillStage;
  return {
    id: String(raw.id ?? ''),
    supplierName: String(raw.supplierName ?? raw.vendor ?? 'Supplier'),
    supplierId: typeof raw.supplierId === 'string' ? raw.supplierId : undefined,
    amount: Number(raw.amount ?? 0),
    dueDate: String(raw.dueDate ?? new Date().toISOString().slice(0, 10)),
    stage,
    reference: String(raw.reference ?? raw.id ?? '—'),
  };
}

function normalizeBankFeed(raw: Record<string, unknown>): BankFeedRecord {
  const matchStatus = String(raw.matchStatus ?? 'matched').toLowerCase();
  return {
    id: String(raw.id ?? ''),
    bookedDate: String(raw.bookedDate ?? raw.date ?? new Date().toISOString().slice(0, 10)),
    description: String(raw.description ?? 'Bank transaction'),
    amount: Number(raw.amount ?? 0),
    matchStatus:
      matchStatus === 'unmatched'
        ? 'unmatched'
        : matchStatus === 'suggested'
          ? 'suggested'
          : 'matched',
    matchedTo: typeof raw.matchedTo === 'string' ? raw.matchedTo : undefined,
  };
}

export function normalizeAccountingWorkspace(
  raw: unknown,
): ReturnType<typeof emptyAccountingWorkspace> {
  const base = emptyAccountingWorkspace();
  if (!raw || typeof raw !== 'object') return base;

  const data = raw as Record<string, unknown>;
  const kpisRaw = (data.kpis as Record<string, number>) ?? {};
  if (kpisRaw.netOperating === undefined && kpisRaw.netOperatingDemo !== undefined) {
    kpisRaw.netOperating = kpisRaw.netOperatingDemo;
  }

  const posInvoices = asArray<Record<string, unknown>>(data.invoices).map(normalizeInvoice);
  const journalRaw = asArray<Record<string, unknown>>(data.journalEntries);
  const journalEntries =
    journalRaw.length > 0
      ? journalRaw.map((je) =>
          Array.isArray(je.lines) && je.lines.length > 0
            ? journalFromSale(je)
            : journalFromSale({
                ...je,
                customer: je.memo,
                amount: je.amount,
                date: je.postedDate ?? je.date,
              }),
        )
      : posInvoices.map((inv) =>
          journalFromSale({
            id: inv.id,
            customer: inv.customer,
            amount: inv.amt,
            date: inv.postedDate,
            status: inv.status === 'Paid' ? 'paid' : 'due',
          }),
        );

  return {
    ...base,
    kpis: { ...base.kpis, ...kpisRaw },
    agingAr: asArray(data.agingAr),
    agingAp: asArray(data.agingAp),
    cashFlowTrend: asArray(data.cashFlowTrend),
    automationAlerts: asArray<string>(data.automationAlerts),
    controlAlerts: asArray<string>(data.controlAlerts),
    invoices: posInvoices,
    journalEntries,
    bankFeed: asArray<Record<string, unknown>>(data.bankFeed).map(normalizeBankFeed),
    apBills: asArray<Record<string, unknown>>(data.apBills).map(normalizeApBill),
    auditLog: asArray<Record<string, unknown>>(data.auditLog).map(normalizeAuditRow),
  };
}

export function normalizeBranchesWorkspace(
  raw: unknown,
): ReturnType<typeof emptyBranchesWorkspace> {
  const base = emptyBranchesWorkspace();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Record<string, unknown>;
  const kpisRaw = (data.kpis as Partial<typeof base.kpis>) ?? {};
  return {
    branches: asArray<(typeof base.branches)[number]>(data.branches),
    tasks: asArray<(typeof base.tasks)[number]>(data.tasks),
    alerts: asArray<string>(data.alerts),
    kpis: { ...base.kpis, ...kpisRaw },
  };
}

export function normalizeSalesCrmWorkspace(
  raw: unknown,
): ReturnType<typeof emptySalesCrmWorkspace> {
  const base = emptySalesCrmWorkspace();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Record<string, unknown>;
  const inventoryHealth = (data.inventoryHealth as Record<string, unknown>) ?? {};
  const stageCountsRaw = (data.stageCounts as Partial<Record<CrmStage, number>>) ?? {};
  const kpisRaw = (data.kpis as Partial<typeof base.kpis>) ?? {};
  return {
    stageCounts: { ...base.stageCounts, ...stageCountsRaw },
    leads: asArray<CrmLeadRecord>(data.leads),
    activities: asArray<CrmDealActivityRecord>(data.activities),
    customers: asArray<CustomerRecord>(data.customers),
    invoices: asArray<Record<string, unknown>>(data.invoices).map(normalizeInvoice),
    inventoryHealth: {
      lowStockSkus: Number(inventoryHealth.lowStockSkus ?? 0),
      spotlightLines: asArray<string>(inventoryHealth.spotlightLines),
    },
    kpis: { ...base.kpis, ...kpisRaw },
    tasksToday: asArray<(typeof base.tasksToday)[number]>(data.tasksToday),
    aiInsights: asArray<string>(data.aiInsights),
  };
}
