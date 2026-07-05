import { createFileRoute, Link } from "@tanstack/react-router";
import { guardDisabledAdminPath } from "@/lib/auth/production-routes";
import { useMemo, useState } from "react";
import { Kpi } from "@/components/workspace/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminCurrency } from "@/contexts/admin-currency";
import { loadPlatformOverview } from "@/lib/platform/admin-loaders";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  Database,
  Download,
  FileText,
  Globe2,
  Layers,
  LineChart,
  Plug,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  loader: () => loadPlatformOverview(),
  component: AdminReportsPage,
});

type ReportCategory = "financial" | "operational" | "tenant" | "compliance";

type ReportDef = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  href: string;
  /** Original six financial roll-ups */
  legacy?: boolean;
};

const FILTER_CTX = (region: string, tier: string, period: string) =>
  `Scope: ${region} · ${tier} · ${period}`;

function slugifyExportId(id: string) {
  return id
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function downloadReportCsv(
  report: ReportDef,
  region: string,
  tier: string,
  period: string,
  formatCurrency: (n: number) => string,
  mrrTotal: number,
) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `velon-${slugifyExportId(report.id)}-${ts}.csv`;
  const rows: string[][] = [
    ["report_id", report.id],
    ["report_title", report.title],
    ["region", region],
    ["tenant_tier", tier],
    ["period", period],
    ["platform_mrr_snapshot", formatCurrency(mrrTotal)],
    ["note", "Demo export — wire to API for production extracts."],
  ];
  const bom = "\uFEFF";
  const body = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded", { description: filename });
}

function queuePdfExport(report: ReportDef, region: string, tier: string, period: string) {
  toast.message("PDF queued", {
    description: `${report.title} · ${FILTER_CTX(region, tier, period)} — print-ready pack when billing service returns a job id (demo).`,
  });
}

function queueApiExport(report: ReportDef, region: string, tier: string, period: string) {
  toast.message("BI / API export", {
    description: `${report.title} · ${FILTER_CTX(region, tier, period)} — signed URL would be issued for warehouse sync (demo).`,
  });
}

