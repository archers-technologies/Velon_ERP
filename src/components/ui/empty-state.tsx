import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function EmptyStateActionButton({
  children,
  onClick,
  to,
  asChild,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  asChild?: boolean;
}) {
  if (to) {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={to}>{children}</a>
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={onClick} asChild={asChild}>
      {children}
    </Button>
  );
}
