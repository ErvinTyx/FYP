export type AdditionalChargeStatus = 
  | "Pending Payment"
  | "Pending Approval"
  | "Approved"
  | "Rejected";

export type ItemType = "Missing" | "Damaged" | "Repair" | "Cleaning";

export interface AdditionalChargeItem {
  id: string;
  itemName: string;
  itemType: ItemType;
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
  customerId: string;
  returnedDate: string;
  inspectionReportId?: string;
  totalCharges: number;
  status: AdditionalChargeStatus;
  dueDate: string;
  lastUpdated: string;
  items: AdditionalChargeItem[];
  proofOfPayment?: string;
  referenceId?: string;
  rejectionReason?: string;
  approvalDate?: string;
  rejectionDate?: string;
}
