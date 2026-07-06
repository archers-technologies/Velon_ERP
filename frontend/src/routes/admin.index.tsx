import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Activity,
  ArrowUpRight,
  Building2,
  CreditCard,
  DollarSign,
  Globe,
  MoreHorizontal,
  Plus,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Kpi } from '@/components/workspace/app-shell';
import { TenantStatusPill } from '@/components/workspace/tenant-status-pill';
import { useAdminCurrency } from '@/contexts/admin-currency';
import { loadPlatformOverview } from '@/lib/platform/admin-loaders';
import type { PlatformActivityItem } from '@/lib/types/workspace-ui';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin/')({
  loader: () => loadPlatformOverview(),
  component: AdminOverviewPage,
});

const revenueChartConfig = {
  mrr: {
    label: 'MRR',
    theme: { light: 'oklch(0.2 0 0)', dark: 'oklch(0.92 0 0)' },
  },
} satisfies ChartConfig;

const signupChartConfig = {
  newTenants: {
    label: 'New orgs',
    theme: { light: 'oklch(0.45 0.12 250)', dark: 'oklch(0.72 0.12 250)' },
  },
} satisfies ChartConfig;

type RevenuePeriod = '1W' | '1M' | '3M' | '1Y';

function revenueSeriesForPeriod(
  period: RevenuePeriod,
  byDay: { month: string; mrr: number }[],
  byMonth: { month: string; mrr: number }[],
) {
  switch (period) {
    case '1W':
      return byDay.slice(-7);
    case '1M':
      return byDay;
    case '3M':
      return byMonth.slice(-3);
    case '1Y':
      return byMonth;
    default:
      return byMonth.slice(-6);
  }
}

function activityIcon(kind: PlatformActivityItem['kind']) {
  switch (kind) {
    case 'signup':
      return UserPlus;
    case 'support':
      return Ticket;
    case 'security':
      return ShieldCheck;
    case 'billing':
      return CreditCard;
    default:
      return Server;
  }
}

function activityTone(severity: PlatformActivityItem['severity']) {
  if (severity === 'critical') return 'border-l-destructive bg-destructive/5';
  if (severity === 'warning') return 'border-l-warning bg-warning/10';
  return 'border-l-border bg-muted/30';
}

function logLevelClass(level: 'info' | 'warn' | 'error') {
  if (level === 'error') return 'text-destructive';
  if (level === 'warn') return 'text-warning-foreground';
  return 'text-muted-foreground';
}

