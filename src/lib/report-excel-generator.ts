import * as XLSX from 'xlsx';
import type {
  RentalPerformanceData,
  RentalPerformanceSummary,
  RentalPerformanceByCategory,
  InventoryUtilizationData,
  InventoryUtilizationSummary,
  UtilizationByCategory,
  FinancialMonthlyData,
  CustomerPaymentData,
  FinancialSummary,
} from '@/types/report';
import { formatRfqDate } from './rfqDate';

interface ExcelGeneratorOptions {
  title: string;
  dateRange?: { from?: Date; to?: Date };
}

// Utility to set column widths
function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// Create styled header row
function createHeaderRow(headers: string[]): string[] {
  return headers;
}

// Rental Performance Excel Export
export function generateRentalPerformanceExcel(
  data: RentalPerformanceData[],
  summary: RentalPerformanceSummary,
  byCategory: RentalPerformanceByCategory[],
  options: ExcelGeneratorOptions
): Blob {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Power Metal & Steel'],
    [options.title],
    [`Generated: ${formatRfqDate(new Date())}`],
    options.dateRange?.from && options.dateRange?.to
      ? [`Period: ${formatRfqDate(options.dateRange.from)} - ${formatRfqDate(options.dateRange.to)}`]
      : [''],
    [''],
    ['SUMMARY'],
    ['Metric', 'Value'],
    ['Total Rentals', summary.totalRentals],
    ['Total Revenue (RM)', summary.totalRevenue],
    ['Average Duration (days)', summary.avgDuration],
    ['Average Utilization (%)', summary.avgUtilization],
    [''],
    ['REVENUE BY CATEGORY'],
    ['Category', 'Revenue (RM)', 'Rentals'],
    ...byCategory.map(c => [c.category, c.revenue, c.rentals]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  setColumnWidths(summarySheet, [25, 20, 15]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Detail Sheet
  const detailHeaders = [
    'Item Code',
    'Item Name',
    'Category',
    'Total Rentals',
    'Revenue (RM)',
    'Avg Duration (days)',
    'Utilization (%)',
    'Qty Rented',
    'Total Qty',
  ];

  const detailData = [
    createHeaderRow(detailHeaders),
    ...data.map(item => [
      item.itemCode,
      item.itemName,
      item.category,
      item.totalRentals,
      item.totalRevenue,
      item.avgRentalDuration,
      item.utilizationRate,
      item.quantityRented,
      item.totalQuantity,
    ]),
  ];

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  setColumnWidths(detailSheet, [15, 40, 15, 15, 15, 18, 15, 12, 12]);
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Performance Details');

  // Generate blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Inventory Utilization Excel Export
export function generateInventoryUtilizationExcel(
  data: InventoryUtilizationData[],
  summary: InventoryUtilizationSummary,
  byCategory: UtilizationByCategory[],
  options: ExcelGeneratorOptions
): Blob {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Power Metal & Steel'],
    [options.title],
    [`Generated: ${formatRfqDate(new Date())}`],
    options.dateRange?.from && options.dateRange?.to
      ? [`Period: ${formatRfqDate(options.dateRange.from)} - ${formatRfqDate(options.dateRange.to)}`]
      : [''],
    [''],
    ['SUMMARY'],
    ['Metric', 'Value'],
    ['Total Items', summary.totalItems],
    ['Items In Use', summary.totalInUse],
    ['Idle Items', summary.totalIdle],
    ['Average Utilization (%)', summary.avgUtilization],
    ['Average Idle Days', summary.avgIdleDays],
    ['Total Value (RM)', summary.totalValue],
    ['Idle Value (RM)', summary.idleValue],
    [''],
    ['UTILIZATION BY CATEGORY'],
    ['Category', 'Total', 'In Use', 'Idle', 'Utilization (%)'],
    ...byCategory.map(c => [c.category, c.total, c.inUse, c.idle, c.utilizationRate]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  setColumnWidths(summarySheet, [25, 15, 15, 15, 18]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Detail Sheet
  const detailHeaders = [
    'Item Code',
    'Item Name',
    'Category',
    'Total Qty',
    'In Use',
    'Idle',
    'Utilization (%)',
    'Avg Idle Days',
    'Location',
    'Condition',
    'Unit Price (RM)',
  ];

  const detailData = [
    createHeaderRow(detailHeaders),
    ...data.map(item => [
      item.itemCode,
      item.itemName,
      item.category,
      item.totalQuantity,
      item.inUse,
      item.idle,
      item.utilizationRate,
      item.avgIdleDays,
      item.location,
      item.condition,
      item.price,
    ]),
  ];

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  setColumnWidths(detailSheet, [15, 40, 15, 12, 10, 10, 15, 15, 15, 18, 15]);
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Utilization Details');

  // Idle Items Alert Sheet
  const idleItems = data.filter(item => item.avgIdleDays > 30);
  if (idleItems.length > 0) {
    const idleHeaders = ['Item Code', 'Item Name', 'Idle Qty', 'Idle Days', 'Location', 'Idle Value (RM)'];
    const idleData = [
      ['IDLE INVENTORY ALERT'],
      [`Items idle for more than 30 days: ${idleItems.length}`],
      [''],
      createHeaderRow(idleHeaders),
      ...idleItems.map(item => [
        item.itemCode,
        item.itemName,
        item.idle,
        item.avgIdleDays,
        item.location,
        item.idle * item.price,
      ]),
    ];

    const idleSheet = XLSX.utils.aoa_to_sheet(idleData);
    setColumnWidths(idleSheet, [15, 40, 12, 12, 15, 18]);
    XLSX.utils.book_append_sheet(wb, idleSheet, 'Idle Alerts');
  }

  // Generate blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Financial Report Excel Export
export function generateFinancialExcel(
  monthlyData: FinancialMonthlyData[],
  customerData: CustomerPaymentData[],
  summary: FinancialSummary,
  options: ExcelGeneratorOptions
): Blob {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summarySheetData = [
    ['Power Metal & Steel'],
    [options.title],
    [`Generated: ${formatRfqDate(new Date())}`],
    options.dateRange?.from && options.dateRange?.to
      ? [`Period: ${formatRfqDate(options.dateRange.from)} - ${formatRfqDate(options.dateRange.to)}`]
      : [''],
    [''],
    ['FINANCIAL SUMMARY'],
    ['Metric', 'Value'],
    ['Total Invoiced (RM)', summary.totalInvoiced],
    ['Total Paid (RM)', summary.totalPaid],
    ['Total Outstanding (RM)', summary.totalOutstanding],
    ['Total Overdue (RM)', summary.totalOverdue],
    ['Total Deposits (RM)', summary.totalDeposits],
    ['Total Credit Notes (RM)', summary.totalCreditNotes],
    ['Average Payment Rate (%)', summary.avgPaymentRate],
    ['Total Customers', summary.totalCustomers],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
  setColumnWidths(summarySheet, [25, 20]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Monthly Summary Sheet
  const monthlyHeaders = [
    'Period',
    'Total Invoiced (RM)',
    'Total Paid (RM)',
    'Outstanding (RM)',
    'Overdue (RM)',
    'Deposits (RM)',
    'Credit Notes (RM)',
    'Invoices',
    'Customers',
    'Payment Rate (%)',
    'Status',
  ];

  const monthlySheetData = [
    createHeaderRow(monthlyHeaders),
    ...monthlyData.map(item => [
      item.month,
      item.totalInvoiced,
      item.totalPaid,
      item.outstandingAmount,
      item.overdueAmount,
      item.depositAmount,
      item.creditNoteAmount,
      item.numberOfInvoices,
      item.numberOfCustomers,
      item.paymentRate,
      item.status,
    ]),
  ];

  const monthlySheet = XLSX.utils.aoa_to_sheet(monthlySheetData);
  setColumnWidths(monthlySheet, [20, 18, 15, 15, 15, 15, 15, 12, 12, 15, 12]);
  XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly Summary');

  // Customer Payment Sheet
  const customerHeaders = [
    'Customer ID',
    'Customer Name',
    'Email',
    'Total Invoiced (RM)',
    'Total Paid (RM)',
    'Outstanding (RM)',
    'Overdue Days',
    'Last Payment',
    'Invoices',
    'Deposits Paid (RM)',
    'Deposits Outstanding (RM)',
    'Status',
  ];

  const customerSheetData = [
    createHeaderRow(customerHeaders),
    ...customerData.map(item => [
      item.customerId,
      item.customerName,
      item.customerEmail,
      item.totalInvoiced,
      item.totalPaid,
      item.outstanding,
      item.overdueDays,
      item.lastPaymentDate ? formatRfqDate(item.lastPaymentDate) : '-',
      item.numberOfInvoices,
      item.depositsPaid,
      item.depositsOutstanding,
      item.status,
    ]),
  ];

  const customerSheet = XLSX.utils.aoa_to_sheet(customerSheetData);
  setColumnWidths(customerSheet, [12, 30, 25, 18, 15, 15, 12, 15, 10, 18, 20, 12]);
  XLSX.utils.book_append_sheet(wb, customerSheet, 'Customer Payments');

  // Overdue Customers Alert Sheet
  const overdueCustomers = customerData.filter(c => c.status === 'Critical' || c.status === 'Overdue');
  if (overdueCustomers.length > 0) {
    const overdueHeaders = ['Customer', 'Outstanding (RM)', 'Overdue Days', 'Status', 'Action Required'];
    const overdueSheetData = [
      ['OVERDUE PAYMENT ALERTS'],
      [`Customers with overdue payments: ${overdueCustomers.length}`],
      [''],
      createHeaderRow(overdueHeaders),
      ...overdueCustomers.map(c => [
        c.customerName,
        c.outstanding,
        c.overdueDays,
        c.status,
        c.status === 'Critical' ? 'URGENT - Escalate' : 'Follow up required',
      ]),
    ];

    const overdueSheet = XLSX.utils.aoa_to_sheet(overdueSheetData);
    setColumnWidths(overdueSheet, [30, 18, 15, 12, 25]);
    XLSX.utils.book_append_sheet(wb, overdueSheet, 'Overdue Alerts');
  }

  // Generate blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Utility function to trigger download
export function downloadExcel(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
