import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { TenantRecord } from "@/lib/types/workspace-ui";
import {
  createAdminTenant,
  deleteAdminTenant,
  loadAdminTenants,
  resetTenantSubscription,
  updateAdminTenant,
} from "@/lib/platform/admin-loaders";
import { tenantWorkspaceHost } from "@/lib/tenant-workspace";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TenantStatusPill } from "@/components/tenant-status-pill";
import { useAdminCurrency } from "@/contexts/admin-currency";
import type { IndustryTemplate, TenantHealth, TenantPlan, TenantStatus } from "@/lib/admin-demo";
import { INDUSTRY_TEMPLATES } from "@/lib/admin-demo";
import { TENANT_STATUS_COLUMN_HELP } from "@velon/shared";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  KeyRound,
  Ban,
  PlayCircle,
  ShieldCheck,
  ShieldAlert,
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/admin/tenants")({
  loader: () => loadAdminTenants(),
  component: AdminTenantsPage,
});

function healthLabel(h: TenantHealth) {
  switch (h) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "critical":
      return "Critical";
    default:
      return h;
  }
}

function healthDotClass(h: TenantHealth) {
  switch (h) {
    case "healthy":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "critical":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}

function slugPreviewFromName(name: string) {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "tenant";
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type DetailDraft = {
  plan: TenantPlan;
  status: TenantStatus;
  users: number;
  mrr: number;
  modules: TenantRecord["modules"];
};

type TenantSortColumn =
  | "tenantCode"
  | "name"
  | "workspace"
  | "plan"
  | "status"
  | "health"
  | "createdAt"
  | "lastActive"
  | "users"
  | "storage"
  | "mrr";

function planRank(p: TenantPlan): number {
  switch (p) {
    case "Starter":
      return 1;
    case "Growth":
      return 2;
    case "Enterprise":
      return 3;
    default:
      return 0;
  }
}

const STATUS_SORT_ORDER: TenantStatus[] = ["Active", "Trial", "Past due", "Suspended"];

function statusRank(s: TenantStatus): number {
  const i = STATUS_SORT_ORDER.indexOf(s);
  return i === -1 ? 99 : i;
}

function healthRank(h: TenantHealth): number {
  switch (h) {
    case "healthy":
      return 1;
    case "degraded":
      return 2;
    case "critical":
      return 3;
    default:
      return 0;
  }
}

/** Lower = more recently active (demo labels). */
function lastActiveSortMinutes(label: string): number {
  const l = label.toLowerCase();
  if (l.includes("just now")) return 0;
  const min = /(\d+)\s*min/.exec(l);
  if (min) return Number(min[1]);
  const hr = /(\d+)\s*hr/.exec(l);
  if (hr) return Number(hr[1]) * 60;
  if (l.includes("yesterday")) return 24 * 60 + 1;
  const days = /(\d+)\s*days?/.exec(l);
  if (days) return 24 * 60 * (Number(days[1]) + 1);
  if (l.includes("suspended")) return 365 * 24 * 60;
  return 999_999;
}

function compareTenants(
  a: TenantRecord,
  b: TenantRecord,
  col: TenantSortColumn,
  desc: boolean,
): number {
  const dir = desc ? -1 : 1;
  let cmp = 0;
  switch (col) {
    case "tenantCode":
      cmp = a.tenantCode.localeCompare(b.tenantCode);
      break;
    case "name":
      cmp = a.name.localeCompare(b.name);
      break;
    case "workspace":
      cmp = tenantWorkspaceHost(a.slug).localeCompare(tenantWorkspaceHost(b.slug));
      break;
    case "plan":
      cmp = planRank(a.plan) - planRank(b.plan);
      break;
    case "status":
      cmp = statusRank(a.status) - statusRank(b.status);
      break;
    case "health":
      cmp = healthRank(a.health) - healthRank(b.health);
      break;
    case "createdAt":
      cmp = a.createdAt.localeCompare(b.createdAt);
      break;
    case "lastActive":
      cmp = lastActiveSortMinutes(a.lastActiveLabel) - lastActiveSortMinutes(b.lastActiveLabel);
      break;
    case "users":
      cmp = a.users - b.users;
      break;
    case "storage":
      cmp = a.storageUsedGb / a.storageCapGb - b.storageUsedGb / b.storageCapGb;
      break;
    case "mrr":
      cmp = a.mrr - b.mrr;
      break;
    default:
      cmp = 0;
  }
  if (cmp !== 0) return cmp * dir;
  return a.tenantCode.localeCompare(b.tenantCode) * dir;
}

function StatusColumnHeader({
  sortColumn,
  sortDesc,
  onSort,
}: {
  sortColumn: TenantSortColumn;
  sortDesc: boolean;
  onSort: (c: TenantSortColumn) => void;
}) {
  const active = sortColumn === "status";
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDesc ? "descending" : "ascending") : "none"}
      className="whitespace-nowrap px-4 py-2 text-left font-medium sm:px-5 sm:py-3"
    >
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSort("status")}
          aria-label={
            active
              ? `Status: sorted ${sortDesc ? "descending" : "ascending"}, click to reverse`
              : "Sort by Status"
          }
          className={cn(
            "group inline-flex max-w-full items-center gap-1 rounded-md py-1 pr-1 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
            active && "text-foreground",
          )}
        >
          <span className="min-w-0 truncate">Status</span>
          {active ? (
            sortDesc ? (
              <ArrowDown className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
            ) : (
              <ArrowUp className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
            )
          ) : (
            <ArrowUpDown
              className="h-3.5 w-3.5 shrink-0 opacity-35 group-hover:opacity-60"
              aria-hidden
            />
          )}
        </button>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded-md p-0.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                aria-label="Status column help"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left leading-snug">
              {TENANT_STATUS_COLUMN_HELP}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </th>
  );
}

