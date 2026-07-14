import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  resolvePaymentStatus,
  shouldDeductStock,
} from '@velon/shared';

describe('invoice-calculation', () => {
  it('calculates line subtotal, tax, and total', () => {
    const line = calculateInvoiceLine({
      quantity: 2,
      unitPrice: 100,
      discount: 10,
      taxRate: 18,
    });
    expect(line.lineSubtotal).toBe(190);
    expect(line.taxAmount).toBe(34.2);
    expect(line.lineTotal).toBe(224.2);
  });

  it('never allows discount to reduce taxable base below zero', () => {
    const line = calculateInvoiceLine({
      quantity: 1,
      unitPrice: 50,
      discount: 100,
      taxRate: 10,
    });
    expect(line.lineSubtotal).toBe(0);
    expect(line.taxAmount).toBe(0);
    expect(line.lineTotal).toBe(0);
  });

  it('calculates invoice totals with invoice-level discount and shipping', () => {
    const totals = calculateInvoiceTotals({
      lines: [
        { quantity: 1, unitPrice: 200, discount: 0, taxRate: 10 },
        { quantity: 2, unitPrice: 50, discount: 5, taxRate: 5 },
      ],
      invoiceDiscount: 20,
      shippingCharges: 15,
      roundingAdjustment: 0.5,
      amountPaid: 100,
    });
    expect(totals.subtotal).toBe(275);
    expect(totals.taxAmount).toBe(24.75);
    expect(totals.total).toBe(315.25);
    expect(totals.balanceDue).toBe(215.25);
  });

  it('resolves partial and full payment statuses', () => {
    expect(resolvePaymentStatus(100, 0, 'UNPAID')).toBe('UNPAID');
    expect(resolvePaymentStatus(100, 40, 'UNPAID')).toBe('PARTIALLY_PAID');
    expect(resolvePaymentStatus(100, 100, 'UNPAID')).toBe('PAID');
  });

  it('deducts stock only for finalized statuses', () => {
    expect(shouldDeductStock('DRAFT')).toBe(false);
    expect(shouldDeductStock('UNPAID')).toBe(true);
    expect(shouldDeductStock('PAID')).toBe(true);
  });
});
