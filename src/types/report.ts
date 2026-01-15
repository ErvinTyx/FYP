export interface DepositRecord {
  invoiceNo: string;
  customer: string;
  depositAmount: number;
  status: 'Paid' | 'Pending Approval' | 'Overdue';
  proofUploaded: boolean;
  date: string;
}

export interface MonthlyBillingRecord {
  invoiceNo: string;
  project: string;
  billingMonth: string;
  amount: number;
  status: 'Paid' | 'Pending Payment' | 'Overdue';
  itemsReturned: boolean;
  dueDate: string;
  paymentProof: boolean;
}

export interface CreditNoteRecord {
  cnNo: string;
  invoiceNo: string;
  customer: string;
  item: string;
  quantityAdjusted: string;
  priceAdjusted: string;
  reason: string;
  status: 'Pending Approval' | 'Rejected' | 'Paid';
}

// Sample data for reports
export const sampleDepositRecords: DepositRecord[] = [
  {
    invoiceNo: 'DEP-1001',
    customer: 'Alpha Construction',
    depositAmount: 5000,
    status: 'Paid',
    proofUploaded: true,
    date: '12-Jan-2025'
  },
  {
    invoiceNo: 'DEP-1002',
    customer: 'Beta Builders',
    depositAmount: 3200,
    status: 'Pending Approval',
    proofUploaded: true,
    date: '14-Jan-2025'
  },
  {
    invoiceNo: 'DEP-1003',
    customer: 'Citra Engineering',
    depositAmount: 4500,
    status: 'Overdue',
    proofUploaded: false,
    date: '10-Jan-2025'
  },
  {
    invoiceNo: 'DEP-1004',
    customer: 'Alpha Construction',
    depositAmount: 7200,
    status: 'Paid',
    proofUploaded: true,
    date: '15-Jan-2025'
  },
  {
    invoiceNo: 'DEP-1005',
    customer: 'KL Tower Project',
    depositAmount: 10000,
    status: 'Paid',
    proofUploaded: true,
    date: '18-Jan-2025'
  }
];

export const sampleMonthlyBillingRecords: MonthlyBillingRecord[] = [
  {
    invoiceNo: 'INV-2001',
    project: 'KL Tower Project',
    billingMonth: 'Month 1',
    amount: 2400,
    status: 'Paid',
    itemsReturned: false,
    dueDate: '30-Jan-2025',
    paymentProof: true
  },
  {
    invoiceNo: 'INV-2002',
    project: 'PJ Mall',
    billingMonth: 'Month 1',
    amount: 1800,
    status: 'Pending Payment',
    itemsReturned: false,
    dueDate: '31-Jan-2025',
    paymentProof: false
  },
  {
    invoiceNo: 'INV-3001',
    project: 'KL Tower Project',
    billingMonth: 'Month 2',
    amount: 2400,
    status: 'Paid',
    itemsReturned: false,
    dueDate: '28-Feb-2025',
    paymentProof: true
  },
  {
    invoiceNo: 'INV-3002',
    project: 'PJ Mall',
    billingMonth: 'Month 2',
    amount: 1800,
    status: 'Overdue',
    itemsReturned: false,
    dueDate: '28-Feb-2025',
    paymentProof: false
  },
  {
    invoiceNo: 'INV-4001',
    project: 'Alpha Construction',
    billingMonth: 'Month 1',
    amount: 3200,
    status: 'Paid',
    itemsReturned: false,
    dueDate: '25-Jan-2025',
    paymentProof: true
  }
];

export const sampleCreditNoteRecords: CreditNoteRecord[] = [
  {
    cnNo: 'CN-001',
    invoiceNo: 'INV-2001',
    customer: 'KL Tower Project',
    item: 'Steel Pipe',
    quantityAdjusted: '10 → 8',
    priceAdjusted: 'RM 200 → RM 160',
    reason: 'Item damaged',
    status: 'Pending Approval'
  },
  {
    cnNo: 'CN-002',
    invoiceNo: 'INV-2002',
    customer: 'PJ Mall',
    item: 'Scaffold Set',
    quantityAdjusted: '5 → 5',
    priceAdjusted: 'RM 500 → RM 450',
    reason: 'Price correction',
    status: 'Rejected'
  },
  {
    cnNo: 'CN-003',
    invoiceNo: 'INV-3001',
    customer: 'KL Tower Project',
    item: 'Frame Set',
    quantityAdjusted: '2 → 1',
    priceAdjusted: 'RM 400 → RM 200',
    reason: 'Customer return',
    status: 'Paid'
  },
  {
    cnNo: 'CN-004',
    invoiceNo: 'INV-4001',
    customer: 'Alpha Construction',
    item: 'Clamp',
    quantityAdjusted: '50 → 45',
    priceAdjusted: 'RM 150 → RM 135',
    reason: 'Incorrect quantity delivered',
    status: 'Paid'
  },
  {
    cnNo: 'CN-005',
    invoiceNo: 'INV-2002',
    customer: 'PJ Mall',
    item: 'Base Jack',
    quantityAdjusted: '20 → 18',
    priceAdjusted: 'RM 300 → RM 270',
    reason: 'Damaged during transport',
    status: 'Pending Approval'
  }
];