function SortableTh({
  label,
  column,
  sortColumn,
  sortDesc,
  onSort,
}: {
  label: string;
  column: TenantSortColumn;
  sortColumn: TenantSortColumn;
  sortDesc: boolean;
  onSort: (c: TenantSortColumn) => void;
}) {
  const active = sortColumn === column;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDesc ? "descending" : "ascending") : "none"}
      className="whitespace-nowrap px-4 py-2 text-left font-medium sm:px-5 sm:py-3"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={
          active
            ? `${label}: sorted ${sortDesc ? "descending" : "ascending"}, click to reverse`
            : `Sort by ${label}`
        }
        className={cn(
          "group inline-flex max-w-full items-center gap-1 rounded-md py-1 pr-1 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        {active ? (
          sortDesc ? (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
          ) : (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
          )
        ) : (
          <ArrowUpDown
            className="h-3.5 w-3.5 shrink-0 opacity-35 group-hover:opacity-60"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}

function AdminTenantsPage() {
  const router = useRouter();
  const { formatCurrency } = useAdminCurrency();
  const tenants = Route.useLoaderData();

  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | TenantPlan>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all");
  const [sortColumn, setSortColumn] = useState<TenantSortColumn>("tenantCode");
  const [sortDesc, setSortDesc] = useState(false);

  const [openWizard, setOpenWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [slugOverride, setSlugOverride] = useState("");
  const [industryTemplate, setIndustryTemplate] = useState<IndustryTemplate>("Retail");
  const [users, setUsers] = useState("10");
  const [mrr, setMrr] = useState("99");
  const [plan, setPlan] = useState<TenantPlan>("Growth");
  const [status, setStatus] = useState<TenantStatus>("Trial");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [draft, setDraft] = useState<DetailDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantRecord | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const detailTenant = useMemo(
    () => tenants.find((t) => t.id === detailId) ?? null,
    [detailId, tenants],
  );

  useEffect(() => {
    if (!detailTenant) {
      setDraft(null);
      return;
    }
    setDraft({
      plan: detailTenant.plan,
      status: detailTenant.status,
      users: detailTenant.users,
      mrr: detailTenant.mrr,
      modules: { ...detailTenant.modules },
    });
  }, [detailTenant]);

  const slugForCreate = slugOverride.trim() || slugPreviewFromName(name);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tenants.filter((t) => {
      if (planFilter !== "all" && t.plan !== planFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!s) return true;
      const host = tenantWorkspaceHost(t.slug).toLowerCase();
      return (
        t.name.toLowerCase().includes(s) ||
        t.country.toLowerCase().includes(s) ||
        t.plan.toLowerCase().includes(s) ||
        t.slug.toLowerCase().includes(s) ||
        t.tenantCode.toLowerCase().includes(s) ||
        host.includes(s)
      );
    });
  }, [q, tenants, planFilter, statusFilter]);

  const healthSummary = useMemo(() => {
    return {
      healthy: filtered.filter((t) => t.health === "healthy").length,
      degraded: filtered.filter((t) => t.health === "degraded").length,
      critical: filtered.filter((t) => t.health === "critical").length,
    };
  }, [filtered]);

  const sortedTenants = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => compareTenants(a, b, sortColumn, sortDesc));
    return arr;
  }, [filtered, sortColumn, sortDesc]);

  function handleSortColumn(col: TenantSortColumn) {
    if (sortColumn === col) setSortDesc((d) => !d);
    else {
      setSortColumn(col);
      setSortDesc(false);
    }
  }

  function resetWizard() {
    setWizardStep(0);
    setName("");
    setCountry("");
    setSlugOverride("");
    setIndustryTemplate("Retail");
    setUsers("10");
    setMrr("99");
    setPlan("Growth");
    setStatus("Trial");
  }

  async function handleCreateTenant() {
    setSubmitting(true);
    try {
      await createAdminTenant({
        name: name.trim(),
        plan,
        country: country.trim(),
        users: Number.parseInt(users, 10) || 0,
        mrr: Number.parseFloat(mrr) || 0,
        status,
        slug: slugOverride.trim() || undefined,
        industryTemplate,
      });
      toast.success("Tenant provisioned and saved to the platform database.");
      setOpenWizard(false);
      resetWizard();
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create tenant");
    } finally {
      setSubmitting(false);
    }
  }

  async function persistDetail() {
    if (!detailTenant || !draft) return;
    setDetailSaving(true);
    try {
      await updateAdminTenant(detailTenant.id, {
        plan: draft.plan,
        status: draft.status,
        users: draft.users,
        mrr: draft.mrr,
        modules: draft.modules,
      });
      toast.success("Tenant saved");
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setDetailSaving(false);
    }
  }

  async function setSuspended(id: string, suspend: boolean) {
    try {
      await updateAdminTenant(id, { status: suspend ? "Suspended" : "Active" });
      toast.success(suspend ? "Tenant suspended" : "Tenant reactivated");
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function resetSubscription(id: string) {
    try {
      await resetTenantSubscription(id);
      toast.success("Subscription reset (+30 day renewal)");
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    }
  }

  async function confirmDeleteTenant() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminTenant(deleteTarget.id);
      if (detailId === deleteTarget.id) setDetailId(null);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete tenant");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <Card className="border-border bg-card p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">
            Command center for isolated workspaces — search, filter, and act on billing, access, and
            health in one surface.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, code, subdomain, region, plan…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 rounded-lg border-border bg-muted/40 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={planFilter}
                onValueChange={(v) => setPlanFilter(v as typeof planFilter)}
              >
                <SelectTrigger className="h-9 w-[140px] rounded-lg">
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
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
        <Button
          type="button"
          className="h-10 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90 lg:self-end"
          onClick={() => {
            resetWizard();
            setOpenWizard(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add tenant
        </Button>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This soft-deletes{" "}
                  <span className="font-medium text-foreground">{deleteTarget?.name}</span> (
                  <span className="font-mono text-xs">{deleteTarget?.tenantCode}</span>) and suspends
                  workspace access. Billing and audit records are retained.
                </p>
                <p>
                  Type <span className="font-mono text-foreground">DELETE</span> or the tenant code{" "}
                  <span className="font-mono text-foreground">{deleteTarget?.tenantCode}</span> to
                  confirm.
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE or tenant code"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleting ||
                !deleteTarget ||
                (deleteConfirmText !== "DELETE" &&
                  deleteConfirmText.trim() !== deleteTarget.tenantCode)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteTenant();
              }}
            >
              {deleting ? "Deleting…" : "Delete tenant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={openWizard}
        onOpenChange={(o) => {
          setOpenWizard(o);
          if (!o) resetWizard();
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Provision tenant · step {wizardStep + 1} of 2</DialogTitle>
            <DialogDescription>
              Create a new tenant workspace with industry template and subscription plan — saved to
              the platform database.
            </DialogDescription>
          </DialogHeader>
          {wizardStep === 0 ? (
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="tn-name">Business name</Label>
                <Input
                  id="tn-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Retail Ltd."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tn-country">Country / region</Label>
                <Input
                  id="tn-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United Kingdom"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tn-slug">Workspace subdomain (optional)</Label>
                <Input
                  id="tn-slug"
                  value={slugOverride}
                  onChange={(e) => setSlugOverride(e.target.value)}
                  placeholder={slugPreviewFromName(name || "your-business")}
                />
                <p className="text-[11px] text-muted-foreground">
                  Host preview:{" "}
                  <span className="font-mono text-foreground">
                    {tenantWorkspaceHost(slugForCreate)}
                  </span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Configuration profile</Label>
                <Select
                  value={industryTemplate}
                  onValueChange={(v) => setIndustryTemplate(v as IndustryTemplate)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_TEMPLATES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Seeds default module flags (Finance, CRM, HRM, Inventory, Manufacturing) for the
                  tenant workspace.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 py-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{name.trim() || "—"}</span> ·{" "}
                {tenantWorkspaceHost(slugForCreate)} · {industryTemplate}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={plan} onValueChange={(v) => setPlan(v as TenantPlan)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Starter">Starter</SelectItem>
                      <SelectItem value="Growth">Growth</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Lifecycle status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as TenantStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trial">Trial</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Past due">Past due</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tn-users">Licensed seats</Label>
                  <Input
                    id="tn-users"
                    inputMode="numeric"
                    value={users}
                    onChange={(e) => setUsers(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tn-mrr">MRR (platform)</Label>
                  <Input
                    id="tn-mrr"
                    inputMode="decimal"
                    value={mrr}
                    onChange={(e) => setMrr(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpenWizard(false)}>
              Cancel
            </Button>
            {wizardStep === 0 ? (
              <Button
                type="button"
                className="bg-foreground text-background hover:bg-foreground/90"
                disabled={!name.trim() || !country.trim()}
                onClick={() => setWizardStep(1)}
              >
                Next
              </Button>
            ) : (
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setWizardStep(0)}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={handleCreateTenant}
                >
                  {submitting ? "Provisioning…" : "Create tenant"}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={detailId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailId(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {detailTenant && draft ? (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">{detailTenant.name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {detailTenant.tenantCode} · {tenantWorkspaceHost(detailTenant.slug)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-md font-normal">
                    {detailTenant.industryTemplate}
                  </Badge>
                  {detailTenant.isolationVerified ? (
                    <Badge className="gap-1 rounded-md bg-emerald-600/15 font-normal text-emerald-800 dark:text-emerald-200">
                      <ShieldCheck className="h-3 w-3" /> Row-level isolation verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 rounded-md font-normal">
                      <ShieldAlert className="h-3 w-3" /> Isolation review required
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Subscription
                  </h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Plan</Label>
                      <Select
                        value={draft.plan}
                        onValueChange={(v) => setDraft((d) => d && { ...d, plan: v as TenantPlan })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Starter">Starter</SelectItem>
                          <SelectItem value="Growth">Growth</SelectItem>
                          <SelectItem value="Enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select
                        value={draft.status}
                        onValueChange={(v) =>
                          setDraft((d) => d && { ...d, status: v as TenantStatus })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Trial">Trial</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Past due">Past due</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="d-renewal">Renewal anchor</Label>
                      <Input
                        id="d-renewal"
                        readOnly
                        value={detailTenant.renewalDate}
                        className="font-mono text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Renewal date from subscription reset and billing operations.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="d-users">Seats</Label>
                      <Input
                        id="d-users"
                        inputMode="numeric"
                        value={String(draft.users)}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, users: Number.parseInt(e.target.value, 10) || 0 } : d,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="d-mrr">MRR</Label>
                      <Input
                        id="d-mrr"
                        inputMode="decimal"
                        value={String(draft.mrr)}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, mrr: Number.parseFloat(e.target.value) || 0 } : d,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Module access
                  </h4>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Module flags per tenant — persisted with tenant record and aligned to plan
                    entitlements.
                  </p>
                  <ul className="mt-3 space-y-3">
                    {(
                      [
                        ["hrm", "HRM & payroll"],
                        ["crm", "CRM & pipeline"],
                        ["finance", "Finance & GL"],
                        ["inventory", "Inventory & WMS"],
                        ["manufacturing", "Manufacturing"],
                      ] as const
                    ).map(([key, label]) => (
                      <li key={key} className="flex items-center justify-between gap-3">
                        <span className="text-sm">{label}</span>
                        <Switch
                          checked={draft.modules[key]}
                          onCheckedChange={(checked) =>
                            setDraft((d) =>
                              d ? { ...d, modules: { ...d.modules, [key]: checked } } : d,
                            )
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Usage & caps
                  </h4>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Storage</span>
                      <span className="font-mono">
                        {detailTenant.storageUsedGb.toFixed(1)} / {detailTenant.storageCapGb} GB
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (detailTenant.storageUsedGb / detailTenant.storageCapGb) * 100,
                      )}
                      className="h-1.5"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" /> Usage
                  </h4>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {detailTenant.users} active seats · Last active {detailTenant.lastActiveLabel} ·
                    MRR tracked in subscriptions.
                  </p>
                </div>
              </div>
              <SheetFooter className="mt-8 flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setDetailId(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  disabled={detailSaving}
                  onClick={persistDetail}
                >
                  {detailSaving ? "Saving…" : "Save changes"}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Card className="border-border bg-card">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="text-sm font-semibold">All tenants</div>
            <div className="text-xs text-muted-foreground">
              {filtered.length} of {tenants.length} shown ·{" "}
              <span className="text-emerald-700 dark:text-emerald-400">
                {healthSummary.healthy} healthy
              </span>
              {" · "}
              <span className="text-amber-700 dark:text-amber-400">
                {healthSummary.degraded} degraded
              </span>
              {" · "}
              <span className="text-red-700 dark:text-red-400">
                {healthSummary.critical} critical
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <SortableTh
                  label="Code"
                  column="tenantCode"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Business"
                  column="name"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Workspace"
                  column="workspace"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Plan"
                  column="plan"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <StatusColumnHeader
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Health"
                  column="health"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Created"
                  column="createdAt"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Last active"
                  column="lastActive"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Seats"
                  column="users"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="Storage"
                  column="storage"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <SortableTh
                  label="MRR"
                  column="mrr"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSortColumn}
                />
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] sm:px-5"
                />
              </tr>
            </thead>
            <tbody>
              {sortedTenants.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {tenants.length === 0
                      ? "No tenants yet. New tenants will appear here after signup or Super Admin creation."
                      : "No tenants match your filters."}
                  </td>
                </tr>
              ) : (
                sortedTenants.map((t) => {
                const pct = Math.min(100, (t.storageUsedGb / t.storageCapGb) * 100);
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground sm:px-5">
                      {t.tenantCode}
                    </td>
                    <td className="min-w-[140px] px-4 py-3 font-medium sm:px-5">{t.name}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-muted-foreground sm:max-w-[240px] sm:px-5">
                      {tenantWorkspaceHost(t.slug)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <Badge
                        variant="outline"
                        className={`rounded-md border-border font-normal ${t.plan === "Enterprise" ? "border-foreground bg-foreground text-background" : ""}`}
                      >
                        {t.plan}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <TenantStatusPill status={t.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={cn("h-2 w-2 shrink-0 rounded-full", healthDotClass(t.health))}
                        />
                        <span className="text-muted-foreground">{healthLabel(t.health)}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground sm:px-5">
                      {formatShortDate(t.createdAt)}
                    </td>
                    <td className="max-w-[120px] truncate px-4 py-3 text-xs text-muted-foreground sm:px-5">
                      {t.lastActiveLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">{t.users}</td>
                    <td className="min-w-[100px] px-4 py-3 sm:px-5">
                      <div className="flex flex-col gap-1">
                        <Progress value={pct} className="h-1 max-w-[88px]" />
                        <span className="text-[10px] text-muted-foreground">
                          {t.storageUsedGb.toFixed(0)} / {t.storageCapGb} GB
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-5">
                      {formatCurrency(t.mrr)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label="Row actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onSelect={() => {
                              setDetailId(t.id);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setDetailId(t.id);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit tenant
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => void resetSubscription(t.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Reset subscription
                          </DropdownMenuItem>
                          {t.status === "Suspended" ? (
                            <DropdownMenuItem onSelect={() => void setSuspended(t.id, false)}>
                              <PlayCircle className="mr-2 h-4 w-4" /> Resume tenant
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => void setSuspended(t.id, true)}
                            >
                              <Ban className="mr-2 h-4 w-4" /> Suspend tenant
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && tenants.length > 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tenants match your filters.
          </div>
        ) : null}
      </Card>

      <p className="text-center text-[11px] text-muted-foreground">
        Drag-and-drop dashboard widgets are planned; this list is optimized for mobile horizontal
        scroll and dense ops review.
      </p>
    </div>
  );
}
