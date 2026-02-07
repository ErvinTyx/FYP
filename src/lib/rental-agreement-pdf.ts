/**
 * Generate a Rental Agreement PDF with the formal layout:
 * Header (logo area, company info, title), Owner/Hirer table, Agreement specifics,
 * Financial terms, Signatory details, Acknowledgement, Signature blocks.
 */
import { jsPDF } from 'jspdf';

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Company default (used when no separate address in agreement)
const DEFAULT_OWNER_ADDRESS = 'LOT 413-A, BATU 13 ½, JALAN SUNGAI TIRAM, 81800 ULU TIRAM, JOHOR';

export interface RentalAgreementForPDF {
  agreementNumber: string;
  poNumber?: string | null;
  projectName: string;
  owner: string;
  ownerPhone?: string | null;
  hirer: string;
  hirerPhone?: string | null;
  location?: string | null;
  termOfHire?: string | null;
  monthlyRental: number;
  securityDeposit: number;
  minimumCharges: number;
  defaultInterest: number;
  ownerSignatoryName?: string | null;
  ownerNRIC?: string | null;
  hirerSignatoryName?: string | null;
  hirerNRIC?: string | null;
  ownerSignatureDate?: string | null;
  hirerSignatureDate?: string | null;
}

function formatDate(d: string | undefined | null): string {
  if (d == null || d === '') return '';
  try {
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day} / ${month} / ${year}`;
  } catch {
    return d;
  }
}

function formatTermOfHire(term: string | undefined | null): string {
  if (!term || !term.trim()) return '-';
  const t = term.trim();
  const num = parseInt(t, 10);
  if (!Number.isNaN(num) && String(num) === t) {
    return `Minimum : ${num} month${num !== 1 ? 's' : ''}`;
  }
  return t;
}

export function generateRentalAgreementPdf(agreement: RentalAgreementForPDF): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  // ----- Header -----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Power', MARGIN, y + 5);
  doc.text('Metal & Steel', MARGIN, y + 10);

  const companyLine = 'POWER METAL & STEEL (M) SDN BHD (1308591-X)';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(companyLine, PAGE_W - MARGIN, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(DEFAULT_OWNER_ADDRESS, PAGE_W - MARGIN, y + 9, { align: 'right' });

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RENTAL AGREEMENT', PAGE_W / 2, y, { align: 'center' });
  y += 12;

  // ----- Owner | Hirer -----
  const colW = CONTENT_W / 2;
  const ownerHirerH = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.rect(MARGIN, y, colW, 8);
  doc.rect(MARGIN + colW, y, colW, 8);
  doc.text('Owner', MARGIN + colW / 2, y + 5.5, { align: 'center' });
  doc.text('Hirer', MARGIN + colW + colW / 2, y + 5.5, { align: 'center' });
  y += 8;

  doc.rect(MARGIN, y, colW, ownerHirerH);
  doc.rect(MARGIN + colW, y, colW, ownerHirerH);
  doc.setFontSize(9);
  // Owner: first line in bold/uppercase (full legal name), then address, then Tel
  doc.setFont('helvetica', 'bold');
  doc.text(agreement.owner.toUpperCase(), MARGIN + 3, y + 5, { maxWidth: colW - 6 });
  doc.setFont('helvetica', 'normal');
  doc.text(DEFAULT_OWNER_ADDRESS, MARGIN + 3, y + 10, { maxWidth: colW - 6 });
  doc.text(`Tel : ${agreement.ownerPhone || '-'}`, MARGIN + 3, y + 30, { maxWidth: colW - 6 });
  // Hirer: name, address (location), Tel
  doc.setFont('helvetica', 'bold');
  doc.text(agreement.hirer, MARGIN + colW + 3, y + 5, { maxWidth: colW - 6 });
  doc.setFont('helvetica', 'normal');
  doc.text(agreement.location || '-', MARGIN + colW + 3, y + 10, { maxWidth: colW - 6 });
  doc.text(`Tel : ${agreement.hirerPhone || '-'}`, MARGIN + colW + 3, y + 30, { maxWidth: colW - 6 });
  y += ownerHirerH + 8;

  // ----- Agreement specifics (no border; Location, Project values in bold, origin order) -----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Rental Agreement No.: ${agreement.agreementNumber}`, MARGIN, y);
  y += 6;
  // Location & Address of Goods: label normal, value bold
  doc.text('Location & Address of Goods: ', MARGIN, y);
  const locX = MARGIN + doc.getTextDimensions('Location & Address of Goods: ').w;
  doc.setFont('helvetica', 'bold');
  doc.text(agreement.location || '-', locX, y, { maxWidth: CONTENT_W - (locX - MARGIN) });
  doc.setFont('helvetica', 'normal');
  y += 6;
  const termStr = formatTermOfHire(agreement.termOfHire);
  doc.text(`Term of Hire: ${termStr}`, MARGIN, y);
  y += 6;
  doc.text(`P/O.NO.: ${agreement.poNumber || '-'}`, MARGIN, y);
  y += 6;
  doc.text('Project: ', MARGIN, y);
  const projX = MARGIN + doc.getTextDimensions('Project: ').w;
  doc.setFont('helvetica', 'bold');
  doc.text(agreement.projectName || '-', projX, y, { maxWidth: CONTENT_W - (projX - MARGIN) });
  doc.setFont('helvetica', 'normal');
  y += 8;

  // ----- Financial + Signatory combined (one two-column bordered block, like origin) -----
  const row1Y = y + 6;
  const row2Y = y + 16;
  const row3Y = y + 26;
  const row4Y = y + 36;
  const combinedH = 44;
  doc.rect(MARGIN, y, CONTENT_W, combinedH);
  doc.line(MARGIN + colW, y, MARGIN + colW, y + combinedH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const monthlyRentalFormatted = `RM ${Number(agreement.monthlyRental).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  doc.text(
    `Monthly Rental: ${monthlyRentalFormatted} As per Tax Invoice billing in the early of every month`,
    MARGIN + 3,
    row1Y,
    { maxWidth: colW - 6 }
  );
  doc.text(`Security Deposit: ${agreement.securityDeposit} MONTH`, MARGIN + colW + 3, row1Y, {
    maxWidth: colW - 6,
  });
  doc.text(
    `Minimum Charges: (${agreement.minimumCharges}) ${numberToWord(Number(agreement.minimumCharges))} months`,
    MARGIN + 3,
    row2Y,
    { maxWidth: colW - 6 }
  );
  doc.text(`Default Interest: ${agreement.defaultInterest}% per month`, MARGIN + colW + 3, row2Y, {
    maxWidth: colW - 6,
  });
  doc.text(`Name of Owner Signatory: ${agreement.ownerSignatoryName || ''}`, MARGIN + 3, row3Y, {
    maxWidth: colW - 6,
  });
  doc.text(`Name of Hirer Signatory: ${agreement.hirerSignatoryName || ''}`, MARGIN + colW + 3, row3Y, {
    maxWidth: colW - 6,
  });
  doc.text(`NRIC No: ${agreement.ownerNRIC || ''}`, MARGIN + 3, row4Y, { maxWidth: colW - 6 });
  doc.text(`NRIC No: ${agreement.hirerNRIC || ''}`, MARGIN + colW + 3, row4Y, { maxWidth: colW - 6 });
  y += combinedH + 8;

  // ----- Acknowledgement (bold: Integral, binding Owner, Owner) -----
  const ackParts = [
    { text: 'By signing below, Hirer / Guarantor acknowledge that the terms and conditions below shall form an ', bold: false },
    { text: 'Integral', bold: true },
    { text: ' part of this Agreement and that Hirer / Guarantor has read all of such terms and conditions and agrees with the same. This Agreement is not ', bold: false },
    { text: 'binding Owner', bold: true },
    { text: ' until it has been signed below by a duly authorized officer of ', bold: false },
    { text: 'Owner', bold: true },
    { text: '.', bold: false },
  ];
  const ackBoxH = 22;
  doc.rect(MARGIN, y, CONTENT_W, ackBoxH);
  doc.setFontSize(8);
  const ackMaxW = CONTENT_W - 6;
  let lineY = y + 5;
  let cursorX = MARGIN + 3;
  for (const part of ackParts) {
    doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
    const words = part.text.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const prefix = cursorX > MARGIN + 3 ? ' ' : '';
      const toDraw = prefix + word;
      const w = doc.getTextDimensions(toDraw).w;
      if (cursorX + w > PAGE_W - MARGIN - 3 && cursorX > MARGIN + 3) {
        lineY += 4;
        cursorX = MARGIN + 3;
      }
      const drawn = (cursorX > MARGIN + 3 ? ' ' : '') + word;
      doc.text(drawn, cursorX, lineY);
      cursorX += doc.getTextDimensions(drawn).w;
    }
  }
  doc.setFont('helvetica', 'normal');
  y += ackBoxH + 6;

  // ----- Signature blocks -----
  const blockH = 36;
  doc.rect(MARGIN, y, colW, blockH);
  doc.rect(MARGIN + colW, y, colW, blockH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Company Stamp & Signature of Owner Authorized Signing Officer', MARGIN + colW / 2, y + 5, {
    align: 'center',
    maxWidth: colW - 4,
  });
  doc.text('Company Stamp & Signature of Hirer Authorized Signing Officer', MARGIN + colW + colW / 2, y + 5, {
    align: 'center',
    maxWidth: colW - 4,
  });
  doc.text(`Date of Signature: ${formatDate(agreement.ownerSignatureDate)}`, MARGIN + 3, y + blockH - 5);
  doc.text(`Date of Signature: ${formatDate(agreement.hirerSignatureDate)}`, MARGIN + colW + 3, y + blockH - 5);

  return doc;
}

function numberToWord(n: number): string {
  const words: Record<number, string> = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
    6: 'SIX',
    7: 'SEVEN',
    8: 'EIGHT',
    9: 'NINE',
    10: 'TEN',
  };
  return words[n] ?? String(n);
}
