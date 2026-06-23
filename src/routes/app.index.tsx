import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { classifyDashboardLoaderError, workspaceAdminSearch } from "@velon/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceDashboardSkeleton } from "@/components/workspace-dashboard-skeleton";
import { signOutWorkspace } from "@/lib/auth/sign-out";
import { loadWorkspaceDashboard } from "@/lib/workspace/loaders";
import {
  Building2,
  Users,
  Layers,
  Bell,
  CreditCard,
  UserPlus,
  Settings,
  ArrowRight,
  Briefcase,
  Target,
  FileText,
  Activity,
  Boxes,
  Warehouse,
  ClipboardList,
} from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Welcome back
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{data.company.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.workspace.name} · {data.subscription.planDisplayName} plan ·{" "}
            <Badge variant="secondary" className="ml-1 align-middle">
              {data.subscription.status}
            </Badge>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/settings/admin" search={workspaceAdminSearch("company")}>
            <Settings className="mr-2 h-4 w-4" />
            Company settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Subscription</span>
          </div>
          <p className="mt-2 text-xl font-semibold">{data.subscription.planDisplayName}</p>
          <p className="text-xs text-muted-foreground">Renews {data.subscription.renewalDate}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Seats</span>
          </div>
          <p className="mt-2 text-xl font-semibold">
            {data.seats.used}
            {data.seats.unlimited ? "" : ` / ${data.seats.limit}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.seats.unlimited ? "Unlimited" : `${data.seats.remaining} remaining`}
          </p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Active users</span>
          </div>
          <p className="mt-2 text-xl font-semibold">{data.team.activeUsers}</p>
          <p className="text-xs text-muted-foreground">{data.seats.pendingInvites} pending invites</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Departments</span>
          </div>
          <p className="mt-2 text-xl font-semibold">{data.team.departments}</p>
          <p className="text-xs text-muted-foreground">Organize your team</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserPlus className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Pending invites</span>
          </div>
          <p className="mt-2 text-xl font-semibold">{data.seats.pendingInvites}</p>
          <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Customers</span>
          </div>
          <p className="mt-2 text-xl font-semibold">{data.crmSummary.customers}</p>
          <p className="text-xs text-muted-foreground">
            {data.crmSummary.customers === 0 ? "Add customers" : "Active records"}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">Company information</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd>{data.company.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd>{data.company.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Country</dt>
              <dd>{data.company.country ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Industry</dt>
              <dd>{data.company.industry ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Address</dt>
              <dd>{data.company.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Website</dt>
              <dd>{data.company.website ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tax ID</dt>
              <dd>{data.company.taxId ?? "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">Workspace information</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Workspace name</dt>
              <dd>{data.workspace.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Slug</dt>
              <dd className="font-mono text-xs">{data.workspace.slug}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Timezone</dt>
              <dd>{data.workspace.timezone}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Currency</dt>
              <dd>{data.workspace.currency}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Language</dt>
              <dd>{data.workspace.language}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="border-border bg-card p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Inventory & procurement</h2>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/inventory">Inventory</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/procurement">Procurement</Link>
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Boxes className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Products</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.inventorySummary.totalProducts}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Low stock</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.inventorySummary.lowStockAlerts}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Pending requests</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.inventorySummary.pendingPurchaseRequests}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Pending POs</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.inventorySummary.pendingPurchaseOrders}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Warehouse className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Warehouses</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.inventorySummary.warehouseCount}</p>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Sales CRM summary</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/sales-crm">Open Sales CRM</Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Customers</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.crmSummary.customers}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Active leads</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.crmSummary.leads}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Open opportunities</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.crmSummary.openOpportunities}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Open quotations</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.crmSummary.openQuotations}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">CRM activities</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{data.crmSummary.activities}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.quickActions.map((action) => (
              <Button key={action.label} asChild variant="outline" className="justify-between h-auto py-3">
                <Link
                  to={
                    action.to === "/app/crm" || action.to === "/app/customers"
                      ? "/app/customers"
                      : action.to === "/app/sales-crm"
                        ? "/app/sales-crm"
                        : "/app/settings/admin"
                  }
                  search={
                    action.to === "/app/crm" || action.to === "/app/customers"
                      ? { section: "customers" }
                      : workspaceAdminSearch(
                          (action.search?.section ?? "users") as
                            | "company"
                            | "workspace"
                            | "users"
                            | "departments"
                            | "seats"
                            | "invitations"
                            | "security"
                            | "audit",
                        )
                  }
                >
                  <span className="flex items-center gap-2">
                    {action.label.includes("Invite") || action.label.includes("Add") ? (
                      <UserPlus className="h-4 w-4" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-50" />
                </Link>
              </Button>
            ))}
          </div>
        </Card>

        <Card className="border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {data.notifications.slice(0, 5).map((n) => (
              <li key={n.id} className={`text-sm ${n.read ? "opacity-70" : ""}`}>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
              </li>
            ))}
            {data.notifications.length === 0 && (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}
          </ul>
          <Button asChild variant="link" className="mt-3 h-auto p-0">
            <Link to="/app/alerts">View all alerts</Link>
          </Button>
        </Card>
      </div>

      <Card className="border-border bg-card p-6">
        <h2 className="font-semibold">Recent activity</h2>
        <ul className="mt-4 divide-y">
          {data.recentActivity.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-mono text-xs">{a.action}</span>
              <span className="text-muted-foreground">
                {a.actorEmail ?? "System"} · {new Date(a.at).toLocaleString()}
              </span>
            </li>
          ))}
          {data.recentActivity.length === 0 && (
            <li className="py-6 text-sm text-muted-foreground">Activity will appear as your team uses Velon.</li>
          )}
        </ul>
        <Button asChild variant="link" className="mt-2 h-auto p-0">
          <Link to="/app/settings/admin" search={workspaceAdminSearch("audit")}>
            View audit log
          </Link>
        </Button>
      </Card>
    </div>
  );
}
