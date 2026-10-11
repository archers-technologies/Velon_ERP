/**
 * ZATCA Phase 1 QR payload (TLV tags 1–5, then Base64).
 * This generates the generation-phase QR only. It does not sign, clear, or report an invoice.
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
  if (bytes.length > 255) {
    throw new Error(`ZATCA QR tag ${tag} exceeds the single-byte length limit.`);
  }
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
  const merged = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  let binary = '';
  for (const byte of merged) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export type ZatcaReadiness = {
  readyForPhase1Qr: boolean;
  missing: string[];
};

/** Phase 1 QR can be shown only when the seller identity and totals are present. */
export function assessZatcaPhase1Readiness(input: {
  sellerName?: string | null;
  vatNumber?: string | null;
  timestamp?: string | null;
  totalWithVat?: string | null;
  vatAmount?: string | null;
}): ZatcaReadiness {
  const missing: string[] = [];
  if (!input.sellerName?.trim()) missing.push('Arabic or legal seller name');
  if (!/^\d{15}$/.test(input.vatNumber?.trim() ?? '')) missing.push('15-digit VAT registration number');
  if (!input.timestamp?.trim()) missing.push('invoice timestamp');
  if (!input.totalWithVat?.trim()) missing.push('invoice total including VAT');
  if (!input.vatAmount?.trim()) missing.push('VAT amount');
  return { readyForPhase1Qr: missing.length === 0, missing };
}
