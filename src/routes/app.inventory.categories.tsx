import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createInventoryCategory,
  deleteInventoryCategory,
  listInventoryCategories,
  updateInventoryCategory,
  type InventoryCategory,
} from "@/lib/api/inventory";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { canManageInventory, normalizeVelonRole } from "@velon/shared";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/inventory/categories")({
  component: InventoryCategoriesPage,
});

function InventoryCategoriesPage() {
  const canManage = canManageInventory(normalizeVelonRole(getSessionMembershipRole() ?? "USER"));
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = useCallback(async () => {
    setCategories(await listInventoryCategories());
  }, []);

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load categories"));
  }, [refresh]);

  async function handleSave() {
    if (!canManage || !name.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateInventoryCategory(editingId, { name: name.trim(), description: description.trim() || undefined });
        toast.success("Category updated");
      } else {
        await createInventoryCategory({ name: name.trim(), description: description.trim() || undefined });
        toast.success("Category created");
      }
      setEditingId(null);
      setName("");
      setDescription("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save category");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!canManage) return;
    setBusy(true);
    try {
      await deleteInventoryCategory(id);
      toast.success("Category deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="border-border bg-card p-4">
          <h2 className="font-medium">{editingId ? "Edit category" : "New category"}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <Button className="mt-3" size="sm" disabled={busy || !name.trim()} onClick={handleSave}>
            <Plus className="mr-2 h-4 w-4" />
            {editingId ? "Save" : "Create category"}
          </Button>
        </Card>
      )}

      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.description ?? "—"}</TableCell>
                {canManage && (
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(c.id);
                        setName(c.name);
                        setDescription(c.description ?? "");
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 3 : 2} className="text-center text-muted-foreground">
                  No categories yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
