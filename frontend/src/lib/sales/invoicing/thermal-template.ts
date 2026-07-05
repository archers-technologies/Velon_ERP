import { invoiceTotals, lineSubtotal } from './calculations';
import type { InvoiceDocument, ThermalWidth } from './types';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderThermalInvoiceHtml(
  doc: InvoiceDocument,
  qrDataUrl: string,
  width: ThermalWidth,
): string {
  const { subtotal, taxRate, taxAmount, grandTotal } = invoiceTotals(doc);
  const c = doc.company;
  const maxWidth = width === '58mm' ? '58mm' : '80mm';
  const fontSize = width === '58mm' ? '10px' : '11px';
  const lines = doc.lines
    .map((line) => {
      const amt = lineSubtotal(line);
      return `<div class="line">
        <div class="name">${escapeHtml(line.name)}</div>
        <div class="detail">${line.quantity} x ${line.unitPrice.toFixed(2)} = ${amt.toFixed(2)}</div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(doc.invoiceNumber)}</title>
  <style>
    @page { size: ${maxWidth} auto; margin: 4mm; }
    body { font-family: monospace, ui-monospace, monospace; font-size: ${fontSize}; max-width: ${maxWidth}; margin: 0 auto; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .line { margin-bottom: 6px; }
    .name { font-weight: 600; }
    .detail { color: #333; }
    .row { display: flex; justify-content: space-between; }
    .qr { display: block; margin: 10px auto; width: ${width === '58mm' ? '96px' : '120px'}; }
  </style>
</head>
<body>
  <div class="center bold">${escapeHtml(c.legalName)}</div>
  ${c.taxId ? `<div class="center">VAT/GST: ${escapeHtml(c.taxId)}</div>` : ''}
  ${c.phone ? `<div class="center">${escapeHtml(c.phone)}</div>` : ''}
  <hr />
  <div class="row"><span>Invoice</span><span>${escapeHtml(doc.invoiceNumber)}</span></div>
  <div class="row"><span>Date</span><span>${escapeHtml(doc.invoiceDate)}</span></div>
  <div class="row"><span>Customer</span><span>${escapeHtml(doc.customerName)}</span></div>
  <hr />
  ${lines}
  <hr />
  <div class="row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
  <div class="row"><span>Tax (${(taxRate * 100).toFixed(0)}%)</span><span>${taxAmount.toFixed(2)}</span></div>
  <div class="row bold"><span>TOTAL</span><span>${grandTotal.toFixed(2)} ${escapeHtml(doc.currency)}</span></div>
  <img class="qr" src="${qrDataUrl}" alt="QR" />
</body>
</html>`;
}
