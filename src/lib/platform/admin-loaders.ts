import { apiFetch, apiGetPlatformOverview } from "@/lib/api/client";
import { isApiEnabled } from "@/lib/api/config";
import { mapApiTenant, toApiCreateBody, toApiUpdatePatch } from "@/lib/api/tenant-mappers";
import type { IndustryTemplate, TenantPlan, TenantStatus } from "@/lib/admin-demo";
import type { TenantRecord } from "@/lib/types/workspace-ui";
import {
  emptyAlertsLogsCommandCenter,
  emptyAutomationCommandCenter,
  emptySalesCommercialFloor,
  emptySubscriptionCommandCenter,
} from "@/lib/workspace/empty-states";
import type {
  PlatformActivityItem,
  PlatformSystemLog,
  SubscriptionBillingStatus,
  SubscriptionClientRow,
  SubscriptionPlanCatalogEntry,
} from "@/lib/types/workspace-ui";

function canCallApiFromLoader(): boolean {
  return typeof window !== "undefined";
}

function requireApi(): boolean {
  if (!isApiEnabled()) {
    console.warn("[velon] VITE_API_URL is required — demo store removed in Phase 2C.");
    return false;
  }
  return canCallApiFromLoader();
}

export type PlatformOverviewData = ReturnType<typeof emptyPlatformOverview>;

function emptyPlatformOverview() {
  return {
    mrrTotal: 0,
    arrGrowthPct: 0,
    activeTenantCount: 0,
    trialCount: 0,
    totalSeatsAllocated: 0,
    licenseSeatCapacity: 500,
    platformUptimePct: 99.97,
    pendingPlanRequests: 0,
    openSecurityAlerts: 0,
    recentTenants: [] as {
      id: string;
      name: string;
      plan: import("@/lib/admin-demo").TenantPlan;
      status: import("@/lib/admin-demo").TenantStatus;
      mrr: number;
      country: string;
      users: number;
    }[],
    revenueByMonth: [
      { month: "Dec", mrr: 0 },
      { month: "Jan", mrr: 0 },
      { month: "Feb", mrr: 0 },
      { month: "Mar", mrr: 0 },
      { month: "Apr", mrr: 0 },
      { month: "May", mrr: 0 },
    ],
    tenantSignupsByMonth: [
      { month: "Dec", newTenants: 0 },
      { month: "Jan", newTenants: 0 },
      { month: "Feb", newTenants: 0 },
      { month: "Mar", newTenants: 0 },
      { month: "Apr", newTenants: 0 },
      { month: "May", newTenants: 0 },
    ],
    planDistribution: [
      { plan: "Starter", pct: 0 },
      { plan: "Growth", pct: 0 },
      { plan: "Enterprise", pct: 0 },
    ],
    moduleUsage: [
      { module: "Finance & GL", pct: 0 },
      { module: "CRM & pipeline", pct: 0 },
      { module: "HRM & payroll", pct: 0 },
      { module: "Inventory & WMS", pct: 0 },
    ],
    activityFeed: [] as PlatformActivityItem[],
    systemLogs: [] as PlatformSystemLog[],
  };
}

export async function loadAdminTenants(): Promise<TenantRecord[]> {
  if (!requireApi()) return [];
  const rows = await apiFetch<Parameters<typeof mapApiTenant>[0][]>("/tenants");
  return rows.map(mapApiTenant);
}

export async function loadPlatformStaff() {
  if (!requireApi()) return [];
  return apiFetch<
    {
      id: string;
      username: string;
      name: string;
      email: string;
      role: string;
      lastActive: string;
      status: "Active" | "Suspended";
      mfaEnabled: boolean;
    }[]
  >("/platform/users");
}

export async function loadPlatformOverview(): Promise<PlatformOverviewData> {
  if (!requireApi()) return emptyPlatformOverview();
  const raw = await apiGetPlatformOverview();
  const planFromApi: Record<string, TenantPlan> = {
    STARTER: "Starter",
    GROWTH: "Growth",
    ENTERPRISE: "Enterprise",
  };
  const statusFromApi: Record<string, TenantStatus> = {
    ACTIVE: "Active",
    TRIAL: "Trial",
    PAST_DUE: "Past due",
    SUSPENDED: "Suspended",
  };
  type RecentTenantRow = PlatformOverviewData["recentTenants"][number];
  const recentTenants = (
    (raw as { recentTenants?: RecentTenantRow[] }).recentTenants ?? []
  ).map((t) => ({
    ...t,
    plan: planFromApi[String(t.plan)] ?? t.plan,
    status: statusFromApi[String(t.status)] ?? t.status,
  }));
  return {
    ...(raw as PlatformOverviewData),
    recentTenants,
  };
}

