import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { createInventoryItem, updateInventoryItem } from "@/lib/workspace/mutations";
import { loadInventory } from "@/lib/workspace/loaders";
import type { InventoryRecord } from "@/lib/types/workspace-ui";
import { useWorkspaceCurrency } from "@/contexts/workspace-currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Plus,
  ScanBarcode,
  RefreshCw,
  MapPin,
  TrendingDown,
  Layers,
  ListFilter,
  Pencil,
} from "lucide-react";

type InventoryListSort =
  | "name_asc"
  | "order_value_desc"
  | "order_value_asc"
  | "price_asc"
  | "price_desc";

function extensionValue(item: InventoryRecord): number {
  return item.quantity * item.unitPrice;
}

function sortInventoryRows(rows: InventoryRecord[], sort: InventoryListSort): InventoryRecord[] {
  const arr = [...rows];
  switch (sort) {
    case "name_asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "order_value_desc":
      return arr.sort((a, b) => extensionValue(b) - extensionValue(a));
    case "order_value_asc":
      return arr.sort((a, b) => extensionValue(a) - extensionValue(b));
    case "price_asc":
      return arr.sort((a, b) => a.unitPrice - b.unitPrice);
    case "price_desc":
      return arr.sort((a, b) => b.unitPrice - a.unitPrice);
    default:
      return arr;
  }
}

function stockBadgeClass(level: InventoryRecord["stockLevel"]) {
  switch (level) {
    case "healthy":
      return "border-success/30 bg-success/10 text-success";
    case "low":
      return "border-warning/40 bg-warning/15 text-warning-foreground";
    case "critical":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-border";
  }
}

function abcBadgeClass(tier: InventoryRecord["abcClass"]) {
  if (tier === "A") return "border-foreground bg-foreground text-background";
  if (tier === "B") return "border-border bg-muted/50";
  return "border-border text-muted-foreground";
}

/** Heuristic suggested replenishment units based on reorder levels. */
function suggestedReorderUnits(item: InventoryRecord): number {
  const target = item.reorderPoint + item.safetyStock;
  return Math.max(0, target - item.quantity);
}

function needsReplenishment(item: InventoryRecord): boolean {
  return item.quantity <= item.reorderPoint;
}

export const Route = createFileRoute("/app/inventory/")({
  loader: () => loadInventory(),
  component: InventoryPage,
});

