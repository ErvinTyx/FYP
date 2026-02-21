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
  ProjectFinancialReportRow,
  CustomerRentalBehaviourRow,
  InventoryUtilizationRow,
  MaintenanceRecordRow,
  DeliveryPerformanceRow,
  RentalDurationRow,
  CustomerCreditRiskRow,
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

// Financial & Profitability Report Excel
export function generateFinancialProfitabilityExcel(
  data: ProjectFinancialReportRow[],
  options: ExcelGeneratorOptions
): Blob {
  const wb = XLSX.utils.book_new();
  const summaryData = [
    ['Power Metal & Steel'],
    [options.title],
    [`Generated: ${formatRfqDate(new Date())}`],
    options.dateRange?.from && options.dateRange?.to ? [`Period: ${formatRfqDate(options.dateRange.from)} - ${formatRfqDate(options.dateRange.to)}`] : [''],
    [''],
    ['PROJECT FINANCIAL REPORT'],
  ];
  const headers = ['Project ID', 'Customer', 'Start', 'End', 'Revenue', 'Repair', 'Damage', 'Transport', 'Net Profit', 'Margin %'];
  const rows = data.map(r => [r.project_id, r.customer_id, r.project_start_date, r.project_end_date, r.total_rental_revenue, r.total_repair_cost, r.total_damage_cost, r.transportation_cost, r.net_profit, r.profit_margin]);
  const sheet = XLSX.utils.aoa_to_sheet([...summaryData, createHeaderRow(headers), ...rows]);
  setColumnWidths(sheet, [20, 30, 12, 12, 15, 15, 15, 15, 15, 12]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Financial Profitability');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Customer Behaviour Report Excel
export function generateCustomerBehaviourExcel(data: CustomerRentalBehaviourRow[], options: ExcelGeneratorOptions): Blob {
  const wb = XLSX.utils.book_new();
  const headers = ['Customer ID', 'Name', 'Industry', 'Projects', 'Total Value', 'Frequency', 'Last Rental'];
  const rows = data.map(r => [r.customer_id, r.customer_name, r.industry_type, r.total_projects, r.total_rental_value, r.rental_frequency, r.last_rental_date ?? '']);
  const sheet = XLSX.utils.aoa_to_sheet([[options.title], ['Generated: ' + formatRfqDate(new Date())], [], createHeaderRow(headers), ...rows]);
  setColumnWidths(sheet, [20, 35, 15, 12, 18, 15, 15]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Customer Behaviour');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Inventory Utilization (new schema) Excel
export function generateInventoryUtilizationReportExcel(data: InventoryUtilizationRow[], options: ExcelGeneratorOptions): Blob {
  const wb = XLSX.utils.book_new();
  const headers = ['Item ID', 'Item Name', 'Category', 'Total Qty', 'Rented', 'Utilization %', 'Idle Days'];
  const rows = data.map(r => [r.item_id, r.item_name, r.category, r.total_quantity, r.rented_quantity, r.utilization_rate, r.idle_days]);
  const sheet = XLSX.utils.aoa_to_sheet([[options.title], ['Generated: ' + formatRfqDate(new Date())], [], createHeaderRow(headers), ...rows]);
  setColumnWidths(sheet, [25, 40, 20, 12, 12, 15, 12]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Inventory Utilization');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Maintenance Repair Report Excel
export function generateMaintenanceRepairExcel(data: MaintenanceRecordRow[], options: ExcelGeneratorOptions): Blob {
  const wb = XLSX.utils.book_new();
  const headers = ['Repair ID', 'Item ID', 'Damage Type', 'Date', 'Cost', 'Status', 'Downtime Days', 'Technician'];
  const rows = data.map(r => [r.repair_id, r.item_id, r.damage_type, r.repair_date, r.repair_cost, r.repair_status, r.downtime_days, r.technician ?? '']);
  const sheet = XLSX.utils.aoa_to_sheet([[options.title], ['Generated: ' + formatRfqDate(new Date())], [], createHeaderRow(headers), ...rows]);
  setColumnWidths(sheet, [20, 25, 25, 12, 15, 15, 15, 25]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Maintenance Repair');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Delivery Logistics Report Excel
export function generateDeliveryLogisticsExcel(data: DeliveryPerformanceRow[], options: ExcelGeneratorOptions): Blob {
  const wb = XLSX.utils.book_new();
  const headers = ['Delivery ID', 'Project', 'Driver', 'Delivery Date', 'Pickup Date', 'Delay Days', 'Transport Cost', 'Status'];
  const rows = data.map(r => [r.delivery_id, r.project_id, r.driver_id, r.delivery_date, r.pickup_date, r.delay_days, r.transportation_cost, r.delivery_status]);
  const sheet = XLSX.utils.aoa_to_sheet([[options.title], ['Generated: ' + formatRfqDate(new Date())], [], createHeaderRow(headers), ...rows]);
  setColumnWidths(sheet, [25, 25, 25, 15, 15, 12, 18, 20]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Delivery Logistics');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Rental Duration Report Excel
export function generateRentalDurationExcel(data: RentalDurationRow[], options: ExcelGeneratorOptions): Blob {
  const wb = XLSX.utils.book_new();
  const headers = ['Rental ID', 'Item ID', 'Project', 'Start', 'End', 'Days', 'Extensions', 'Early Return'];
  const rows = data.map(r => [r.rental_id, r.item_id, r.project_id, r.rental_start, r.rental_end, r.rental_days, r.extension_days, r.early_return]);
  const sheet = XLSX.utils.aoa_to_sheet([[options.title], ['Generated: ' + formatRfqDate(new Date())], [], createHeaderRow(headers), ...rows]);
  setColumnWidths(sheet, [35, 25, 25, 12, 12, 10, 12, 15]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Rental Duration');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Credit Risk Report Excel
export function generateCreditRiskExcel(data: CustomerCreditRiskRow[], options: ExcelGeneratorOptions): Blob {
  const wb = XLSX.utils.book_new();
  const headers = ['Customer', 'Credit Limit', 'Outstanding', 'Overdue', 'Aging Days', 'Risk Level'];
  const rows = data.map(r => [r.customer_id, r.credit_limit, r.outstanding_balance, r.overdue_amount, r.aging_days, r.risk_level]);
  const sheet = XLSX.utils.aoa_to_sheet([[options.title], ['Generated: ' + formatRfqDate(new Date())], [], createHeaderRow(headers), ...rows]);
  setColumnWidths(sheet, [35, 18, 18, 18, 15, 15]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Credit Risk');
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
