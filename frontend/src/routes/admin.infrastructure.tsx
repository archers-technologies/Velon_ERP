import { createFileRoute } from '@tanstack/react-router';
import { Activity, Database, Server, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { loadPlatformDiagnostics } from '@/lib/platform/admin-loaders';

export const Route = createFileRoute('/admin/infrastructure')({
  loader: () => loadPlatformDiagnostics(),
  component: InfrastructurePage,
});

function statusBadge(status: string) {
  const ok = status === 'ok' || status === 'not_configured';
  return (
    <Badge
      variant={ok ? 'secondary' : 'destructive'}
      className="font-mono text-[10px] uppercase"
    >
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
        <p className="text-muted-foreground mt-1 text-sm">
          Internal health view for Super Admin — no tenant business data is shown.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wider uppercase">Active workspaces</span>
          </div>
          <p className="mt-2 text-3xl font-semibold">{data.activeTenants}</p>
          <p className="text-muted-foreground mt-1 text-xs">Tenants on trial or paid plans</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wider uppercase">Workspace members</span>
          </div>
          <p className="mt-2 text-3xl font-semibold">{data.activeUsers}</p>
          <p className="text-muted-foreground mt-1 text-xs">Active users across all workspaces</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wider uppercase">Postgres</span>
          </div>
          <p className="mt-2">{statusBadge(data.database.postgres)}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wider uppercase">Redis</span>
          </div>
          <p className="mt-2">{statusBadge(data.database.redis)}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wider uppercase">API</span>
          </div>
          <p className="mt-2">{statusBadge(data.api.status)}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wider uppercase">Migrations</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.migrations?.applied ?? 0}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {data.migrations?.pending
              ? `${data.migrations.pending} pending`
              : statusBadge(data.migrations?.status ?? 'degraded')}
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
                <li
                  key={e.id}
                  className="border-border rounded-md border px-3 py-2"
                >
                  <span className="font-mono text-xs">{e.action}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(e.at).toLocaleString()}
                  </span>
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
                <li
                  key={e.id}
                  className="border-border rounded-md border px-3 py-2"
                >
                  <span className="font-mono text-xs">{e.action}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(e.at).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Last checked {new Date(data.checkedAt).toLocaleString()}
      </p>
    </div>
  );
}
