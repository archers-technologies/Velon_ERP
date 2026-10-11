import { assessZatcaPhase1Readiness, buildZatcaTlvBase64 } from './zatca-qr';

describe('ZATCA phase 1 QR', () => {
  it('encodes seller, VAT number, timestamp, total, and VAT amount', () => {
    const payload = buildZatcaTlvBase64({
      sellerName: 'Nakheel Demo Trading',
      vatNumber: '399999999900003',
      timestamp: '2026-10-11T08:00:00Z',
      totalWithVat: '115.00',
      vatAmount: '15.00',
    });
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
    expect(bytes[0]).toBe(1);
    expect(bytes[1]).toBe('Nakheel Demo Trading'.length);
    const vatTag = bytes.indexOf(2, 2);
    expect(vatTag).toBeGreaterThan(1);
    expect(bytes[vatTag + 1]).toBe(15);
  });

  it('refuses a phase 1 QR when the VAT number is missing', () => {
    const readiness = assessZatcaPhase1Readiness({
      sellerName: 'Nakheel Demo Trading',
      vatNumber: '',
      timestamp: '2026-10-11T08:00:00Z',
      totalWithVat: '115.00',
      vatAmount: '15.00',
    });
    expect(readiness.readyForPhase1Qr).toBe(false);
    expect(readiness.missing.join(' ')).toContain('VAT');
  });
});