const REPORT_LIBRARY: ReportDef[] = [
  /* Legacy six (unchanged titles) */
  {
    id: "mrr-arr-rollup",
    title: "MRR / ARR roll-up",
    description: "Consolidated recurring revenue and annualized view across all tenants.",
    category: "financial",
    href: "/admin/subscriptions",
    legacy: true,
  },
  {
    id: "plan-wise-revenue",
    title: "Plan-wise revenue",
    description: "Starter, Growth, and Enterprise mix with attach rate and discount leakage.",
    category: "financial",
    href: "/admin/subscriptions",
    legacy: true,
  },
  {
    id: "churn-expansion",
    title: "Churn & expansion",
    description: "Logo churn, net revenue retention, and expansion cohorts by region.",
    category: "financial",
    href: "/admin/subscriptions",
    legacy: true,
  },
  {
    id: "partner-commissions",
    title: "Partner commissions",
    description: "Reseller and referral payouts with clawback status and accruals.",
    category: "financial",
    href: "/admin/sales-partners",
    legacy: true,
  },
  {
    id: "country-tenants",
    title: "Country-wise tenants",
    description: "Geographic concentration, data residency flags, and FX exposure.",
    category: "tenant",
    href: "/admin/tenants",
    legacy: true,
  },
  {
    id: "invoice-gmv",
    title: "Invoice volume · GMV",
    description: "Document counts, GMV proxy, and gateway success rates.",
    category: "financial",
    href: "/admin/subscriptions",
    legacy: true,
  },
  /* Sidebar-aligned exports */
  {
    id: "overview-executive",
    title: "Overview · executive pack",
    description: "KPI snapshot, activity digest, and charts matching the platform dashboard.",
    category: "tenant",
    href: "/admin",
  },
  {
    id: "tenants-directory",
    title: "Tenants · directory & health",
    description: "Org roster, isolation checks, storage, and renewal windows.",
    category: "tenant",
    href: "/admin/tenants",
  },
  {
    id: "users-roster",
    title: "Users · admin roster",
    description: "Super-admin identities, roles, last login, and MFA posture.",
    category: "compliance",
    href: "/admin/users",
  },
  {
    id: "subscriptions-billing",
    title: "Subscriptions · billing ledger",
    description: "Plans, dunning, tax IDs, and Stripe reconciliation lines.",
    category: "financial",
    href: "/admin/subscriptions",
  },
  {
    id: "automations-runs",
    title: "Automations · run history",
    description: "Workflow executions, failures, retries, and owner audit.",
    category: "operational",
    href: "/admin/automations",
  },
  {
    id: "alerts-logs",
    title: "Alerts & Logs",
    description: "Incidents, webhooks, platform logs, and acknowledgement SLA.",
    category: "operational",
    href: "/admin/alerts-logs",
  },
  {
    id: "sales-partners-pipeline",
    title: "Sales partners · pipeline",
    description:
      "Partner tiers, leads, MDF, and registration funnel (distinct from commission accruals).",
    category: "operational",
    href: "/admin/sales-partners",
  },
  {
    id: "infrastructure-capacity",
    title: "Infrastructure · capacity & SLO",
    description: "Shards, replication lag, saturation, and synthetic uptime proofs.",
    category: "operational",
    href: "/admin/infrastructure",
  },
  {
    id: "integrations-health",
    title: "Integrations · gateways & connectors",
    description: "OAuth apps, rate limits, error budgets, and partner API keys.",
    category: "operational",
    href: "/admin/integrations",
  },
  {
    id: "compliance-posture",
    title: "Compliance · controls",
    description: "SOC2 / ISO mappings, policy packs, and exception queues.",
    category: "compliance",
    href: "/admin/compliance",
  },
  {
    id: "settings-config",
    title: "Settings · configuration bundle",
    description: "Feature flags, regional defaults, and display currency audit trail.",
    category: "compliance",
    href: "/admin/settings",
  },
  /* Library extensions from the hub blueprint */
  {
    id: "cash-flow",
    title: "Cash flow statement",
    description: "Operating / investing / financing view with tenant-level cash timing.",
    category: "financial",
    href: "/admin/subscriptions",
  },
  {
    id: "gst-tax",
    title: "GST · indirect tax roll-up",
    description: "Place-of-supply, HSN/SAC summaries, and filing readiness across books.",
    category: "financial",
    href: "/admin/subscriptions",
  },
  {
    id: "billing-accuracy",
    title: "Billing accuracy & dunning",
    description: "Invoice mismatch detection, credit notes, and recovery rates.",
    category: "financial",
    href: "/admin/subscriptions",
  },
  {
    id: "inventory-storage",
    title: "Inventory & storage signals",
    description: "Manufacturing tenant turnover proxy and object-store pressure alerts.",
    category: "operational",
    href: "/admin/infrastructure",
  },
  {
    id: "tenant-adoption",
    title: "Tenant adoption & journeys",
    description: "Onboarding cycle times, module heatmaps, and comparative utilization scores.",
    category: "tenant",
    href: "/admin/tenants",
  },
  {
    id: "audit-security",
    title: "Audit trails · security logs",
    description: "Immutable admin actions, privileged access, and financial compliance evidence.",
    category: "compliance",
    href: "/admin/alerts-logs",
  },
];

const CATEGORY_LABEL: Record<ReportCategory, { title: string; subtitle: string }> = {
  financial: {
    title: "Financial & revenue",
    subtitle: "Cash, tax, subscriptions, and partner economics.",
  },
  operational: {
    title: "Operational",
    subtitle: "Automations, infra, integrations, and day-two signals.",
  },
  tenant: {
    title: "Tenant insights",
    subtitle: "Directory, geography, adoption, and executive snapshots.",
  },
  compliance: {
    title: "Compliance & audit",
    subtitle: "Identity, controls, configuration, and evidentiary exports.",
  },
};

