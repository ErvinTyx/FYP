import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const COMPANY_NAME = 'Power Metal & Steel Sdn Bhd';
const REPORT_TITLE = 'Rental Agreements';

export interface RentalAgreementExportRow {
  id: string;
  agreementNumber: string;
  poNumber: string;
  projectName: string;
  owner: string;
  ownerPhone: string;
  hirer: string;
  hirerPhone: string;
  location: string;
  termOfHire: string;
  monthlyRental: number;
  totalAmount?: number; // from rfq.totalAmount (Total Rental)
  securityDeposit: number;
  minimumCharges: number;
  defaultInterest: number;
  ownerSignatoryName: string;
  ownerNRIC: string;
  hirerSignatoryName: string;
  hirerNRIC: string;
  status: string;
  signedStatus?: string | null;
  currentVersion: number;
  createdAt: string;
  createdBy: string;
  depositsCount?: number;
}

const MARGIN = 14;
const ROW_HEIGHT = 7;
const HEADER_AREA = 32;
const FOOTER_AREA = 18;
const FONT_SIZE = 9;

/**
 * Generate PDF list of rental agreements. Header: company name, title, date. Footer: company name, page number.
 */
export function generateRentalAgreementListPdf(items: RentalAgreementExportRow[]): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentTop = MARGIN + HEADER_AREA;
  const contentBottom = pageHeight - FOOTER_AREA;

  const colWidths = [22, 22, 28, 24, 34, 36, 34, 18, 16, 18]; // agreementNumber, poNumber, projectName, hirer, termOfHire, monthlyRental (wider), totalRental, status, version, createdAt
  const headers = ['Agreement No', 'P/O No', 'Project Name', 'Hirer', 'Term of Hire', 'Monthly Rental (RM)', 'Total Rental (RM)', 'Status', 'Ver', 'Created'];

  function drawPageHeader() {
    doc.setFontSize(14);
    doc.setTextColor(35, 31, 32);
    doc.text(COMPANY_NAME, pageWidth / 2, MARGIN + 6, { align: 'center' });
    doc.setFontSize(11);
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
  drawPageHeader();
  let y = contentTop;
  doc.setFontSize(FONT_SIZE);

  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN, y - 5, pageWidth - 2 * MARGIN, ROW_HEIGHT, 'F');
  doc.setTextColor(35, 31, 32);
  doc.setFont('helvetica', 'bold');
  let x = MARGIN + 2;
  headers.forEach((h, i) => {
    doc.text(String(h ?? ''), x, y);
    x += colWidths[i];
  });
  doc.setFont('helvetica', 'normal');
  y += ROW_HEIGHT + 2;

  for (const item of items) {
    if (y + ROW_HEIGHT > contentBottom) {
      drawPageFooter(pageNum);
      doc.addPage('a4', 'landscape');
      pageNum++;
      drawPageHeader();
      y = contentTop;
      doc.setFillColor(243, 244, 246);
      doc.rect(MARGIN, y - 5, pageWidth - 2 * MARGIN, ROW_HEIGHT, 'F');
      doc.setFont('helvetica', 'bold');
      x = MARGIN + 2;
      headers.forEach((h, i) => {
        doc.text(String(h ?? ''), x, y);
        x += colWidths[i];
      });
      doc.setFont('helvetica', 'normal');
      y += ROW_HEIGHT + 2;
    }
    doc.setTextColor(17, 24, 39);
    x = MARGIN + 2;
    const row = [
      item.agreementNumber,
      item.poNumber,
      item.projectName.slice(0, 22),
      item.hirer.slice(0, 20),
      item.termOfHire.slice(0, 28),
      item.monthlyRental.toFixed(2),
      item.totalAmount != null ? item.totalAmount.toFixed(2) : '—',
      item.status,
      String(item.currentVersion),
      item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : '',
    ];
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), x, y);
      x += colWidths[i];
    });
    y += ROW_HEIGHT;
  }

  drawPageFooter(pageNum);
  return doc;
}

/**
 * Generate detailed Excel: one row per agreement with many columns (all key fields).
 */
export function generateRentalAgreementExcel(items: RentalAgreementExportRow[]): Blob {
  const wb = XLSX.utils.book_new();
  const headers = [
    'Agreement Number',
    'P/O Number',
    'Project Name',
    'Owner',
    'Owner Phone',
    'Hirer',
    'Hirer Phone',
    'Location',
    'Term of Hire',
    'Monthly Rental (RM)',
    'Security Deposit (RM)',
    'Minimum Charges (months)',
    'Default Interest (%)',
    'Owner Signatory Name',
    'Owner NRIC',
    'Hirer Signatory Name',
    'Hirer NRIC',
    'Status',
    'Signed Status',
    'Current Version',
    'Deposits Count',
    'Created At',
    'Created By',
  ];
  const data = [
    [COMPANY_NAME],
    [REPORT_TITLE],
    [`Export Date: ${format(new Date(), 'dd/MM/yyyy')}`],
    [],
    headers,
    ...items.map((item) => [
      item.agreementNumber,
      item.poNumber,
      item.projectName,
      item.owner,
      item.ownerPhone,
      item.hirer,
      item.hirerPhone,
      item.location,
      item.termOfHire,
      item.monthlyRental,
      item.securityDeposit,
      item.minimumCharges,
      item.defaultInterest,
      item.ownerSignatoryName,
      item.ownerNRIC,
      item.hirerSignatoryName,
      item.hirerNRIC,
      item.status,
      item.signedStatus ?? '',
      item.currentVersion,
      item.depositsCount ?? 0,
      item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm') : '',
      item.createdBy,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 14 },
    { wch: 24 }, { wch: 14 }, { wch: 32 }, { wch: 24 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 16 },
    { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
    { wch: 10 }, { wch: 18 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Rental Agreements');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadRentalAgreementPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function downloadRentalAgreementExcel(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
