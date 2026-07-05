import {
  buildVariantLabel,
  cartesianProduct,
  effectiveVariantPrice,
} from './inventory-variants.util';

describe('inventory-variants.util', () => {
  it('builds cartesian combinations', () => {
    const combos = cartesianProduct([
      ['Black', 'White'],
      ['128GB', '256GB'],
    ]);
    expect(combos).toHaveLength(4);
    expect(combos[0]).toEqual(['Black', '128GB']);
  });

  it('builds variant labels', () => {
    expect(buildVariantLabel(['iPhone 17 Pro', '256GB', 'Black'])).toBe(
      'iPhone 17 Pro / 256GB / Black',
    );
  });

  it('prefers sale price when set', () => {
    expect(effectiveVariantPrice(100, 80)).toBe(80);
    expect(effectiveVariantPrice(100, null)).toBe(100);
  });
});
