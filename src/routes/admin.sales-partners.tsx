import { createFileRoute, Link } from "@tanstack/react-router";
import { guardDisabledAdminPath } from "@/lib/auth/production-routes";
import { useMemo, useState } from "react";
import { Kpi } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAdminCurrency } from "@/contexts/admin-currency";
import { loadSalesCommercialFloor } from "@/lib/platform/admin-loaders";
import { SALES_DEMO_INR_PER_USD } from "@/lib/admin-demo";
import {
  type SalesCommercialAlert,
  type SalesCommercialAlertKind,
  type SalesCommercialAuditEntry,
  type SalesCommercialAuditKind,
  type SalesLeakageRow,
} from "@/lib/types/workspace-ui";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Fish,
  Globe2,
  MoreHorizontal,
  Plus,
  Radio,
  ScrollText,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sales-partners")({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  loader: () => loadSalesCommercialFloor(),
  component: AdminSalesPartnersPage,
});

function alertAccent(kind: SalesCommercialAlertKind) {
  switch (kind) {
    case "payment_failed":
      return "border-l-destructive bg-destructive/5";
    case "big_fish":
      return "border-l-foreground bg-muted/40";
    case "renewal_cluster":
      return "border-l-warning bg-warning/10";
    case "credit_limit":
      return "border-l-info bg-info/10";
    default:
      return "border-l-border bg-muted/30";
  }
}

function auditIcon(kind: SalesCommercialAuditKind) {
  switch (kind) {
    case "pricing":
      return DollarSign;
    case "discount":
      return Sparkles;
    case "refund":
      return CreditCard;
    default:
      return Shield;
  }
}

function leakageBadge(kind: SalesLeakageRow["kind"]) {
  switch (kind) {
    case "overdue_invoice":
      return {
        label: "Overdue",
        className: "border-destructive/30 bg-destructive/10 text-destructive",
      };
    case "stale_quote":
      return {
        label: "Stale quote",
        className: "border-warning/30 bg-warning/10 text-warning-foreground",
      };
    default:
      return { label: "Trial cap", className: "border-info/30 bg-info/10 text-info" };
  }
}

