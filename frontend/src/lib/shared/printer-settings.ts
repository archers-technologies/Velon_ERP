export type ReceiptFormat = "none" | "58mm" | "80mm" | "a4";

export const RECEIPT_FORMAT_OPTIONS: { value: ReceiptFormat; label: string; description: string }[] =
  [
    { value: "none", label: "Disabled", description: "Do not open print preview for receipts." },
    { value: "58mm", label: "Thermal 58mm", description: "Compact receipt for narrow thermal printers." },
    { value: "80mm", label: "Thermal 80mm", description: "Standard POS thermal receipt width." },
    { value: "a4", label: "A4 invoice", description: "Full tax invoice on A4 paper." },
  ];

const STORAGE_FORMAT = "velon-workspace-pref-receipt-format";
const STORAGE_AUTO_PRINT = "velon-workspace-pref-auto-print-receipt";

const DEFAULT_FORMAT: ReceiptFormat = "80mm";
const DEFAULT_AUTO_PRINT = true;

export const PRINTER_SETTINGS_STORAGE_KEYS = [STORAGE_FORMAT, STORAGE_AUTO_PRINT] as const;

function readFormat(): ReceiptFormat {
  if (typeof window === "undefined") return DEFAULT_FORMAT;
  try {
    const v = localStorage.getItem(STORAGE_FORMAT);
    if (v === "none" || v === "58mm" || v === "80mm" || v === "a4") return v;
    return DEFAULT_FORMAT;
  } catch {
    return DEFAULT_FORMAT;
  }
}

function readAutoPrint(): boolean {
  if (typeof window === "undefined") return DEFAULT_AUTO_PRINT;
  try {
    const v = localStorage.getItem(STORAGE_AUTO_PRINT);
    if (v === null) return DEFAULT_AUTO_PRINT;
    return v === "1" || v === "true";
  } catch {
    return DEFAULT_AUTO_PRINT;
  }
}

export function getPrinterSettings() {
  return {
    receiptFormat: readFormat(),
    autoPrintOnCharge: readAutoPrint(),
  };
}

export function saveReceiptFormat(format: ReceiptFormat) {
  try {
    localStorage.setItem(STORAGE_FORMAT, format);
  } catch {
    /* ignore */
  }
}

export function saveAutoPrintOnCharge(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_AUTO_PRINT, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function resetPrinterSettings() {
  saveReceiptFormat(DEFAULT_FORMAT);
  saveAutoPrintOnCharge(DEFAULT_AUTO_PRINT);
}

export function receiptFormatLabel(format: ReceiptFormat): string {
  return RECEIPT_FORMAT_OPTIONS.find((o) => o.value === format)?.label ?? format;
}
