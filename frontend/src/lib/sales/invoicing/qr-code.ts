import QRCode from 'qrcode';
import { invoiceTotals } from './calculations';
import type { InvoiceDocument } from './types';
import { buildZatcaTlvBase64 } from './zatca-qr';

export async function invoiceQrDataUrl(doc: InvoiceDocument): Promise<string> {
  const { taxAmount, grandTotal } = invoiceTotals(doc);
  const vatNumber = doc.company.taxId ?? '';
  const sellerName = doc.company.legalName;
  const timestamp = new Date(doc.invoiceDate).toISOString();

  const payload =
    vatNumber.length > 0
      ? buildZatcaTlvBase64({
          sellerName,
          vatNumber,
          timestamp,
          totalWithVat: grandTotal.toFixed(2),
          vatAmount: taxAmount.toFixed(2),
        })
      : JSON.stringify({
          company: sellerName,
          vat: vatNumber,
          invoice: doc.invoiceNumber,
          date: doc.invoiceDate,
          total: grandTotal.toFixed(2),
          tax: taxAmount.toFixed(2),
        });

  return QRCode.toDataURL(payload, { margin: 1, width: 180, errorCorrectionLevel: 'M' });
}
