import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { DocumentBody, DocumentSection } from './document-builder.types';

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
  currency?: string;
  title?: string;
  qrPayload?: string | null;
  document?: DocumentBody;
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

const BRAND_COLOR = '#0f172a';
const MUTED_COLOR = '#64748b';
const BORDER_COLOR = '#e2e8f0';

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], 'base64');
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function tryGenerateQrDataUrl(payload: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const QRCode = require('qrcode') as {
      toDataURL: (text: string, opts?: { margin?: number; width?: number }) => Promise<string>;
    };
    return await QRCode.toDataURL(payload, { margin: 1, width: 120 });
  } catch {
    return null;
  }
}

@Injectable()
export class ProposalPdfService {
  async generate(input: ProposalPdfInput): Promise<Buffer> {
    if (input.document) {
      return this.generateFromDocument(input);
    }
    return this.generateLegacy(input);
  }

  private async generateFromDocument(input: ProposalPdfInput): Promise<Buffer> {
    const document = input.document!;
    const currency = input.currency ?? 'USD';
    const companyLabel = input.company.legalName ?? input.company.name;
    const logoBuffer = input.company.logoDataUrl
      ? dataUrlToBuffer(input.company.logoDataUrl)
      : null;
    const qrDataUrl = input.qrPayload ? await tryGenerateQrDataUrl(input.qrPayload) : null;
    const visibleSections = document.sections.filter((section) => section.visible);
    const coverSection =
      visibleSections.find((section) => section.type === 'COVER') ?? visibleSections[0];
    const coverTitle = input.title ?? coverSection?.title ?? 'Proposal';
    const tocSections = visibleSections.filter((section) => section.type !== 'COVER');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      const marginLeft = 50;
      const marginRight = doc.page.width - 50;
      let pageNum = 0;

      const addFooter = () => {
        pageNum += 1;
        doc.fontSize(8).fillColor(MUTED_COLOR).font('Helvetica');
        doc.text(`${companyLabel} · Proposal · Page ${pageNum}`, marginLeft, doc.page.height - 40, {
          width: pageWidth,
          align: 'center',
        });
        doc.fillColor('#000000');
      };

      const ensureSpace = (height: number) => {
        if (doc.y + height > doc.page.height - 70) {
          addFooter();
          doc.addPage();
        }
      };

      const renderSectionHeading = (section: DocumentSection) => {
        ensureSpace(48);
        doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND_COLOR);
        doc.text(section.title, marginLeft, doc.y, { width: pageWidth });
        doc.moveDown(0.35);
        doc.moveTo(marginLeft, doc.y).lineTo(marginRight, doc.y).lineWidth(1).stroke(BORDER_COLOR);
        doc.moveDown(0.75);
      };

      const renderBodyText = (body: string) => {
        const text = stripHtml(body);
        if (!text) return;
        ensureSpace(40);
        doc.fontSize(11).font('Helvetica').fillColor('#1e293b');
        doc.text(text, marginLeft, doc.y, { width: pageWidth, lineGap: 3 });
        doc.moveDown(0.75);
      };

