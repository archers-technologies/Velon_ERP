import type { SalesInvoiceStatus } from '@/lib/sales/invoice-api';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  DRAFT: 'Draft',
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  VOID: 'Void',
};

export function invoiceStatusClass(status: SalesInvoiceStatus) {
  switch (status) {
    case 'PAID':
      return 'border-success/25 bg-success/10 text-success';
    case 'PARTIALLY_PAID':
    case 'UNPAID':
      return 'border-warning/35 bg-warning/15 text-warning-foreground';
    case 'OVERDUE':
      return 'border-destructive/25 bg-destructive/10 text-destructive';
    case 'DRAFT':
      return 'border-border bg-muted/50 text-muted-foreground';
    case 'CANCELLED':
    case 'VOID':
      return 'border-border bg-muted text-muted-foreground';
    default:
      return 'border-border bg-muted/50 text-muted-foreground';
  }
}

export function invoiceStatusLabel(status: SalesInvoiceStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function SalesInvoiceStatusBadge({ status }: { status: SalesInvoiceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        invoiceStatusClass(status),
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
      {invoiceStatusLabel(status)}
    </span>
  );
}
