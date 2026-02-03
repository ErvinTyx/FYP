export type RefundInvoiceType = 'deposit' | 'monthlyRental' | 'additionalCharge';

export type RefundStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';

export interface RefundAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

export interface Refund {
  id: string;
  refundNumber: string;
  invoiceType: RefundInvoiceType;
  sourceId: string;
  originalInvoice: string;
  customerName: string;
  customerId: string;
  amount: number;
  refundMethod?: string;
  reason?: string;
  reasonDescription?: string;
  status: RefundStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  attachments: RefundAttachment[];
}

export interface RelatedCreditNote {
  id: string;
  creditNoteNumber: string;
  amount: number;
  date: string;
}

export interface RefundInvoiceDetailsResponse {
  success: true;
  invoice: {
    type: RefundInvoiceType;
    id: string;
    number: string;
    customerName: string;
    customerEmail?: string;
    amount: number;
    status: string;
    dueDate: string;
    agreementNumber?: string;
    billingMonth?: number;
    billingYear?: number;
    items?: Array<{
      id: string;
      scaffoldingItemName?: string;
      itemName?: string;
      itemType?: string;
      quantityBilled?: number;
      quantity?: number;
      unitPrice: number;
      daysCharged?: number;
      lineTotal?: number;
      amount?: number;
    }>;
  };
  relatedCreditNotes: RelatedCreditNote[];
  totalCredited: number;
}
