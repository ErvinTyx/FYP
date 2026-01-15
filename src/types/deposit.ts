export interface Deposit {
  id: string;
  depositId: string;
  invoiceNo: string;
  customerName: string;
  customerId: string;
  agreementDocument: DepositDocument;
  depositAmount: number;
  status: 'Pending Payment' | 'Pending Approval' | 'Paid' | 'Rejected' | 'Overdue';
  dueDate: string;
  lastUpdated: string;
  createdAt: string;
  paymentProof?: DepositDocument;
  paymentSubmittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  referenceId?: string;
  transactionId?: string;
  isOverdue?: boolean;
  linkedToNewInvoice?: string;
  rentalItems?: RentalItem[];
  depositReceipt?: DepositReceipt;
}

export interface RentalItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DepositReceipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  generatedAt: string;
}

export interface DepositDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export interface DepositFormData {
  invoiceNo: string;
  customerName: string;
  customerId: string;
  depositAmount: number;
  dueDate: string;
  agreementDocument: File;
}