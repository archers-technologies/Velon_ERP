import { cn } from '@/lib/utils';

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

export function invoiceStatusClass(status: InvoiceStatus) {
  switch (status) {
    case 'Paid':
      return 'border-success/25 bg-success/10 text-success';
    case 'Pending':
      return 'border-warning/35 bg-warning/15 text-warning-foreground';
    case 'Overdue':
      return 'border-destructive/25 bg-destructive/10 text-destructive';
    default:
      return 'border-border bg-muted/50 text-muted-foreground';
  }
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        invoiceStatusClass(status),
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}
