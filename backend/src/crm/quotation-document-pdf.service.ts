import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { DocumentBody, DocumentSection } from './document-builder.types';

export type QuotationDocumentPdfInput = {
  quotationNumber: string;
  revisionNumber: number;
  issueDate: string;
  expiryDate?: string | null;
  status: string;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  title?: string;
  qrPayload?: string | null;
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
  document: DocumentBody;
  signature?: {
    customerName?: string | null;
    customerSignatureDataUrl?: string | null;
    authorizedBy?: string | null;
    authorizedSignatureDataUrl?: string | null;
  };
};

const BRAND_COLOR = '#0f172a';
const MUTED_COLOR = '#64748b';
const BORDER_COLOR = '#e2e8f0';
const ACCENT_COLOR = '#334155';

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
export class QuotationDocumentPdfService {
  async generate(input: QuotationDocumentPdfInput): Promise<Buffer> {
    const qrDataUrl = input.qrPayload ? await tryGenerateQrDataUrl(input.qrPayload) : null;
    const logoBuffer = input.company.logoDataUrl
      ? dataUrlToBuffer(input.company.logoDataUrl)
      : null;
    const companyLabel = input.company.legalName ?? input.company.name;
    const visibleSections = input.document.sections.filter((section) => section.visible);
    const coverSection =
      visibleSections.find((section) => section.type === 'COVER') ?? visibleSections[0];
    const coverTitle = input.title ?? coverSection?.title ?? 'Quotation';

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

      const drawWatermark = () => {
        if (!companyLabel) return;
        doc.save();
        doc.fillColor(BRAND_COLOR).opacity(0.04);
        doc.fontSize(52).font('Helvetica-Bold');
        doc.text(companyLabel, marginLeft, doc.page.height / 2 - 26, {
          width: pageWidth,
          align: 'center',
        });
        doc.opacity(1).fillColor('#000000');
        doc.restore();
      };

      const drawBrandHeader = (subtitle?: string) => {
        const headerHeight = 56;
        doc.save();
        doc.rect(marginLeft, 36, pageWidth, headerHeight).fill(BRAND_COLOR);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
        const headerTextX = logoBuffer ? marginLeft + 62 : marginLeft + 14;
        doc.text(companyLabel, headerTextX, 52, { width: pageWidth - 80 });
        if (subtitle) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .text(subtitle, headerTextX, 68, {
              width: pageWidth - 80,
            });
        }
        if (logoBuffer) {
          doc.image(logoBuffer, marginLeft + 10, 42, { fit: [44, 44] });
        }
        doc.restore();
        doc.y = 36 + headerHeight + 18;
      };

      const addFooter = () => {
        pageNum += 1;
        doc.fontSize(8).fillColor(MUTED_COLOR).font('Helvetica');
        doc.text(
          `${companyLabel} · Quotation · Page ${pageNum}`,
          marginLeft,
          doc.page.height - 40,
          { width: pageWidth, align: 'center' },
        );
        doc.fillColor('#000000');
      };

      const ensureSpace = (height: number) => {
        if (doc.y + height > doc.page.height - 70) {
          addFooter();
          doc.addPage();
          drawWatermark();
          drawBrandHeader(input.quotationNumber);
        }
      };

      const renderBodyText = (body: string) => {
        const text = stripHtml(body);
        if (!text) return;
        ensureSpace(40);
        doc.fontSize(11).font('Helvetica').fillColor('#1e293b');
        doc.text(text, marginLeft, doc.y, { width: pageWidth, lineGap: 3 });
        doc.moveDown(0.75);
      };

