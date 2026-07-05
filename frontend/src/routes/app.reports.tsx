import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Download,
  PieChart as PieChartIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspaceCurrency } from '@/contexts/workspace-currency';
import { useDismissiblePanel } from '@/hooks/use-dismissible-panel';
import type { FinanceExpenseDrillNode } from '@/lib/types/workspace-ui';
import { loadFinanceReportsWorkspace } from '@/lib/workspace/loaders';

export const Route = createFileRoute('/app/reports')({
  loader: () => loadFinanceReportsWorkspace(),
  component: ReportsPage,
});

const cashNetConfig = {
  net: {
    label: 'Net cash movement',
    theme: { light: '#0f766e', dark: '#2dd4bf' },
  },
} satisfies ChartConfig;

const expenseBarConfig = {
  value: {
    label: 'OpEx MTD',
    theme: { light: '#1d4ed8', dark: '#60a5fa' },
  },
} satisfies ChartConfig;

type RoleLens = 'cfo' | 'controller';

function ReportsPage() {
  const { formatCurrency } = useWorkspaceCurrency();
  const data = Route.useLoaderData();
  const [drillOpen, setDrillOpen] = React.useState<string | null>(null);
  const alertsDismiss = useDismissiblePanel('velon-dismiss:app:reports:alerts');

  const profitLoss = data.kpis.revenueMtd - data.kpis.expensesMtd;
  const profitTone =
    profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';

  const hasFinanceData =
    data.kpis.revenueMtd > 0 ||
    data.kpis.expensesMtd > 0 ||
    data.netCashSeries.some((p) => p.net !== 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Plain-language reports for your business — no accounting degree required.
        </p>
      </div>

      {!hasFinanceData ? (
        <Card className="border-border bg-muted/20 text-muted-foreground border-dashed p-6 text-sm">
          No activity yet. Create an invoice or add a purchase to see your numbers here.
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Total Sales
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(data.kpis.revenueMtd)}
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">This month</div>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Total Purchases
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(data.kpis.expensesMtd)}
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">This month</div>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Pending Payments
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(data.kpis.receivables)}
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">Money customers owe you</div>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Low Stock
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {data.alerts.filter((a) => a.toLowerCase().includes('stock')).length || '—'}
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">
            <Link
              to="/app/inventory"
              className="text-primary hover:underline"
            >
              Check inventory
            </Link>
          </div>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Profit / Loss
          </div>
          <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${profitTone}`}>
            {formatCurrency(profitLoss)}
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">Sales minus purchases (MTD)</div>
        </Card>
        <Card className="border-border bg-card p-5">
          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Tax Summary
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(data.kpis.payables)}
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">
            Payables & tax-related balances
          </div>
        </Card>
      </div>

      {data.alerts.length > 0 && !alertsDismiss.dismissed ? (
        <Card className="border-destructive/25 bg-destructive/5 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-destructive flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Action-oriented alerts
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-8 text-xs"
              onClick={alertsDismiss.dismiss}
            >
              Dismiss
            </Button>
          </div>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {data.alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border bg-card p-5 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <div className="text-muted-foreground text-[11px] font-medium tracking-[0.14em] uppercase">
                Cash movement
              </div>
              <div className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
                Money in vs money out
                <TrendingUp className="text-success h-4 w-4" />
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-normal"
            >
              Live workspace roll-up
            </Badge>
          </div>
          <ChartContainer
            config={cashNetConfig}
            className="h-[240px] w-full md:h-[260px]"
          >
            <LineChart
              data={data.netCashSeries}
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                hide
                domain={['auto', 'auto']}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="var(--color-net)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-net)' }}
              />
            </LineChart>
          </ChartContainer>
        </Card>

        <Card className="border-border bg-primary/5 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            Velon Copilot insights
          </div>
          <p className="text-muted-foreground text-xs">
            Ask natural-language questions against governed datasets — same security as scheduled
            reports.
          </p>
          <Button
            className="bg-foreground text-background hover:bg-foreground/90 mt-4 w-full rounded-lg"
            asChild
          >
            <Link to="/app/ai-copilot">
              <Bot className="mr-2 h-4 w-4" />
              Open copilot
            </Link>
          </Button>
        </Card>
      </div>

      <Tabs
        defaultValue="overview"
        className="space-y-4"
      >
        <TabsList className="bg-muted/50 h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger
            value="overview"
            className="rounded-md"
          >
            Interactive overview
          </TabsTrigger>
          <TabsTrigger
            value="drill"
            className="rounded-md"
          >
            GL drill-down
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-md"
          >
            Workflow queues
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="rounded-md"
          >
            Report library
          </TabsTrigger>
          <TabsTrigger
            value="collab"
            className="rounded-md"
          >
            Commentary
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="space-y-4 outline-none"
        >
          <Card className="border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <PieChartIcon className="h-4 w-4" />
                Where your money goes
              </div>
              <span className="text-muted-foreground text-[11px]">Workspace aggregate</span>
            </div>
            <ChartContainer
              config={expenseBarConfig}
              className="h-[280px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={data.expenseMix}
                layout="vertical"
                margin={{ left: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  hide
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </Card>
        </TabsContent>

        <TabsContent
          value="drill"
          className="space-y-3 outline-none"
        >
          <p className="text-muted-foreground text-sm">
            Expand any GL bucket to see originating journal entries — continuation clicks open
            Accounting workspace for full audit trail.
          </p>
          {data.expenseDrill.length === 0 ? (
            <Card className="border-border text-muted-foreground p-6 text-sm">
              No OpEx lines for the current period.
            </Card>
          ) : (
            data.expenseDrill.map((node: FinanceExpenseDrillNode) => (
              <Collapsible
                key={node.accountKey}
                open={drillOpen === node.accountKey}
                onOpenChange={(o) => setDrillOpen(o ? node.accountKey : null)}
              >
                <Card className="border-border bg-card">
                  <CollapsibleTrigger className="hover:bg-muted/30 flex w-full items-center justify-between gap-3 p-4 text-left">
                    <div>
                      <div className="text-muted-foreground font-mono text-xs">{node.label}</div>
                      <div className="text-lg font-semibold tabular-nums">
                        {formatCurrency(node.amount)}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform ${drillOpen === node.accountKey ? 'rotate-180' : ''}`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Separator />
                    <div className="overflow-x-auto p-2">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="text-[10px] uppercase">JE</TableHead>
                            <TableHead className="text-[10px] uppercase">Posted</TableHead>
                            <TableHead className="text-[10px] uppercase">Memo</TableHead>
                            <TableHead className="text-right text-[10px] uppercase">
                              Debit
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {node.entries.map((e) => (
                            <TableRow key={`${e.jeId}-${e.postedDate}-${e.debit}`}>
                              <TableCell className="font-mono text-xs">{e.jeId}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {e.postedDate}
                              </TableCell>
                              <TableCell className="max-w-[280px] text-xs">{e.memo}</TableCell>
                              <TableCell className="text-right text-xs font-semibold tabular-nums">
                                {formatCurrency(e.debit)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
          <Button
            variant="outline"
            className="rounded-lg"
            asChild
          >
            <Link to="/app/accounting">
              Open full ledger workspace <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </TabsContent>

        <TabsContent
          value="tasks"
          className="outline-none"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border bg-card p-5">
              <div className="mb-3 text-sm font-semibold">Invoices / bills to approve</div>
              <ul className="space-y-2 text-sm">
                {data.taskQueues.approvals.map((t) => (
                  <li
                    key={t.id}
                    className="border-border bg-muted/20 rounded-lg border px-3 py-2"
                  >
                    <div className="font-medium">{t.title}</div>
                    <div className="text-muted-foreground text-xs">{t.subtitle}</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-border bg-card p-5">
              <div className="mb-3 text-sm font-semibold">Reconciliations needed</div>
              <ul className="space-y-2 text-sm">
                {data.taskQueues.reconciliations.map((t) => (
                  <li
                    key={t.id}
                    className="border-border bg-muted/20 rounded-lg border px-3 py-2"
                  >
                    {t.title}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-border bg-card p-5">
              <div className="mb-3 text-sm font-semibold">Journal checkpoints</div>
              <ul className="space-y-2 text-sm">
                {data.taskQueues.journals.map((t) => (
                  <li
                    key={t.id}
                    className="border-border bg-muted/20 rounded-lg border px-3 py-2"
                  >
                    {t.title}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="library"
          className="outline-none"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {data.catalog.map((r) => (
              <Card
                key={r.id}
                className="border-border bg-card flex flex-col justify-between p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {r.category}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">{r.hint}</p>
                </div>
                <p className="text-muted-foreground mt-4 text-xs">
                  Report exports are not available in this build. Use Accounting for CSV exports
                  when ledger data exists.
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value="collab"
          className="outline-none"
        >
          <Card className="border-border bg-card p-5">
            <div className="mb-3 text-sm font-semibold">Annotations & approvals</div>
            <p className="text-muted-foreground mb-4 text-xs">
              Inline commentary travels with governed exports — reviewers acknowledge before packs
              leave the workspace.
            </p>
            <div className="space-y-4">
              {data.annotations.map((a) => (
                <div
                  key={a.id}
                  className="border-border bg-muted/20 rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{a.author}</div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {a.reportKey}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">{a.body}</p>
                  <div className="text-muted-foreground mt-2 text-[11px]">
                    {format(parseISO(a.at), 'PPp')}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 rounded-lg"
                    onClick={() => toast.success('Annotation acknowledged in audit trail.')}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
