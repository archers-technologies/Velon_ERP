import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, TrendingUp, AlertCircle, Users, Package } from "lucide-react";
import { classifyDashboardLoaderError, formatCurrencyLabel } from "@velon/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { WorkspaceDashboardSkeleton } from "@/components/workspace/workspace-dashboard-skeleton";
import { signOutWorkspace } from "@/lib/auth/sign-out";
import { loadWorkspaceDashboard } from "@/lib/workspace/loaders";
import { OnboardingChecklist } from "@/components/workspace/onboarding-checklist";
import { QuickActionGrid } from "@/components/workspace/quick-action-grid";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  loader: () => loadWorkspaceDashboard(),
  pendingComponent: WorkspaceDashboardSkeleton,
  component: DashboardPage,
  errorComponent: DashboardError,
});

function DashboardError({ error }: { error: Error }) {
  const kind = classifyDashboardLoaderError(error.message);

  if (kind === "api_config") {
    return (
      <Card className="border-amber-500/30 bg-card p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
        <h2 className="mt-4 font-semibold">API URL is not configured</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add <code className="rounded bg-muted px-1">VITE_API_URL</code> in the web environment
          (for example in <code className="rounded bg-muted px-1">.env</code>). In local development,
          run <code className="rounded bg-muted px-1">npm run dev</code> so the Vite proxy can reach
          the API on port 3001.
        </p>
      </Card>
    );
  }

  const isAuth = kind === "auth";
  const title = isAuth ? "Session expired" : "Could not load workspace dashboard";
  const description = isAuth
    ? "Your session is no longer valid. Sign in again to continue."
    : error.message;

  return (
    <Card className="border-destructive/30 bg-card p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {isAuth ? (
          <Button
            variant="outline"
            onClick={() => {
              signOutWorkspace();
            }}
          >
            Sign in again
          </Button>
        ) : (
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry connection
          </Button>
        )}
      </div>
    </Card>
  );
}

function DashboardPage() {
  const data = Route.useLoaderData();
  const currencyLabel = formatCurrencyLabel(data.workspace.currency);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
          Good {getGreeting()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{data.company.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Easy and affordable ERP for growing businesses · {currencyLabel}
        </p>
      </div>

      <OnboardingChecklist data={data} />

      <div>
        <h2 className="text-sm font-semibold">What do you want to do today?</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          One tap to create invoices, add customers, record payments, and more.
        </p>
        <div className="mt-4">
          <QuickActionGrid />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Customers"
          value={data.crmSummary.customers}
          hint={data.crmSummary.customers === 0 ? "Add your first customer" : "Active customers"}
          icon={Users}
        />
        <MetricCard
          label="Open quotes"
          value={data.crmSummary.openQuotations}
          hint="Quotations waiting for approval"
          icon={TrendingUp}
        />
        <MetricCard
          label="Products"
          value={data.inventorySummary.totalProducts}
          hint={data.inventorySummary.totalProducts === 0 ? "Add products you sell" : "In catalog"}
          icon={Package}
        />
        <MetricCard
          label="Low stock"
          value={data.inventorySummary.lowStockAlerts}
          hint={
            data.inventorySummary.lowStockAlerts > 0
              ? "Items need restocking"
              : "Stock levels look good"
          }
          icon={AlertCircle}
          trendTone={data.inventorySummary.lowStockAlerts > 0 ? "down" : "neutral"}
        />
      </div>

      {(data.inventorySummary.pendingPurchaseOrders > 0 ||
        data.crmSummary.openOpportunities > 0) && (
        <Card className="border-border bg-card p-4">
          <p className="text-sm font-medium">Needs your attention</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {data.inventorySummary.pendingPurchaseOrders > 0 && (
              <li>
                <Link to="/app/procurement" className="text-primary hover:underline">
                  {data.inventorySummary.pendingPurchaseOrders} pending purchase
                  {data.inventorySummary.pendingPurchaseOrders === 1 ? "" : "s"}
                </Link>
              </li>
            )}
            {data.crmSummary.openOpportunities > 0 && (
              <li>
                <Link to="/app/crm/opportunities" className="text-primary hover:underline">
                  {data.crmSummary.openOpportunities} open sales opportunit
                  {data.crmSummary.openOpportunities === 1 ? "y" : "ies"}
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