function ReportCard({
  report,
  region,
  tier,
  period,
  formatCurrency,
  mrrTotal,
}: {
  report: ReportDef;
  region: string;
  tier: string;
  period: string;
  formatCurrency: (n: number) => string;
  mrrTotal: number;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col justify-between gap-4 border-border bg-card p-5 transition hover:border-foreground/15 hover:shadow-sm",
        report.legacy && "ring-1 ring-border/80",
      )}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium leading-snug">{report.title}</h3>
              {report.legacy && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Core
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{report.description}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-lg gap-1">
                      <Download className="h-4 w-4" />
                      Export
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onSelect={() =>
                        downloadReportCsv(report, region, tier, period, formatCurrency, mrrTotal)
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => queuePdfExport(report, region, tier, period)}>
                      <FileText className="mr-2 h-4 w-4" />
                      PDF pack
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => queueApiExport(report, region, tier, period)}>
                      <Plug className="mr-2 h-4 w-4" />
                      API / BI handoff
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px] text-[11px] leading-snug">
              Exports honor the global filters below. CSV is generated locally for demo; PDF and API
              are queued messages until wired to your data plane.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2 text-xs text-muted-foreground"
          asChild
        >
          <Link to={report.href}>
            Open console
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function AdminReportsPage() {
  const o = Route.useLoaderData();
  const { formatCurrency } = useAdminCurrency();
  const [region, setRegion] = useState("global");
  const [tier, setTier] = useState("all-tiers");
  const [period, setPeriod] = useState("30d");

  const regionLabel =
    region === "global"
      ? "Global · multi-region"
      : region === "us-east"
        ? "US-East (primary)"
        : region === "eu-west"
          ? "EU-West"
          : "APAC";

  const tierLabel =
    tier === "all-tiers"
      ? "All tiers"
      : tier === "starter"
        ? "Starter"
        : tier === "growth"
          ? "Growth"
          : "Enterprise";

  const periodLabel =
    period === "7d"
      ? "Last 7 days"
      : period === "30d"
        ? "Last 30 days"
        : period === "90d"
          ? "Last 90 days"
          : "Year to date";

  const avgMrrPerOrg = useMemo(() => {
    const n = Math.max(1, o.activeTenantCount);
    return o.mrrTotal / n;
  }, [o.activeTenantCount, o.mrrTotal]);

  const newSignups = o.tenantSignupsByMonth.at(-1)?.newTenants ?? 0;
  const churnDemoPct = "2.1%";
  const apiLatency = "P95 · 142ms";
  const npsDemo = "4.6 / 5";

  const byCategory = useMemo(() => {
    const m: Record<ReportCategory, ReportDef[]> = {
      financial: [],
      operational: [],
      tenant: [],
      compliance: [],
    };
    for (const r of REPORT_LIBRARY) m[r.category].push(r);
    return m;
  }, []);

  const narrative = useMemo(() => {
    const growth = o.arrGrowthPct >= 0 ? "grew" : "softened";
    return `Revenue ${growth} ${Math.abs(o.arrGrowthPct)}% vs prior window with ${formatCurrency(o.mrrTotal)} MRR on ${regionLabel}. ${o.openSecurityAlerts ? `${o.openSecurityAlerts} open security items deserve a glance` : "No open security alerts in the demo snapshot"}. EU shard lag spikes have stayed inside autoscale guardrails — watch APAC if webhook retries climb.`;
  }, [formatCurrency, o.arrGrowthPct, o.mrrTotal, o.openSecurityAlerts, regionLabel]);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-8">
        <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Executive summary
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
            Multi-tenant performance hub
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground sm:text-sm">
            One place for revenue, reliability, and adoption — slice exports by region, tier, and
            window before handing data to finance or an external BI tool.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            <Kpi
              label="Platform MRR"
              value={formatCurrency(o.mrrTotal)}
              delta={`ARR momentum ${o.arrGrowthPct >= 0 ? "+" : ""}${o.arrGrowthPct}%`}
              deltaTone={o.arrGrowthPct >= 0 ? "up" : "down"}
              hint="Recurring revenue"
              icon={TrendingUp}
            />
            <Kpi
              label="Churn (demo)"
              value={churnDemoPct}
              delta="MoM logo + revenue"
              deltaTone="neutral"
              hint="Wire to billing API"
              icon={LineChart}
            />
            <Kpi
              label="Avg MRR / org"
              value={formatCurrency(avgMrrPerOrg)}
              delta={`${o.activeTenantCount.toLocaleString()} active orgs`}
              deltaTone="neutral"
              hint="Profitability proxy"
              icon={Layers}
            />
            <Kpi
              label="Platform uptime"
              value={`${o.platformUptimePct}%`}
              delta={apiLatency}
              deltaTone="up"
              hint="Synthetic + regional probes"
              icon={Activity}
            />
            <Kpi
              label="Active users (seats)"
              value={`${o.totalSeatsAllocated.toLocaleString()} / ${o.licenseSeatCapacity.toLocaleString()}`}
              delta={`${newSignups} new orgs (period)`}
              deltaTone="up"
              hint="Licensed footprint"
              icon={Users}
            />
            <Kpi
              label="Adoption pulse"
              value={npsDemo}
              delta="CSAT proxy (demo)"
              deltaTone="up"
              hint="Survey + in-app signals"
              icon={Sparkles}
            />
          </div>
        </div>

        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Global filters
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Applied to export filenames, CSV metadata, and queued PDF/API jobs (demo
                scaffolding).
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Region
                </span>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-9 w-[180px] rounded-lg">
                    <Globe2 className="mr-2 h-3.5 w-3.5 opacity-60" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="us-east">US-East</SelectItem>
                    <SelectItem value="eu-west">EU-West</SelectItem>
                    <SelectItem value="apac">APAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Tenant tier
                </span>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger className="h-9 w-[160px] rounded-lg">
                    <Layers className="mr-2 h-3.5 w-3.5 opacity-60" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-tiers">All tiers</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Period
                </span>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-9 w-[150px] rounded-lg">
                    <Zap className="mr-2 h-3.5 w-3.5 opacity-60" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="ytd">Year to date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="font-normal">
              {regionLabel}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {tierLabel}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {periodLabel}
            </Badge>
          </div>
        </Card>

        {(Object.keys(CATEGORY_LABEL) as ReportCategory[]).map((cat) => (
          <section key={cat} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">{CATEGORY_LABEL[cat].title}</h3>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[cat].subtitle}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {byCategory[cat].map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  region={regionLabel}
                  tier={tierLabel}
                  period={periodLabel}
                  formatCurrency={formatCurrency}
                  mrrTotal={o.mrrTotal}
                />
              ))}
            </div>
            <Separator className="opacity-60" />
          </section>
        ))}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border bg-gradient-to-br from-card to-muted/20 p-5 lg:col-span-2">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Velon AI · smart narrative
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{narrative}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Forecasting, anomaly surfacing, and drill-down to raw facts will attach here once
              models read from your warehouse — today this paragraph is synthesized from live
              overview metrics for a credible demo.
            </p>
          </Card>
          <Card className="border-border bg-card p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Database className="h-3.5 w-3.5" />
              Signals to watch
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Anomaly:</span>{" "}
                {o.pendingPlanRequests > 2
                  ? `${o.pendingPlanRequests} plan-change requests queued — align sales and billing.`
                  : "Plan-change queue is within normal bounds."}
              </li>
              <li>
                <span className="font-medium text-foreground">Forecast:</span> MRR trajectory
                implies {formatCurrency(Math.round(o.mrrTotal * (1 + o.arrGrowthPct / 100)))} next
                period if growth holds.
              </li>
              <li>
                <span className="font-medium text-foreground">Infra:</span> Replication lag
                narrative mirrors the activity feed — export Infrastructure for raw series.
              </li>
            </ul>
          </Card>
        </div>

        <Card className="border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Custom report builder (drag-and-drop dimensions & metrics) can live here without crowding
          the catalog — when you are ready we can add a canvas-style composer next to these exports.
        </Card>
      </div>
    </TooltipProvider>
  );
}