function AdminSalesPartnersPage() {
  const data = Route.useLoaderData();
  const { formatCurrency } = useAdminCurrency();
  const [moneyView, setMoneyView] = useState<"local" | "usd">("local");
  const [stuckLens, setStuckLens] = useState(false);

  const fmtMoney = useMemo(() => {
    if (moneyView === "local") return (n: number) => formatCurrency(n);
    return (n: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n / SALES_DEMO_INR_PER_USD);
  }, [formatCurrency, moneyView]);

  const leakageRows = useMemo(() => {
    if (!stuckLens) return data.leakage;
    return data.leakage.filter((r) => r.kind === "overdue_invoice" || r.kind === "trial_cap");
  }, [data.leakage, stuckLens]);

  const maxRegionMrr = useMemo(
    () => Math.max(1, ...data.regionPulse.map((r) => r.mrrLocal)),
    [data.regionPulse],
  );

  function fireAction(scope: string, actionId: string, label: string) {
    toast.success(label, {
      description: `${scope} · ${actionId} (demo — wire to billing/support APIs).`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Commercial pulse
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Trading floor · platform revenue
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
              Momentum across checkout, approvals, and live interruptions — not a CRM for
              end-customers, but a cockpit for how money moves across tenants and regions.
            </p>
          </div>
          <Button
            className="shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90"
            type="button"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Onboard partner
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Kpi
            label="Active subscriptions"
            value={data.activePaidSubscriptions.toLocaleString()}
            delta="Tenants on paid plans"
            deltaTone="neutral"
            hint="Excludes trial & suspended"
            icon={Building2}
          />
          <Kpi
            label="Checkout success rate"
            value={`${data.checkoutSuccessRatePct}%`}
            delta="Completed vs abandoned carts"
            deltaTone="up"
            hint="Hosted checkout + self-serve upgrades"
            icon={CreditCard}
          />
          <Kpi
            label="Pending approvals"
            value={data.pendingApprovalsCount.toLocaleString()}
            delta={data.pendingApprovalsHint}
            deltaTone={data.pendingApprovalsCount > 2 ? "down" : "neutral"}
            hint="Enterprise + manual invoices"
            icon={ClipboardList}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <Card className="flex-1 border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Multi-currency view
              </p>
              <p className="mt-0.5 text-sm font-medium">Books normalization</p>
              <p className="text-xs text-muted-foreground">
                Local follows{" "}
                <Link to="/admin/settings" className="underline-offset-4 hover:underline">
                  platform display
                </Link>
                ; USD uses a demo FX divisor for executive comparison.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-1">
              <Button
                type="button"
                size="sm"
                variant={moneyView === "local" ? "secondary" : "ghost"}
                className="rounded-md"
                onClick={() => setMoneyView("local")}
              >
                Local / books
              </Button>
              <Button
                type="button"
                size="sm"
                variant={moneyView === "usd" ? "secondary" : "ghost"}
                className="rounded-md"
                onClick={() => setMoneyView("usd")}
              >
                Base · USD
              </Button>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-start gap-2">
            <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                Regional performance (MRR attribution)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Synthetic mapping from tenant country → control region.
              </p>
              <ul className="mt-3 space-y-3">
                {data.regionPulse.map((r) => (
                  <li key={r.regionId}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-mono text-muted-foreground">{r.label}</span>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          r.growthPct >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {r.growthPct >= 0 ? "+" : ""}
                        {r.growthPct}% MoM
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {fmtMoney(r.mrrLocal)} · {r.tenantCount} orgs
                      </span>
                    </div>
                    <Progress
                      value={Math.round((r.mrrLocal / maxRegionMrr) * 100)}
                      className="mt-1.5 h-1.5"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "flex-1 border-border bg-card p-4 sm:p-5 transition",
            stuckLens && "ring-2 ring-warning/40",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Revenue leakage
              </p>
              <p className="mt-0.5 text-sm font-medium">Stuck sales &amp; collection risk</p>
              <p className="text-xs text-muted-foreground">
                Overdue invoices, cold quotes, and trials that hit limits without upgrading.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="stuck-lens" checked={stuckLens} onCheckedChange={setStuckLens} />
              <label htmlFor="stuck-lens" className="cursor-pointer text-xs text-muted-foreground">
                High severity only
              </label>
            </div>
          </div>
          <Separator className="my-4" />
          <ul className="space-y-3">
            {leakageRows.map((row) => {
              const b = leakageBadge(row.kind);
              return (
                <li
                  key={row.id}
                  className="rounded-xl border border-border bg-muted/20 px-3 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-normal", b.className)}
                      >
                        {b.label}
                      </Badge>
                      <span className="text-sm font-medium">{row.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.tenantName} · {row.regionLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{row.meta}</p>
                  </div>
                  <div className="mt-2 flex shrink-0 flex-wrap gap-2 sm:mt-0 sm:flex-col sm:items-end">
                    <span className="text-sm font-semibold tabular-nums">
                      {fmtMoney(row.amountLocal)}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs"
                        type="button"
                        onClick={() => fireAction(row.title, "pdf", "Generate PDF")}
                      >
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 rounded-lg text-xs"
                        type="button"
                        onClick={() => fireAction(row.title, "remind", "Send reminder")}
                      >
                        Remind
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col border-border bg-card lg:min-h-[420px]">
          <div className="border-b border-border p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Radio className="h-4 w-4 text-destructive" aria-hidden />
              Live alerts
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Interruptions to revenue — payment, renewals, guardrails.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            {data.liveAlerts.map((a: SalesCommercialAlert) => (
              <div
                key={a.id}
                className={cn("rounded-xl border border-l-4 p-4 shadow-sm", alertAccent(a.kind))}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.kind === "big_fish" ? (
                        <Fish className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
                      ) : (
                        <Bell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="text-sm font-medium">{a.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {a.regionLabel} · {a.timeLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    type="button"
                    onClick={() => fireAction(a.title, a.primaryAction.id, a.primaryAction.label)}
                  >
                    {a.primaryAction.label}
                  </Button>
                  {a.secondaryAction && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs"
                      type="button"
                      onClick={() =>
                        fireAction(a.title, a.secondaryAction!.id, a.secondaryAction!.label)
                      }
                    >
                      {a.secondaryAction.label}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col border-border bg-card lg:min-h-[420px]">
          <div className="border-b border-border p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden />
              Recent audit · money logic
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pricing, discounts, refunds, and overrides — who touched revenue configuration.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            {data.auditLog.map((e: SalesCommercialAuditEntry) => {
              const Icon = auditIcon(e.kind);
              return (
                <div
                  key={e.id}
                  className="flex gap-3 rounded-xl border border-border bg-muted/15 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs leading-relaxed text-foreground">{e.summary}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{e.at}</p>
                    <div className="flex flex-wrap gap-2">
                      {e.primaryAction && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 rounded-lg text-xs"
                          type="button"
                          onClick={() =>
                            fireAction(
                              e.summary.slice(0, 40),
                              e.primaryAction!.id,
                              e.primaryAction!.label,
                            )
                          }
                        >
                          {e.primaryAction.label}
                        </Button>
                      )}
                      {e.secondaryAction && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs"
                          type="button"
                          onClick={() =>
                            fireAction(
                              e.summary.slice(0, 40),
                              e.secondaryAction!.id,
                              e.secondaryAction!.label,
                            )
                          }
                        >
                          {e.secondaryAction.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-warning-foreground" aria-hidden />
          Leaderboard · MTD commissions (
          {moneyView === "usd" ? "USD normalized" : "platform currency"})
        </div>
        <Button variant="outline" size="sm" className="rounded-lg" asChild>
          <Link to="/admin/subscriptions">
            Open subscriptions
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </Card>

      <Card className="border-border bg-card">
        <div className="border-b border-border p-5">
          <div className="text-sm font-semibold">Partner directory</div>
          <div className="text-xs text-muted-foreground">
            Referral codes · payouts · performance
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                {["Partner", "Code", "Deals closed", "Commission MTD", "Tier", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.partnerLeaderboard.map((p) => (
                <tr key={p.code} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3.5 font-medium">{p.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{p.code}</td>
                  <td className="px-5 py-3.5">{p.dealsClosed}</td>
                  <td className="px-5 py-3.5 font-semibold tabular-nums">
                    {fmtMoney(p.commissionMtdLocal)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className="rounded-md border-border">
                      {p.tier}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg"
                      type="button"
                      aria-label="Row actions"
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
        {data.partnerLeaderboard.slice(0, 2).map((p) => (
          <Card key={p.code} className="border-border bg-card p-5">
            <div className="text-xs text-muted-foreground">Target progress · {p.name}</div>
            <Progress value={p.targetPct} className="mt-3 h-2" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {p.targetPct}% of quarterly quota (demo)
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
