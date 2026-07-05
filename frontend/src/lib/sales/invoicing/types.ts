export type InvoiceLineItem = {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

export type InvoiceCompanyProfile = {
  legalName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  crNumber?: string | null;
  logoDataUrl?: string | null;
};

export type InvoiceDocument = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  lines: InvoiceLineItem[];
  taxRate?: number;
  currency: string;
  company: InvoiceCompanyProfile;
  paymentStatus?: "paid" | "due";
};

export type ThermalWidth = "58mm" | "80mm";
