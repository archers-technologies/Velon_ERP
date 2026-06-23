import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  changeTenantBillingPlan,
  loadSubscriptionCommandCenter,
  resetTenantSubscription,
  updatePlanDefinition,
} from "@/lib/platform/admin-loaders";
import {
  approveBillingPayment,
  extendTenantTrial,
  loadPendingBillingPayments,
  loadPlatformBillingPayments,
  rejectBillingPayment,
} from "@/lib/api/subscription-billing";
import type {
  SubscriptionBillingStatus,
  SubscriptionClientRow,
  SubscriptionPlanCatalogEntry,
} from "@/lib/types/workspace-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdminCurrency } from "@/contexts/admin-currency";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  Percent,
  AlertTriangle,
  ArrowUpRight,
  MoreHorizontal,
  Sparkles,
  Building2,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscriptions")({
  loader: async () => {
    const [data, pendingPayments, platformPayments] = await Promise.all([
      loadSubscriptionCommandCenter(),
      loadPendingBillingPayments().catch(() => []),
      loadPlatformBillingPayments().catch(() => []),
    ]);
    return { data, pendingPayments, platformPayments };
  },
  component: AdminSubscriptionsPage,
});

const chartConfig = {
  mrr: {
    label: "MRR",
    theme: { light: "oklch(0.2 0 0)", dark: "oklch(0.92 0 0)" },
  },
} satisfies ChartConfig;

function billingBadgeClass(s: SubscriptionBillingStatus) {
  switch (s) {
    case "Active":
      return "border-success/25 bg-success/10 text-success";
    case "Trial":
      return "border-info/25 bg-info/10 text-info";
    case "Past due":
      return "border-warning/30 bg-warning/15 text-warning-foreground";
    case "Cancelled":
      return "border-muted-foreground/30 bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted/50";
  }
}

function limitLabel(n: number, suffix: string) {
  if (n === 0) return "∞";
  return `${n}${suffix}`;
}

function tenantPlanToApi(plan: SubscriptionClientRow["plan"]): "STARTER" | "GROWTH" | "ENTERPRISE" {
  if (plan === "Growth") return "GROWTH";
  if (plan === "Enterprise") return "ENTERPRISE";
  return "STARTER";
}

function formatProviderLabel(provider: string) {
  if (provider === "BANK_TRANSFER") return "Bank transfer";
  if (provider === "RAZORPAY") return "Razorpay";
  return provider.replace(/_/g, " ");
}

function catalogPlanToApi(planId: string): "STARTER" | "GROWTH" | "ENTERPRISE" {
  const id = planId.toUpperCase();
  if (id === "GROWTH" || id === "PROFESSIONAL") return "GROWTH";
  if (id === "ENTERPRISE") return "ENTERPRISE";
  return "STARTER";
}

