import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendTone = 'neutral',
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: string;
  trendTone?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  const trendCls =
    trendTone === 'up'
      ? 'text-success'
      : trendTone === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'group border-border/80 bg-card/90 hover:border-primary/20 relative overflow-hidden rounded-xl border p-5 shadow-sm backdrop-blur-sm transition hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {label}
        </span>
        {Icon ? (
          <div className="bg-primary/8 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <Icon
              className="h-4 w-4"
              aria-hidden
            />
          </div>
        ) : null}
      </div>
      <p className="text-foreground mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {(hint || trend) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {trend ? <span className={cn('font-medium', trendCls)}>{trend}</span> : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      )}
    </div>
  );
}
