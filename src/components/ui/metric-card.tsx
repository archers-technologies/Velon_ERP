import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendTone = "neutral",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
  className?: string;
}) {
  const trendCls =
    trendTone === "up"
      ? "text-success"
      : trendTone === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-sm transition hover:border-primary/20 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {(hint || trend) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {trend ? <span className={cn("font-medium", trendCls)}>{trend}</span> : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      )}
    </div>
  );
}
