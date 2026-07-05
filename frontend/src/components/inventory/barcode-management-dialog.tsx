import * as React from 'react';
import JsBarcode from 'jsbarcode';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InventoryProduct } from '@/lib/inventory/api';
import {
  autoGenerateBarcode,
  isValidEan13,
  type BarcodeFormat,
} from '@/lib/inventory/barcode/generate';
import { openPrintPreview } from '@/lib/sales/invoicing/print';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: InventoryProduct[];
  onSaveBarcode: (productId: string, barcode: string) => Promise<void>;
};

function renderBarcodeSvg(value: string, format: BarcodeFormat): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, value, {
      format: format === 'EAN13' ? 'EAN13' : 'CODE128',
      displayValue: true,
      fontSize: 14,
      height: 60,
      margin: 8,
    });
  } catch (e) {
    throw e instanceof Error ? e : new Error('Could not render barcode.');
  }
  return new XMLSerializer().serializeToString(svg);
}

function barcodePrintHtml(items: { name: string; sku: string; svg: string }[]): string {
  const cards = items
    .map(
      (item) => `
      <div class="label">
        <div class="name">${item.name}</div>
        <div class="sku">${item.sku}</div>
        ${item.svg}
      </div>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    @page { margin: 10mm; }
    body { font-family: system-ui, sans-serif; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .label { border: 1px solid #ccc; padding: 12px; text-align: center; page-break-inside: avoid; }
    .name { font-weight: 600; font-size: 12px; margin-bottom: 4px; }
    .sku { font-size: 10px; color: #555; margin-bottom: 8px; }
  </style></head><body><div class="grid">${cards}</div></body></html>`;
}

export function BarcodeManagementDialog({ open, onOpenChange, products, onSaveBarcode }: Props) {
  const [format, setFormat] = React.useState<BarcodeFormat>('CODE128');
  const [customValue, setCustomValue] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const activeProduct = products.find((p) => p.id === activeId) ?? products[0] ?? null;

  React.useEffect(() => {
    if (!open) return;
    if (products.length && !activeId) setActiveId(products[0].id);
    if (products.length) setSelectedIds(new Set(products.map((p) => p.id)));
  }, [open, products, activeId]);

  const previewValue = React.useMemo(() => {
    if (!activeProduct) return '';
    if (customValue.trim()) return customValue.trim();
    if (activeProduct.barcode?.trim()) return activeProduct.barcode.trim();
    return autoGenerateBarcode(activeProduct, format);
  }, [activeProduct, customValue, format]);

  React.useEffect(() => {
    if (!previewValue) {
      setPreviewSvg('');
      return;
    }
    try {
      if (format === 'EAN13' && !isValidEan13(previewValue)) {
        setPreviewSvg('');
        return;
      }
      setPreviewSvg(renderBarcodeSvg(previewValue, format));
    } catch {
      setPreviewSvg('');
    }
  }, [previewValue, format]);

  async function applyBarcode(saveToProduct: boolean) {
    if (!activeProduct || !previewValue) return;
    if (format === 'EAN13' && !isValidEan13(previewValue)) {
      toast.error('EAN-13 requires 13 digits with a valid check digit.');
      return;
    }
    setBusy(true);
    try {
      if (saveToProduct) {
        await onSaveBarcode(activeProduct.id, previewValue);
        toast.success(`Barcode saved for ${activeProduct.name}`);
      }
      setCustomValue('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save barcode');
    } finally {
      setBusy(false);
    }
  }

  function printSelected() {
    const selected = products.filter((p) => selectedIds.has(p.id));
    if (!selected.length) {
      toast.error('Select at least one product to print.');
      return;
    }
    try {
      const items = selected.map((p) => {
        const value = p.barcode?.trim() || autoGenerateBarcode(p, format);
        return {
          name: p.name,
          sku: p.sku,
          svg: renderBarcodeSvg(value, format),
        };
      });
      openPrintPreview(barcodePrintHtml(items), 'Barcode labels');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Print failed');
    }
  }

  function toggleId(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Barcode management</DialogTitle>
          <DialogDescription>
            Generate Code128 or EAN-13 barcodes, enter custom values, preview, and print labels.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select
                value={activeId ?? ''}
                onValueChange={setActiveId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                    >
                      {p.sku} · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as BarcodeFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE128">Code128</SelectItem>
                  <SelectItem value="EAN13">EAN-13</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Barcode value</Label>
              <Input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={
                  activeProduct ? autoGenerateBarcode(activeProduct, format) : 'Auto-generated'
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeProduct) setCustomValue(autoGenerateBarcode(activeProduct, format));
              }}
            >
              Auto-generate
            </Button>
          </div>

          <div className="border-border bg-muted/20 rounded-lg border p-4">
            <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              Print preview
            </div>
            {previewSvg ? (
              <div
                className="flex min-h-[120px] items-center justify-center rounded-md bg-white p-2"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <div className="text-muted-foreground flex min-h-[120px] items-center justify-center text-sm">
                Enter or generate a valid barcode value
              </div>
            )}
            <div className="text-muted-foreground mt-2 font-mono text-xs">
              {previewValue || '—'}
            </div>
          </div>
        </div>

        <div className="border-border max-h-40 overflow-y-auto rounded-md border p-2">
          <div className="mb-2 text-xs font-semibold">Bulk print selection</div>
          {products.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 py-1 text-sm"
            >
              <Checkbox
                checked={selectedIds.has(p.id)}
                onCheckedChange={(c) => toggleId(p.id, c === true)}
              />
              <span>
                {p.sku} · {p.name}
              </span>
            </label>
          ))}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={printSelected}
          >
            Print selected
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !previewValue}
            onClick={() => applyBarcode(false)}
          >
            Use without saving
          </Button>
          <Button
            type="button"
            disabled={busy || !previewValue}
            onClick={() => applyBarcode(true)}
          >
            Save &amp; apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