export type PlatformDiagnosticsData = {
  activeTenants: number;
  activeUsers: number;
  database: { postgres: "ok" | "degraded"; redis: "ok" | "degraded" };
  migrations?: { applied: number; pending: number; status: "ok" | "degraded" };
  api: { status: "ok" | "degraded" };
  queue: { status: "ok" | "degraded"; label: string };
  recentSecurityEvents: {
    id: string;
    action: string;
    at: string;
    entityType: string;
    tenantId: string | null;
  }[];
  recentErrors: { id: string; action: string; at: string; entityType: string }[];
  checkedAt: string;
};

export async function loadPlatformDiagnostics(): Promise<PlatformDiagnosticsData> {
  if (!requireApi()) {
    return {
      activeTenants: 0,
      activeUsers: 0,
      database: { postgres: "degraded", redis: "degraded" },
      api: { status: "degraded" },
      queue: { status: "degraded", label: "Redis revision bus" },
      recentSecurityEvents: [],
      recentErrors: [],
      checkedAt: new Date().toISOString(),
    };
  }
  return apiFetch<PlatformDiagnosticsData>("/platform/diagnostics");
}

export async function createAdminTenant(input: {
  name: string;
  plan: TenantPlan;
  country: string;
  users: number;
  mrr: number;
  status: TenantStatus;
  slug?: string;
  industryTemplate: IndustryTemplate;
}) {
  if (!requireApi()) throw new Error("API required to create tenants.");
  const row = await apiFetch<Parameters<typeof mapApiTenant>[0]>("/tenants", {
    method: "POST",
    body: JSON.stringify(toApiCreateBody(input)),
  });
  return mapApiTenant(row);
}

