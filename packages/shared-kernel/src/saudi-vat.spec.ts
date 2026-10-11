import { resolveLineVat, standardVatRateOn } from './saudi-vat';

describe('Saudi VAT', () => {
  it('uses 5% before 1 July 2020 and 15% from that date', () => {
    expect(standardVatRateOn(new Date('2020-06-30T12:00:00.000Z'))).toBe(5);
    expect(standardVatRateOn(new Date('2020-07-01T00:00:00.000Z'))).toBe(15);
    expect(standardVatRateOn(new Date('2026-10-11T00:00:00.000Z'))).toBe(15);
  });

  it('calculates exclusive standard VAT from the issue date', () => {
    const line = resolveLineVat({
      treatment: 'STANDARD',
      quantity: 2,
      unitPrice: 100,
      discount: 0,
      issuedOn: new Date('2026-01-15T00:00:00.000Z'),
    });
    expect(line.treatment).toBe('STANDARD');
    expect(line.ratePercent).toBe(15);
    expect(line.lineSubtotal).toBe(200);
    expect(line.taxAmount).toBe(30);
    expect(line.lineTotal).toBe(230);
    expect(line.reviewRequired).toBe(false);
  });

  it('extracts VAT from a tax-inclusive price', () => {
    const line = resolveLineVat({
      treatment: 'STANDARD',
      taxInclusive: true,
      quantity: 1,
      unitPrice: 115,
      discount: 0,
      issuedOn: new Date('2026-01-15T00:00:00.000Z'),
    });
    expect(line.lineSubtotal).toBe(100);
    expect(line.taxAmount).toBe(15);
    expect(line.lineTotal).toBe(115);
  });

  it('does not invent a treatment when the line is unclassified', () => {
    const line = resolveLineVat({
      quantity: 1,
      unitPrice: 50,
      discount: 0,
      issuedOn: new Date('2026-01-15T00:00:00.000Z'),
    });
    expect(line.treatment).toBe('REVIEW_REQUIRED');
    expect(line.taxAmount).toBe(0);
    expect(line.reviewRequired).toBe(true);
  });

  it('keeps zero-rated and exempt lines at a zero rate', () => {
    const zeroRated = resolveLineVat({
      treatment: 'ZERO_RATED',
      quantity: 1,
      unitPrice: 80,
      discount: 10,
      issuedOn: new Date('2026-01-15T00:00:00.000Z'),
    });
    const exempt = resolveLineVat({
      treatment: 'EXEMPT',
      quantity: 1,
      unitPrice: 80,
      discount: 0,
      issuedOn: new Date('2026-01-15T00:00:00.000Z'),
    });
    expect(zeroRated.ratePercent).toBe(0);
    expect(zeroRated.lineSubtotal).toBe(70);
    expect(zeroRated.taxAmount).toBe(0);
    expect(exempt.treatment).toBe('EXEMPT');
    expect(exempt.taxAmount).toBe(0);
  });

  it('retains the historical 5% rate on invoices issued before the increase', () => {
    const line = resolveLineVat({
      treatment: 'STANDARD',
      quantity: 1,
      unitPrice: 100,
      discount: 0,
      issuedOn: new Date('2019-05-01T00:00:00.000Z'),
    });
    expect(line.ratePercent).toBe(5);
    expect(line.taxAmount).toBe(5);
  });
});
