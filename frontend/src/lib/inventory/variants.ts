export type VariantAttributeDraft = {
  id: string;
  name: string;
  values: string[];
};

export type VariantRowDraft = {
  id: string;
  label: string;
  sku: string;
  barcode: string;
  unitPrice: string;
  costPrice: string;
  salePrice: string;
  quantity: string;
  minStock: string;
  status: string;
  optionValues: Array<{ attributeName: string; value: string }>;
};

export function cartesianProduct<T>(groups: T[][]): T[][] {
  if (groups.length === 0) return [];
  return groups.reduce<T[][]>(
    (acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])),
    [[]],
  );
}

export function buildVariantLabel(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' / ');
}

function slugifyPart(value: string, maxLen = 10): string {
  const slug = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, maxLen);
  return slug || 'V';
}

/** Build a unique, human-readable SKU suffix from option values. */
export function buildVariantSku(
  baseSku: string,
  combo: Array<{ value: string }>,
  index: number,
): string {
  const skuBase = baseSku.trim() || 'VAR';
  const partSkus = combo.map((c) => slugifyPart(c.value));
  const fromParts = `${skuBase}-${partSkus.join('-')}`;
  if (fromParts.length <= 80 && partSkus.every((part) => part.length > 0)) {
    return fromParts;
  }
  return `${skuBase}-${String(index + 1).padStart(2, '0')}`;
}

export function syncAttributeValuesFromText(
  attributes: VariantAttributeDraft[],
  valuesText: Record<string, string>,
): VariantAttributeDraft[] {
  return attributes.map((attr) => {
    const raw = valuesText[attr.id] ?? attr.values.join(', ');
    const values = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return { ...attr, values: values.length ? values : [''] };
  });
}

export function findDuplicateVariantSkus(variants: VariantRowDraft[]): string | null {
  const seen = new Set<string>();
  for (const variant of variants) {
    const sku = variant.sku.trim();
    if (!sku) continue;
    if (seen.has(sku)) return sku;
    seen.add(sku);
  }
  return null;
}

export function findDuplicateVariantBarcodes(variants: VariantRowDraft[]): string | null {
  const seen = new Set<string>();
  for (const variant of variants) {
    const barcode = variant.barcode.trim();
    if (!barcode) continue;
    if (seen.has(barcode)) return barcode;
    seen.add(barcode);
  }
  return null;
}

export function generateVariantsFromAttributes(
  attributes: VariantAttributeDraft[],
  baseSku: string,
  defaultPrice: string,
): VariantRowDraft[] {
  const activeAttrs = attributes
    .map((a) => ({
      name: a.name.trim(),
      values: a.values.map((v) => v.trim()).filter(Boolean),
    }))
    .filter((a) => a.name && a.values.length > 0);

  if (!activeAttrs.length) return [];

  const combos = cartesianProduct(
    activeAttrs.map((a) => a.values.map((value) => ({ attributeName: a.name, value }))),
  );

  const usedSkus = new Set<string>();

  return combos.map((combo, index) => {
    const label = buildVariantLabel(combo.map((c) => c.value));
    let sku = buildVariantSku(baseSku, combo, index);
    let suffix = index + 1;
    while (usedSkus.has(sku)) {
      const skuBase = baseSku.trim() || 'VAR';
      sku = `${skuBase}-${String(suffix).padStart(2, '0')}`;
      suffix += 1;
    }
    usedSkus.add(sku);

    return {
      id: `draft-${index}`,
      label,
      sku,
      barcode: '',
      unitPrice: defaultPrice || '0',
      costPrice: '0',
      salePrice: '',
      quantity: '0',
      minStock: '0',
      status: 'ACTIVE',
      optionValues: combo,
    };
  });
}
