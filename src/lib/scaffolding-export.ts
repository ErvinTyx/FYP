import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const COMPANY_NAME = 'Power Metal & Steel Sdn Bhd';
const REPORT_TITLE = 'Scaffolding Management';

export interface ScaffoldingExportItem {
  itemCode: string;
  name: string;
  category: string;
  available: number;
  price: number;
  originPrice?: number;
  status: string;
  itemStatus: string;
  location: string;
}

const MARGIN = 14;
const ROW_HEIGHT = 7;
const HEADER_AREA = 32;
const FOOTER_AREA = 18;
const FONT_SIZE = 9;
const FONT_SIZE_HEADER = 11;

/**
 * Generate PDF with all scaffolding records. Header: company name, report title, date. Footer: company name, page number.
 */
export function generateScaffoldingPdf(items: ScaffoldingExportItem[]): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentTop = MARGIN + HEADER_AREA;
  const contentBottom = pageHeight - FOOTER_AREA;

  const colWidths = [18, 62, 36, 18, 22, 22, 22, 22, 28]; // itemCode, name, category, available, price, originPrice, status, itemStatus (wider), location
  const headers = ['Item Code', 'Name', 'Category', 'Available', 'Price (RM)', 'Origin (RM)', 'Status', 'Item Status', 'Location'];
  const rightAlignCols = [3, 4, 5]; // Available, Price (RM), Origin (RM) - right-align numeric columns

  function drawPageHeader(pageNum: number) {
    doc.setFontSize(14);
    doc.setTextColor(35, 31, 32);
    doc.text(COMPANY_NAME, pageWidth / 2, MARGIN + 6, { align: 'center' });
    doc.setFontSize(FONT_SIZE_HEADER);
    doc.setTextColor(241, 89, 41);
    doc.text(REPORT_TITLE, pageWidth / 2, MARGIN + 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Export Date: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, MARGIN + 22, { align: 'center' });
  }

  function drawPageFooter(pageNum: number) {
    const y = pageHeight - 10;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(COMPANY_NAME, MARGIN, y);
    doc.text(`Page ${pageNum}`, pageWidth - MARGIN, y, { align: 'right' });
  }

  let pageNum = 1;
  drawPageHeader(pageNum);
  let y = contentTop;
  doc.setFontSize(FONT_SIZE);

  // Table header row
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN, y - 5, pageWidth - 2 * MARGIN, ROW_HEIGHT, 'F');
  doc.setTextColor(35, 31, 32);
  doc.setFont('helvetica', 'bold');
  let x = MARGIN + 2;
  headers.forEach((h, i) => {
    const label = String(h ?? '');
    if (rightAlignCols.includes(i)) {
      doc.text(label, x + colWidths[i] - 2, y, { align: 'right' });
    } else {
      doc.text(label, x, y);
    }
    x += colWidths[i];
  });
  doc.setFont('helvetica', 'normal');
  y += ROW_HEIGHT + 2;

  for (const item of items) {
    if (y + ROW_HEIGHT > contentBottom) {
      drawPageFooter(pageNum);
      doc.addPage('a4', 'landscape');
      pageNum++;
      drawPageHeader(pageNum);
      y = contentTop;
      // Repeat table header
      doc.setFillColor(243, 244, 246);
      doc.rect(MARGIN, y - 5, pageWidth - 2 * MARGIN, ROW_HEIGHT, 'F');
      doc.setFont('helvetica', 'bold');
      x = MARGIN + 2;
      headers.forEach((h, i) => {
        const label = String(h ?? '');
        if (rightAlignCols.includes(i)) {
          doc.text(label, x + colWidths[i] - 2, y, { align: 'right' });
        } else {
          doc.text(label, x, y);
        }
        x += colWidths[i];
      });
      doc.setFont('helvetica', 'normal');
      y += ROW_HEIGHT + 2;
    }
    doc.setTextColor(17, 24, 39);
    x = MARGIN + 2;
    const row = [
      item.itemCode,
      item.name,
      item.category,
      String(item.available),
      item.price.toFixed(2),
      (item.originPrice ?? 0).toFixed(2),
      item.status,
      item.itemStatus,
      item.location ?? '',
    ];
    const maxLengths = [12, 50, 28, 8, 10, 14, 14, 16, 22]; // itemStatus (index 7) allows "Unavailable" etc.
    row.forEach((cell, i) => {
      const str = String(cell ?? '').slice(0, maxLengths[i]);
      if (rightAlignCols.includes(i)) {
        doc.text(str, x + colWidths[i] - 2, y, { align: 'right' });
      } else {
        doc.text(str, x, y);
      }
      x += colWidths[i];
    });
    y += ROW_HEIGHT;
  }

  drawPageFooter(pageNum);
  return doc;
}

/**
 * Generate Excel with all scaffolding records. First rows: company name, title, date. Then header row and data.
 */
export function generateScaffoldingExcel(items: ScaffoldingExportItem[]): Blob {
  const wb = XLSX.utils.book_new();
  const headers = ['Item Code', 'Name', 'Category', 'Available', 'Price (RM)', 'Origin Price (RM)', 'Status', 'Item Status', 'Location'];
  const data = [
    [COMPANY_NAME],
    [REPORT_TITLE],
    [`Export Date: ${format(new Date(), 'dd/MM/yyyy')}`],
    [],
    headers,
    ...items.map(item => [
      item.itemCode,
      item.name,
      item.category,
      item.available,
      item.price,
      item.originPrice ?? 0,
      item.status,
      item.itemStatus,
      item.location ?? '',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 24 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Scaffolding');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function downloadExcel(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
