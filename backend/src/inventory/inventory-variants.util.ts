/** Cartesian product of attribute value lists for variant generation. */
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

export function effectiveVariantPrice(
  unitPrice: number,
  salePrice: number | null | undefined,
): number {
  if (salePrice != null && salePrice >= 0) return salePrice;
  return unitPrice;
}
