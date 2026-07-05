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

  return combos.map((combo, index) => {
    const label = buildVariantLabel(combo.map((c) => c.value));
    const suffix = String(index + 1).padStart(2, '0');
    const skuBase = baseSku.trim() || 'VAR';
    return {
      id: `draft-${index}`,
      label,
      sku: `${skuBase}-${suffix}`,
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