      const renderPricingTable = (title: string) => {
        ensureSpace(80);
        renderSectionHeading({ id: '', type: 'PRICING', title, body: '', visible: true });

        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
        const cols = [
          marginLeft,
          marginLeft + 170,
          marginLeft + 220,
          marginLeft + 280,
          marginLeft + 330,
          marginLeft + 385,
          marginLeft + 430,
        ];
        doc.text('Item', cols[0], tableTop);
        doc.text('Qty', cols[1], tableTop);
        doc.text('Price', cols[2], tableTop);
        doc.text('Disc.', cols[3], tableTop);
        doc.text('Tax%', cols[4], tableTop);
        doc.text('Total', cols[5], tableTop);
        doc
          .moveTo(marginLeft, tableTop + 14)
          .lineTo(marginRight, tableTop + 14)
          .stroke(BORDER_COLOR);
        doc.font('Helvetica').fillColor('#1e293b');

        let rowY = tableTop + 22;
        for (const item of input.items) {
          if (rowY > doc.page.height - 140) {
            addFooter();
            doc.addPage();
            rowY = 60;
          }
          doc.text(item.itemName.slice(0, 34), cols[0], rowY, { width: 155 });
          doc.text(String(item.quantity), cols[1], rowY);
          doc.text(formatMoney(item.unitPrice, currency), cols[2], rowY);
          doc.text(formatMoney(item.discount, currency), cols[3], rowY);
          doc.text(`${item.taxRate}%`, cols[4], rowY);
          doc.text(formatMoney(item.lineTotal, currency), cols[5], rowY);
          rowY += 18;
        }

        doc.y = rowY + 10;
        const totalsX = marginLeft + 300;
        doc.font('Helvetica');
        doc.text(`Subtotal: ${formatMoney(input.subtotal, currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.text(`Discount: ${formatMoney(input.discount, currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.text(`Tax: ${formatMoney(input.tax, currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND_COLOR);
        doc.text(`Total: ${formatMoney(input.total, currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.moveDown(1);
        doc.fontSize(11).font('Helvetica').fillColor('#1e293b');
      };

      const renderSignatureSection = (section: DocumentSection) => {
        renderSectionHeading(section);
        renderBodyText(section.body);
        ensureSpace(80);
        doc.fontSize(11).font('Helvetica').fillColor('#1e293b');
        doc.text('Customer signature: ___________________________    Date: ______________');
        doc.moveDown(1);
        doc.text(`Authorized by ${companyLabel}`);
      };

      // Cover page
      doc.save();
      doc.rect(0, 0, doc.page.width, 170).fill(BRAND_COLOR);
      if (logoBuffer) {
        doc.image(logoBuffer, marginLeft, 48, { fit: [68, 68] });
      }
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
      doc.text(companyLabel, logoBuffer ? marginLeft + 84 : marginLeft, 54, {
        width: pageWidth - 120,
      });
      doc.font('Helvetica').fontSize(9);
      const contactBits = [input.company.phone, input.company.email, input.company.website]
        .filter(Boolean)
        .join(' · ');
      if (contactBits) {
        doc.text(contactBits, logoBuffer ? marginLeft + 84 : marginLeft, 72, {
          width: pageWidth - 120,
        });
      }
      if (qrDataUrl) {
        const qrBuffer = dataUrlToBuffer(qrDataUrl);
        if (qrBuffer) {
          doc.image(qrBuffer, marginRight - 72, 44, { fit: [64, 64] });
        }
      }
      doc.restore();

      doc.y = 210;
      doc.fontSize(28).font('Helvetica-Bold').fillColor(BRAND_COLOR);
      doc.text(coverTitle, marginLeft, doc.y, { width: pageWidth });
      doc.moveDown(0.35);
      doc.fontSize(13).font('Helvetica').fillColor(MUTED_COLOR);
      doc.text(input.quotationNumber);
      doc.moveDown(1.5);
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b');
      doc.text(input.customer.companyName);
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor(MUTED_COLOR);
      doc.text(`Prepared by ${companyLabel}`);
      doc.text(`Issue date: ${input.issueDate}`);
      if (input.expiryDate) doc.text(`Valid until: ${input.expiryDate}`);
      doc.text(`Revision: ${input.revisionNumber}`);
      doc.text(`Status: ${input.status.replace(/_/g, ' ')}`);
      const coverBody = stripHtml(coverSection?.body ?? '');
      if (coverBody) {
        doc.moveDown(0.75);
        doc.text(coverBody, marginLeft, doc.y, { width: pageWidth, lineGap: 3 });
      }
      addFooter();
      doc.addPage();

      // Table of contents
      doc.fontSize(20).font('Helvetica-Bold').fillColor(BRAND_COLOR);
      doc.text('Contents', marginLeft, doc.y);
      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica').fillColor('#1e293b');
      tocSections.forEach((section, index) => {
        doc.text(`${index + 1}. ${section.title}`, marginLeft, doc.y, { width: pageWidth });
        doc.moveDown(0.35);
      });
      addFooter();
      doc.addPage();

      for (const section of visibleSections) {
        if (section.type === 'COVER') continue;

        if (section.type === 'PRICING' || section.type === 'COMMERCIAL') {
          renderPricingTable(section.title);
          if (section.body.trim()) {
            renderBodyText(section.body);
          }
        } else if (section.type === 'SIGNATURE') {
          renderSignatureSection(section);
        } else {
          renderSectionHeading(section);
          renderBodyText(section.body);
        }

        addFooter();
        if (section !== visibleSections[visibleSections.length - 1]) {
          doc.addPage();
        }
      }

      doc.end();
    });
  }

  private generateLegacy(input: ProposalPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      let pageNum = 0;

      const addFooter = () => {
        pageNum += 1;
        doc.fontSize(8).fillColor('#666666');
        doc.text(
          `${input.company.legalName ?? input.company.name} · Page ${pageNum}`,
          50,
          doc.page.height - 40,
          { width: pageWidth, align: 'center' },
        );
        doc.fillColor('#000000');
      };

      // Cover page
      doc.fontSize(28).font('Helvetica-Bold').text('Proposal', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text(input.quotationNumber, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(18).font('Helvetica-Bold').text(input.customer.companyName, { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Prepared by ${input.company.legalName ?? input.company.name}`, { align: 'center' });
      doc.text(`Issue date: ${input.issueDate}`, { align: 'center' });
      if (input.expiryDate) doc.text(`Valid until: ${input.expiryDate}`, { align: 'center' });
      doc.text(`Revision: ${input.revisionNumber}`, { align: 'center' });
      addFooter();
      doc.addPage();

      // Customer & company info
      doc.fontSize(16).font('Helvetica-Bold').text('Customer Information');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(input.customer.companyName);
      if (input.customer.email) doc.text(`Email: ${input.customer.email}`);
      if (input.customer.phone) doc.text(`Phone: ${input.customer.phone}`);
      if (input.customer.address) doc.text(`Address: ${input.customer.address}`);
      doc.moveDown(1.5);

      doc.fontSize(16).font('Helvetica-Bold').text('Company Information');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
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
        doc.fontSize(16).font('Helvetica-Bold').text('Scope of Work');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').text(input.scopeOfWork, { width: pageWidth });
        doc.moveDown(1.5);
      }
      if (input.deliverables) {
        doc.fontSize(16).font('Helvetica-Bold').text('Deliverables');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').text(input.deliverables, { width: pageWidth });
        doc.moveDown(1.5);
      }
      addFooter();
      doc.addPage();

      // Pricing table
      doc.fontSize(16).font('Helvetica-Bold').text('Pricing');
      doc.moveDown(0.75);
      doc.fontSize(10).font('Helvetica-Bold');
      const colX = [50, 220, 280, 340, 400, 460];
      doc.text('Item', colX[0], doc.y);
      doc.text('Qty', colX[1], doc.y - doc.currentLineHeight());
      doc.text('Price', colX[2], doc.y - doc.currentLineHeight());
      doc.text('Disc.', colX[3], doc.y - doc.currentLineHeight());
      doc.text('Tax%', colX[4], doc.y - doc.currentLineHeight());
      doc.text('Total', colX[5], doc.y - doc.currentLineHeight());
      doc.moveDown(0.5);
      doc.font('Helvetica');

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
      doc.font('Helvetica-Bold');
      doc.text(`Subtotal: $${input.subtotal.toFixed(2)}`, { align: 'right' });
      doc.text(`Discount: $${input.discount.toFixed(2)}`, { align: 'right' });
      doc.text(`Tax: $${input.tax.toFixed(2)}`, { align: 'right' });
      doc.fontSize(14).text(`Total: $${input.total.toFixed(2)}`, { align: 'right' });
      addFooter();
      doc.addPage();

      // Terms & signature
      doc.fontSize(16).font('Helvetica-Bold').text('Terms & Conditions');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(
        input.terms ??
          'Payment terms as agreed. This proposal is valid until the expiry date shown above.',
        { width: pageWidth },
      );
      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').text('Signature');
      doc.moveDown(2);
      doc.fontSize(11).font('Helvetica');
      doc.text('Customer signature: ___________________________    Date: ______________');
      doc.moveDown(1);
      doc.text(`Authorized by ${input.company.legalName ?? input.company.name}`);
      addFooter();

      doc.end();
    });
  }
}
