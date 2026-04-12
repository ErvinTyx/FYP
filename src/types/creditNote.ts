export type CreditNoteInvoiceType = 'deposit' | 'monthlyRental' | 'additionalCharge';

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customerId?: string | null;
  customer?: { id: string; firstName?: string | null; lastName?: string | null; email: string; phone?: string | null } | null;
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
  agreementId?: string;
  applications?: CreditNoteApplication[];
  remainingBalance?: number;
  totalApplied?: number;
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
  amount: number;
}

export interface CreditNoteApplication {
  id: string;
  creditNoteId: string;
  targetInvoiceType: CreditNoteInvoiceType;
  targetInvoiceId: string;
  targetInvoiceNumber: string;
  amountApplied: number;
  appliedBy: string;
  appliedAt: string;
  notes?: string;
}

/** Application history row: either invoice application or refund */
export type CreditNoteApplicationHistoryItem = (CreditNoteApplication & { applicationType?: 'invoice' }) | {
  id: string;
  applicationType: 'refund';
  targetInvoiceNumber: string;
  targetInvoiceType: 'refund';
  amountApplied: number;
  appliedBy: string;
  appliedAt: string;
  notes?: string;
  refundStatus?: string;
};

export interface EligibleInvoice {
  id: string;
  invoiceNumber: string;
  invoiceType: CreditNoteInvoiceType;
  totalAmount: number;
  outstanding: number;
  status: string;
  date: string;
  description: string;
}

export interface CreditNoteFormData {
  customerId: string;
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