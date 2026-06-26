import { createFileRoute } from "@tanstack/react-router";
import { loadPlatformDiagnostics } from "@/lib/platform/admin-loaders";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/infrastructure")({
  loader: () => loadPlatformDiagnostics(),
  component: InfrastructurePage,
});

function statusBadge(status: string) {
  const ok = status === "ok" || status === "not_configured";
  return (
    <Badge variant={ok ? "secondary" : "destructive"} className="font-mono text-[10px] uppercase">
      {status}
    </Badge>
  );
}

function InfrastructurePage() {
  const data = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal health view for Super Admin — no tenant business data is shown.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Active workspaces</span>
          </div>
          <p className="mt-2 text-3xl font-semibold">{data.activeTenants}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tenants on trial or paid plans</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Workspace members</span>
          </div>
          <p className="mt-2 text-3xl font-semibold">{data.activeUsers}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active users across all workspaces</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Postgres</span>
          </div>
          <p className="mt-2">{statusBadge(data.database.postgres)}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Redis</span>
          </div>
          <p className="mt-2">{statusBadge(data.database.redis)}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">API</span>
          </div>
          <p className="mt-2">{statusBadge(data.api.status)}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Migrations</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.migrations?.applied ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.migrations?.pending ? `${data.migrations.pending} pending` : statusBadge(data.migrations?.status ?? "degraded")}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Recent security events</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.recentSecurityEvents.length === 0 ? (
              <li className="text-muted-foreground">No security events recorded.</li>
            ) : (
              data.recentSecurityEvents.map((e) => (
                <li key={e.id} className="rounded-md border border-border px-3 py-2">
                  <span className="font-mono text-xs">{e.action}</span>
                  <span className="ml-2 text-muted-foreground">{new Date(e.at).toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card className="border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Recent errors</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.recentErrors.length === 0 ? (
              <li className="text-muted-foreground">No error audit entries.</li>
            ) : (
              data.recentErrors.map((e) => (
                <li key={e.id} className="rounded-md border border-border px-3 py-2">
                  <span className="font-mono text-xs">{e.action}</span>
                  <span className="ml-2 text-muted-foreground">{new Date(e.at).toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Last checked {new Date(data.checkedAt).toLocaleString()}</p>
    </div>
  );
}
