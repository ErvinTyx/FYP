// Types that align with the database schema

export type MonthlyRentalInvoiceStatus = 
  | 'Pending Payment' 
  | 'Pending Approval' 
  | 'Paid' 
  | 'Rejected' 
  | 'Overdue';

export interface MonthlyRentalInvoice {
  id: string;
  invoiceNumber: string;
  
  // Links
  deliveryRequestId: string;
  deliveryRequest?: DeliveryRequestInfo;
  agreementId?: string | null;
  agreement?: AgreementInfo | null;
  
  // Customer Info (snapshot)
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  
  // Billing Period
  billingMonth: number; // 1-12
  billingYear: number;
  billingStartDate: string;
  billingEndDate: string;
  daysInPeriod: number;
  
  // Amount Calculation
  baseAmount: number;
  overdueCharges: number;
  totalAmount: number;
  
  // Status & Payment
  status: MonthlyRentalInvoiceStatus;
  dueDate: string;
  
  // Payment Proof
  paymentProofUrl?: string | null;
  paymentProofFileName?: string | null;
  paymentProofUploadedAt?: string | null;
  paymentProofUploadedBy?: string | null;
  
  // Approval
  approvedBy?: string | null;
  approvedAt?: string | null;
  referenceNumber?: string | null;
  
  // Rejection
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  
  // Invoice Items (snapshot of what was billed)
  items: MonthlyRentalInvoiceItem[];
  
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyRentalInvoiceItem {
  id: string;
  invoiceId: string;
  
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantityBilled: number;
  unitPrice: number;
  daysCharged: number;
  lineTotal: number;
  
  createdAt: string;
}

// Helper interfaces for nested data
export interface DeliveryRequestInfo {
  id: string;
  requestId: string;
  customerName: string;
  agreementNo: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  deliveryAddress: string;
  deliveryType: string;
  requestDate: string;
  totalSets: number;
  deliveredSets: number;
  rfq?: RFQInfo | null;
}

export interface RFQInfo {
  id: string;
  rfqNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  projectLocation: string;
  status: string;
  totalAmount: number;
  items?: RFQItemInfo[];
}

export interface RFQItemInfo {
  id: string;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface AgreementInfo {
  id: string;
  agreementNumber: string;
  projectName: string;
  hirer: string;
  hirerPhone?: string | null;
  monthlyRental: number;
  securityDeposit: number;
  minimumCharges: number;
  defaultInterest: number;
  status: string;
}

// Legacy types for backward compatibility with existing component code
export interface InvoiceDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

// API Response types
export interface MonthlyRentalInvoiceResponse {
  success: boolean;
  message?: string;
  invoice?: MonthlyRentalInvoice;
  invoices?: MonthlyRentalInvoice[];
}

// For creating a new invoice
export interface CreateMonthlyRentalInvoiceRequest {
  deliveryRequestId: string;
  billingMonth?: number;
  billingYear?: number;
  agreementId?: string;
}

// For updating an invoice (status transitions)
export interface UpdateMonthlyRentalInvoiceRequest {
  id: string;
  action: 'upload-proof' | 'approve' | 'reject';
  paymentProofUrl?: string;
  paymentProofFileName?: string;
  referenceNumber?: string;
  rejectionReason?: string;
}