export async function updateAdminTenant(
  id: string,
  patch: {
    plan?: TenantPlan;
    status?: TenantStatus;
    users?: number;
    mrr?: number;
    modules?: TenantRecord["modules"];
  },
) {
  if (!requireApi()) throw new Error("API required to update tenants.");
  const row = await apiFetch<Parameters<typeof mapApiTenant>[0]>(`/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(toApiUpdatePatch(patch)),
  });
  return mapApiTenant(row);
}

export async function deleteAdminTenant(id: string) {
  if (!requireApi()) throw new Error("API required to delete tenants.");
  return apiFetch<{ id: string; deleted: true }>(`/tenants/${id}`, { method: "DELETE" });
}

function apiPlanToTenantPlan(plan: string): TenantPlan {
  if (plan === "GROWTH") return "Growth";
  if (plan === "ENTERPRISE") return "Enterprise";
  return "Starter";
}

function apiStatusToBillingStatus(status: string): SubscriptionBillingStatus {
  if (status === "TRIAL") return "Trial";
  if (status === "SUSPENDED") return "Cancelled";
  if (status === "PAST_DUE") return "Past due";
  return "Active";
}

function renewalWithinDays(renewalDate: string, days: number): boolean {
  const renewal = new Date(renewalDate);
  const now = new Date();
  const diff = renewal.getTime() - now.getTime();
  return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function mapCatalogPlan(
  plan: {
    id: string;
    displayName: string;
    monthlyPrice: number;
    annualPrice?: number;
    currency?: string;
    seatLimit: number | null;
    storageLimitGb?: number;
    invoiceLimitMo?: number | null;
    branchLimit?: number | null;
    trialDays?: number;
    isEnabled?: boolean;
    description?: string;
    modules?: SubscriptionPlanCatalogEntry["modules"];
  },
  tenants: { plan: string; status: string }[],
): SubscriptionPlanCatalogEntry {
  const activeRenewals = tenants.filter((t) => t.plan === plan.id && t.status === "ACTIVE").length;
  const users = plan.seatLimit ?? 0;
  const modules = plan.modules ?? {
    hrm: true,
    crm: true,
    finance: plan.id !== "STARTER",
    inventory: true,
    manufacturing: plan.id === "ENTERPRISE",
  };
  return {
    id: plan.id.toLowerCase(),
    name: plan.displayName,
    monthlyPrice: plan.monthlyPrice,
    annualPrice: plan.annualPrice ?? plan.monthlyPrice * 10,
    description: plan.description ?? "",
    seatsSummary: plan.seatLimit ? `Up to ${plan.seatLimit} users` : "Unlimited users",
    activeRenewals,
    customPricing: plan.id === "ENTERPRISE",
    trialDaysDefault: plan.trialDays ?? 14,
    hiddenFromCatalog: plan.isEnabled === false,
    limits: {
      users,
      storageGb: plan.storageLimitGb ?? (plan.id === "STARTER" ? 10 : plan.id === "GROWTH" ? 50 : 500),
      invoicesPerMo: plan.invoiceLimitMo ?? (plan.id === "STARTER" ? 500 : 5000),
      branches: plan.branchLimit ?? (plan.id === "STARTER" ? 1 : plan.id === "GROWTH" ? 5 : 99),
    },
    modules,
  };
}

export async function loadSubscriptionCommandCenter() {
  if (!requireApi()) return emptySubscriptionCommandCenter();
  try {
    const raw = await apiFetch<{
      plans: {
        id: string;
        displayName: string;
        monthlyPrice: number;
        annualPrice: number;
        currency: string;
        seatLimit: number | null;
        storageLimitGb: number;
        invoiceLimitMo: number | null;
        branchLimit: number | null;
        trialDays: number;
        isEnabled: boolean;
        description?: string;
        modules: SubscriptionPlanCatalogEntry["modules"];
      }[];
      summary: {
        totalTenants: number;
        activeTenants: number;
        trialTenants: number;
        suspendedTenants: number;
        mrrTotal: number;
      };
      byPlan?: Record<string, number>;
      tenants: {
        id: string;
        name: string;
        plan: string;
        planDisplayName: string;
        status: string;
        seatsUsed: number;
        seatLimit: number | null;
        mrr: number;
        renewalDate: string;
      }[];
    }>("/billing/platform/subscriptions");
    const empty = emptySubscriptionCommandCenter();
    const byPlan = raw.byPlan ?? {};
    return {
      ...empty,
      mrrTotal: raw.summary.mrrTotal,
      activePaidSubscriptions: raw.summary.activeTenants,
      activeByPlan: {
        Starter: byPlan.STARTER ?? 0,
        Growth: byPlan.GROWTH ?? 0,
        Enterprise: byPlan.ENTERPRISE ?? 0,
      },
      openTrials: raw.summary.trialTenants,
      catalogPlans: raw.plans.map((p) => mapCatalogPlan(p, raw.tenants)),
      clients: raw.tenants.map(
        (t): SubscriptionClientRow => ({
          tenantId: t.id,
          clientName: t.name,
          plan: apiPlanToTenantPlan(t.plan),
          billingDate: t.renewalDate,
          billingStatus: apiStatusToBillingStatus(t.status),
          mrr: t.mrr,
          lastInvoiceId: `INV-${t.id.slice(0, 8).toUpperCase()}`,
          renewalSoon: renewalWithinDays(t.renewalDate, 30),
          failedPayment: false,
        }),
      ),
    };
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to load subscription data from API.");
  }
}

export async function loadSalesCommercialFloor() {
  if (!requireApi()) return emptySalesCommercialFloor();
  return emptySalesCommercialFloor();
}

export async function loadAutomationCommandCenter() {
  if (!requireApi()) return emptyAutomationCommandCenter();
  return emptyAutomationCommandCenter();
}

export async function loadAlertsLogsCommandCenter() {
  if (!requireApi()) return emptyAlertsLogsCommandCenter();
  try {
    const logs = await apiFetch<
      {
        id: string;
        action: string;
        entityType: string;
        entityId: string | null;
        metadata: Record<string, unknown> | null;
        createdAt: string;
        actor: { email: string; name: string | null } | null;
        tenantId: string | null;
      }[]
    >("/audit/logs");

    const empty = emptyAlertsLogsCommandCenter();
    const auditLogs = logs.map((row): import("@/lib/types/workspace-ui").AuditLogRow => {
      const action = row.action;
      const severity: import("@/lib/types/workspace-ui").LiveAlertSeverity =
        action.includes("security") || action.includes("failed") || action.includes("suspended")
          ? "critical"
          : action.includes("billing") || action.includes("plan")
            ? "warning"
            : "info";

      return {
        id: row.id,
        isoDate: row.createdAt,
        actor: row.actor?.email ?? "system",
        actorRole: row.actor?.name ?? "platform",
        action: row.action,
        entityKind: mapEntityKind(row.entityType),
        entityName: row.entityType,
        entityRef: row.entityId ?? "—",
        status: action.includes("failed") ? "failed" : "ok",
        diffSummary: row.metadata ? JSON.stringify(row.metadata).slice(0, 120) : undefined,
        tamper: "verified",
      };
    });

    const liveAlerts = auditLogs.slice(0, 12).map(
      (log): import("@/lib/types/workspace-ui").LiveAlertItem => ({
        id: log.id,
        title: log.action.replace(/\./g, " · "),
        severity:
          log.action.includes("security") || log.action.includes("failed") ? "critical" : "info",
        timeLabel: new Date(log.isoDate).toLocaleString(),
        grouped: false,
        rcaHint: log.diffSummary ?? "Audit event recorded",
        tags: [log.entityKind],
      }),
    );

    const criticalCount = liveAlerts.filter((a) => a.severity === "critical").length;

    return {
      ...empty,
      pulse: {
        ...empty.pulse,
        unresolvedCriticals: criticalCount,
        sparkline60m: buildSparklineFromLogs(logs),
      },
      liveAlerts,
      auditLogs,
    };
  } catch {
    return emptyAlertsLogsCommandCenter();
  }
}

function mapEntityKind(entityType: string): import("@/lib/types/workspace-ui").AuditEntityKind {
  if (entityType === "tenant") return "tenant";
  if (entityType === "user") return "user";
  if (entityType === "invoice") return "invoice";
  if (entityType === "webhook") return "webhook";
  return "system";
}

function buildSparklineFromLogs(
  logs: { createdAt: string; action: string }[],
): { bucket: string; errors: number }[] {
  const buckets = new Map<string, number>();
  for (const log of logs) {
    const hour = new Date(log.createdAt).toISOString().slice(11, 13) + ":00";
    const isError = log.action.includes("failed") || log.action.includes("security");
    if (isError) buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([bucket, errors]) => ({ bucket, errors }));
}

export async function createPlatformUser(input: {
  email: string;
  name: string;
  password: string;
  role: "SUPER_ADMIN" | "PLATFORM_SUPPORT";
}) {
  if (!requireApi()) throw new Error("API required to create platform users.");
  return apiFetch<Awaited<ReturnType<typeof loadPlatformStaff>>[number]>("/platform/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setPlatformUserStatus(id: string, isActive: boolean) {
  if (!requireApi()) throw new Error("API required to update platform users.");
  return apiFetch<Awaited<ReturnType<typeof loadPlatformStaff>>[number]>(
    `/platform/users/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ isActive }) },
  );
}

