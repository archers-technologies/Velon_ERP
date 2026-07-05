import { useMemo, useState } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  ProductVariantAttributeInput,
  ProductVariantInput,
  ProductVariantsPayload,
} from '@/lib/inventory/api';
import {
  generateVariantsFromAttributes,
  type VariantAttributeDraft,
  type VariantRowDraft,
} from '@/lib/inventory/variants';

type ProductVariantsSectionProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  readOnly?: boolean;
  baseSku: string;
  defaultPrice: string;
  warehouseId: string;
  attributes: VariantAttributeDraft[];
  onAttributesChange: (attributes: VariantAttributeDraft[]) => void;
  variants: VariantRowDraft[];
  onVariantsChange: (variants: VariantRowDraft[]) => void;
};

function newAttribute(): VariantAttributeDraft {
  return { id: crypto.randomUUID(), name: '', values: [''] };
}

export function ProductVariantsSection({
  enabled,
  onEnabledChange,
  readOnly = false,
  baseSku,
  defaultPrice,
  warehouseId,
  attributes,
  onAttributesChange,
  variants,
  onVariantsChange,
}: ProductVariantsSectionProps) {
  const [valuesText, setValuesText] = useState<Record<string, string>>({});

  const canEdit = !readOnly;

  function updateAttribute(id: string, patch: Partial<VariantAttributeDraft>) {
    onAttributesChange(attributes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function addAttribute() {
    onAttributesChange([...attributes, newAttribute()]);
  }

  function removeAttribute(id: string) {
    onAttributesChange(attributes.filter((a) => a.id !== id));
  }

  function syncValuesFromText(attr: VariantAttributeDraft) {
    const raw = valuesText[attr.id] ?? attr.values.join(', ');
    const values = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    updateAttribute(attr.id, { values: values.length ? values : [''] });
  }

  function generateVariants() {
    const generated = generateVariantsFromAttributes(attributes, baseSku, defaultPrice);
    onVariantsChange(generated);
  }

  function updateVariant(id: string, patch: Partial<VariantRowDraft>) {
    onVariantsChange(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function removeVariant(id: string) {
    onVariantsChange(variants.filter((v) => v.id !== id));
  }

  const attributeSummary = useMemo(
    () =>
      attributes
        .filter((a) => a.name.trim() && a.values.some((v) => v.trim()))
        .map((a) => `${a.name}: ${a.values.filter((v) => v.trim()).join(', ')}`)
        .join(' · '),
    [attributes],
  );

  return (
    <div className="border-border bg-muted/20 mt-4 space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label
            htmlFor="has-variants"
            className="text-sm font-medium"
          >
            This product has variants
          </Label>
          <p className="text-muted-foreground text-xs">
            Enable when the product has multiple SKUs, prices, or stock levels.
          </p>
        </div>
        <Switch
          id="has-variants"
          checked={enabled}
          disabled={!canEdit}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled ? (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Attributes</h3>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addAttribute}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add attribute
                </Button>
              ) : null}
            </div>

            {attributes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add attributes like Color, Size, or Storage, then generate variant combinations.
              </p>
            ) : (
              attributes.map((attr) => (
                <div
                  key={attr.id}
                  className="border-border bg-card grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_2fr_auto]"
                >
                  <div>
                    <Label className="text-xs">Attribute name</Label>
                    <Input
                      value={attr.name}
                      disabled={!canEdit}
                      placeholder="e.g. Color"
                      onChange={(e) => updateAttribute(attr.id, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Values (comma-separated)</Label>
                    <Input
                      value={valuesText[attr.id] ?? attr.values.join(', ')}
                      disabled={!canEdit}
                      placeholder="Black, White, Blue"
                      onChange={(e) =>
                        setValuesText((prev) => ({ ...prev, [attr.id]: e.target.value }))
                      }
                      onBlur={() => syncValuesFromText(attr)}
                    />
                  </div>
                  {canEdit ? (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Remove attribute"
                        onClick={() => removeAttribute(attr.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}

            {attributeSummary ? (
              <p className="text-muted-foreground text-xs">{attributeSummary}</p>
            ) : null}
          </div>

          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={generateVariants}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Generate variants
            </Button>
          ) : null}

          {variants.length > 0 ? (
            <div className="border-border overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Low stock</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit ? <TableHead className="text-right">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="min-w-[160px] text-sm">{variant.label}</TableCell>
                      <TableCell>
                        <Input
                          value={variant.sku}
                          disabled={!canEdit}
                          className="h-8 min-w-[100px] font-mono text-xs"
                          onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variant.barcode}
                          disabled={!canEdit}
                          className="h-8 min-w-[100px] font-mono text-xs"
                          onChange={(e) => updateVariant(variant.id, { barcode: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variant.unitPrice}
                          disabled={!canEdit}
                          className="h-8 w-20 text-xs"
                          onChange={(e) => updateVariant(variant.id, { unitPrice: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variant.costPrice}
                          disabled={!canEdit}
                          className="h-8 w-20 text-xs"
                          onChange={(e) => updateVariant(variant.id, { costPrice: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variant.quantity}
                          disabled={!canEdit}
                          className="h-8 w-16 text-xs"
                          onChange={(e) => updateVariant(variant.id, { quantity: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variant.minStock}
                          disabled={!canEdit}
                          className="h-8 w-16 text-xs"
                          onChange={(e) => updateVariant(variant.id, { minStock: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={variant.status}
                          disabled={!canEdit}
                          onValueChange={(v) => updateVariant(variant.id, { status: v })}
                        >
                          <SelectTrigger className="h-8 w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Remove variant"
                            onClick={() => removeVariant(variant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Generate variants from attributes to set SKU, price, and stock per combination.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

export function buildVariantsPayload(
  enabled: boolean,
  attributes: VariantAttributeDraft[],
  variants: VariantRowDraft[],
  warehouseId: string,
): ProductVariantsPayload | undefined {
  if (!enabled) {
    return { hasVariants: false, attributes: [], variants: [] };
  }

  const attributeInputs: ProductVariantAttributeInput[] = attributes
    .map((a) => ({
      name: a.name.trim(),
      values: a.values.map((v) => v.trim()).filter(Boolean),
    }))
    .filter((a) => a.name && a.values.length > 0);

  const variantInputs: ProductVariantInput[] = variants.map((v) => ({
    label: v.label,
    sku: v.sku.trim(),
    barcode: v.barcode.trim() || undefined,
    unitPrice: Number.parseFloat(v.unitPrice) || 0,
    costPrice: Number.parseFloat(v.costPrice) || 0,
    salePrice: v.salePrice.trim() ? Number.parseFloat(v.salePrice) : undefined,
    quantity: Number.parseInt(v.quantity, 10) || 0,
    minStock: Number.parseInt(v.minStock, 10) || 0,
    warehouseId: warehouseId || undefined,
    status: v.status,
    optionValues: v.optionValues,
  }));

  return {
    hasVariants: true,
    attributes: attributeInputs,
    variants: variantInputs,
  };
}

export function variantsFromProductDetail(product: {
  attributes?: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; value: string }>;
  }>;
  variants?: Array<{
    id: string;
    label: string;
    sku: string;
    barcode: string | null;
    unitPrice: number;
    costPrice: number;
    salePrice: number | null;
    status: string;
    options: Array<{ attributeName: string; value: string }>;
    stock?: Array<{ quantity: number; minStock: number }>;
  }>;
}): { attributes: VariantAttributeDraft[]; variants: VariantRowDraft[] } {
  const attributes: VariantAttributeDraft[] = (product.attributes ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    values: a.values.map((v) => v.value),
  }));

  const variants: VariantRowDraft[] = (product.variants ?? []).map((v) => ({
    id: v.id,
    label: v.label,
    sku: v.sku,
    barcode: v.barcode ?? '',
    unitPrice: String(v.unitPrice),
    costPrice: String(v.costPrice),
    salePrice: v.salePrice != null ? String(v.salePrice) : '',
    quantity: String(v.stock?.[0]?.quantity ?? 0),
    minStock: String(v.stock?.[0]?.minStock ?? 0),
    status: v.status,
    optionValues: v.options.map((o) => ({
      attributeName: o.attributeName,
      value: o.value,
    })),
  }));

  return { attributes, variants };
}