function AdminOverviewPage() {
  const { formatCurrency } = useAdminCurrency();
  const o = Route.useLoaderData();
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('1M');
  const tenants = o.recentTenants;
  const seatPct = Math.min(100, Math.round((o.totalSeatsAllocated / o.licenseSeatCapacity) * 100));
  const revenueChartData = useMemo(
    () => revenueSeriesForPeriod(revenuePeriod, o.revenueByDay, o.revenueByMonth),
    [revenuePeriod, o.revenueByDay, o.revenueByMonth],
  );

  return (
    <div className="space-y-6">
      <div className="border-border bg-card/80 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.14em] uppercase">
            Command center
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
            What&apos;s happening right now
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-xs sm:text-sm">
            Health, revenue, tenants, and risk — tuned for a five-second read. Currency follows{' '}
            <Link
              to="/admin/settings"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              platform display
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-lg"
            asChild
          >
            <Link to="/admin/tenants">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add tenant
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg"
            asChild
          >
            <Link to="/admin/subscriptions">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Plans
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg"
            asChild
          >
            <Link to="/admin/settings">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              System settings
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="MRR (platform)"
          value={formatCurrency(o.mrrTotal)}
          delta={`+${o.arrGrowthPct}%`}
          hint="vs last month"
          deltaTone="up"
          icon={DollarSign}
        />
        <Kpi
          label="Active organizations"
          value={o.activeTenantCount.toLocaleString()}
          delta={`${o.trialCount} in trial`}
          hint="Active + trial"
          deltaTone="neutral"
          icon={Building2}
        />
        <Kpi
          label="Seats in use"
          value={`${o.totalSeatsAllocated.toLocaleString()} / ${o.licenseSeatCapacity.toLocaleString()}`}
          delta={`${seatPct}% utilized`}
          hint="Allocated across active tenants"
          deltaTone={seatPct > 85 ? 'down' : 'neutral'}
          icon={Users}
        />
        <Kpi
          label="New trials today"
          value={o.trialCount.toLocaleString()}
          delta="Pipeline signal"
          hint="Across all regions"
          deltaTone="up"
          icon={UserPlus}
        />
        <Kpi
          label="Platform uptime"
          value={`${o.platformUptimePct}%`}
          delta="Last 90 days"
          hint="API process health"
          deltaTone="up"
          icon={Activity}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-card p-4 sm:p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-muted-foreground text-[11px] font-medium tracking-[0.14em] uppercase">
                Recurring revenue trend
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {formatCurrency(o.mrrTotal)}
                </span>
                <span className="text-success text-sm font-medium">↑ {o.arrGrowthPct}%</span>
              </div>
            </div>
            <div className="border-border bg-muted/40 flex items-center gap-1 rounded-lg border p-0.5">
              {(['1W', '1M', '3M', '1Y'] as const).map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'h-7 px-2.5 text-xs',
                    revenuePeriod === p
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => setRevenuePeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <ChartContainer
            config={revenueChartConfig}
            className="aspect-[21/9] max-h-[280px] min-h-[200px] w-full"
          >
            <AreaChart
              data={revenueChartData}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="adminMrrFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-mrr)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-mrr)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border/60"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-[10px]"
              />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrency(Number(v))}
                className="text-[10px]"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="var(--color-mrr)"
                fill="url(#adminMrrFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Plan mix</div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              type="button"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {o.planDistribution.map((p) => (
              <div key={p.plan}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">{p.plan}</span>
                  <span className="font-semibold">{p.pct}%</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-foreground h-full rounded-full"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-pale mt-5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" /> 47 countries
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Top: US · IN · DE · UK · AU</p>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Plan requests</span>
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/10 text-warning-foreground"
            >
              {o.pendingPlanRequests} open
            </Badge>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Security signals</span>
            <Badge
              variant="outline"
              className={
                o.openSecurityAlerts > 0
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : 'border-success/30 bg-success/10 text-success'
              }
            >
              {o.openSecurityAlerts > 0 ? `${o.openSecurityAlerts} review` : 'Clear'}
            </Badge>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold">Tenant acquisition</div>
            <p className="text-muted-foreground text-xs">New organizations per month</p>
          </div>
          <ChartContainer
            config={signupChartConfig}
            className="aspect-[16/9] max-h-[240px] min-h-[180px] w-full"
          >
            <BarChart
              data={o.tenantSignupsByMonth}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border/60"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-[10px]"
              />
              <YAxis
                width={28}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                className="text-[10px]"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="newTenants"
                fill="var(--color-newTenants)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="text-muted-foreground h-4 w-4" />
            <div>
              <div className="text-sm font-semibold">Module load (API share)</div>
              <p className="text-muted-foreground text-xs">Plan distribution across tenants</p>
            </div>
          </div>
          <div className="space-y-3.5">
            {o.moduleUsage.map((m) => (
              <div key={m.module}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{m.module}</span>
                  <span className="font-semibold tabular-nums">{m.pct}%</span>
                </div>
                <Progress
                  value={m.pct}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Live activity</div>
            <Badge
              variant="outline"
              className="text-[10px] font-normal"
            >
              Actionable
            </Badge>
          </div>
          <ul className="space-y-2">
            {o.activityFeed.map((item) => {
              const Icon = activityIcon(item.kind);
              return (
                <li
                  key={item.id}
                  className={`flex gap-3 rounded-lg border border-l-4 py-2.5 pr-2 pl-3 ${activityTone(item.severity)}`}
                >
                  <div className="text-muted-foreground mt-0.5 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">{item.timeLabel}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="mb-4 text-sm font-semibold">System log (tail)</div>
          <ul className="space-y-2.5 font-mono text-[11px] leading-relaxed">
            {o.systemLogs.map((log) => (
              <li
                key={log.id}
                className="border-border bg-muted/20 rounded-md border px-2 py-1.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`shrink-0 uppercase ${logLevelClass(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-muted-foreground">{log.at}</span>
                </div>
                <p className="text-foreground/90 mt-1">{log.message}</p>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full rounded-lg"
            asChild
          >
            <Link to="/admin/alerts-logs">
              Open alerts &amp; logs <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>

        <Card className="border-border bg-foreground text-background relative overflow-hidden p-4 sm:p-5">
          <div className="bg-background/10 absolute -top-12 -right-12 h-44 w-44 rounded-full blur-3xl" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div className="text-sm font-semibold">Agentic signals</div>
            </div>
            <p className="text-background/70 mb-3 text-[11px]">
              Velon monitors drift, capacity, and billing risk — surfacing what needs a human.
            </p>
            <ul className="space-y-2 text-xs">
              {[
                'EU: invoice volume +14% — consider inference pool +1 node.',
                '5 tenants near seat cap — expansion quotes ready.',
                'Webhook p95 820ms APAC — circuit breaker armed (dry-run).',
              ].map((t) => (
                <li
                  key={t}
                  className="border-background/10 bg-background/10 rounded-lg border p-2 leading-relaxed"
                >
                  {t}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="sm"
              className="bg-background text-foreground hover:bg-background/90 mt-4 w-full"
            >
              <Link to="/admin/infrastructure">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> View diagnostics
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <div className="border-border flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="text-sm font-semibold">Recent tenants</div>
            <div className="text-muted-foreground text-xs">
              Full tenant command center with health, storage, and row actions
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 rounded-lg"
            asChild
          >
            <Link to="/admin/tenants">
              View all <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              <tr>
                {['Business', 'Plan', 'Region', 'Users', 'MRR', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-medium sm:px-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className="border-border hover:bg-muted/30 border-t"
                >
                  <td className="px-4 py-3 font-medium sm:px-5 sm:py-3.5">{t.name}</td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <Badge
                      variant="outline"
                      className={`border-border rounded-md font-normal ${t.plan === 'Enterprise' ? 'border-foreground bg-foreground text-background' : ''}`}
                    >
                      {t.plan}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 sm:px-5 sm:py-3.5">{t.country}</td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">{t.users}</td>
                  <td className="px-4 py-3 font-medium sm:px-5 sm:py-3.5">
                    {formatCurrency(t.mrr)}
                  </td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <TenantStatusPill status={t.status} />
                  </td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      type="button"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="mb-2 text-sm font-semibold">Platform operations</div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Partner commissions and synthetic SLO widgets are not shown here. Use{' '}
            <Link
              to="/admin/infrastructure"
              className="underline underline-offset-2"
            >
              Infrastructure
            </Link>{' '}
            for live service health and database diagnostics.
          </p>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="mb-2 text-sm font-semibold">Tenant metrics</div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            MRR, tenant counts, and subscription status on this overview come from the platform API.
            Advanced revenue analytics are available under Subscriptions.
          </p>
        </Card>
      </div>
    </div>
  );
}