function InventoryPage() {
  const router = useRouter();
  const { formatCurrency } = useWorkspaceCurrency();
  const items = Route.useLoaderData();
  const [listSort, setListSort] = useState<InventoryListSort>("name_asc");

  const sortedItems = useMemo(() => sortInventoryRows(items, listSort), [items, listSort]);

  const stats = useMemo(() => {
    const totalSkus = items.length;
    const belowReorder = items.filter(needsReplenishment).length;
    const critical = items.filter((i) => i.stockLevel === "critical").length;
    const locations = new Set(items.map((i) => i.site)).size;
    return { totalSkus, belowReorder, critical, locations };
  }, [items]);

  const bySite = useMemo(() => {
    const m = new Map<string, { skus: number; units: number }>();
    for (const i of items) {
      const cur = m.get(i.site) ?? { skus: 0, units: 0 };
      m.set(i.site, { skus: cur.skus + 1, units: cur.units + i.quantity });
    }
    return [...m.entries()].map(([site, v]) => ({ site, ...v }));
  }, [items]);

  const abcCounts = useMemo(() => {
    return {
      A: items.filter((i) => i.abcClass === "A").length,
      B: items.filter((i) => i.abcClass === "B").length,
      C: items.filter((i) => i.abcClass === "C").length,
    };
  }, [items]);

  const abcTotal = abcCounts.A + abcCounts.B + abcCounts.C || 1;
  const slowMovers = useMemo(() => sortedItems.filter((i) => i.velocity === "slow"), [sortedItems]);

  const reorderQueue = useMemo(
    () =>
      [...items]
        .filter(needsReplenishment)
        .sort((a, b) => suggestedReorderUnits(b) - suggestedReorderUnits(a)),
    [items],
  );

  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [sku, setSku] = useState("");
  const [safetyStock, setSafetyStock] = useState("5");
  const [reorderPoint, setReorderPoint] = useState("15");
  const [unitPrice, setUnitPrice] = useState("24");
  const [abcClass, setAbcClass] = useState<InventoryRecord["abcClass"]>("B");
  const [velocity, setVelocity] = useState<InventoryRecord["velocity"]>("medium");
  const [batchTracked, setBatchTracked] = useState(false);
  const [variantParent, setVariantParent] = useState("");

  function resetInventoryForm() {
    setEditingItem(null);
    setName("");
    setSite("");
    setQuantity("0");
    setSku("");
    setSafetyStock("5");
    setReorderPoint("15");
    setUnitPrice("24");
    setAbcClass("B");
    setVelocity("medium");
    setBatchTracked(false);
    setVariantParent("");
  }

  function openAddDialog() {
    resetInventoryForm();
    setOpen(true);
  }

  function openEditDialog(item: InventoryRecord) {
    setEditingItem(item);
    setName(item.name);
    setSite(item.site);
    setQuantity(String(item.quantity));
    setSku(item.sku);
    setSafetyStock(String(item.safetyStock));
    setReorderPoint(String(item.reorderPoint));
    setUnitPrice(String(item.unitPrice));
    setAbcClass(item.abcClass);
    setVelocity(item.velocity);
    setBatchTracked(item.batchTracked);
    setVariantParent(item.variantParent ?? "");
    setOpen(true);
  }

  async function handleSaveInventory() {
    setSubmitting(true);
    try {
      const ss = Number.parseInt(safetyStock, 10);
      const rp = Number.parseInt(reorderPoint, 10);
      const price = Number.parseFloat(unitPrice);
      const data = {
        name: name.trim(),
        site: site.trim(),
        quantity: Number.parseInt(quantity, 10) || 0,
        sku: sku.trim() || undefined,
        safetyStock: Number.isFinite(ss) ? ss : undefined,
        reorderPoint: Number.isFinite(rp) ? rp : undefined,
        abcClass,
        velocity,
        batchTracked,
        variantParent: variantParent.trim() || undefined,
        unitPrice: Number.isFinite(price) ? price : undefined,
      };

      if (editingItem) {
        await updateInventoryItem(editingItem.id, data);
        toast.success("SKU updated");
      } else {
        await createInventoryItem(data);
        toast.success("SKU added — stock status derived from safety & reorder levels");
      }
      setOpen(false);
      resetInventoryForm();
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="desk" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9 w-fit">
            <TabsTrigger value="desk">Stock desk</TabsTrigger>
            <TabsTrigger value="optimize">Optimization & accuracy</TabsTrigger>
          </TabsList>
          <p className="max-w-xl text-xs text-muted-foreground sm:text-right">
            Live balances across locations · Reorder when on-hand hits policy thresholds ·
            Scan-ready SKUs · ABC tiers for where to focus counts and capital.
          </p>
        </div>

        <TabsContent value="desk" className="mt-0 space-y-6 outline-none">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total SKUs",
                value: stats.totalSkus.toLocaleString(),
                hint: "Active items",
              },
              {
                label: "Below reorder",
                value: String(stats.belowReorder),
                hint: "Auto PO candidates",
              },
              {
                label: "Critical SKUs",
                value: String(stats.critical),
                hint: "At or under safety stock",
              },
              { label: "Locations", value: String(stats.locations), hint: "Warehouses on file" },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-border bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">{kpi.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</div>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border bg-card p-5 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Multi-location snapshot
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-[10px] uppercase tracking-wider">Site</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">SKUs</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">
                        Units on hand
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bySite.map((row) => (
                      <TableRow key={row.site}>
                        <TableCell className="font-medium">{row.site}</TableCell>
                        <TableCell>{row.skus}</TableCell>
                        <TableCell>{row.units.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Replenishment queue
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                When on-hand crosses reorder, Velon drafts purchase suggestions from live stock
                below).
              </p>
              {reorderQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All SKUs above reorder — no drafts pending.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {reorderQueue.map((item) => (
                    <li key={item.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.sku}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span>
                          Suggested PO qty:{" "}
                          <span className="font-semibold text-foreground">
                            {suggestedReorderUnits(item)}
                          </span>
                        </span>
                        <Badge variant="outline" className={stockBadgeClass(item.stockLevel)}>
                          {item.stockLevel}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) resetInventoryForm();
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit SKU" : "Add SKU"}</DialogTitle>
                <DialogDescription>
                  Set safety stock and reorder point — status (healthy / low / critical) is computed
                  automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name">Product name</Label>
                  <Input
                    id="inv-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Oat Milk Carton"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-sku">SKU (optional)</Label>
                    <Input
                      id="inv-sku"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Auto if empty"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-site">Warehouse</Label>
                    <Input
                      id="inv-site"
                      value={site}
                      onChange={(e) => setSite(e.target.value)}
                      placeholder="Warehouse B"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-variant">Variant group (optional)</Label>
                  <Input
                    id="inv-variant"
                    value={variantParent}
                    onChange={(e) => setVariantParent(e.target.value)}
                    placeholder="Parent product line"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-qty">On hand</Label>
                    <Input
                      id="inv-qty"
                      inputMode="numeric"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-safety">Safety stock</Label>
                    <Input
                      id="inv-safety"
                      inputMode="numeric"
                      value={safetyStock}
                      onChange={(e) => setSafetyStock(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-price">Unit price</Label>
                  <Input
                    id="inv-price"
                    inputMode="decimal"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-reorder">Reorder point</Label>
                    <Input
                      id="inv-reorder"
                      inputMode="numeric"
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ABC class</Label>
                    <Select
                      value={abcClass}
                      onValueChange={(v) => setAbcClass(v as InventoryRecord["abcClass"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A — high value</SelectItem>
                        <SelectItem value="B">B — medium</SelectItem>
                        <SelectItem value="C">C — long tail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Velocity</Label>
                  <Select
                    value={velocity}
                    onValueChange={(v) => setVelocity(v as InventoryRecord["velocity"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="slow">Slow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={batchTracked}
                    onCheckedChange={(c) => setBatchTracked(c === true)}
                  />
                  Batch / lot traceability (receiving and expiry by batch)
                </label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={submitting || !name.trim() || !site.trim()}
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={handleSaveInventory}
                >
                  {submitting ? "Saving…" : editingItem ? "Update SKU" : "Save SKU"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="border-border bg-card p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold">Inventory list</h2>
                <p className="text-xs text-muted-foreground">
                  Table for ops · Cards on small screens
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <Select
                    value={listSort}
                    onValueChange={(v) => setListSort(v as InventoryListSort)}
                  >
                    <SelectTrigger className="h-9 w-[200px] rounded-lg text-xs">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                      <SelectItem value="order_value_desc">Order value (high → low)</SelectItem>
                      <SelectItem value="order_value_asc">Order value (low → high)</SelectItem>
                      <SelectItem value="price_asc">Unit price (low → high)</SelectItem>
                      <SelectItem value="price_desc">Unit price (high → low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={openAddDialog}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add product
                </Button>
              </div>
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[100px] text-[10px] uppercase tracking-wider">
                      SKU
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Product</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Location</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider">
                      On hand
                    </TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider">
                      Safety
                    </TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider">
                      Reorder
                    </TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider">
                      Unit price
                    </TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider">
                      Ext. value
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">ABC</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Scan</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        {item.variantParent ? (
                          <div className="text-[11px] text-muted-foreground">
                            {item.variantParent}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.site}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.safetyStock}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.reorderPoint}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">
                        {formatCurrency(extensionValue(item))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal ${abcBadgeClass(item.abcClass)}`}
                        >
                          {item.abcClass}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.batchTracked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <ScanBarcode className="h-3.5 w-3.5" /> Lot
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${stockBadgeClass(item.stockLevel)}`}
                        >
                          {item.stockLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-xs"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 p-5 md:hidden">
              {sortedItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${stockBadgeClass(item.stockLevel)}`}
                    >
                      {item.stockLevel}
                    </Badge>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">{item.sku}</div>
                  <div className="mt-1 font-medium">{item.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.site}</div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {formatCurrency(item.unitPrice)} each · ext.{" "}
                    {formatCurrency(extensionValue(item))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">On hand</div>
                      <div className="text-2xl font-semibold tabular-nums">{item.quantity}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Safety {item.safetyStock} · Reorder {item.reorderPoint}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8 rounded-lg text-xs"
                    onClick={() => openEditDialog(item)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit item
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="optimize" className="mt-0 space-y-6 outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-muted-foreground" />
                ABC analysis
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Prioritize cycle counts and purchasing focus on A SKUs (roughly the 80/20 of value
                motion in this workspace).
              </p>
              <div className="space-y-3">
                {(["A", "B", "C"] as const).map((tier) => {
                  const n = abcCounts[tier];
                  const pct = Math.round((n / abcTotal) * 100);
                  return (
                    <div key={tier}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-muted-foreground">Class {tier}</span>
                        <span className="font-semibold">
                          {n} SKU{n === 1 ? "" : "s"} · {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Cycle counting plan
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Rotate small slices of stock on a cadence instead of one annual wall-to-wall count —
                less disruption, tighter trust in the ledger.
              </p>
              <ul className="space-y-3 text-sm">
                {bySite.map((loc, i) => (
                  <li
                    key={loc.site}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span className="font-medium">{loc.site}</span>
                    <span className="text-xs text-muted-foreground">
                      Slot {i + 1} · {loc.skus} SKUs · est. 25 min
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Slow-moving and excess risk
            </div>
            {slowMovers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No slow movers flagged in this catalog slice.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Velocity</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowMovers.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {item.velocity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
