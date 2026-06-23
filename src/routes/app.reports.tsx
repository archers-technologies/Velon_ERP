import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { loadFinanceReportsWorkspace } from "@/lib/workspace/loaders";
import { useDismissiblePanel } from "@/hooks/use-dismissible-panel";
import type { FinanceExpenseDrillNode } from "@/lib/types/workspace-ui";
import { useWorkspaceCurrency } from "@/contexts/workspace-currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Landmark,
  ClipboardList,
  AlertTriangle,
  Sparkles,
  Download,
  ChevronDown,
  TrendingUp,
  PieChart as PieChartIcon,
  Bot,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  loader: () => loadFinanceReportsWorkspace(),
  component: ReportsPage,
});

const cashNetConfig = {
  net: {
    label: "Net cash movement",
    theme: { light: "#0f766e", dark: "#2dd4bf" },
  },
} satisfies ChartConfig;

const expenseBarConfig = {
  value: {
    label: "OpEx MTD",
    theme: { light: "#1d4ed8", dark: "#60a5fa" },
  },
} satisfies ChartConfig;

type RoleLens = "cfo" | "controller";

function ReportsPage() {
  const { formatCurrency } = useWorkspaceCurrency();
  const data = Route.useLoaderData();
  const [roleLens, setRoleLens] = React.useState<RoleLens>("cfo");
  const [drillOpen, setDrillOpen] = React.useState<string | null>(null);
  const [kpiFocus, setKpiFocus] = React.useState<string | null>(null);
  const alertsDismiss = useDismissiblePanel("velon-dismiss:app:reports:alerts");

  const marginTone =
    data.kpis.netMarginPct >= 15
      ? "text-success"
      : data.kpis.netMarginPct >= 0
        ? "text-foreground"
        : "text-destructive";

  const hasFinanceData =
    data.kpis.revenueMtd > 0 ||
    data.kpis.expensesMtd > 0 ||
    data.netCashSeries.some((p) => p.net !== 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-9 items-center rounded-lg border border-border bg-muted/40 p-1">
          <Button
            type="button"
            variant={roleLens === "cfo" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3"
            onClick={() => setRoleLens("cfo")}
          >
            <Landmark className="mr-1.5 h-3.5 w-3.5" />
            CFO lens
          </Button>
          <Button
            type="button"
            variant={roleLens === "controller" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3"
            onClick={() => setRoleLens("controller")}
          >
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Controller lens
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Workspace</span>
          <Badge variant="outline" className="font-normal">
            Current workspace
          </Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {roleLens === "cfo"
          ? "Figures below come from workspace finance aggregates. Zeros mean no ledger activity recorded yet."
          : "Transactional drill-down uses the same API-backed aggregates as Accounting."}
      </p>

      {!hasFinanceData ? (
        <Card className="border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          No finance activity recorded yet for this workspace. Post journal entries in Accounting or
          complete sales and procurement flows to populate these reports.
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            id: "cash",
            label: "Operating cash",
            value: formatCurrency(data.kpis.operatingCash),
            hint: "Aligned to ledger cash position",
            detail: "Single source with Accounting bank reconciliation.",
          },
          {
            id: "margin",
            label: "Net margin",
            value: `${data.kpis.netMarginPct}%`,
            hint: "MTD revenue vs COGS & OpEx",
            detail: "Computed from synchronized journals and billing cut.",
          },
          {
            id: "ar",
            label: "Receivables",
            value: formatCurrency(data.kpis.receivables),
            hint: "Open billing workspace AR",
            detail: "Drill to invoice-level aging from Customers.",
          },
          {
            id: "ap",
            label: "Payables",
            value: formatCurrency(data.kpis.payables),
            hint: "Supplier AP snapshot",
            detail: "Matches Suppliers module outstanding balances.",
          },
        ].map((k) => (
          <button key={k.id} type="button" className="text-left" onClick={() => setKpiFocus(k.id)}>
            <Card className="border-border bg-card p-5 transition-colors hover:border-foreground/25 hover:bg-muted/15">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {k.label}
              </div>
              <div
                className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${k.id === "margin" ? marginTone : ""}`}
              >
                {k.value}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{k.hint}</div>
              <div className="mt-2 text-[10px] font-medium text-primary">Tap for narrative ·</div>
            </Card>
          </button>
        ))}
      </div>

      {roleLens === "controller" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Revenue (MTD)
            </div>
            <div className="mt-2 text-xl font-semibold tabular-nums">
              {formatCurrency(data.kpis.revenueMtd)}
            </div>
          </Card>
          <Card className="border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">OpEx (MTD)</div>
            <div className="mt-2 text-xl font-semibold tabular-nums">
              {formatCurrency(data.kpis.expensesMtd)}
            </div>
          </Card>
          <Card className="border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Budget variance
            </div>
            <div
              className={`mt-2 text-xl font-semibold tabular-nums ${data.kpis.budgetVariancePct > 5 ? "text-destructive" : "text-foreground"}`}
            >
              {data.kpis.budgetVariancePct > 0 ? "+" : ""}
              {data.kpis.budgetVariancePct}%
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Vs rolling OpEx envelope</div>
          </Card>
        </div>
      ) : null}

      {data.alerts.length > 0 && !alertsDismiss.dismissed ? (
        <Card className="border-destructive/25 bg-destructive/5 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Action-oriented alerts
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={alertsDismiss.dismiss}
            >
              Dismiss
            </Button>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
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
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Liquidity bridge
              </div>
              <div className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
                Net operating cash pulse
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-normal">
              Live workspace roll-up
            </Badge>
          </div>
          <ChartContainer config={cashNetConfig} className="h-[240px] w-full md:h-[260px]">
            <LineChart data={data.netCashSeries} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis hide domain={["auto", "auto"]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="var(--color-net)"
                strokeWidth={2}
                dot={{ fill: "var(--color-net)" }}
              />
            </LineChart>
          </ChartContainer>
        </Card>

        <Card className="border-border bg-primary/5 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            Velon Copilot insights
          </div>
          <p className="text-xs text-muted-foreground">
            Ask natural-language questions against governed datasets — same security as scheduled
            reports.
          </p>
          <Button
            className="mt-4 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90"
            asChild
          >
            <Link to="/app/ai-copilot">
              <Bot className="mr-2 h-4 w-4" />
              Open copilot
            </Link>
          </Button>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="rounded-md">
            Interactive overview
          </TabsTrigger>
          <TabsTrigger value="drill" className="rounded-md">
            GL drill-down
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-md">
            Workflow queues
          </TabsTrigger>
          <TabsTrigger value="library" className="rounded-md">
            Report library
          </TabsTrigger>
          <TabsTrigger value="collab" className="rounded-md">
            Commentary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 outline-none">
          <Card className="border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <PieChartIcon className="h-4 w-4" />
                OpEx composition (MTD journals)
              </div>
              <span className="text-[11px] text-muted-foreground">Workspace aggregate</span>
            </div>
            <ChartContainer config={expenseBarConfig} className="h-[280px] w-full">
              <BarChart
                accessibilityLayer
                data={data.expenseMix}
                layout="vertical"
                margin={{ left: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
              </BarChart>
            </ChartContainer>
          </Card>
        </TabsContent>

        <TabsContent value="drill" className="space-y-3 outline-none">
          <p className="text-sm text-muted-foreground">
            Expand any GL bucket to see originating journal entries — continuation clicks open
            Accounting workspace for full audit trail.
          </p>
          {data.expenseDrill.length === 0 ? (
            <Card className="border-border p-6 text-sm text-muted-foreground">
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
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{node.label}</div>
                      <div className="text-lg font-semibold tabular-nums">
                        {formatCurrency(node.amount)}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform ${drillOpen === node.accountKey ? "rotate-180" : ""}`}
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
                            <TableHead className="text-[10px] uppercase text-right">
                              Debit
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {node.entries.map((e) => (
                            <TableRow key={`${e.jeId}-${e.postedDate}-${e.debit}`}>
                              <TableCell className="font-mono text-xs">{e.jeId}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
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
          <Button variant="outline" className="rounded-lg" asChild>
            <Link to="/app/accounting">
              Open full ledger workspace <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </TabsContent>

        <TabsContent value="tasks" className="outline-none">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border bg-card p-5">
              <div className="mb-3 text-sm font-semibold">Invoices / bills to approve</div>
              <ul className="space-y-2 text-sm">
                {data.taskQueues.approvals.map((t) => (
                  <li key={t.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.subtitle}</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-border bg-card p-5">
              <div className="mb-3 text-sm font-semibold">Reconciliations needed</div>
              <ul className="space-y-2 text-sm">
                {data.taskQueues.reconciliations.map((t) => (
                  <li key={t.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                    {t.title}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-border bg-card p-5">
              <div className="mb-3 text-sm font-semibold">Journal checkpoints</div>
              <ul className="space-y-2 text-sm">
                {data.taskQueues.journals.map((t) => (
                  <li key={t.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                    {t.title}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="library" className="outline-none">
          <div className="grid gap-3 md:grid-cols-2">
            {data.catalog.map((r) => (
              <Card key={r.id} className="flex flex-col justify-between border-border bg-card p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {r.category}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{r.hint}</p>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Report exports are not available in this build. Use Accounting for CSV exports when
                  ledger data exists.
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collab" className="outline-none">
          <Card className="border-border bg-card p-5">
            <div className="mb-3 text-sm font-semibold">Annotations & approvals</div>
            <p className="mb-4 text-xs text-muted-foreground">
              Inline commentary travels with governed exports — reviewers acknowledge before packs
              leave the workspace.
            </p>
            <div className="space-y-4">
              {data.annotations.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{a.author}</div>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {a.reportKey}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {format(parseISO(a.at), "PPp")}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 rounded-lg"
                    onClick={() => toast.success("Annotation acknowledged in audit trail.")}
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

      <Sheet open={kpiFocus !== null} onOpenChange={(o) => !o && setKpiFocus(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>KPI drill narrative</SheetTitle>
            <SheetDescription>Contextual storytelling for executive readouts.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4 text-sm text-muted-foreground">
            {kpiFocus === "cash" ? (
              <p>
                Operating cash ties to the same ledger balance highlighted in Accounting. Net cash
                bridge chart above shows operational rhythm — CFO lens emphasizes runway vs
                strategic bets.
              </p>
            ) : null}
            {kpiFocus === "margin" ? (
              <p>
                Margin tiles blend POS revenue recognition, inventory COGS journals, and accrued
                OpEx. Controllers use the GL drill tab to prove each driver before publishing board
                decks.
              </p>
            ) : null}
            {kpiFocus === "ar" ? (
              <p>
                Receivables reflect billing workspace truth. Drill into Customers for collections
                workflows without exporting static CSVs.
              </p>
            ) : null}
            {kpiFocus === "ap" ? (
              <p>
                Payables mirror Supplier masters — exception queues explain deltas versus straight
                vendor balances.
              </p>
            ) : null}
            <Button variant="outline" className="w-full rounded-lg" asChild>
              <Link to="/app/accounting">Jump to Accounting</Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
