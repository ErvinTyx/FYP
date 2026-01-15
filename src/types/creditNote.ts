export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customer: string;
  customerId: string;
  originalInvoice: string;
  deliveryOrderId?: string; // DO selection
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
  previousPrice: number; // Price from DO
  currentPrice: number;  // Price from Invoice
  unitPrice: number;     // Legacy field (keep for backward compatibility)
  amount: number;        // Calculated as: quantity × currentPrice
}

export interface CreditNoteFormData {
  customer: string;
  customerId: string;
  originalInvoice: string;
  deliveryOrderId?: string;
  reason: CreditNote['reason'];
  reasonDescription?: string;
  date: string;
  items: CreditNoteItem[];
  attachments: File[];
}