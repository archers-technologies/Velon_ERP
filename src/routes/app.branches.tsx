import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { loadBranchesWorkspace } from "@/lib/workspace/loaders";
import {
  createInventoryWarehouse,
  updateInventoryWarehouse,
} from "@/lib/api/inventory";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { canManageInventory, normalizeVelonRole } from "@velon/shared";
import type { BranchOperationalTask } from "@/lib/types/workspace-ui";
import { useDismissiblePanel } from "@/hooks/use-dismissible-panel";
import { useWorkspaceCurrency } from "@/contexts/workspace-currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  Building2,
  ScanBarcode,
  PackagePlus,
  Smartphone,
  AlertTriangle,
  ArrowUpRight,
  Truck,
  Receipt,
  FileStack,
  ListFilter,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/app/branches")({
  loader: () => loadBranchesWorkspace(),
  component: BranchesPage,
});

type RoleLens = "store_ops" | "area_manager";

type BranchForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  isActive: boolean;
};

function statusStyles(status: "healthy" | "watch" | "critical"): string {
  if (status === "healthy") return "border-success/35 bg-success/10 text-success";
  if (status === "critical") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-warning/45 bg-warning/15 text-warning-foreground";
}

function stockLevelClass(level: string): string {
  if (level === "critical") return "text-destructive";
  if (level === "low") return "text-warning-foreground";
  return "text-muted-foreground";
}

type BranchListSort =
  | "name_asc"
  | "order_value_desc"
  | "order_value_asc"
  | "price_asc"
  | "price_desc";

function branchOrderValue(b: { kind: string; salesMtd: number }): number {
  return b.kind === "store" ? b.salesMtd : 0;
}

function branchAvgUnitPrice(b: { lines: { quantity: number; unitPrice: number }[] }): number {
  if (b.lines.length === 0) return 0;
  const units = b.lines.reduce((s, l) => s + l.quantity, 0);
  if (units <= 0) return 0;
  return b.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) / units;
}

function sortBranches<
  T extends {
    name: string;
    kind: string;
    salesMtd: number;
    lines: { quantity: number; unitPrice: number }[];
  },
>(rows: T[], sort: BranchListSort): T[] {
  const arr = [...rows];
  switch (sort) {
    case "name_asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "order_value_desc":
      return arr.sort((a, b) => branchOrderValue(b) - branchOrderValue(a));
    case "order_value_asc":
      return arr.sort((a, b) => branchOrderValue(a) - branchOrderValue(b));
    case "price_asc":
      return arr.sort((a, b) => branchAvgUnitPrice(a) - branchAvgUnitPrice(b));
    case "price_desc":
      return arr.sort((a, b) => branchAvgUnitPrice(b) - branchAvgUnitPrice(a));
    default:
      return arr;
  }
}

function sortBranchSkuLines<L extends { name: string; quantity: number; unitPrice: number }>(
  lines: L[],
  sort: BranchListSort,
): L[] {
  const arr = [...lines];
  const ext = (l: L) => l.quantity * l.unitPrice;
  switch (sort) {
    case "name_asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "order_value_desc":
      return arr.sort((a, b) => ext(b) - ext(a));
    case "order_value_asc":
      return arr.sort((a, b) => ext(a) - ext(b));
    case "price_asc":
      return arr.sort((a, b) => a.unitPrice - b.unitPrice);
    case "price_desc":
      return arr.sort((a, b) => b.unitPrice - a.unitPrice);
    default:
      return arr;
  }
}

const emptyBranchForm = (): BranchForm => ({
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  manager: "",
  isActive: true,
});

