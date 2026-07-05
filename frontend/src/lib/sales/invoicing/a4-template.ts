import { invoiceTotals, lineSubtotal } from "./calculations";
import type { InvoiceDocument } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderA4InvoiceHtml(doc: InvoiceDocument, qrDataUrl: string): string {
  const { subtotal, taxRate, taxAmount, grandTotal } = invoiceTotals(doc);
  const c = doc.company;
  const rows = doc.lines
    .map(
      (line) => `
      <tr>
        <td>${escapeHtml(line.name)}</td>
        <td class="num">${line.quantity}</td>
        <td class="num">${line.unitPrice.toFixed(2)}</td>
        <td class="num">${lineSubtotal(line).toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(doc.invoiceNumber)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: system-ui, sans-serif; color: #111; font-size: 12px; line-height: 1.45; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
    .logo { max-height: 56px; max-width: 160px; object-fit: contain; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .muted { color: #555; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-left: auto; width: 260px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; }
    .signature { border-top: 1px solid #999; width: 200px; padding-top: 6px; margin-top: 48px; }
    .qr { width: 120px; height: 120px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${c.logoDataUrl ? `<img class="logo" src="${c.logoDataUrl}" alt="" />` : ""}
      <h1>${escapeHtml(c.legalName)}</h1>
      ${c.address ? `<div class="muted">${escapeHtml(c.address)}</div>` : ""}
      ${c.phone ? `<div class="muted">Tel: ${escapeHtml(c.phone)}</div>` : ""}
      ${c.email ? `<div class="muted">${escapeHtml(c.email)}</div>` : ""}
      ${c.taxId ? `<div class="muted">VAT/GST: ${escapeHtml(c.taxId)}</div>` : ""}
      ${c.crNumber ? `<div class="muted">CR: ${escapeHtml(c.crNumber)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700">TAX INVOICE</div>
      <div><strong>No.</strong> ${escapeHtml(doc.invoiceNumber)}</div>
      <div><strong>Date</strong> ${escapeHtml(doc.invoiceDate)}</div>
      ${doc.dueDate ? `<div><strong>Due</strong> ${escapeHtml(doc.dueDate)}</div>` : ""}
      <div><strong>Currency</strong> ${escapeHtml(doc.currency)}</div>
    </div>
  </div>
  <div class="grid">
    <div>
      <strong>Bill to</strong><br/>
      ${escapeHtml(doc.customerName)}<br/>
      ${doc.customerAddress ? escapeHtml(doc.customerAddress) + "<br/>" : ""}
      ${doc.customerPhone ? escapeHtml(doc.customerPhone) + "<br/>" : ""}
      ${doc.customerEmail ? escapeHtml(doc.customerEmail) : ""}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
    <div><span>Tax (${(taxRate * 100).toFixed(0)}%)</span><span>${taxAmount.toFixed(2)}</span></div>
    <div class="grand"><span>Total</span><span>${grandTotal.toFixed(2)} ${escapeHtml(doc.currency)}</span></div>
  </div>
  <div class="footer">
    <div class="signature">Authorized signature</div>
    <img class="qr" src="${qrDataUrl}" alt="Invoice QR" />
  </div>
</body>
</html>`;
}
