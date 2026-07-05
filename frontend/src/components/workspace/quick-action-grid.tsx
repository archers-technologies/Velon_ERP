import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { WORKSPACE_QUICK_ACTIONS } from "@/lib/workspace/quick-actions";

export function QuickActionGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {WORKSPACE_QUICK_ACTIONS.map((action) => (
        <Link
          key={action.label}
          to={action.to}
          search={action.search}
          className="group block"
        >
          <Card className="flex h-full items-center gap-3 border-border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.tone}`}
            >
              <action.icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-medium group-hover:text-primary">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
