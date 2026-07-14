export type InvoiceLineInput = {
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type InvoiceTotalsInput = {
  lines: InvoiceLineInput[];
  invoiceDiscount?: number;
  shippingCharges?: number;
  roundingAdjustment?: number;
  amountPaid?: number;
};

export type CalculatedInvoiceLine = {
  lineSubtotal: number;
  taxAmount: number;
  lineTotal: number;
};

export type CalculatedInvoiceTotals = {
  lines: CalculatedInvoiceLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  balanceDue: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateInvoiceLine(line: InvoiceLineInput): CalculatedInvoiceLine {
  const qty = Math.max(0, line.quantity);
  const unitPrice = Math.max(0, line.unitPrice);
  const discount = Math.max(0, line.discount);
  const taxRate = Math.max(0, line.taxRate);

  const gross = qty * unitPrice;
  const lineSubtotal = round2(Math.max(0, gross - discount));
  const taxAmount = round2(lineSubtotal * (taxRate / 100));
  const lineTotal = round2(lineSubtotal + taxAmount);

  return { lineSubtotal, taxAmount, lineTotal };
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): CalculatedInvoiceTotals {
  const invoiceDiscount = Math.max(0, input.invoiceDiscount ?? 0);
  const shippingCharges = Math.max(0, input.shippingCharges ?? 0);
  const roundingAdjustment = input.roundingAdjustment ?? 0;
  const amountPaid = Math.max(0, input.amountPaid ?? 0);

  const lines = input.lines.map((line) => calculateInvoiceLine(line));
  const rawSubtotal = round2(lines.reduce((sum, line) => sum + line.lineSubtotal, 0));
  const subtotal = round2(Math.max(0, rawSubtotal - invoiceDiscount));
  const taxAmount = round2(lines.reduce((sum, line) => sum + line.taxAmount, 0));
  const total = round2(subtotal + taxAmount + shippingCharges + roundingAdjustment);
  const balanceDue = round2(Math.max(0, total - amountPaid));

  return { lines, subtotal, taxAmount, total, balanceDue };
}

export function resolvePaymentStatus(
  total: number,
  amountPaid: number,
  current: string,
  dueDate?: Date | null,
): 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' {
  if (current === 'DRAFT') return 'DRAFT';
  if (amountPaid <= 0) {
    if (dueDate && dueDate < new Date() && current !== 'CANCELLED' && current !== 'VOID') {
      return 'OVERDUE';
    }
    return 'UNPAID';
  }
  if (amountPaid >= total) return 'PAID';
  return 'PARTIALLY_PAID';
}

export function shouldDeductStock(status: string): boolean {
  return ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'].includes(status);
}
