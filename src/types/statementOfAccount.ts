export type TransactionType = 
  | "Deposit"
  | "Deposit Payment"
  | "Deposit Refund"
  | "Monthly Bill"
  | "Monthly Payment"
  | "Default Interest"
  | "Additional Charge"
  | "Additional Charge Payment"
  | "Credit Note"
  | "Adjustment";

export type TransactionStatus = 
  | "Paid"
  | "Unpaid"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Partial";

export interface Customer {
  id: string;
  name: string;
  type: "Individual" | "Company";
  email: string;
  phone: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  reference: string;
  description: string;
  debit: number; // Amount customer owes
  credit: number; // Amount customer paid/credited
  balance: number; // Running balance
  status: TransactionStatus;
  linkedDocuments?: string[]; // Invoice IDs, POP files, etc.
}

export interface Project {
  id: string;
  projectName: string;
  customerId: string;
  customerName: string;
  startDate: string;
  endDate?: string;
  status: "Active" | "Completed" | "On Hold" | "Terminated";
}

export interface SOASummary {
  totalDepositCollected: number;
  totalMonthlyBilling: number;
  totalPenalty: number;
  totalAdditionalCharges: number;
  totalPaid: number;
  finalBalance: number; // Positive = customer owes, Negative = customer has credit
}

export interface SOAData {
  project: Project;
  summary: SOASummary;
  transactions: Transaction[];
}