import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PosVariantCatalogItem, PosVariantOption } from '@/erp/pos-seed';

type PosVariantPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: PosVariantCatalogItem | null;
  onSelect: (variant: PosVariantOption) => void;
  formatCurrency: (amount: number) => string;
};

export function PosVariantPickerDialog({
  open,
  onOpenChange,
  product,
  onSelect,
  formatCurrency,
}: PosVariantPickerDialogProps) {
  if (!product) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose variant — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {product.variants.map((variant) => (
            <Button
              key={variant.id}
              type="button"
              variant="outline"
              className="h-auto w-full flex-col items-start gap-1 rounded-xl px-4 py-3 text-left"
              onClick={() => {
                onSelect(variant);
                onOpenChange(false);
              }}
            >
              <span className="font-medium">{variant.label}</span>
              <span className="text-muted-foreground text-xs">
                {variant.sku} · {formatCurrency(variant.unitPrice)} · {variant.available} in stock
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
