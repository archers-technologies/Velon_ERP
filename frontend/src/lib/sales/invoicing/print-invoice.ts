import { renderA4InvoiceHtml } from "./a4-template";
import { invoiceQrDataUrl } from "./qr-code";
import { renderThermalInvoiceHtml } from "./thermal-template";
import type { InvoiceDocument, ThermalWidth } from "./types";
import { openPrintPreview } from "./print";
import type { ReceiptFormat } from "@/lib/shared/printer-settings";

export async function printInvoiceDocument(
  doc: InvoiceDocument,
  format: ReceiptFormat,
): Promise<void> {
  if (format === "none") return;
  const qr = await invoiceQrDataUrl(doc);
  const html =
    format === "a4"
      ? renderA4InvoiceHtml(doc, qr)
      : renderThermalInvoiceHtml(doc, qr, format as ThermalWidth);
  openPrintPreview(html, `Invoice ${doc.invoiceNumber}`);
}
