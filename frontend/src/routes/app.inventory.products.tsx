import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Barcode, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { canManageInventory, normalizeVelonRole } from '@velon/shared';
import { BarcodeManagementDialog } from '@/components/inventory/barcode-management-dialog';
import {
  buildVariantsPayload,
  ProductVariantsSection,
  variantsFromProductDetail,
} from '@/components/inventory/product-variants-section';
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
import { ModuleEmptyState } from '@/components/workspace/module-empty-state';
import { MoreOptionsSection } from '@/components/workspace/more-options-section';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  createInventoryProduct,
  getInventoryProduct,
  listInventoryCategories,
  listInventoryProducts,
  listInventoryWarehouses,
  updateInventoryProduct,
  type InventoryCategory,
  type InventoryProduct,
  type InventoryWarehouse,
} from '@/lib/inventory/api';
import type { VariantAttributeDraft, VariantRowDraft } from '@/lib/inventory/variants';

export const Route = createFileRoute('/app/inventory/products')({
  component: InventoryProductsPage,
});

function InventoryProductsPage() {
  const canManage = canManageInventory(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [busy, setBusy] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productMoreOpen, setProductMoreOpen] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantAttributes, setVariantAttributes] = useState<VariantAttributeDraft[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRowDraft[]>([]);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    imageDataUrl: '',
    categoryId: '',
    warehouseId: '',
    quantity: '0',
    unitPrice: '0',
    status: 'ACTIVE',
  });

  const refresh = useCallback(async () => {
    const [p, c, w] = await Promise.all([
      listInventoryProducts(),
      listInventoryCategories(),
      listInventoryWarehouses(),
    ]);
    setProducts(p);
    setCategories(c);
    setWarehouses(w);
  }, []);

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load products'));
  }, [refresh]);

  function resetForm() {
    setEditingId(null);
    setHasVariants(false);
    setVariantAttributes([]);
    setVariantRows([]);
    setForm({
      name: '',
      sku: '',
      barcode: '',
      imageDataUrl: '',
      categoryId: '',
      warehouseId: '',
      quantity: '0',
      unitPrice: '0',
      status: 'ACTIVE',
    });
  }

  async function startEdit(p: InventoryProduct) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? '',
      imageDataUrl: p.imageDataUrl ?? '',
      categoryId: p.categoryId ?? '',
      warehouseId: '',
      quantity: '0',
      unitPrice: String(p.unitPrice),
      status: p.status,
    });
    setHasVariants(p.hasVariants ?? false);
    if (p.hasVariants) {
      try {
        const detail = await getInventoryProduct(p.id);
        const parsed = variantsFromProductDetail(detail);
        setVariantAttributes(parsed.attributes);
        setVariantRows(parsed.variants);
      } catch {
        setVariantAttributes([]);
        setVariantRows([]);
      }
    } else {
      setVariantAttributes([]);
      setVariantRows([]);
    }
  }

  function handleImageFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 512_000) {
      toast.error('Image must be under 512 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageDataUrl: String(reader.result ?? '') }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!canManage || !form.name.trim()) return;
    setBusy(true);
    try {
      const variantsPayload = buildVariantsPayload(
        hasVariants,
        variantAttributes,
        variantRows,
        form.warehouseId,
      );
      const body = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        barcode: hasVariants ? undefined : form.barcode.trim() || undefined,
        imageDataUrl: form.imageDataUrl.trim() || undefined,
        categoryId: form.categoryId || undefined,
        unitPrice: hasVariants ? 0 : Number.parseFloat(form.unitPrice) || 0,
        status: form.status,
        hasVariants,
        variants: variantsPayload,
        site: warehouses.find((w) => w.id === form.warehouseId)?.name,
        quantity: hasVariants ? 0 : Number.parseInt(form.quantity, 10) || 0,
      };
      if (editingId) {
        await updateInventoryProduct(editingId, body);
        toast.success('Product updated');
      } else {
        await createInventoryProduct(body);
        toast.success('Product created');
      }
      resetForm();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save product');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="border-border bg-card p-4">
          <h2 className="font-medium">{editingId ? 'Edit product' : 'New product'}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="What you sell"
              />
            </div>
            <div>
              <Label>Selling price</Label>
              <Input
                value={form.unitPrice}
                disabled={hasVariants}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                placeholder="0"
              />
              {hasVariants ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Price is set per variant when variants are enabled.
                </p>
              ) : null}
            </div>
            {!editingId && !hasVariants && (
              <div>
                <Label>Opening stock</Label>
                <Input
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <MoreOptionsSection
                open={productMoreOpen}
                onOpenChange={setProductMoreOpen}
              >
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <Label>Barcode</Label>
                  <Input
                    value={form.barcode}
                    disabled={hasVariants}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.categoryId || 'none'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, categoryId: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((c) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                        >
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editingId && (
                  <div>
                    <Label>Warehouse</Label>
                    <Select
                      value={form.warehouseId || 'none'}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, warehouseId: v === 'none' ? '' : v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
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
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label>Product image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-1"
                    onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                  />
                  {form.imageDataUrl ? (
                    <img
                      src={form.imageDataUrl}
                      alt="Product preview"
                      className="border-border mt-2 h-16 w-16 rounded-md border object-cover"
                    />
                  ) : null}
                </div>
              </MoreOptionsSection>
            </div>
          </div>
          <ProductVariantsSection
            enabled={hasVariants}
            onEnabledChange={(enabled) => {
              setHasVariants(enabled);
              if (enabled && variantAttributes.length === 0) {
                setVariantAttributes([{ id: crypto.randomUUID(), name: '', values: [''] }]);
              }
            }}
            readOnly={!canManage}
            baseSku={form.sku}
            defaultPrice={form.unitPrice}
            warehouseId={form.warehouseId}
            attributes={variantAttributes}
            onAttributesChange={setVariantAttributes}
            variants={variantRows}
            onVariantsChange={setVariantRows}
          />
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              disabled={busy || !form.name.trim()}
              onClick={handleSave}
            >
              <Plus className="mr-2 h-4 w-4" />
              {editingId ? 'Save changes' : 'Create product'}
            </Button>
            {editingId && (
              <Button
                size="sm"
                variant="outline"
                onClick={resetForm}
              >
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Product listing</h2>
        {canManage && products.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBarcodeOpen(true)}
          >
            <Barcode className="mr-2 h-4 w-4" />
            Barcode management
          </Button>
        ) : null}
      </div>

      <Card className="border-border bg-card hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  {p.hasVariants ? (
                    <Badge variant="outline">{p.variantCount ?? 0} variants</Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{p.category?.name ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{p.barcode ?? '—'}</TableCell>
                <TableCell>
                  {p.imageDataUrl ? (
                    <img
                      src={p.imageDataUrl}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.status}</Badge>
                </TableCell>
                <TableCell>{Number(p.unitPrice).toFixed(2)}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 9 : 8}
                  className="p-0"
                >
                  <ModuleEmptyState
                    icon={Package}
                    title="No products yet"
                    description="Add what you sell above — then use them in invoices and quotes."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="space-y-3 md:hidden">
        {products.map((p) => (
          <Card
            key={p.id}
            className="border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs">{p.sku}</p>
              </div>
              <Badge variant="secondary">{p.status}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {p.hasVariants
                  ? `${p.variantCount ?? 0} variants`
                  : (p.category?.name ?? 'No category')}
              </span>
              <span className="font-semibold tabular-nums">{Number(p.unitPrice).toFixed(2)}</span>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => startEdit(p)}
              >
                Edit
              </Button>
            )}
          </Card>
        ))}
        {products.length === 0 && (
          <ModuleEmptyState
            icon={Package}
            title="No products yet"
            description="Add what you sell above — then use them in invoices and quotes."
          />
        )}
      </div>

      <BarcodeManagementDialog
        open={barcodeOpen}
        onOpenChange={setBarcodeOpen}
        products={products}
        onSaveBarcode={async (productId, barcode) => {
          await updateInventoryProduct(productId, { barcode });
          await refresh();
        }}
      />
    </div>
  );
}
