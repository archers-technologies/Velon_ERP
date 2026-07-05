import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { canManageInventory, normalizeVelonRole } from '@velon/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  createInventoryWarehouse,
  listInventoryWarehouses,
  updateInventoryWarehouse,
  type InventoryWarehouse,
} from '@/lib/inventory/api';

export const Route = createFileRoute('/app/inventory/warehouses')({
  component: InventoryWarehousesPage,
});

function InventoryWarehousesPage() {
  const canManage = canManageInventory(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', location: '' });

  const refresh = useCallback(async () => {
    setWarehouses(await listInventoryWarehouses());
  }, []);

  useEffect(() => {
    refresh().catch((e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to load warehouses'),
    );
  }, [refresh]);

  async function handleSave() {
    if (!canManage || !form.name.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateInventoryWarehouse(editingId, {
          name: form.name.trim(),
          location: form.location.trim() || undefined,
        });
        toast.success('Warehouse updated');
      } else {
        await createInventoryWarehouse({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          location: form.location.trim() || undefined,
        });
        toast.success('Warehouse created');
      }
      setEditingId(null);
      setForm({ name: '', code: '', location: '' });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save warehouse');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(w: InventoryWarehouse) {
    if (!canManage) return;
    setBusy(true);
    try {
      await updateInventoryWarehouse(w.id, { isActive: !w.isActive });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update warehouse');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="border-border bg-card p-4">
          <h2 className="font-medium">{editingId ? 'Edit warehouse' : 'New warehouse'}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Auto if empty"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
          </div>
          <Button
            className="mt-3"
            size="sm"
            disabled={busy || !form.name.trim()}
            onClick={handleSave}
          >
            <Plus className="mr-2 h-4 w-4" />
            {editingId ? 'Save' : 'Create warehouse'}
          </Button>
        </Card>
      )}

      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Active</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono text-xs">{w.code}</TableCell>
                <TableCell>{w.name}</TableCell>
                <TableCell>{w.location ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={w.isActive ? 'secondary' : 'outline'}>
                    {w.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Switch
                      checked={w.isActive}
                      disabled={busy}
                      onCheckedChange={() => toggleActive(w)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {warehouses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="text-muted-foreground text-center"
                >
                  No warehouses yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
