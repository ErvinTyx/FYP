// API status values (snake_case); display as "Pending Payment", etc.
export type AdditionalChargeStatus =
  | "Pending Payment"
  | "Pending Approval"
  | "Approved"
  | "Rejected";

export type ItemType = "Missing" | "Damaged" | "Repair" | "Cleaning";

export interface AdditionalChargeItem {
  id: string;
  itemName: string;
  itemType: ItemType | string;
  repairDescription?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  remark?: string;
}

export interface AdditionalCharge {
  id: string;
  invoiceNo: string;
  doId: string;
  customerName: string;
  returnedDate?: string | null;
  conditionReportId?: string | null;
  totalCharges: number;
  status: AdditionalChargeStatus;
  dueDate: string;
  lastUpdated?: string;
  items: AdditionalChargeItem[];
  proofOfPayment?: string;
  proofOfPaymentUrl?: string | null;
  referenceId?: string | null;
  rejectionReason?: string | null;
  approvalDate?: string | null;
  rejectionDate?: string | null;
  uploadedByEmail?: string | null;
  openRepairSlipId?: string | null;
}
