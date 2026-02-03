import jsPDF from 'jspdf';
import type { SOAData, Transaction } from '@/types/statementOfAccount';

const BRAND = '#F15929';
const TEXT = '#231F20';
const GRAY = '#6B7280';
const MARGIN = 20;

export function generateSOAPdf(data: SOAData): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  let y = MARGIN;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(TEXT);
  doc.text('Statement of Account', w / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(GRAY);
  doc.text(`Generated ${new Date().toLocaleDateString('en-MY')}`, w / 2, y, { align: 'center' });
  y += 12;

  // Project info
  doc.setFontSize(12);
  doc.setTextColor(BRAND);
  doc.text('Project', MARGIN, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(TEXT);
  doc.text(`Project: ${data.project.projectName}`, MARGIN, y);
  y += 6;
  doc.text(`Customer: ${data.project.customerName}`, MARGIN, y);
  y += 6;
  doc.text(`Period: ${data.project.startDate}${data.project.endDate ? ` - ${data.project.endDate}` : ' (Ongoing)'} | Status: ${data.project.status}`, MARGIN, y);
  y += 12;

  // Summary
  doc.setFontSize(11);
  doc.setTextColor(BRAND);
  doc.text('Summary', MARGIN, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(TEXT);
  const summary = data.summary;
  doc.text(`Total Deposit: RM ${summary.totalDepositCollected.toFixed(2)}  |  Monthly Billing: RM ${summary.totalMonthlyBilling.toFixed(2)}  |  Penalty: RM ${summary.totalPenalty.toFixed(2)}`, MARGIN, y);
  y += 6;
  doc.text(`Additional Charges: RM ${summary.totalAdditionalCharges.toFixed(2)}  |  Total Paid: RM ${summary.totalPaid.toFixed(2)}  |  Balance: RM ${summary.finalBalance.toFixed(2)}`, MARGIN, y);
  y += 14;

  // Table
  const headers = ['Date', 'Type', 'Reference', 'Description', 'Debit (RM)', 'Credit (RM)', 'Balance (RM)', 'Status'];
  const colWidths = [22, 28, 28, 45, 28, 28, 28, 28];
  const rows: (string | number)[][] = data.transactions.map((t: Transaction) => [
    t.date,
    t.type,
    t.reference,
    (t.description || '').slice(0, 30),
    t.debit > 0 ? t.debit.toFixed(2) : '-',
    t.credit > 0 ? t.credit.toFixed(2) : '-',
    t.balance.toFixed(2),
    t.status,
  ]);

  const tableWidth = w - MARGIN * 2;
  const rowHeight = 7;

  // Table header
  doc.setFillColor(249, 250, 251);
  doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
  doc.setFontSize(8);
  doc.setTextColor(TEXT);
  let x = MARGIN;
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 5);
    x += colWidths[i];
  });
  y += rowHeight;

  doc.setFontSize(7);
  for (let i = 0; i < rows.length; i++) {
    if (y + rowHeight > h - MARGIN) {
      doc.addPage();
      y = MARGIN;
      doc.setFillColor(249, 250, 251);
      doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
      x = MARGIN;
      doc.setFontSize(8);
      headers.forEach((h, j) => {
        doc.text(h, x + 2, y + 5);
        x += colWidths[j];
      });
      y += rowHeight;
      doc.setFontSize(7);
    }
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
    }
    x = MARGIN;
    rows[i].forEach((cell, j) => {
      doc.text(String(cell), x + 2, y + 5);
      x += colWidths[j];
    });
    y += rowHeight;
  }

  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.text('Power Metal & Steel - Statement of Account', w / 2, h - 10, { align: 'center' });

  return doc.output('blob');
}
