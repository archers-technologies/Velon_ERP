import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { loadAlertsLogsCommandCenter } from "@/lib/platform/admin-loaders";
import type { AuditLogRow, LiveAlertItem, LiveAlertSeverity } from "@/lib/types/workspace-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Activity,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Layers,
  Search,
  Radio,
  Bell,
  User,
  Building2,
  Slack,
  UserPlus,
  Clock4,
  CreditCard,
  AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/alerts-logs")({
  loader: () => loadAlertsLogsCommandCenter(),
  component: AdminAlertsLogsPage,
});

const sparkConfig = {
  errors: {
    label: "Errors",
    theme: { light: "oklch(0.55 0.2 25)", dark: "oklch(0.72 0.16 25)" },
  },
} satisfies ChartConfig;

function severityStyles(s: LiveAlertSeverity) {
  switch (s) {
    case "critical":
      return {
        bar: "border-l-red-600 bg-red-500/[0.06] dark:bg-red-950/30",
        badge: "border-red-500/40 bg-red-500/15 text-red-900 dark:text-red-100",
        dot: "bg-red-500",
      };
    case "warning":
      return {
        bar: "border-l-amber-500 bg-amber-500/[0.06] dark:bg-amber-950/25",
        badge: "border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100",
        dot: "bg-amber-500",
      };
    case "info":
      return {
        bar: "border-l-sky-600 bg-sky-500/[0.06] dark:bg-sky-950/25",
        badge: "border-sky-500/40 bg-sky-500/15 text-sky-950 dark:text-sky-100",
        dot: "bg-sky-500",
      };
    default:
      return {
        bar: "border-l-border bg-muted/30",
        badge: "border-border",
        dot: "bg-muted-foreground",
      };
  }
}

function entityLinkTarget(row: AuditLogRow): { to: string; label: string } | null {
  switch (row.entityKind) {
    case "tenant":
      return { to: "/admin/tenants", label: row.entityName };
    case "user":
      return { to: "/admin/users", label: row.entityName };
    case "invoice":
      return { to: "/admin/subscriptions", label: row.entityRef };
    case "webhook":
      return { to: "/admin/integrations", label: row.entityName };
    default:
      return null;
  }
}

type QuickChip = "none" | "hour" | "payments" | "critical" | "audit_invoice";

