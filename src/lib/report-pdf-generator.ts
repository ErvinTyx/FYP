import jsPDF from 'jspdf';
import type {
  RentalPerformanceData,
  RentalPerformanceSummary,
  InventoryUtilizationData,
  InventoryUtilizationSummary,
  FinancialMonthlyData,
  CustomerPaymentData,
  FinancialSummary,
  ProjectFinancialReportRow,
  CustomerRentalBehaviourRow,
  InventoryUtilizationRow,
  MaintenanceRecordRow,
  DeliveryPerformanceRow,
  RentalDurationRow,
  CustomerCreditRiskRow,
} from '@/types/report';
import { formatRfqDate } from './rfqDate';

const BRAND_COLOR = '#F15929';
const TEXT_COLOR = '#231F20';
const GRAY_COLOR = '#6B7280';
const LIGHT_GRAY = '#F9FAFB';

interface PDFGeneratorOptions {
  title: string;
  subtitle?: string;
  dateRange?: { from?: Date; to?: Date };
}

export class ReportPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 0;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.currentY = this.margin;
  }

  private addHeader(options: PDFGeneratorOptions) {
    // Company name
    this.doc.setFontSize(24);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Power Metal & Steel', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;

    // Report title
    this.doc.setFontSize(18);
    this.doc.setTextColor(BRAND_COLOR);
    this.doc.text(options.title, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    // Subtitle / date
    this.doc.setFontSize(10);
    this.doc.setTextColor(GRAY_COLOR);
    const generatedText = `Generated on ${new Date().toLocaleDateString('en-MY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
    this.doc.text(generatedText, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 5;

    if (options.dateRange?.from && options.dateRange?.to) {
      const rangeText = `Period: ${formatRfqDate(options.dateRange.from)} - ${formatRfqDate(options.dateRange.to)}`;
      this.doc.text(rangeText, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 5;
    }

    // Divider line
    this.doc.setDrawColor(BRAND_COLOR);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  private addSummaryCards(cards: { label: string; value: string; subtext?: string }[]) {
    const cardWidth = (this.pageWidth - this.margin * 2 - (cards.length - 1) * 5) / cards.length;
    const cardHeight = 20;
    let x = this.margin;

    for (const card of cards) {
      // Card background
      this.doc.setFillColor(LIGHT_GRAY);
      this.doc.setDrawColor(BRAND_COLOR);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 2, 2, 'FD');

      // Left border accent
      this.doc.setFillColor(BRAND_COLOR);
      this.doc.rect(x, this.currentY, 1.5, cardHeight, 'F');

      // Label
      this.doc.setFontSize(8);
      this.doc.setTextColor(GRAY_COLOR);
      this.doc.text(card.label, x + 5, this.currentY + 6);

      // Value
      this.doc.setFontSize(14);
      this.doc.setTextColor(TEXT_COLOR);
      this.doc.text(card.value, x + 5, this.currentY + 14);

      x += cardWidth + 5;
    }

    this.currentY += cardHeight + 10;
  }

  private addTable(
    headers: string[],
    rows: (string | number)[][],
    columnWidths?: number[]
  ) {
    const tableWidth = this.pageWidth - this.margin * 2;
    const defaultColWidth = tableWidth / headers.length;
    const colWidths = columnWidths || headers.map(() => defaultColWidth);
    const rowHeight = 8;
    let x = this.margin;

    // Check if we need a new page
    if (this.currentY + rowHeight * (rows.length + 1) > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    // Header row
    this.doc.setFillColor(LIGHT_GRAY);
    this.doc.rect(this.margin, this.currentY, tableWidth, rowHeight, 'F');
    this.doc.setFontSize(9);
    this.doc.setTextColor(TEXT_COLOR);

    for (let i = 0; i < headers.length; i++) {
      this.doc.text(headers[i], x + 2, this.currentY + 5.5);
      x += colWidths[i];
    }
    this.currentY += rowHeight;

    // Data rows
    this.doc.setFontSize(8);
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      x = this.margin;

      // Check for page break
      if (this.currentY + rowHeight > this.pageHeight - this.margin) {
        this.doc.addPage();
        this.currentY = this.margin;
        
        // Repeat header on new page
        this.doc.setFillColor(LIGHT_GRAY);
        this.doc.rect(this.margin, this.currentY, tableWidth, rowHeight, 'F');
        this.doc.setFontSize(9);
        x = this.margin;
        for (let i = 0; i < headers.length; i++) {
          this.doc.text(headers[i], x + 2, this.currentY + 5.5);
          x += colWidths[i];
        }
        this.currentY += rowHeight;
        x = this.margin;
        this.doc.setFontSize(8);
      }

      // Alternate row background
      if (rowIndex % 2 === 1) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(this.margin, this.currentY, tableWidth, rowHeight, 'F');
      }

      // Draw row border
      this.doc.setDrawColor(229, 231, 235);
      this.doc.setLineWidth(0.1);
      this.doc.line(this.margin, this.currentY + rowHeight, this.pageWidth - this.margin, this.currentY + rowHeight);

      this.doc.setTextColor(TEXT_COLOR);
      for (let i = 0; i < row.length; i++) {
        const cellValue = String(row[i]);
        const truncated = cellValue.length > 25 ? cellValue.substring(0, 22) + '...' : cellValue;
        this.doc.text(truncated, x + 2, this.currentY + 5.5);
        x += colWidths[i];
      }
      this.currentY += rowHeight;
    }

    this.currentY += 5;
  }

  private addFooter() {
    const footerY = this.pageHeight - 10;
    this.doc.setFontSize(8);
    this.doc.setTextColor(GRAY_COLOR);
    this.doc.text(
      'Power Metal & Steel - Scaffolding Rental Management System',
      this.pageWidth / 2,
      footerY,
      { align: 'center' }
    );

    // Page numbers
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.margin, footerY, { align: 'right' });
    }
  }

  // Rental Performance Report
  generateRentalPerformanceReport(
    data: RentalPerformanceData[],
    summary: RentalPerformanceSummary,
    options: PDFGeneratorOptions
  ): Blob {
    this.addHeader(options);

    this.addSummaryCards([
      { label: 'Total Rentals', value: summary.totalRentals.toLocaleString() },
      { label: 'Total Revenue', value: `RM ${summary.totalRevenue.toLocaleString()}` },
      { label: 'Avg Duration', value: `${summary.avgDuration} days` },
      { label: 'Avg Utilization', value: `${summary.avgUtilization}%` },
    ]);

    // Section title
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Performance Details', this.margin, this.currentY);
    this.currentY += 8;

    const headers = ['Item Code', 'Item Name', 'Category', 'Rentals', 'Revenue (RM)', 'Avg Duration', 'Utilization', 'Qty'];
    const rows = data.map(item => [
      item.itemCode,
      item.itemName,
      item.category,
      item.totalRentals,
      item.totalRevenue.toLocaleString(),
      `${item.avgRentalDuration} days`,
      `${item.utilizationRate}%`,
      `${item.quantityRented}/${item.totalQuantity}`,
    ]);

    this.addTable(headers, rows, [25, 70, 30, 20, 35, 30, 25, 25]);
    this.addFooter();

    return this.doc.output('blob');
  }

  // Inventory Utilization Report
  generateInventoryUtilizationReport(
    data: InventoryUtilizationData[],
    summary: InventoryUtilizationSummary,
    options: PDFGeneratorOptions
  ): Blob {
    this.addHeader(options);

    this.addSummaryCards([
      { label: 'Total Items', value: summary.totalItems.toLocaleString() },
      { label: 'In Use', value: summary.totalInUse.toLocaleString() },
      { label: 'Idle', value: summary.totalIdle.toLocaleString() },
      { label: 'Avg Utilization', value: `${summary.avgUtilization}%` },
      { label: 'Avg Idle Days', value: String(summary.avgIdleDays) },
    ]);

    // Section title
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Utilization Details', this.margin, this.currentY);
    this.currentY += 8;

    const headers = ['Item Code', 'Item Name', 'Category', 'Total', 'In Use', 'Idle', 'Utilization', 'Idle Days', 'Location'];
    const rows = data.map(item => [
      item.itemCode,
      item.itemName,
      item.category,
      item.totalQuantity,
      item.inUse,
      item.idle,
      `${item.utilizationRate}%`,
      item.avgIdleDays,
      item.location,
    ]);

    this.addTable(headers, rows, [25, 60, 30, 20, 20, 20, 25, 25, 30]);
    this.addFooter();

    return this.doc.output('blob');
  }

  // Financial Report
  generateFinancialReport(
    monthlyData: FinancialMonthlyData[],
    customerData: CustomerPaymentData[],
    summary: FinancialSummary,
    options: PDFGeneratorOptions
  ): Blob {
    this.addHeader(options);

    this.addSummaryCards([
      { label: 'Total Invoiced', value: `RM ${summary.totalInvoiced.toLocaleString()}` },
      { label: 'Total Paid', value: `RM ${summary.totalPaid.toLocaleString()}` },
      { label: 'Outstanding', value: `RM ${summary.totalOutstanding.toLocaleString()}` },
      { label: 'Overdue', value: `RM ${summary.totalOverdue.toLocaleString()}` },
      { label: 'Payment Rate', value: `${summary.avgPaymentRate}%` },
    ]);

    // Monthly Summary section
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Monthly Summary', this.margin, this.currentY);
    this.currentY += 8;

    const monthlyHeaders = ['Period', 'Invoiced (RM)', 'Paid (RM)', 'Outstanding (RM)', 'Overdue (RM)', 'Rate', 'Invoices', 'Status'];
    const monthlyRows = monthlyData.slice(0, 6).map(item => [
      item.month,
      item.totalInvoiced.toLocaleString(),
      item.totalPaid.toLocaleString(),
      item.outstandingAmount.toLocaleString(),
      item.overdueAmount.toLocaleString(),
      `${item.paymentRate}%`,
      item.numberOfInvoices,
      item.status,
    ]);

    this.addTable(monthlyHeaders, monthlyRows, [45, 35, 35, 35, 35, 20, 25, 25]);

    // Customer Payment section
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Customer Payment Status', this.margin, this.currentY);
    this.currentY += 8;

    const customerHeaders = ['Customer', 'Invoiced (RM)', 'Paid (RM)', 'Outstanding (RM)', 'Overdue Days', 'Invoices', 'Status'];
    const customerRows = customerData.slice(0, 10).map(item => [
      item.customerName,
      item.totalInvoiced.toLocaleString(),
      item.totalPaid.toLocaleString(),
      item.outstanding.toLocaleString(),
      item.overdueDays || '-',
      item.numberOfInvoices,
      item.status,
    ]);

    this.addTable(customerHeaders, customerRows, [60, 35, 35, 35, 30, 25, 25]);
    this.addFooter();

    return this.doc.output('blob');
  }

  generateFinancialProfitabilityReport(data: ProjectFinancialReportRow[], options: PDFGeneratorOptions): Blob {
    this.addHeader(options);
    const totalRevenue = data.reduce((s, r) => s + r.total_rental_revenue, 0);
    const totalProfit = data.reduce((s, r) => s + r.net_profit, 0);
    this.addSummaryCards([
      { label: 'Total Revenue', value: `RM ${totalRevenue.toLocaleString()}` },
      { label: 'Total Profit', value: `RM ${totalProfit.toLocaleString()}` },
    ]);
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Project Financial Details', this.margin, this.currentY);
    this.currentY += 8;
    const headers = ['Project', 'Customer', 'Revenue', 'Costs', 'Net Profit', 'Margin'];
    const rows = data.slice(0, 20).map(r => [r.project_id.slice(0, 8), r.customer_id.slice(0, 15), r.total_rental_revenue.toLocaleString(), (r.total_repair_cost + r.total_damage_cost + r.transportation_cost).toLocaleString(), r.net_profit.toLocaleString(), `${r.profit_margin}%`]);
    this.addTable(headers, rows, [30, 45, 35, 35, 35, 25]);
    this.addFooter();
    return this.doc.output('blob');
  }

  generateCustomerBehaviourReport(data: CustomerRentalBehaviourRow[], options: PDFGeneratorOptions): Blob {
    this.addHeader(options);
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Customer Rental Behaviour', this.margin, this.currentY);
    this.currentY += 8;
    const headers = ['Customer', 'Industry', 'Projects', 'Value (RM)', 'Frequency', 'Last Rental'];
    const rows = data.slice(0, 25).map(r => [r.customer_name.slice(0, 20), r.industry_type, r.total_projects, r.total_rental_value.toLocaleString(), r.rental_frequency, r.last_rental_date ?? '-']);
    this.addTable(headers, rows, [50, 35, 25, 40, 30, 25]);
    this.addFooter();
    return this.doc.output('blob');
  }

  generateInventoryUtilizationReportNew(data: InventoryUtilizationRow[], options: PDFGeneratorOptions): Blob {
    this.addHeader(options);
    const totalItems = data.reduce((s, r) => s + r.total_quantity, 0);
    const avgUtil = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.utilization_rate, 0) / data.length) : 0;
    this.addSummaryCards([
      { label: 'Total Items', value: totalItems.toLocaleString() },
      { label: 'Avg Utilization', value: `${avgUtil}%` },
    ]);
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Inventory Utilization', this.margin, this.currentY);
    this.currentY += 8;
    const headers = ['Item', 'Category', 'Total', 'Rented', 'Util %', 'Idle Days'];
    const rows = data.slice(0, 25).map(r => [r.item_name.slice(0, 25), r.category, r.total_quantity, r.rented_quantity, `${r.utilization_rate}%`, r.idle_days]);
    this.addTable(headers, rows, [60, 35, 25, 25, 25, 25]);
    this.addFooter();
    return this.doc.output('blob');
  }

  generateMaintenanceRepairReport(data: MaintenanceRecordRow[], options: PDFGeneratorOptions): Blob {
    this.addHeader(options);
    const totalCost = data.reduce((s, r) => s + r.repair_cost, 0);
    this.addSummaryCards([{ label: 'Total Repairs', value: String(data.length) }, { label: 'Total Cost', value: `RM ${totalCost.toLocaleString()}` }]);
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Maintenance Records', this.margin, this.currentY);
    this.currentY += 8;
    const headers = ['Repair ID', 'Item', 'Type', 'Date', 'Cost', 'Status'];
    const rows = data.slice(0, 25).map(r => [r.repair_id, r.item_id.slice(0, 8), r.damage_type.slice(0, 15), r.repair_date, r.repair_cost.toLocaleString(), r.repair_status]);
    this.addTable(headers, rows, [30, 30, 40, 25, 35, 25]);
    this.addFooter();
    return this.doc.output('blob');
  }

  generateDeliveryLogisticsReport(data: DeliveryPerformanceRow[], options: PDFGeneratorOptions): Blob {
    this.addHeader(options);
    const totalCost = data.reduce((s, r) => s + r.transportation_cost, 0);
    const avgDelay = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.delay_days, 0) / data.length) : 0;
    this.addSummaryCards([{ label: 'Deliveries', value: String(data.length) }, { label: 'Avg Delay (days)', value: String(avgDelay) }, { label: 'Total Transport Cost', value: `RM ${totalCost.toLocaleString()}` }]);
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Delivery Performance', this.margin, this.currentY);
    this.currentY += 8;
    const headers = ['Delivery', 'Driver', 'Del Date', 'Pickup', 'Delay', 'Cost', 'Status'];
    const rows = data.slice(0, 25).map(r => [r.delivery_id.slice(0, 8), r.driver_id.slice(0, 15), r.delivery_date, r.pickup_date, r.delay_days, r.transportation_cost.toLocaleString(), r.delivery_status]);
    this.addTable(headers, rows, [30, 40, 25, 25, 20, 35, 30]);
    this.addFooter();
    return this.doc.output('blob');
  }

  generateRentalDurationReport(data: RentalDurationRow[], options: PDFGeneratorOptions): Blob {
    this.addHeader(options);
    const avgDays = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.rental_days, 0) / data.length) : 0;
    this.addSummaryCards([{ label: 'Total Rentals', value: String(data.length) }, { label: 'Avg Duration (days)', value: String(avgDays) }]);
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Rental Duration Details', this.margin, this.currentY);
    this.currentY += 8;
    const headers = ['Rental', 'Item', 'Start', 'End', 'Days', 'Early Return'];
    const rows = data.slice(0, 25).map(r => [r.rental_id.slice(0, 12), r.item_id.slice(0, 8), r.rental_start, r.rental_end, r.rental_days, r.early_return]);
    this.addTable(headers, rows, [35, 30, 25, 25, 20, 25]);
    this.addFooter();
    return this.doc.output('blob');
  }

  generateCreditRiskReport(data: CustomerCreditRiskRow[], options: PDFGeneratorOptions): Blob {
    this.addHeader(options);
    const totalOut = data.reduce((s, r) => s + r.outstanding_balance, 0);
    const highCount = data.filter(r => r.risk_level === 'High').length;
    this.addSummaryCards([{ label: 'High Risk', value: String(highCount) }, { label: 'Total Outstanding', value: `RM ${totalOut.toLocaleString()}` }]);
    this.doc.setFontSize(12);
    this.doc.setTextColor(TEXT_COLOR);
    this.doc.text('Customer Credit Risk', this.margin, this.currentY);
    this.currentY += 8;
    const headers = ['Customer', 'Outstanding', 'Overdue', 'Aging Days', 'Risk'];
    const rows = data.slice(0, 25).map(r => [r.customer_id.slice(0, 25), r.outstanding_balance.toLocaleString(), r.overdue_amount.toLocaleString(), r.aging_days, r.risk_level]);
    this.addTable(headers, rows, [55, 40, 40, 30, 25]);
    this.addFooter();
    return this.doc.output('blob');
  }
}

// Utility function to trigger download
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
