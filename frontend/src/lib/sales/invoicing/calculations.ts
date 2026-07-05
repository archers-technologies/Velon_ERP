import type { InvoiceDocument, InvoiceLineItem } from "./types";

const DEFAULT_TAX_RATE = 0.15;

export function lineSubtotal(line: InvoiceLineItem): number {
  return Math.round(line.quantity * line.unitPrice * 100) / 100;
}

export function invoiceTotals(doc: InvoiceDocument) {
  const subtotal = Math.round(doc.lines.reduce((s, l) => s + lineSubtotal(l), 0) * 100) / 100;
  const taxRate = doc.taxRate ?? DEFAULT_TAX_RATE;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxRate, taxAmount, grandTotal };
}
