export type DepositStatus = 'Pending Payment' | 'Pending Approval' | 'Paid' | 'Rejected' | 'Overdue' | 'Expired';

export interface Deposit {
  id: string;
  depositNumber: string;
  agreementId: string;
  depositAmount: number;
  status: DepositStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  
  // Payment proof
  paymentProofUrl?: string;
  paymentProofFileName?: string;
  paymentProofUploadedAt?: string;
  paymentProofUploadedBy?: string;
  paymentSubmittedAt?: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: string;
  referenceNumber?: string; // Bank reference number entered on approval
  
  // Rejection
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  // Related agreement data (populated from API)
  agreement?: {
    id: string;
    agreementNumber: string;
    projectName: string;
    hirer: string;
    hirerPhone?: string;
    owner: string;
    monthlyRental: number;
    securityDeposit: number;
    signedDocumentUrl?: string;
    rfq?: {
      id: string;
      rfqNumber: string;
      customerName: string;
      customerEmail: string;
      totalAmount: number;
      items?: RentalItem[];
    };
  };
  
  // Legacy fields for backwards compatibility
  depositId?: string; // Alias for depositNumber
  invoiceNo?: string;
  customerName?: string;
  customerId?: string;
  agreementDocument?: DepositDocument;
  paymentProof?: DepositDocument;
  referenceId?: string; // Alias for referenceNumber
  transactionId?: string;
  isOverdue?: boolean;
  linkedToNewInvoice?: string;
  lastUpdated?: string;
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