function BranchesPage() {
  const router = useRouter();
  const { formatCurrency } = useWorkspaceCurrency();
  const data = Route.useLoaderData();
  const canManage = canManageInventory(normalizeVelonRole(getSessionMembershipRole() ?? "USER"));
  const [roleLens, setRoleLens] = React.useState<RoleLens>("area_manager");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [branchListSort, setBranchListSort] = React.useState<BranchListSort>("name_asc");
  const [branchLineSort, setBranchLineSort] = React.useState<BranchListSort>("name_asc");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [branchForm, setBranchForm] = React.useState<BranchForm>(emptyBranchForm);
  const [branchBusy, setBranchBusy] = React.useState(false);
  const alertsDismiss = useDismissiblePanel("velon-dismiss:app:branches:alerts");

  const visibleBranches = React.useMemo(() => {
    if (roleLens === "store_ops") return data.branches.filter((b) => b.isActive !== false);
    return data.branches;
  }, [data.branches, roleLens]);

  const sortedVisibleBranches = React.useMemo(
    () => sortBranches(visibleBranches, branchListSort),
    [visibleBranches, branchListSort],
  );

  const visibleTasks = React.useMemo(() => {
    const ids = new Set(visibleBranches.map((b) => b.id));
    return data.tasks.filter((t) => ids.has(t.branchId));
  }, [data.tasks, visibleBranches]);

  const selected = visibleBranches.find((b) => b.id === selectedId) ?? null;

  const sortedBranchLines = React.useMemo(
    () => (selected?.lines ? sortBranchSkuLines(selected.lines, branchLineSort) : []),
    [selected, branchLineSort],
  );

  React.useEffect(() => {
    setBranchLineSort("name_asc");
  }, [selectedId]);

  function openCreateBranch() {
    setEditId(null);
    setBranchForm(emptyBranchForm());
    setCreateOpen(true);
  }

  function openEditBranch(branch: (typeof data.branches)[number]) {
    setEditId(branch.id);
    setBranchForm({
      name: branch.name,
      code: branch.code ?? "",
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
      manager: branch.manager ?? "",
      isActive: branch.isActive !== false,
    });
    setCreateOpen(true);
  }

  async function saveBranch() {
    if (!canManage || !branchForm.name.trim()) return;
    setBranchBusy(true);
    try {
      const body = {
        name: branchForm.name.trim(),
        code: branchForm.code.trim() || undefined,
        location: branchForm.address.trim() || undefined,
        phone: branchForm.phone.trim() || undefined,
        email: branchForm.email.trim() || undefined,
        managerName: branchForm.manager.trim() || undefined,
        isActive: branchForm.isActive,
      };
      if (editId) {
        await updateInventoryWarehouse(editId, body);
        toast.success("Branch updated");
      } else {
        await createInventoryWarehouse(body);
        toast.success("Branch created");
      }
      setCreateOpen(false);
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save branch");
    } finally {
      setBranchBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-9 items-center rounded-lg border border-border bg-muted/40 p-1">
          <Button
            type="button"
            variant={roleLens === "store_ops" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3"
            onClick={() => setRoleLens("store_ops")}
          >
            <Store className="mr-1.5 h-3.5 w-3.5" />
            Store ops
          </Button>
          <Button
            type="button"
            variant={roleLens === "area_manager" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3"
            onClick={() => setRoleLens("area_manager")}
          >
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Area view
          </Button>
        </div>
        <p className="max-w-xl text-xs text-muted-foreground">
          {roleLens === "store_ops"
            ? "Receive, pick, and adjust with barcode-first flows — minimal chrome for floor tablets."
            : "Compare locations, stock health, and POS-linked sales on one surface."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Network MTD sales",
            value: formatCurrency(data.kpis.networkMtdSales),
            hint: "POS revenue attributed network-wide (MTD)",
          },
          {
            label: "POS sales today",
            value: formatCurrency(data.kpis.posLinkedSalesToday),
            hint: "Live decrement path to Inventory",
          },
          {
            label: "Open operational tasks",
            value: String(roleLens === "area_manager" ? data.kpis.openTasks : visibleTasks.length),
            hint: "GRNs, picks, PRs, expenses",
          },
          {
            label: "Low / critical SKUs",
            value: String(data.kpis.lowStockSkusNetwork),
            hint: "Across store locations",
          },
          {
            label: "Locations in watch",
            value: String(data.kpis.storesInWatch),
            hint: "Needs attention today",
          },
        ].map((k) => (
          <Card key={k.label} className="border-border bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {k.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{k.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{k.hint}</div>
          </Card>
        ))}
      </div>

      {data.alerts.length > 0 && !alertsDismiss.dismissed ? (
        <Card className="border-warning/30 bg-warning/10 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              Operational signals
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

      <Card className="border-border bg-muted/20 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Quick actions</span>
          <Badge variant="outline" className="text-[10px] font-normal">
            Pin favorites in production
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="rounded-lg bg-foreground text-background hover:bg-foreground/90" asChild>
            <Link to="/app/inventory">
              <ScanBarcode className="mr-1.5 h-3.5 w-3.5" />
              Receive item
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg" asChild>
            <Link to="/app/inventory">
              <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
              Stock adjustment
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg" asChild>
            <Link to="/app/suppliers">
              <Truck className="mr-1.5 h-3.5 w-3.5" />
              New PO
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg" asChild>
            <Link to="/app/billing-pos">
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              POS checkout
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg" asChild>
            <Link to="/app/inventory">
              Live stock
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg" asChild>
            <Link to="/app/documents">
              <FileStack className="mr-1.5 h-3.5 w-3.5" />
              Documents
            </Link>
          </Button>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          Responsive layout: primary actions stay thumb-reachable on phones; scanner hardware binds
          to the same receive flow.
        </div>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Locations</h2>
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <Button size="sm" className="rounded-lg" onClick={openCreateBranch}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create branch
              </Button>
            ) : null}
            <span className="text-xs text-muted-foreground max-sm:hidden">
              Tap a card for SKU-level stock and tasks
            </span>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Select
                value={branchListSort}
                onValueChange={(v) => setBranchListSort(v as BranchListSort)}
              >
                <SelectTrigger className="h-9 w-[200px] rounded-lg text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                  <SelectItem value="order_value_desc">Order value · MTD (high → low)</SelectItem>
                  <SelectItem value="order_value_asc">Order value · MTD (low → high)</SelectItem>
                  <SelectItem value="price_asc">Avg unit price (low → high)</SelectItem>
                  <SelectItem value="price_desc">Avg unit price (high → low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sortedVisibleBranches.map((branch) => {
            const healthScore =
              branch.skusTracked === 0
                ? 100
                : Math.round(
                    ((branch.skusTracked - branch.lowStockSkus - branch.criticalSkus * 2) /
                      branch.skusTracked) *
                      100,
                  );
            const clamped = Math.max(0, Math.min(100, healthScore));
            return (
              <button
                key={branch.id}
                type="button"
                className="text-left"
                onClick={() => setSelectedId(branch.id)}
              >
                <Card className="h-full border-border bg-card p-5 transition-colors hover:border-foreground/25 hover:bg-muted/10">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{branch.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {branch.code ? `${branch.code} · ` : ""}Retail / warehouse
                        {branch.isActive === false ? " · Inactive" : ""}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${statusStyles(branch.operationalStatus)}`}
                    >
                      {branch.operationalStatus}
                    </Badge>
                  </div>
                  <div className="mt-4 text-2xl font-semibold tabular-nums">
                    {formatCurrency(branch.salesMtd)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">MTD sales (branch)</div>
                  <div className="mt-4 flex justify-between text-[11px] text-muted-foreground">
                    <span>Stock health</span>
                    <span className="font-medium text-foreground">{clamped}%</span>
                  </div>
                  <Progress value={clamped} className="mt-1.5 h-1.5" />
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span>{branch.skusTracked} SKUs</span>
                    <span>·</span>
                    <span>{branch.batchTrackedSkus} batch-tracked</span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Pending tasks · approvals</h3>
          <Badge variant="outline" className="text-[10px] font-normal">
            Curated for this lens
          </Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {visibleTasks.map((t) => {
            const b = data.branches.find((x) => x.id === t.branchId);
            return (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/15 px-3 py-2.5 text-sm"
              >
                <div>
                  <div className="font-medium leading-snug">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">{b?.name ?? "Location"}</div>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] capitalize ${t.priority === "high" ? "border-destructive/30 text-destructive" : ""}`}
                >
                  {t.kind.replaceAll("_", " ")}
                </Badge>
              </div>
            );
          })}
        </div>
        {visibleTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks in this view.</p>
        ) : null}
      </Card>

      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  Sites: {selected.inventorySites.join(", ") || "—"} · real-time inventory slice
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 px-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`capitalize ${statusStyles(selected.operationalStatus)}`}
                  >
                    {selected.operationalStatus}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {selected.batchTrackedSkus} lot / serial SKUs
                  </Badge>
                  {canManage ? (
                    <Button size="sm" variant="outline" onClick={() => openEditBranch(selected)}>
                      Edit branch
                    </Button>
                  ) : null}
                </div>

                {(selected.address || selected.phone || selected.email || selected.manager) && (
                  <div className="rounded-lg border border-border bg-muted/15 p-3 text-xs text-muted-foreground">
                    {selected.address ? <div>{selected.address}</div> : null}
                    {selected.phone ? <div>Tel: {selected.phone}</div> : null}
                    {selected.email ? <div>{selected.email}</div> : null}
                    {selected.manager ? <div>Manager: {selected.manager}</div> : null}
                  </div>
                )}

                <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          SKU availability
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Barcode scan on receive ties to these rows — auto-reorder suggestions fire
                          when quantity ≤ reorder point.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ListFilter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <Select
                          value={branchLineSort}
                          onValueChange={(v) => setBranchLineSort(v as BranchListSort)}
                        >
                          <SelectTrigger className="h-8 w-[180px] rounded-lg text-[11px]">
                            <SelectValue placeholder="Sort" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                            <SelectItem value="order_value_desc">
                              Ext. value (high → low)
                            </SelectItem>
                            <SelectItem value="order_value_asc">Ext. value (low → high)</SelectItem>
                            <SelectItem value="price_asc">Unit price (low → high)</SelectItem>
                            <SelectItem value="price_desc">Unit price (high → low)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="text-[10px] uppercase">SKU</TableHead>
                            <TableHead className="text-[10px] uppercase">Item</TableHead>
                            <TableHead className="text-[10px] uppercase text-right">Qty</TableHead>
                            <TableHead className="text-[10px] uppercase text-right">Unit</TableHead>
                            <TableHead className="text-[10px] uppercase text-right">Ext.</TableHead>
                            <TableHead className="text-[10px] uppercase">Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.lines.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                                No inventory rows mapped to this branch yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            sortedBranchLines.map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                                <TableCell className="max-w-[160px] text-xs">{line.name}</TableCell>
                                <TableCell className="text-right text-xs font-semibold tabular-nums">
                                  {line.quantity}
                                </TableCell>
                                <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                  {formatCurrency(line.unitPrice)}
                                </TableCell>
                                <TableCell className="text-right text-xs font-medium tabular-nums">
                                  {formatCurrency(line.quantity * line.unitPrice)}
                                </TableCell>
                                <TableCell
                                  className={`text-xs capitalize ${stockLevelClass(line.stockLevel)}`}
                                >
                                  {line.stockLevel}
                                  {line.batchTracked ? " · batch" : ""}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                </>

                <Separator />

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Tasks here
                  </div>
                  <ul className="space-y-2 text-sm">
                    {data.tasks
                      .filter((t) => t.branchId === selected.id)
                      .map((t) => (
                        <li
                          key={t.id}
                          className="rounded-lg border border-border bg-background px-3 py-2"
                        >
                          {t.title}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit branch" : "Create branch"}</DialogTitle>
            <DialogDescription>
              Branches are tenant-scoped locations backed by your workspace warehouse records.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Branch name</Label>
              <Input
                value={branchForm.name}
                onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Branch code</Label>
              <Input
                value={branchForm.code}
                onChange={(e) => setBranchForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Auto if empty"
              />
            </div>
            <div>
              <Label>Manager</Label>
              <Input
                value={branchForm.manager}
                onChange={(e) => setBranchForm((f) => ({ ...f, manager: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={branchForm.address}
                onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={branchForm.phone}
                onChange={(e) => setBranchForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={branchForm.email}
                onChange={(e) => setBranchForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={branchForm.isActive}
                onCheckedChange={(v) => setBranchForm((f) => ({ ...f, isActive: v }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={branchBusy || !branchForm.name.trim()} onClick={saveBranch}>
              {editId ? "Save changes" : "Create branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
