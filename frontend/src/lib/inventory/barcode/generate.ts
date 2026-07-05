/** EAN-13 check digit (modulo 10). */
export function ean13CheckDigit(digits12: string): string {
  const d = digits12.replace(/\D/g, '').padStart(12, '0').slice(-12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(d[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

/** Build a valid EAN-13 from SKU or product id seed. */
export function generateEan13(seed: string): string {
  const numeric = seed.replace(/\D/g, '');
  const base =
    numeric.length >= 12
      ? numeric.slice(0, 12)
      : `${numeric}${seed.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)}`
          .replace(/\D/g, '')
          .padEnd(12, '0')
          .slice(0, 12);
  const padded = base.padStart(12, '0').slice(-12);
  return `${padded}${ean13CheckDigit(padded)}`;
}

/** Code128-friendly value (ASCII printable). */
export function generateCode128Value(seed: string): string {
  const cleaned = seed.replace(/[^\x20-\x7E]/g, '').trim();
  if (cleaned.length >= 4) return cleaned.slice(0, 48);
  return `VEL${seed.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`.slice(0, 48);
}

export type BarcodeFormat = 'CODE128' | 'EAN13';

export function autoGenerateBarcode(
  product: { sku: string; id?: string; name?: string },
  format: BarcodeFormat = 'CODE128',
): string {
  const seed = product.sku || product.id || product.name || 'ITEM';
  return format === 'EAN13' ? generateEan13(seed) : generateCode128Value(seed);
}

export function isValidEan13(value: string): boolean {
  const v = value.replace(/\D/g, '');
  if (v.length !== 13) return false;
  return v[12] === ean13CheckDigit(v.slice(0, 12));
}
