import { TENANT_STATUS_DESCRIPTIONS } from '@velon/shared';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TenantStatus } from '@/lib/platform/admin-demo';
import { cn } from '@/lib/utils';

export function tenantStatusClass(status: TenantStatus) {
  switch (status) {
    case 'Active':
      return 'border-success/20 bg-success/10 text-success';
    case 'Trial':
      return 'border-info/20 bg-info/10 text-info';
    case 'Past due':
      return 'border-warning/30 bg-warning/15 text-warning-foreground';
    case 'Suspended':
      return 'border-muted-foreground/25 bg-muted text-muted-foreground';
    default:
      return 'border-border bg-muted/50 text-muted-foreground';
  }
}

export function TenantStatusPill({ status }: { status: TenantStatus }) {
  const description =
    TENANT_STATUS_DESCRIPTIONS[status] ??
    'Billing and access lifecycle status (not demo/test detection).';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex cursor-help items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              tenantStatusClass(status),
            )}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {status}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-left leading-snug"
        >
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