export async function deletePlatformUser(id: string) {
  if (!requireApi()) throw new Error("API required to delete platform users.");
  return apiFetch<{ id: string; deleted: true }>(`/platform/users/${id}`, { method: "DELETE" });
}

export async function updatePlanDefinition(
  plan: "STARTER" | "GROWTH" | "ENTERPRISE",
  body: {
    displayName?: string;
    monthlyPrice?: number;
    annualPrice?: number;
    indiaMonthlyPrice?: number;
    indiaAnnualPrice?: number;
    globalMonthlyPrice?: number;
    globalAnnualPrice?: number;
    currency?: string;
    seatLimit?: number | null;
    storageLimitGb?: number;
    invoiceLimitMo?: number | null;
    branchLimit?: number | null;
    trialDays?: number;
    isEnabled?: boolean;
    modules?: SubscriptionPlanCatalogEntry["modules"];
  },
) {
  if (!requireApi()) throw new Error("API required to update plan catalog.");
  return apiFetch(`/billing/platform/plans/${plan}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function changeTenantBillingPlan(tenantId: string, plan: "STARTER" | "GROWTH" | "ENTERPRISE") {
  if (!requireApi()) throw new Error("API required to change tenant plan.");
  return apiFetch<{ id: string; plan: string; mrr: number }>(
    `/billing/platform/tenants/${tenantId}/plan`,
    { method: "PATCH", body: JSON.stringify({ plan }) },
  );
}

export async function resetTenantSubscription(tenantId: string) {
  if (!requireApi()) throw new Error("API required to reset subscription.");
  return apiFetch<{ id: string; renewalDate: string; status: string }>(
    `/billing/platform/tenants/${tenantId}/reset`,
    { method: "POST" },
  );
}