function AdminAlertsLogsPage() {
  const data = Route.useLoaderData();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<QuickChip>("none");

  const visibleAlerts = useMemo(() => {
    return data.liveAlerts.filter((a) => {
      if (dismissedIds.has(a.id)) return false;
      if (chip === "critical" && a.severity !== "critical") return false;
      if (chip === "payments" && !a.tags.includes("payment") && !a.tags.includes("stripe"))
        return false;
      if (chip === "hour") {
        const recent = a.timeLabel.includes("m ago") || a.timeLabel.includes("min");
        if (!recent) return false;
      }
      const s = q.trim().toLowerCase();
      if (!s) return true;
      if (s.startsWith("tenant:")) {
        const v = s.slice(7).trim();
        return a.tags.includes("tenant") || a.title.toLowerCase().includes(v);
      }
      if (s.startsWith("user:")) {
        const v = s.slice(5).trim();
        return a.title.toLowerCase().includes(v);
      }
      if (s.startsWith("error:") || s.includes("404")) {
        return a.severity === "critical" || a.title.toLowerCase().includes("fail");
      }
      return a.title.toLowerCase().includes(s) || a.tags.some((t) => t.includes(s));
    });
  }, [data.liveAlerts, dismissedIds, q, chip]);

  const visibleAudits = useMemo(() => {
    return data.auditLogs.filter((row) => {
      if (chip === "audit_invoice") {
        if (row.entityKind !== "invoice" && !row.action.includes("invoice")) return false;
      }
      if (chip === "payments") {
        if (!row.action.includes("invoice") && !row.entityName.toLowerCase().includes("stripe"))
          return false;
      }
      const s = q.trim().toLowerCase();
      if (!s) return true;
      if (s.startsWith("tenant:")) {
        const v = s.slice(7).trim();
        return row.entityKind === "tenant" && row.entityName.toLowerCase().includes(v);
      }
      if (s.startsWith("user:")) {
        const v = s.slice(5).trim();
        return row.entityKind === "user" && row.entityName.toLowerCase().includes(v);
      }
      const hay = `${row.actor} ${row.action} ${row.entityName} ${row.entityRef}`.toLowerCase();
      return hay.includes(s);
    });
  }, [data.auditLogs, q, chip]);

  function markAllRead() {
    setDismissedIds(new Set(data.liveAlerts.map((a) => a.id)));
    toast.success("All visible alerts cleared", {
      description: "Demo UI — server would ACK and write audit.",
    });
  }

  function dismissOne(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Zone 1 — Health summary */}
        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
            <div className="min-w-0 flex-1 xl:max-w-[52%]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Live error rate · 60 min
                </h2>
                <span className="text-[10px] text-muted-foreground">Bucketed · demo series</span>
              </div>
              <ChartContainer config={sparkConfig} className="mt-2 h-[120px] w-full">
                <AreaChart
                  data={data.pulse.sparkline60m}
                  margin={{ left: 0, right: 4, top: 4, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/40"
                    vertical={false}
                  />
                  <XAxis dataKey="bucket" hide />
                  <YAxis hide domain={[0, "dataMax + 4"]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="var(--color-errors)"
                    fill="var(--color-errors)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
            <Separator className="xl:hidden" />
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:col-span-1">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Unresolved criticals
                </div>
                <div className="mt-1 text-3xl font-bold tabular-nums text-destructive">
                  {data.pulse.unresolvedCriticals}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Needs ACK or runbook</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Log ingestion
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "relative flex h-3 w-3",
                      data.pulse.logIngestionLive &&
                        "after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-emerald-400/60",
                    )}
                  >
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full",
                        data.pulse.logIngestionLive ? "bg-emerald-500" : "bg-muted-foreground",
                      )}
                    />
                  </span>
                  <span className="text-sm font-semibold">
                    {data.pulse.logIngestionLive ? "Live" : "Stale"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Lag p95 · {data.pulse.ingestionLagMs} ms · streams OK
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 sm:col-span-3 xl:col-span-1">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Radio className="h-3.5 w-3.5" aria-hidden />
                  Streaming feed
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  WebSocket / SSE would push new cards here without refresh — UI is wired for
                  append-only lists.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Smart filters */}
        <Card className="flex flex-col gap-3 border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search or try tenant:Aurora, user:Jordan, error:404…"
              className="h-9 rounded-lg border-border bg-muted/40 pl-9 font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "none" as const, label: "All events" },
                { id: "hour" as const, label: "Last hour" },
                { id: "payments" as const, label: "Failed payments" },
                { id: "critical" as const, label: "Critical only" },
                { id: "audit_invoice" as const, label: "Audit · invoices" },
              ] as const
            ).map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={chip === c.id ? "secondary" : "outline"}
                className="h-8 rounded-full text-xs"
                onClick={() => setChip(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Zone 2 — Live alerts */}
          <Card className="border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Live alerts</div>
                <p className="text-xs text-muted-foreground">
                  Severity-first · hover for RCA · bulk &amp; escalation
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs"
                  onClick={markAllRead}
                >
                  Mark all read
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs"
                  onClick={() =>
                    toast.message("Snooze similar", {
                      description: "Mute matching fingerprints 4h (demo).",
                    })
                  }
                >
                  Snooze group
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {visibleAlerts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No alerts match filters.
                </p>
              ) : (
                visibleAlerts.map((a: LiveAlertItem) => {
                  const st = severityStyles(a.severity);
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-xl border border-y border-r border-border border-l-4 p-4 text-left transition-shadow hover:shadow-sm",
                        st.bar,
                        a.grouped && "ring-1 ring-amber-500/20",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn("h-2 w-2 shrink-0 rounded-full", st.dot)}
                              aria-hidden
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="cursor-help text-left text-sm font-medium leading-snug underline decoration-dotted decoration-muted-foreground/50 underline-offset-2"
                                >
                                  {a.title}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-xs border-border bg-popover text-popover-foreground"
                              >
                                <p className="font-medium">RCA hint</p>
                                <p className="mt-1 text-muted-foreground">{a.rcaHint}</p>
                              </TooltipContent>
                            </Tooltip>
                            {a.grouped ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/40 text-[10px] font-normal"
                              >
                                <Layers className="h-3 w-3" />
                                Grouped
                              </Badge>
                            ) : null}
                          </div>
                          {a.groupCountLabel ? (
                            <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                              {a.groupCountLabel}
                            </p>
                          ) : null}
                          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {a.timeLabel}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-[10px] capitalize", st.badge)}
                        >
                          {a.severity}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => {
                            dismissOne(a.id);
                            toast.success("Resolved", { description: a.id });
                          }}
                        >
                          Resolve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => {
                            dismissOne(a.id);
                            toast.message("Snoozed 4h", { description: a.title });
                          }}
                        >
                          <Clock4 className="mr-1 h-3.5 w-3.5" />
                          Snooze 4h
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() =>
                            toast.message("Slack", { description: "#platform-ops thread (demo)." })
                          }
                        >
                          <Slack className="mr-1 h-3.5 w-3.5" />
                          Slack
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() =>
                            toast.message("Assigned", { description: "L2 engineer queue (demo)." })
                          }
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          Assign
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => dismissOne(a.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Zone 3 — Audit logs */}
          <Card className="border-border bg-card p-5 sm:p-6">
            <div className="mb-4">
              <div className="text-sm font-semibold">Recent audit logs</div>
              <p className="text-xs text-muted-foreground">
                Who · what · where · when — diff for money fields, tamper-evidence, deep links
              </p>
            </div>
            <div className="space-y-2">
              {visibleAudits.map((row) => {
                const link = entityLinkTarget(row);
                return (
                  <div
                    key={row.id}
                    className="rounded-lg border border-border bg-muted/20 p-3 text-xs sm:p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1 font-mono text-[11px] text-muted-foreground">
                        <div className="text-foreground">
                          <span>{row.isoDate.slice(0, 10)}</span>{" "}
                          <span className="text-muted-foreground">
                            {row.isoDate.slice(11, 16)} UTC
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">{row.actor}</span>
                          <span className="text-muted-foreground"> · {row.action}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {link ? (
                            <Link
                              to={link.to}
                              className="inline-flex items-center gap-1 font-sans text-[11px] font-medium text-primary underline-offset-4 hover:underline"
                            >
                              {row.entityKind === "tenant" ? (
                                <Building2 className="h-3 w-3" />
                              ) : row.entityKind === "user" ? (
                                <User className="h-3 w-3" />
                              ) : row.entityKind === "invoice" ? (
                                <CreditCard className="h-3 w-3" />
                              ) : (
                                <Activity className="h-3 w-3" />
                              )}
                              {link.label}
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </Link>
                          ) : (
                            <span className="font-sans text-foreground">{row.entityName}</span>
                          )}
                          <Badge variant="outline" className="font-mono text-[10px] font-normal">
                            {row.entityRef}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {row.status}
                          </Badge>
                        </div>
                        {row.diffSummary ? (
                          <div className="mt-2 rounded-md border border-dashed border-border bg-background/80 px-2 py-1.5 font-sans text-[11px] leading-relaxed text-foreground">
                            <span className="font-semibold text-muted-foreground">Diff · </span>
                            {row.diffSummary}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {row.tamper === "verified" ? (
                          <Badge className="gap-1 border-0 bg-emerald-600/15 text-[10px] font-normal text-emerald-900 dark:text-emerald-100">
                            <ShieldCheck className="h-3 w-3" />
                            Chain verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px] font-normal text-amber-800 dark:text-amber-200"
                          >
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Verifying…
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-4" />
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <AlertOctagon
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              Throttling: identical fingerprints roll into one card (see grouped alert). Destructive
              paths require dual control in production.
            </p>
          </Card>
        </div>

        <Card className="border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          <Bell className="mx-auto mb-2 h-4 w-4 opacity-50" aria-hidden />
          Mobile app push mirrors <strong className="text-foreground">
            critical + warning
          </strong>{" "}
          with per-channel mute — same ACK stream as this desk.
        </Card>
      </div>
    </TooltipProvider>
  );
}
