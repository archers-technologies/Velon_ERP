import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, ClipboardList, LayoutGrid, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { canApproveProcurement, canManageProcurement, normalizeVelonRole } from '@velon/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  listInventoryStock,
  listInventoryWarehouses,
  type InventoryWarehouse,
} from '@/lib/inventory/api';
import {
  approvePurchaseOrder,
  approvePurchaseRequest,
  createPurchaseOrder,
  createPurchaseRequest,
  listPurchaseOrders,
  listPurchaseRequests,
  listSuppliers,
  receivePurchaseOrder,
  submitPurchaseRequest,
  type PurchaseOrder,
  type PurchaseRequest,
  type Supplier,
} from '@/lib/procurement/api';

export const Route = createFileRoute('/app/procurement')({
  component: ProcurementPage,
});

function statusBadge(status: string) {
  const s = status.toLowerCase().replace(/_/g, ' ');
  return <Badge variant="secondary">{s}</Badge>;
}

function ProcurementPage() {
  const role = normalizeVelonRole(getSessionMembershipRole() ?? 'USER');
  const canManage = canManageProcurement(role);
  const canApprove = canApproveProcurement(role);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('');
  const [busy, setBusy] = useState(false);

  const [requestForm, setRequestForm] = useState({ description: '', quantity: '1', notes: '' });
  const [orderForm, setOrderForm] = useState({
    supplierId: '',
    description: '',
    quantity: '1',
    unitPrice: '0',
  });

  const refresh = useCallback(async () => {
    const [s, r, o, w, inv] = await Promise.all([
      listSuppliers(),
      listPurchaseRequests(),
      listPurchaseOrders(),
      listInventoryWarehouses(),
      listInventoryStock().catch(() => []),
    ]);
    setSuppliers(s);
    setRequests(r);
    setOrders(o);
    setWarehouses(w);
    setReceiveWarehouseId((prev) => prev || w[0]?.id || '');
    setLowStockCount(
      inv.filter((row) => row.stockLevel === 'low' || row.stockLevel === 'critical').length,
    );
  }, []);

  useEffect(() => {
    refresh().catch((e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to load procurement'),
    );
  }, [refresh]);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'PENDING_APPROVAL' || r.status === 'DRAFT'),
    [requests],
  );
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'PENDING_APPROVAL' || o.status === 'DRAFT'),
    [orders],
  );

  async function handleCreateRequest() {
    if (!canManage) return;
    setBusy(true);
    try {
      await createPurchaseRequest({
        notes: requestForm.notes || undefined,
        items: [
          {
            description: requestForm.description.trim(),
            quantity: Number.parseInt(requestForm.quantity, 10) || 1,
          },
        ],
      });
      setRequestForm({ description: '', quantity: '1', notes: '' });
      await refresh();
      toast.success('Purchase request created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create request');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateOrder() {
    if (!canManage) return;
    setBusy(true);
    try {
      await createPurchaseOrder({
        supplierId: orderForm.supplierId,
        items: [
          {
            description: orderForm.description.trim(),
            quantity: Number.parseInt(orderForm.quantity, 10) || 1,
            unitPrice: Number.parseFloat(orderForm.unitPrice) || 0,
          },
        ],
      });
      setOrderForm({ supplierId: '', description: '', quantity: '1', unitPrice: '0' });
      await refresh();
      toast.success('Purchase order created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          Operations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Procurement</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage purchase requests, purchase orders, approvals, and stock requirements.
        </p>
      </div>

      <Tabs
        defaultValue="overview"
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests">
            <ClipboardList className="mr-2 h-4 w-4" />
            Purchase requests
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Package className="mr-2 h-4 w-4" />
            Purchase orders
          </TabsTrigger>
          <TabsTrigger value="approvals">Pending approvals</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card p-4">
              <p className="text-muted-foreground text-xs">Items at/below reorder</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                {lowStockCount}
                {lowStockCount > 0 ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : null}
              </p>
            </Card>
            <Card className="border-border bg-card p-4">
              <p className="text-muted-foreground text-xs">Open purchase requests</p>
              <p className="mt-1 text-2xl font-semibold">{pendingRequests.length}</p>
            </Card>
            <Card className="border-border bg-card p-4">
              <p className="text-muted-foreground text-xs">Open purchase orders</p>
              <p className="mt-1 text-2xl font-semibold">{pendingOrders.length}</p>
            </Card>
            <Card className="border-border bg-card p-4">
              <p className="text-muted-foreground text-xs">Active suppliers</p>
              <p className="mt-1 text-2xl font-semibold">{suppliers.length}</p>
            </Card>
          </div>
          {requests.length === 0 && orders.length === 0 ? (
            <Card className="border-border bg-muted/30 text-muted-foreground p-6 text-sm">
              No procurement requests yet. Create requests from low-stock inventory or add a
              purchase request when your team needs to buy stock. Manage supplier records under{' '}
              <strong className="text-foreground">Suppliers</strong> in the workspace menu.
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent
          value="requests"
          className="space-y-4"
        >
          {canManage && (
            <Card className="border-border bg-card p-4">
              <h2 className="font-medium">New purchase request</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label>Line description</Label>
                  <Input
                    value={requestForm.description}
                    onChange={(e) => setRequestForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    value={requestForm.quantity}
                    onChange={(e) => setRequestForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                className="mt-3"
                size="sm"
                disabled={busy || !requestForm.description.trim()}
                onClick={handleCreateRequest}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create request
              </Button>
            </Card>
          )}
          <RequestsTable
            rows={requests}
            canManage={canManage}
            canApprove={canApprove}
            busy={busy}
            setBusy={setBusy}
            refresh={refresh}
          />
        </TabsContent>

        <TabsContent
          value="orders"
          className="space-y-4"
        >
          {canManage && (
            <Card className="border-border bg-card p-4">
              <h2 className="font-medium">New purchase order</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Supplier</Label>
                  <Select
                    value={orderForm.supplierId}
                    onValueChange={(v) => setOrderForm((f) => ({ ...f, supplierId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                        >
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {suppliers.length === 0 ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Add suppliers in the Suppliers module first.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={orderForm.description}
                    onChange={(e) => setOrderForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Unit price</Label>
                  <Input
                    value={orderForm.unitPrice}
                    onChange={(e) => setOrderForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                className="mt-3"
                size="sm"
                disabled={busy || !orderForm.supplierId || !orderForm.description.trim()}
                onClick={handleCreateOrder}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create PO
              </Button>
            </Card>
          )}
          {canManage && warehouses.length > 0 && (
            <Card className="border-border bg-card p-4">
              <Label>Receive into warehouse</Label>
              <Select
                value={receiveWarehouseId}
                onValueChange={setReceiveWarehouseId}
              >
                <SelectTrigger className="mt-2 max-w-xs">
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem
                      key={w.id}
                      value={w.id}
                    >
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          )}
          <OrdersTable
            rows={orders}
            canManage={canManage}
            canApprove={canApprove}
            busy={busy}
            setBusy={setBusy}
            refresh={refresh}
            receiveWarehouseId={receiveWarehouseId}
          />
        </TabsContent>

        <TabsContent
          value="approvals"
          className="space-y-4"
        >
          <Card className="border-border bg-card p-4">
            <h2 className="font-medium">Requests awaiting approval</h2>
            <RequestsTable
              rows={requests.filter((r) => r.status === 'PENDING_APPROVAL')}
              canManage={canManage}
              canApprove={canApprove}
              busy={busy}
              setBusy={setBusy}
              refresh={refresh}
            />
          </Card>
          <Card className="border-border bg-card p-4">
            <h2 className="font-medium">Orders awaiting approval</h2>
            <OrdersTable
              rows={orders.filter((o) => o.status === 'PENDING_APPROVAL' || o.status === 'DRAFT')}
              canManage={canManage}
              canApprove={canApprove}
              busy={busy}
              setBusy={setBusy}
              refresh={refresh}
              receiveWarehouseId={receiveWarehouseId}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestsTable({
  rows,
  canManage,
  canApprove,
  busy,
  setBusy,
  refresh,
}: {
  rows: PurchaseRequest[];
  canManage: boolean;
  canApprove: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  refresh: () => Promise<void>;
}) {
  return (
    <Card className="border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.requestNumber}</TableCell>
              <TableCell>{statusBadge(r.status)}</TableCell>
              <TableCell>{r.items.length}</TableCell>
              <TableCell className="space-x-2 text-right">
                {canManage && r.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await submitPurchaseRequest(r.id);
                        await refresh();
                        toast.success('Submitted for approval');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Submit failed');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Submit
                  </Button>
                )}
                {canApprove && r.status === 'PENDING_APPROVAL' && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await approvePurchaseRequest(r.id);
                        await refresh();
                        toast.success('Request approved');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Approve failed');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Approve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground text-center"
              >
                No purchase requests
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function OrdersTable({
  rows,
  canManage,
  canApprove,
  busy,
  setBusy,
  refresh,
  receiveWarehouseId,
}: {
  rows: PurchaseOrder[];
  canManage: boolean;
  canApprove: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  refresh: () => Promise<void>;
  receiveWarehouseId: string;
}) {
  return (
    <Card className="border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO #</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs">{o.poNumber}</TableCell>
              <TableCell>{o.supplier.name}</TableCell>
              <TableCell>{statusBadge(o.status)}</TableCell>
              <TableCell>{Number(o.total).toFixed(2)}</TableCell>
              <TableCell className="space-x-2 text-right">
                {canApprove && (o.status === 'DRAFT' || o.status === 'PENDING_APPROVAL') && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await approvePurchaseOrder(o.id);
                        await refresh();
                        toast.success('PO approved');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Approve failed');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Approve
                  </Button>
                )}
                {canManage &&
                  ['SENT', 'APPROVED', 'PARTIALLY_RECEIVED'].includes(o.status) &&
                  o.items.some((i) => i.receivedQty < i.quantity) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !receiveWarehouseId}
                      onClick={async () => {
                        const lines = o.items
                          .filter((i) => i.receivedQty < i.quantity)
                          .map((i) => ({
                            orderItemId: i.id,
                            quantity: i.quantity - i.receivedQty,
                          }));
                        if (!lines.length) return;
                        setBusy(true);
                        try {
                          await receivePurchaseOrder(o.id, {
                            warehouseId: receiveWarehouseId,
                            lines,
                          });
                          await refresh();
                          toast.success('Goods received — stock updated');
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Receive failed');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Receive all
                    </Button>
                  )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground text-center"
              >
                No purchase orders
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
