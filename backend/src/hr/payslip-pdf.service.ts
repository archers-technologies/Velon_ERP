import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export type PayslipPdfInput = {
  payslipId: string;
  payrollRunName: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  company: {
    name: string;
    legalName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  employee: {
    name: string;
    employeeCode: string;
    email?: string | null;
    department?: string | null;
    designation?: string | null;
  };
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

@Injectable()
export class PayslipPdfService {
  async generate(input: PayslipPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      const companyName = input.company.legalName ?? input.company.name;

      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#1e3a5f')
        .text('PAYSLIP', { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#666666')
        .text(companyName, { align: 'center' });
      doc.moveDown(1.5);

      doc.fillColor('#000000');
      doc.fontSize(12).font('Helvetica-Bold').text('Employee Details');
      doc.moveDown(0.4);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${input.employee.name}`);
      doc.text(`Employee ID: ${input.employee.employeeCode}`);
      if (input.employee.email) doc.text(`Email: ${input.employee.email}`);
      if (input.employee.department) doc.text(`Department: ${input.employee.department}`);
      if (input.employee.designation) doc.text(`Designation: ${input.employee.designation}`);
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text('Pay Period');
      doc.moveDown(0.4);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Run: ${input.payrollRunName}`);
      doc.text(`Period: ${input.periodStart} to ${input.periodEnd}`);
      doc.text(`Reference: ${input.payslipId.slice(0, 8).toUpperCase()}`);
      doc.moveDown(1.5);

      const tableTop = doc.y;
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Description', 50, tableTop, { width: pageWidth * 0.6 });
      doc.text('Amount', 50 + pageWidth * 0.6, tableTop, {
        width: pageWidth * 0.4,
        align: 'right',
      });
      doc.moveDown(0.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(50 + pageWidth, doc.y)
        .stroke('#cccccc');
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      const rowY = doc.y;
      doc.text('Gross Pay', 50, rowY, { width: pageWidth * 0.6 });
      doc.text(formatMoney(input.grossPay, input.currency), 50 + pageWidth * 0.6, rowY, {
        width: pageWidth * 0.4,
        align: 'right',
      });
      doc.moveDown(0.8);

      const dedY = doc.y;
      doc.text('Deductions', 50, dedY, { width: pageWidth * 0.6 });
      doc.text(formatMoney(input.deductions, input.currency), 50 + pageWidth * 0.6, dedY, {
        width: pageWidth * 0.4,
        align: 'right',
      });
      doc.moveDown(1);

      doc
        .moveTo(50, doc.y)
        .lineTo(50 + pageWidth, doc.y)
        .stroke('#1e3a5f');
      doc.moveDown(0.5);

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f');
      const netY = doc.y;
      doc.text('Net Pay', 50, netY, { width: pageWidth * 0.6 });
      doc.text(formatMoney(input.netPay, input.currency), 50 + pageWidth * 0.6, netY, {
        width: pageWidth * 0.4,
        align: 'right',
      });

      doc.moveDown(3);
      doc.fontSize(8).font('Helvetica').fillColor('#999999');
      doc.text('This is a computer-generated payslip and does not require a signature.', {
        align: 'center',
        width: pageWidth,
      });

      doc.end();
    });
  }
}
