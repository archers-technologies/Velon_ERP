import { Link, Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadCrmDashboardMetrics, type CrmDashboardMetrics } from "@/lib/crm/pipeline-api";

const salesCrmNav = [
  { to: "/app/crm/leads", label: "Leads" },
  { to: "/app/crm/opportunities", label: "Opportunities" },
  { to: "/app/crm/quotations", label: "Quotations" },
  { to: "/app/crm/proposals", label: "Proposals" },
  { to: "/app/crm/pipelines", label: "Pipelines" },
  { to: "/app/crm/templates", label: "Templates" },
] as const;

export const Route = createFileRoute("/app/crm")({
  beforeLoad: ({ location }) => {
    const p = location.pathname;
    if (p !== "/app/crm" && p !== "/app/crm/") return;

    const section = (location.search as { section?: string })?.section;
    if (section === "customers" || p === "/app/crm/") {
      throw redirect({ to: "/app/customers", search: { section: "customers" } });
    }
    throw redirect({ to: "/app/crm/leads" });
  },
  component: SalesCrmLayout,
});

function SalesCrmLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [metrics, setMetrics] = useState<CrmDashboardMetrics | null>(null);

  useEffect(() => {
    void loadCrmDashboardMetrics()
      .then(setMetrics)
      .catch((e) => toast.error(String(e)));
  }, [pathname]);

  const statCards = metrics
    ? [
        { label: "Total leads", value: metrics.totalLeads },
        { label: "Qualified leads", value: metrics.qualifiedLeads },
        { label: "Open opportunities", value: metrics.openOpportunities },
        { label: "Won", value: metrics.wonOpportunities },
        { label: "Lost", value: metrics.lostOpportunities },
        { label: "Pipeline value", value: `$${metrics.pipelineValue.toLocaleString()}` },
        { label: "Expected revenue", value: `$${metrics.expectedRevenue.toLocaleString()}` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Sales
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Sales CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage leads, opportunities, quotations, proposals, and sales pipeline.
        </p>
      </div>

      {statCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {statCards.map((s) => (
            <Card key={s.label} className="border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {salesCrmNav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