function AdminSubscriptionsPage() {
  const router = useRouter();
  const { data, pendingPayments, platformPayments } = Route.useLoaderData();
  const { formatCurrency } = useAdminCurrency();
  const [paymentBusy, setPaymentBusy] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<"all" | "Starter" | "Growth" | "Enterprise">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SubscriptionBillingStatus>("all");
  const [q, setQ] = useState("");
  const [planSheet, setPlanSheet] = useState<SubscriptionPlanCatalogEntry | null>(null);
  const [planDraft, setPlanDraft] = useState<SubscriptionPlanCatalogEntry | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [planChangeTarget, setPlanChangeTarget] = useState<SubscriptionClientRow | null>(null);
  const [planChangeValue, setPlanChangeValue] = useState<"STARTER" | "GROWTH" | "ENTERPRISE">(
    "STARTER",
  );

  const filteredClients = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.clients.filter((c) => {
      if (planFilter !== "all" && c.plan !== planFilter) return false;
      if (statusFilter !== "all" && c.billingStatus !== statusFilter) return false;
      if (!s) return true;
      return c.clientName.toLowerCase().includes(s) || c.lastInvoiceId.toLowerCase().includes(s);
    });
  }, [data.clients, planFilter, statusFilter, q]);

  useEffect(() => {
    if (planSheet) {
      setPlanDraft(JSON.parse(JSON.stringify(planSheet)) as SubscriptionPlanCatalogEntry);
    } else {
      setPlanDraft(null);
    }
  }, [planSheet]);

  async function savePlanDraft() {
    if (!planDraft) return;
    setPlanSaving(true);
    try {
      await updatePlanDefinition(catalogPlanToApi(planDraft.id), {
        displayName: planDraft.name,
        monthlyPrice: planDraft.monthlyPrice ?? 0,
        annualPrice: planDraft.annualPrice ?? 0,
        currency: "INR",
        seatLimit: planDraft.limits.users === 0 ? null : planDraft.limits.users,
        storageLimitGb: planDraft.limits.storageGb,
        invoiceLimitMo:
          planDraft.limits.invoicesPerMo === 0 ? null : planDraft.limits.invoicesPerMo,
        branchLimit: planDraft.limits.branches === 0 ? null : planDraft.limits.branches,
        trialDays: planDraft.trialDaysDefault,
        isEnabled: !planDraft.hiddenFromCatalog,
        modules: planDraft.modules,
      });
      toast.success("Plan catalog saved");
      setPlanSheet(null);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan");
    } finally {
      setPlanSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {pendingPayments.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5 p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Pending manual payments</h2>
              <p className="text-xs text-muted-foreground">
                Approve bank transfer requests to activate tenant subscriptions.
              </p>
            </div>
            <Badge variant="outline">{pendingPayments.length} pending</Badge>
          </div>
          <div className="space-y-3">
            {pendingPayments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{p.tenantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.tenantCode} · {p.invoiceNumber ?? "Invoice pending"} ·{" "}
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                  <Button
                    size="sm"
                    disabled={paymentBusy === p.id}
                    onClick={() => {
                      void (async () => {
                        setPaymentBusy(p.id);
                        try {
                          await approveBillingPayment(p.id);
                          toast.success(`${p.tenantName} payment approved — subscription activated`);
                          await router.invalidate();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Approval failed");
                        } finally {
                          setPaymentBusy(null);
                        }
                      })();
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paymentBusy === p.id}
                    onClick={() => {
                      void (async () => {
                        setPaymentBusy(p.id);
                        try {
                          await rejectBillingPayment(p.id, "Rejected by platform admin");
                          toast.success("Payment rejected");
                          await router.invalidate();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Rejection failed");
                        } finally {
                          setPaymentBusy(null);
                        }
                      })();
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            MRR (platform)
          </div>
          <div className="mt-1 text-xl font-semibold tracking-tight">
            {formatCurrency(data.mrrTotal)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Recurring · excl. one-time</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Active paid
          </div>
          <div className="mt-1 text-xl font-semibold tracking-tight">
            {data.activePaidSubscriptions}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{data.openTrials} trials running</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            By plan
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="outline" className="font-normal">
              S {data.activeByPlan.Starter}
            </Badge>
            <Badge variant="outline" className="font-normal">
              G {data.activeByPlan.Growth}
            </Badge>
            <Badge variant="outline" className="font-normal">
              E {data.activeByPlan.Enterprise}
            </Badge>
          </div>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Trial conversion
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tracking-tight">{data.trialConversionPct}%</span>
            <span className="text-[11px] text-success">30d</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Trials → paid</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Churn
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xl font-semibold tracking-tight">
            {data.churnPct}%
            <TrendingDown className="h-4 w-4 text-success" aria-hidden />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Cancelled / active</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Dunning
          </div>
          <div className="mt-1 text-xl font-semibold tracking-tight">{data.dunningQueue}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Auto-retry on</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-border bg-card p-5 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Revenue trend</div>
              <p className="text-xs text-muted-foreground">Platform MRR · last 6 periods</p>
            </div>
            <Badge variant="outline" className="gap-1 font-normal">
              <TrendingUp className="h-3 w-3" />
              {data.netMovementLabel}
            </Badge>
          </div>
          <ChartContainer config={chartConfig} className="mt-4 h-[200px] w-full">
            <AreaChart
              data={data.revenueSparkline}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-[10px]"
              />
              <YAxis hide domain={["dataMin - 200", "dataMax + 200"]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="mrr"
                type="monotone"
                fill="var(--color-mrr)"
                fillOpacity={0.15}
                stroke="var(--color-mrr)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </Card>
        <Card className="flex flex-col justify-between border-border bg-card p-5 lg:col-span-2">
          <div>
            <div className="text-sm font-semibold">Lifecycle automation</div>
            <p className="mt-1 text-xs text-muted-foreground">{data.gatewayLabel}</p>
          </div>
          <Separator className="my-4" />
          <ul className="space-y-3 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
              Invoices generate on renewal; webhooks sync AR to Finance module.
            </li>
            <li className="flex gap-2">
              <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
              Failed cards · 4 retries · then suspend + notify tenant admins.
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
              Offline payments: ops records receipt → marks invoice paid (audit trail).
            </li>
          </ul>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Plans &amp; packages</h2>
            <p className="text-xs text-muted-foreground">
              Pricing, limits, module gates, trials — edit opens catalog detail
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.catalogPlans.length === 0 ? (
            <Card className="col-span-full border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No subscription plans configured yet. Plans are seeded on first database migration.
            </Card>
          ) : (
            data.catalogPlans.map((p) => (
            <Card key={p.id} className="flex flex-col border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  {p.hiddenFromCatalog ? (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Hidden
                    </Badge>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => setPlanSheet(p)}
                >
                  Edit plan
                </Button>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">
                {p.customPricing ? (
                  "Custom"
                ) : (
                  <>
                    {formatCurrency(p.monthlyPrice ?? 0)}
                    <span className="text-sm font-normal text-muted-foreground"> /mo</span>
                  </>
                )}
              </div>
              {!p.customPricing && p.annualPrice != null ? (
                <p className="text-[11px] text-muted-foreground">
                  Annual {formatCurrency(p.annualPrice)} · ~2 mo free
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
              <p className="mt-2 text-xs font-medium">{p.seatsSummary}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                <span>Users cap</span>
                <span className="text-right font-mono text-foreground">
                  {limitLabel(p.limits.users, "")}
                </span>
                <span>Storage</span>
                <span className="text-right font-mono text-foreground">
                  {limitLabel(p.limits.storageGb, " GB")}
                </span>
                <span>Invoices / mo</span>
                <span className="text-right font-mono text-foreground">
                  {limitLabel(p.limits.invoicesPerMo, "")}
                </span>
                <span>Branches</span>
                <span className="text-right font-mono text-foreground">
                  {limitLabel(p.limits.branches, "")}
                </span>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Default trial · {p.trialDaysDefault} days
              </p>
              <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Active renewals</span>
                <span className="ml-2 font-medium">{p.activeRenewals}</span>
              </div>
            </Card>
          ))
          )}
        </div>
      </div>

      <Card className="border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="text-sm font-semibold">Client subscriptions</div>
            <p className="text-xs text-muted-foreground">
              Live from tenant store · {filteredClients.length} shown · renewals &amp; failed pay
              highlighted
            </p>
          </div>
          <Button size="sm" variant="outline" className="rounded-lg shrink-0" asChild>
            <Link to="/admin/tenants">
              Open tenants <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search client or invoice…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 rounded-lg border-border bg-muted/40 pl-9"
            />
          </div>
          <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as typeof planFilter)}>
            <SelectTrigger className="h-9 w-[150px] rounded-lg">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="Growth">Growth</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 w-[160px] rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>
              <SelectItem value="Past due">Past due</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                {[
                  "Client",
                  "Plan",
                  "Billing date",
                  "Status",
                  "MRR",
                  "Last invoice",
                  "Alerts",
                  "",
                ].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 text-left font-medium sm:px-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {data.clients.length === 0
                      ? "No client subscriptions yet. New tenants will appear here after signup or Super Admin creation."
                      : "No subscriptions match your filters."}
                  </td>
                </tr>
              ) : (
                filteredClients.map((c: SubscriptionClientRow) => (
                <tr
                  key={c.tenantId}
                  className={cn(
                    "border-t border-border hover:bg-muted/30",
                    (c.renewalSoon || c.failedPayment) && "bg-warning/5",
                  )}
                >
                  <td className="px-4 py-3 font-medium sm:px-5">{c.clientName}</td>
                  <td className="px-4 py-3 sm:px-5">
                    <Badge variant="outline" className="rounded-md font-normal">
                      {c.plan}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground sm:px-5">
                    {c.billingDate}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <Badge
                      variant="outline"
                      className={cn("rounded-md font-normal", billingBadgeClass(c.billingStatus))}
                    >
                      {c.billingStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium sm:px-5">{formatCurrency(c.mrr)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground sm:px-5">
                    {c.lastInvoiceId}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap gap-1">
                      {c.renewalSoon ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal text-amber-800 dark:text-amber-200"
                        >
                          Renewal ≤14d
                        </Badge>
                      ) : null}
                      {c.failedPayment ? (
                        <Badge variant="destructive" className="text-[10px] font-normal">
                          Failed pay
                        </Badge>
                      ) : null}
                      {!c.renewalSoon && !c.failedPayment ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onSelect={() => {
                            setPlanChangeTarget(c);
                            setPlanChangeValue(tenantPlanToApi(c.plan));
                          }}
                        >
                          Change plan
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            void (async () => {
                              try {
                                await resetTenantSubscription(c.tenantId);
                                toast.success("Subscription reset (+30 day renewal)");
                                await router.invalidate();
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Reset failed");
                              }
                            })();
                          }}
                        >
                          Reset subscription
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            void (async () => {
                              try {
                                await extendTenantTrial(c.tenantId, 14);
                                toast.success("Trial extended by 14 days");
                                await router.invalidate();
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Extend trial failed");
                              }
                            })();
                          }}
                        >
                          Extend trial (+14 days)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Coupons &amp; trials</div>
              <p className="text-xs text-muted-foreground">
                Promotional coupons are not enabled. Use Extend trial from the tenant actions menu.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {data.coupons.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-mono font-semibold">{c.code}</span>
                  <span className="text-muted-foreground"> — {c.description}</span>
                  {c.usesLeft != null ? (
                    <span className="ml-1 text-xs text-muted-foreground">({c.usesLeft} left)</span>
                  ) : null}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 font-normal",
                    c.active ? "border-success/25 text-success" : "",
                  )}
                >
                  {c.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-border bg-card p-6">
          <div className="mb-4">
            <div className="text-sm font-semibold">Invoices &amp; payments</div>
            <p className="text-xs text-muted-foreground">Recent ledger · gateway status</p>
          </div>
          <div className="space-y-2">
            {data.invoiceLog.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs">{inv.id}</div>
                  <div className="truncate text-xs text-muted-foreground">{inv.clientName}</div>
                  <div className="text-[11px] text-muted-foreground">{inv.label}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-medium">{formatCurrency(inv.amount)}</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {inv.gateway}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-normal",
                        inv.status === "Paid" && "border-success/25 text-success",
                        inv.status === "Failed" && "border-destructive/40 text-destructive",
                      )}
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="border-border bg-card p-6">
          <div className="mb-4">
            <div className="text-sm font-semibold">Subscription payments</div>
            <p className="text-xs text-muted-foreground">
              Bank transfer (manual approval) and Razorpay (verified online)
            </p>
          </div>
          <div className="space-y-2">
            {platformPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscription payments yet.</p>
            ) : (
              platformPayments.slice(0, 12).map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{p.tenantName}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.plan} · {formatProviderLabel(p.provider)}
                      {p.providerOrderId ? ` · order ${p.providerOrderId}` : ""}
                      {p.providerPaymentId ? ` · pay ${p.providerPaymentId}` : ""}
                    </div>
                    {p.failureReason ? (
                      <div className="text-xs text-destructive">{p.failureReason}</div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium">
                      {p.currency === "INR" ? "₹" : "$"}
                      {p.amount}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {p.status}
                      </Badge>
                      {p.verifiedAt ? (
                        <Badge variant="outline" className="text-[10px] font-normal text-success">
                          Verified {new Date(p.verifiedAt).toLocaleDateString()}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      <Card className="border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
          <span>
            Bank transfer requires manual approve/reject. Razorpay payments activate only after
            backend signature verification or webhook confirmation.
          </span>
        </div>
      </Card>

      <Sheet open={planSheet !== null} onOpenChange={(o) => !o && setPlanSheet(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {planSheet && planDraft ? (
            <>
              <SheetHeader>
                <SheetTitle>Edit plan</SheetTitle>
                <SheetDescription>Catalog pricing, limits, and module entitlements</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-name">Plan name</Label>
                  <Input
                    id="plan-name"
                    value={planDraft.name}
                    onChange={(e) => setPlanDraft({ ...planDraft, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-monthly">Monthly price</Label>
                    <Input
                      id="plan-monthly"
                      inputMode="decimal"
                      value={String(planDraft.monthlyPrice ?? 0)}
                      onChange={(e) =>
                        setPlanDraft({
                          ...planDraft,
                          monthlyPrice: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-annual">Annual price</Label>
                    <Input
                      id="plan-annual"
                      inputMode="decimal"
                      value={String(planDraft.annualPrice ?? 0)}
                      onChange={(e) =>
                        setPlanDraft({
                          ...planDraft,
                          annualPrice: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-currency">Currency</Label>
                    <Input id="plan-currency" value="INR" readOnly className="font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-trial">Trial days</Label>
                    <Input
                      id="plan-trial"
                      inputMode="numeric"
                      value={String(planDraft.trialDaysDefault)}
                      onChange={(e) =>
                        setPlanDraft({
                          ...planDraft,
                          trialDaysDefault: Number.parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-users">User cap (0 = unlimited)</Label>
                    <Input
                      id="plan-users"
                      inputMode="numeric"
                      value={String(planDraft.limits.users)}
                      onChange={(e) =>
                        setPlanDraft({
                          ...planDraft,
                          limits: {
                            ...planDraft.limits,
                            users: Number.parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-storage">Storage limit (GB)</Label>
                    <Input
                      id="plan-storage"
                      inputMode="numeric"
                      value={String(planDraft.limits.storageGb)}
                      onChange={(e) =>
                        setPlanDraft({
                          ...planDraft,
                          limits: {
                            ...planDraft.limits,
                            storageGb: Number.parseInt(e.target.value, 10) || 1,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-invoices">Invoices / month (0 = unlimited)</Label>
                    <Input
                      id="plan-invoices"
                      inputMode="numeric"
                      value={String(planDraft.limits.invoicesPerMo)}
                      onChange={(e) =>
                        setPlanDraft({
                          ...planDraft,
                          limits: {
                            ...planDraft.limits,
                            invoicesPerMo: Number.parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-branches">Branch limit (0 = unlimited)</Label>
                    <Input
                      id="plan-branches"
                      inputMode="numeric"
                      value={String(planDraft.limits.branches)}
                      onChange={(e) =>
                        setPlanDraft({
                          ...planDraft,
                          limits: {
                            ...planDraft.limits,
                            branches: Number.parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">Plan enabled in catalog</span>
                  <Switch
                    checked={!planDraft.hiddenFromCatalog}
                    onCheckedChange={(checked) =>
                      setPlanDraft({ ...planDraft, hiddenFromCatalog: !checked })
                    }
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Module entitlements</div>
                  <ul className="mt-2 space-y-2">
                    {(
                      [
                        ["hrm", "HRM"],
                        ["crm", "CRM"],
                        ["finance", "Finance"],
                        ["inventory", "Inventory"],
                        ["manufacturing", "Manufacturing"],
                      ] as const
                    ).map(([k, lab]) => (
                      <li key={k} className="flex items-center justify-between gap-2">
                        <span>{lab}</span>
                        <Switch
                          checked={planDraft.modules[k]}
                          onCheckedChange={(checked) =>
                            setPlanDraft({
                              ...planDraft,
                              modules: { ...planDraft.modules, [k]: checked },
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  type="button"
                  disabled={planSaving}
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => void savePlanDraft()}
                >
                  {planSaving ? "Saving…" : "Save catalog changes"}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={planChangeTarget !== null} onOpenChange={(open) => !open && setPlanChangeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change tenant plan</DialogTitle>
            <DialogDescription>
              {planChangeTarget
                ? `${planChangeTarget.clientName} · current ${planChangeTarget.plan}`
                : "Select a new plan"}
            </DialogDescription>
          </DialogHeader>
          <Select
            value={planChangeValue}
            onValueChange={(v) => setPlanChangeValue(v as typeof planChangeValue)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="GROWTH">Growth</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPlanChangeTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!planChangeTarget) return;
                void (async () => {
                  try {
                    await changeTenantBillingPlan(planChangeTarget.tenantId, planChangeValue);
                    toast.success("Plan updated");
                    setPlanChangeTarget(null);
                    await router.invalidate();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Plan change failed");
                  }
                })();
              }}
            >
              Apply plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