      const renderSectionHeading = (section: DocumentSection) => {
        ensureSpace(48);
        doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND_COLOR);
        doc.text(section.title, marginLeft, doc.y, { width: pageWidth });
        doc.moveDown(0.35);
        doc.moveTo(marginLeft, doc.y).lineTo(marginRight, doc.y).lineWidth(1).stroke(BORDER_COLOR);
        doc.moveDown(0.75);
      };

      const renderPricingTable = () => {
        ensureSpace(80);
        renderSectionHeading({
          id: '',
          type: 'PRICING',
          title: 'Pricing',
          body: '',
          visible: true,
        });

        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(ACCENT_COLOR);
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
            drawWatermark();
            drawBrandHeader(input.quotationNumber);
            rowY = doc.y;
          }
          doc.text(item.itemName.slice(0, 34), cols[0], rowY, { width: 155 });
          doc.text(String(item.quantity), cols[1], rowY);
          doc.text(formatMoney(item.unitPrice, input.currency), cols[2], rowY);
          doc.text(formatMoney(item.discount, input.currency), cols[3], rowY);
          doc.text(`${item.taxRate}%`, cols[4], rowY);
          doc.text(formatMoney(item.lineTotal, input.currency), cols[5], rowY);
          rowY += 18;
        }

        doc.y = rowY + 10;
        const totalsX = marginLeft + 300;
        doc.font('Helvetica');
        doc.text(`Subtotal: ${formatMoney(input.subtotal, input.currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.text(`Discount: ${formatMoney(input.discount, input.currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.text(`Tax: ${formatMoney(input.tax, input.currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND_COLOR);
        doc.text(`Total: ${formatMoney(input.total, input.currency)}`, totalsX, doc.y, {
          width: marginRight - totalsX,
          align: 'right',
        });
        doc.moveDown(1);
        doc.fontSize(11).font('Helvetica').fillColor('#1e293b');
      };

      const renderSignatureSection = (section: DocumentSection) => {
        renderSectionHeading(section);
        renderBodyText(section.body);

        ensureSpace(120);
        const sigTop = doc.y + 8;
        const customerSig = input.signature?.customerSignatureDataUrl
          ? dataUrlToBuffer(input.signature.customerSignatureDataUrl)
          : null;
        const authorizedSig = input.signature?.authorizedSignatureDataUrl
          ? dataUrlToBuffer(input.signature.authorizedSignatureDataUrl)
          : null;

        doc.fontSize(10).font('Helvetica-Bold').fillColor(ACCENT_COLOR);
        doc.text('Customer', marginLeft, sigTop);
        if (customerSig) {
          doc.image(customerSig, marginLeft, sigTop + 14, { fit: [160, 48] });
        } else {
          doc
            .moveTo(marginLeft, sigTop + 52)
            .lineTo(marginLeft + 210, sigTop + 52)
            .stroke('#94a3b8');
        }
        doc.font('Helvetica').fontSize(10).fillColor('#1e293b');
        doc.text(input.signature?.customerName ?? 'Customer signature', marginLeft, sigTop + 58);
        doc.text('Date: ____________________', marginLeft, sigTop + 74);

        const rightX = marginLeft + 280;
        doc.font('Helvetica-Bold').fillColor(ACCENT_COLOR);
        doc.text('Authorized signatory', rightX, sigTop);
        if (authorizedSig) {
          doc.image(authorizedSig, rightX, sigTop + 14, { fit: [160, 48] });
        } else {
          doc
            .moveTo(rightX, sigTop + 52)
            .lineTo(rightX + 210, sigTop + 52)
            .stroke('#94a3b8');
        }
        doc.font('Helvetica').fillColor('#1e293b');
        doc.text(input.signature?.authorizedBy ?? companyLabel, rightX, sigTop + 58);
        doc.text('Date: ____________________', rightX, sigTop + 74);
        doc.y = sigTop + 96;
      };

      const renderCover = () => {
        drawWatermark();
        doc.save();
        doc.rect(0, 0, doc.page.width, 180).fill(BRAND_COLOR);
        if (logoBuffer) {
          doc.image(logoBuffer, marginLeft, 52, { fit: [72, 72] });
        }
        doc.fillColor('#ffffff');
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text(companyLabel, logoBuffer ? marginLeft + 88 : marginLeft, 58, {
          width: pageWidth - 140,
        });
        doc.font('Helvetica').fontSize(9);
        const contactBits = [input.company.phone, input.company.email, input.company.website]
          .filter(Boolean)
          .join(' · ');
        if (contactBits) {
          doc.text(contactBits, logoBuffer ? marginLeft + 88 : marginLeft, 76, {
            width: pageWidth - 140,
          });
        }
        if (qrDataUrl) {
          const qrBuffer = dataUrlToBuffer(qrDataUrl);
          if (qrBuffer) {
            doc.image(qrBuffer, marginRight - 72, 48, { fit: [64, 64] });
          }
        }
        doc.restore();

        doc.y = 220;
        doc.fontSize(30).font('Helvetica-Bold').fillColor(BRAND_COLOR);
        doc.text(coverTitle, marginLeft, doc.y, { width: pageWidth, align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(13).font('Helvetica').fillColor(MUTED_COLOR);
        doc.text(input.quotationNumber, marginLeft, doc.y);
        doc.moveDown(2);

        doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text(input.customer.companyName, marginLeft, doc.y);
        doc.moveDown(0.75);
        doc.fontSize(11).font('Helvetica').fillColor(MUTED_COLOR);
        if (input.customer.email) doc.text(`Email: ${input.customer.email}`);
        if (input.customer.phone) doc.text(`Phone: ${input.customer.phone}`);
        if (input.customer.address) doc.text(`Address: ${input.customer.address}`);
        doc.moveDown(1.5);

        doc.fontSize(11).font('Helvetica-Bold').fillColor(ACCENT_COLOR);
        doc.text('Quotation details', marginLeft, doc.y);
        doc.moveDown(0.35);
        doc.font('Helvetica').fillColor('#1e293b');
        doc.text(`Issue date: ${input.issueDate}`);
        if (input.expiryDate) doc.text(`Valid until: ${input.expiryDate}`);
        doc.text(`Revision: ${input.revisionNumber}`);
        doc.text(`Status: ${input.status.replace(/_/g, ' ')}`);
        doc.text(`Total: ${formatMoney(input.total, input.currency)}`);

        const coverBody = stripHtml(coverSection?.body ?? '');
        if (coverBody) {
          doc.moveDown(1.25);
          doc.fontSize(11).font('Helvetica').fillColor('#334155');
          doc.text(coverBody, marginLeft, doc.y, { width: pageWidth, lineGap: 3 });
        }

        addFooter();
        doc.addPage();
      };

      const renderSection = (section: DocumentSection) => {
        if (section.type === 'COVER') return;
        if (section.type === 'PRICING') {
          drawWatermark();
          drawBrandHeader(input.quotationNumber);
          renderPricingTable();
          if (section.body.trim()) {
            renderSectionHeading(section);
            renderBodyText(section.body);
          }
          return;
        }
        if (section.type === 'SIGNATURE') {
          drawWatermark();
          drawBrandHeader(input.quotationNumber);
          renderSignatureSection(section);
          return;
        }

        drawWatermark();
        drawBrandHeader(input.quotationNumber);
        renderSectionHeading(section);
        renderBodyText(section.body);
      };

      renderCover();

      for (const section of visibleSections) {
        renderSection(section);
        addFooter();
        if (section !== visibleSections[visibleSections.length - 1]) {
          doc.addPage();
        }
      }

      doc.end();
    });
  }
}
