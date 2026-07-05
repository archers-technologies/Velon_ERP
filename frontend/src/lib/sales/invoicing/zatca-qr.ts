/**
 * ZATCA Phase-1 TLV payload for simplified tax invoices (Base64).
 * Tags: 1=seller, 2=VAT, 3=timestamp, 4=total, 5=VAT amount
 */
export type ZatcaInvoiceQrInput = {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: string;
  vatAmount: string;
};

function tlv(tag: number, value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = tag;
  out[1] = bytes.length;
  out.set(bytes, 2);
  return out;
}

export function buildZatcaTlvBase64(input: ZatcaInvoiceQrInput): string {
  const chunks = [
    tlv(1, input.sellerName),
    tlv(2, input.vatNumber),
    tlv(3, input.timestamp),
    tlv(4, input.totalWithVat),
    tlv(5, input.vatAmount),
  ];
  const totalLen = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  let binary = '';
  for (const b of merged) binary += String.fromCharCode(b);
  return btoa(binary);
}
