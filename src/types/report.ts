// ============================================
// Report Filter Types
// ============================================

export interface ReportFilters {
  dateFrom?: Date | string;
  dateTo?: Date | string;
  category?: string;
  searchQuery?: string;
  status?: string;
}

// ============================================
// Rental Performance Report Types
// ============================================

export interface RentalPerformanceData {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  totalRentals: number;
  totalRevenue: number;
  avgRentalDuration: number;
  utilizationRate: number;
  totalQuantity: number;
  quantityRented: number;
}

export interface RentalPerformanceSummary {
  totalRentals: number;
  totalRevenue: number;
  avgDuration: number;
  avgUtilization: number;
}

export interface RentalPerformanceByCategory {
  category: string;
  revenue: number;
  rentals: number;
}

export interface RentalTrend {
  month: string;
  rentals: number;
  revenue: number;
}

export interface RentalPerformanceResponse {
  data: RentalPerformanceData[];
  summary: RentalPerformanceSummary;
  byCategory: RentalPerformanceByCategory[];
  trends: RentalTrend[];
  categories: string[];
}

// ============================================
// Inventory Utilization Report Types
// ============================================

export interface InventoryUtilizationData {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  inUse: number;
  idle: number;
  utilizationRate: number;
  avgIdleDays: number;
  location: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Maintenance';
  price: number;
}

export interface InventoryUtilizationSummary {
  totalItems: number;
  totalInUse: number;
  totalIdle: number;
  avgUtilization: number;
  avgIdleDays: number;
  totalValue: number;
  idleValue: number;
}

export interface UtilizationByCategory {
  category: string;
  total: number;
  inUse: number;
  idle: number;
  utilizationRate: number;
}

export interface UtilizationByLocation {
  location: string;
  total: number;
  inUse: number;
  idle: number;
}

export interface InventoryUtilizationResponse {
  data: InventoryUtilizationData[];
  summary: InventoryUtilizationSummary;
  byCategory: UtilizationByCategory[];
  byLocation: UtilizationByLocation[];
  categories: string[];
  locations: string[];
}

// ============================================
// Financial Report Types
// ============================================

export interface FinancialMonthlyData {
  period: string;
  month: string;
  year: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingAmount: number;
  overdueAmount: number;
  depositAmount: number;
  creditNoteAmount: number;
  numberOfInvoices: number;
  numberOfCustomers: number;
  paymentRate: number;
  status: 'Excellent' | 'Good' | 'Warning' | 'Critical';
}

export interface CustomerPaymentData {
  customerId: string;
  customerName: string;
  customerEmail: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdueDays: number;
  lastPaymentDate: string | null;
  status: 'Current' | 'Overdue' | 'Critical';
  numberOfInvoices: number;
  depositsPaid: number;
  depositsOutstanding: number;
}

export interface FinancialSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalDeposits: number;
  totalCreditNotes: number;
  avgPaymentRate: number;
  totalCustomers: number;
}

export interface InvoiceStatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

export interface FinancialResponse {
  monthlyData: FinancialMonthlyData[];
  customerData: CustomerPaymentData[];
  summary: FinancialSummary;
  invoiceStatusBreakdown: InvoiceStatusBreakdown[];
}

// ============================================
// Project_Financial_Report
// ============================================

export interface ProjectFinancialReportRow {
  project_id: string;
  customer_id: string;
  project_start_date: string;
  project_end_date: string;
  total_rental_revenue: number;
  total_repair_cost: number;
  total_damage_cost: number;
  transportation_cost: number;
  net_profit: number;
  profit_margin: number;
}

export interface ProjectFinancialReportResponse {
  data: ProjectFinancialReportRow[];
  summary?: { totalRevenue: number; totalProfit: number; avgMargin: number };
}

// ============================================
// Customer_Rental_Behaviour
// ============================================

export interface CustomerRentalBehaviourRow {
  customer_id: string;
  customer_name: string;
  industry_type: string;
  total_projects: number;
  total_rental_value: number;
  rental_frequency: string;
  last_rental_date: string | null;
}

export interface CustomerRentalBehaviourResponse {
  data: CustomerRentalBehaviourRow[];
}

// ============================================
// Inventory_Utilization (report schema)
// ============================================

export interface InventoryUtilizationRow {
  item_id: string;
  item_name: string;
  category: string;
  total_quantity: number;
  rented_quantity: number;
  utilization_rate: number;
  idle_days: number;
}

export interface InventoryUtilizationReportResponse {
  data: InventoryUtilizationRow[];
  summary?: { totalItems: number; avgUtilization: number; totalIdleDays: number };
}

// ============================================
// Maintenance_Record
// ============================================

export interface MaintenanceRecordRow {
  repair_id: string;
  item_id: string;
  damage_type: string;
  repair_date: string;
  repair_cost: number;
  repair_status: string;
  downtime_days: number;
  technician: string | null;
}

export interface MaintenanceRecordResponse {
  data: MaintenanceRecordRow[];
  summary?: { totalRepairs: number; totalCost: number };
}

// ============================================
// Delivery_Performance
// ============================================

export interface DeliveryPerformanceRow {
  delivery_id: string;
  project_id: string;
  driver_id: string;
  delivery_date: string;
  pickup_date: string;
  delay_days: number;
  transportation_cost: number;
  delivery_status: string;
}

export interface DeliveryPerformanceResponse {
  data: DeliveryPerformanceRow[];
  summary?: { totalDeliveries: number; avgDelayDays: number; totalCost: number };
}

// ============================================
// Rental_Duration
// ============================================

export interface RentalDurationRow {
  rental_id: string;
  item_id: string;
  project_id: string;
  rental_start: string;
  rental_end: string;
  rental_days: number;
  extension_days: number;
  early_return: 'Yes' | 'No';
}

export interface RentalDurationResponse {
  data: RentalDurationRow[];
  summary?: { totalRentals: number; avgDuration: number; extensionRate: number };
}

// ============================================
// Customer_Credit_Risk
// ============================================

export interface CustomerCreditRiskRow {
  customer_id: string;
  credit_limit: number;
  outstanding_balance: number;
  overdue_amount: number;
  aging_days: number;
  risk_level: 'Low' | 'Medium' | 'High';
}

export interface CustomerCreditRiskResponse {
  data: CustomerCreditRiskRow[];
  summary?: { highRiskCount: number; totalOutstanding: number };
}

// ============================================
// Existing Types (Preserved)
// ============================================

export interface DepositRecord {
  invoiceNo: string;
  customer: string;
  depositAmount: number;
  status: 'Paid' | 'Pending Approval' | 'Overdue';
  proofUploaded: boolean;
  date: string;
}

export interface MonthlyBillingRecord {
  invoiceNo: string;
  project: string;
  billingMonth: string;
  amount: number;
  status: 'Paid' | 'Pending Payment' | 'Overdue';
  itemsReturned: boolean;
  dueDate: string;
  paymentProof: boolean;
}

export interface CreditNoteRecord {
  cnNo: string;
  invoiceNo: string;
  customer: string;
  item: string;
  quantityAdjusted: string;
  priceAdjusted: string;
  reason: string;
  status: 'Pending Approval' | 'Rejected' | 'Paid';
}

// Note: Sample data has been removed. 
// All report components now fetch real data from the database via API endpoints:
// - /api/reports/rental-performance
// - /api/reports/inventory-utilization  
// - /api/reports/financial
