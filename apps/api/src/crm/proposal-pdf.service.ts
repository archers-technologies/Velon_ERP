import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

export type ProposalPdfInput = {
  quotationNumber: string;
  revisionNumber: number;
  issueDate: string;
  expiryDate?: string | null;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  scopeOfWork?: string | null;
  deliverables?: string | null;
  company: {
    name: string;
    legalName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    taxId?: string | null;
    logoDataUrl?: string | null;
  };
  customer: {
    companyName: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  items: Array<{
    itemName: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    lineTotal: number;
  }>;
};

@Injectable()
export class ProposalPdfService {
  async generate(input: ProposalPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 100;
      let pageNum = 0;

      const addFooter = () => {
        pageNum += 1;
        doc.fontSize(8).fillColor("#666666");
        doc.text(
          `${input.company.legalName ?? input.company.name} · Page ${pageNum}`,
          50,
          doc.page.height - 40,
          { width: pageWidth, align: "center" },
        );
        doc.fillColor("#000000");
      };

      // Cover page
      doc.fontSize(28).font("Helvetica-Bold").text("Proposal", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(14).font("Helvetica").text(input.quotationNumber, { align: "center" });
      doc.moveDown(2);
      doc.fontSize(18).font("Helvetica-Bold").text(input.customer.companyName, { align: "center" });
      doc.moveDown(1);
      doc.fontSize(11).font("Helvetica");
      doc.text(`Prepared by ${input.company.legalName ?? input.company.name}`, { align: "center" });
      doc.text(`Issue date: ${input.issueDate}`, { align: "center" });
      if (input.expiryDate) doc.text(`Valid until: ${input.expiryDate}`, { align: "center" });
      doc.text(`Revision: ${input.revisionNumber}`, { align: "center" });
      addFooter();
      doc.addPage();

      // Customer & company info
      doc.fontSize(16).font("Helvetica-Bold").text("Customer Information");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica");
      doc.text(input.customer.companyName);
      if (input.customer.email) doc.text(`Email: ${input.customer.email}`);
      if (input.customer.phone) doc.text(`Phone: ${input.customer.phone}`);
      if (input.customer.address) doc.text(`Address: ${input.customer.address}`);
      doc.moveDown(1.5);

      doc.fontSize(16).font("Helvetica-Bold").text("Company Information");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica");
      doc.text(input.company.legalName ?? input.company.name);
      if (input.company.email) doc.text(`Email: ${input.company.email}`);
      if (input.company.phone) doc.text(`Phone: ${input.company.phone}`);
      if (input.company.address) doc.text(`Address: ${input.company.address}`);
      if (input.company.website) doc.text(`Website: ${input.company.website}`);
      if (input.company.taxId) doc.text(`Tax ID: ${input.company.taxId}`);
      addFooter();
      doc.addPage();

      // Scope & deliverables
      if (input.scopeOfWork) {
        doc.fontSize(16).font("Helvetica-Bold").text("Scope of Work");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica").text(input.scopeOfWork, { width: pageWidth });
        doc.moveDown(1.5);
      }
      if (input.deliverables) {
        doc.fontSize(16).font("Helvetica-Bold").text("Deliverables");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica").text(input.deliverables, { width: pageWidth });
        doc.moveDown(1.5);
      }
      addFooter();
      doc.addPage();

      // Pricing table
      doc.fontSize(16).font("Helvetica-Bold").text("Pricing");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica-Bold");
      const colX = [50, 220, 280, 340, 400, 460];
      doc.text("Item", colX[0], doc.y);
      doc.text("Qty", colX[1], doc.y - doc.currentLineHeight());
      doc.text("Price", colX[2], doc.y - doc.currentLineHeight());
      doc.text("Disc.", colX[3], doc.y - doc.currentLineHeight());
      doc.text("Tax%", colX[4], doc.y - doc.currentLineHeight());
      doc.text("Total", colX[5], doc.y - doc.currentLineHeight());
      doc.moveDown(0.5);
      doc.font("Helvetica");

      for (const item of input.items) {
        const y = doc.y;
        doc.text(item.itemName.slice(0, 28), colX[0], y, { width: 160 });
        doc.text(String(item.quantity), colX[1], y);
        doc.text(item.unitPrice.toFixed(2), colX[2], y);
        doc.text(item.discount.toFixed(2), colX[3], y);
        doc.text(`${item.taxRate}%`, colX[4], y);
        doc.text(item.lineTotal.toFixed(2), colX[5], y);
        doc.moveDown(0.75);
      }

      doc.moveDown(1);
      doc.font("Helvetica-Bold");
      doc.text(`Subtotal: $${input.subtotal.toFixed(2)}`, { align: "right" });
      doc.text(`Discount: $${input.discount.toFixed(2)}`, { align: "right" });
      doc.text(`Tax: $${input.tax.toFixed(2)}`, { align: "right" });
      doc.fontSize(14).text(`Total: $${input.total.toFixed(2)}`, { align: "right" });
      addFooter();
      doc.addPage();

      // Terms & signature
      doc.fontSize(16).font("Helvetica-Bold").text("Terms & Conditions");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica");
      doc.text(
        input.terms ??
          "Payment terms as agreed. This proposal is valid until the expiry date shown above.",
        { width: pageWidth },
      );
      doc.moveDown(2);
      doc.fontSize(14).font("Helvetica-Bold").text("Signature");
      doc.moveDown(2);
      doc.fontSize(11).font("Helvetica");
      doc.text("Customer signature: ___________________________    Date: ______________");
      doc.moveDown(1);
      doc.text(`Authorized by ${input.company.legalName ?? input.company.name}`);
      addFooter();

      doc.end();
    });
  }
}
