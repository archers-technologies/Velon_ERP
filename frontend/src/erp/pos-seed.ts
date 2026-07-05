/** POS demo defaults — shared by server store and client reset (no live store singleton on client). */

export type PosTicketLine = {
  id: string;
  /** When set, sale settlement decrements this inventory row */
  inventoryId?: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type PosCatalogItem = {
  id: string;
  name: string;
  unitPrice: number;
  inventoryId?: string;
  productId?: string;
  hasVariants?: boolean;
  favorite?: boolean;
};

export type PosVariantOption = {
  id: string;
  variantId: string;
  inventoryId?: string;
  label: string;
  sku: string;
  unitPrice: number;
  available: number;
  site?: string;
};

export type PosVariantCatalogItem = {
  id: string;
  productId: string;
  name: string;
  imageDataUrl?: string | null;
  variantCount: number;
  hasVariants: true;
  variants: PosVariantOption[];
};

export type PosSaleLineInput = {
  inventoryId?: string;
  name: string;
  qty: number;
  unitPrice: number;
};

/** Matches demo ticket: Cold Brew x4, Sandwich x3, Coffee Beans x2 */
export const POS_DEFAULT_TICKET_LINES: PosTicketLine[] = [
  { id: 'pos-line-1', inventoryId: 'row-1', name: 'Cold Brew', qty: 4, unitPrice: 4.5 },
  { id: 'pos-line-2', name: 'Sandwich', qty: 3, unitPrice: 11.6 },
  { id: 'pos-line-3', inventoryId: 'row-2', name: 'Coffee Beans 1kg', qty: 2, unitPrice: 36 },
];

export const POS_CATALOG_ITEMS: PosCatalogItem[] = [
  { id: 'cat-1', name: 'Cold Brew', unitPrice: 4.5, inventoryId: 'row-1', favorite: true },
  { id: 'cat-2', name: 'Sandwich', unitPrice: 11.6, favorite: true },
  { id: 'cat-3', name: 'Coffee Beans 1kg', unitPrice: 36, inventoryId: 'row-2', favorite: true },
  { id: 'cat-4', name: 'Ceramic Mug', unitPrice: 12, inventoryId: 'row-3' },
];
