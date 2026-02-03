export type CreditNoteInvoiceType = 'deposit' | 'monthlyRental' | 'additionalCharge';

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customer: string;
  customerName?: string;
  customerId: string;
  customerEmail?: string;
  invoiceType: CreditNoteInvoiceType;
  sourceId?: string;
  originalInvoice: string;
  deliveryOrderId?: string;
  amount: number;
  reason: 'Returned Items' | 'Price Adjustment' | 'Service Issue' | 'Damaged Goods' | 'Billing Error' | 'Other';
  reasonDescription?: string;
  date: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  attachments: CreditNoteAttachment[];
  items: CreditNoteItem[];
}

export interface CreditNoteAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

export interface CreditNoteItem {
  id: string;
  description: string;
  quantity: number;
  previousPrice: number;
  currentPrice: number;
  unitPrice: number;
  amount: number;
  daysCharged?: number;  // For monthly rental / additional charge lines
}

export interface CreditNoteFormData {
  customer: string;
  customerName: string;
  customerId: string;
  customerEmail?: string;
  invoiceType: CreditNoteInvoiceType;
  sourceId?: string;
  originalInvoice: string;
  deliveryOrderId?: string;
  reason: CreditNote['reason'];
  reasonDescription?: string;
  date: string;
  items: CreditNoteItem[];
  attachments: File[];
}