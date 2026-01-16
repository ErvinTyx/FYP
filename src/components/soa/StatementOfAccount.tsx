import { useState } from "react";
import { FileDown, Printer, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { ProjectSelector } from "./ProjectSelector";
import { FinancialSummaryCards } from "./FinancialSummaryCards";
import { TransactionLedger } from "./TransactionLedger";
import { Project, SOAData, Transaction, Customer } from "../../types/statementOfAccount";
import { toast } from "sonner";

// Mock customers
const mockCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "Acme Construction Ltd.",
    type: "Company",
    email: "contact@acmeconstruction.com",
    phone: "+60 12-345 6789",
  },
  {
    id: "CUST-002",
    name: "BuildRight Inc.",
    type: "Company",
    email: "info@buildright.com",
    phone: "+60 12-987 6543",
  },
  {
    id: "CUST-003",
    name: "Metro Builders",
    type: "Company",
    email: "admin@metrobuilders.com",
    phone: "+60 11-234 5678",
  },
  {
    id: "CUST-004",
    name: "Ahmad bin Abdullah",
    type: "Individual",
    email: "ahmad.abdullah@email.com",
    phone: "+60 13-456 7890",
  },
];

// Mock data
const mockProjects: Project[] = [
  {
    id: "PROJ-2024-001",
    projectName: "Sunway Construction Site - Tower A",
    customerId: "CUST-001",
    customerName: "Acme Construction Ltd.",
    startDate: "2024-01-15",
    endDate: "2024-12-31",
    status: "Active",
  },
  {
    id: "PROJ-2024-005",
    projectName: "KLCC Extension Works",
    customerId: "CUST-001",
    customerName: "Acme Construction Ltd.",
    startDate: "2024-06-01",
    status: "Active",
  },
  {
    id: "PROJ-2024-002",
    projectName: "KL Central Mall Renovation",
    customerId: "CUST-002",
    customerName: "BuildRight Inc.",
    startDate: "2024-03-01",
    status: "Active",
  },
  {
    id: "PROJ-2023-045",
    projectName: "Pavilion Exterior Works",
    customerId: "CUST-003",
    customerName: "Metro Builders",
    startDate: "2023-11-10",
    endDate: "2024-06-30",
    status: "Completed",
  },
  {
    id: "PROJ-2024-008",
    projectName: "Residential Renovation",
    customerId: "CUST-004",
    customerName: "Ahmad bin Abdullah",
    startDate: "2024-04-15",
    status: "Active",
  },
];

// Calculate running balance for transactions
const calculateRunningBalance = (transactions: Omit<Transaction, 'balance'>[]): Transaction[] => {
  let balance = 0;
  return transactions.map(tx => {
    balance = balance + tx.debit - tx.credit;
    return {
      ...tx,
      balance,
    };
  });
};

const mockSOAData: { [key: string]: SOAData } = {
  "PROJ-2024-001": {
    project: mockProjects[0],
    summary: {
      totalDepositCollected: 15000.00,
      totalMonthlyBilling: 48000.00,
      totalPenalty: 720.00,
      totalAdditionalCharges: 1250.50,
      totalPaid: 52500.00,
      finalBalance: 12470.50, // Customer owes
    },
    transactions: calculateRunningBalance([
      {
        id: "TXN-001",
        date: "2024-01-15",
        type: "Deposit",
        reference: "DEP-2024-001",
        description: "Initial deposit for scaffolding rental",
        debit: 15000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-002",
        date: "2024-01-20",
        type: "Deposit Payment",
        reference: "PAY-2024-001",
        description: "Deposit payment received",
        debit: 0,
        credit: 15000.00,
        status: "Paid",
      },
      {
        id: "TXN-003",
        date: "2024-02-01",
        type: "Monthly Bill",
        reference: "INV-2024-001",
        description: "Monthly rental - February 2024",
        debit: 12000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-004",
        date: "2024-02-10",
        type: "Monthly Payment",
        reference: "PAY-2024-002",
        description: "Payment for INV-2024-001",
        debit: 0,
        credit: 12000.00,
        status: "Paid",
      },
      {
        id: "TXN-005",
        date: "2024-03-01",
        type: "Monthly Bill",
        reference: "INV-2024-002",
        description: "Monthly rental - March 2024",
        debit: 12000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-006",
        date: "2024-03-15",
        type: "Monthly Payment",
        reference: "PAY-2024-003",
        description: "Payment for INV-2024-002",
        debit: 0,
        credit: 12000.00,
        status: "Paid",
      },
      {
        id: "TXN-007",
        date: "2024-04-01",
        type: "Monthly Bill",
        reference: "INV-2024-003",
        description: "Monthly rental - April 2024",
        debit: 12000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-008",
        date: "2024-04-25",
        type: "Default Interest",
        reference: "INT-2024-001",
        description: "Late payment interest for INV-2024-003 (1.5% × RM12,000 × 1 month)",
        debit: 180.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-009",
        date: "2024-04-28",
        type: "Monthly Payment",
        reference: "PAY-2024-004",
        description: "Partial payment for INV-2024-003",
        debit: 0,
        credit: 8000.00,
        status: "Paid",
      },
      {
        id: "TXN-010",
        date: "2024-05-01",
        type: "Monthly Bill",
        reference: "INV-2024-004",
        description: "Monthly rental - May 2024",
        debit: 12000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-011",
        date: "2024-05-20",
        type: "Additional Charge",
        reference: "AC-2024-001",
        description: "Damaged scaffolding components - inspection IR-2024-001",
        debit: 850.50,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-012",
        date: "2024-05-22",
        type: "Additional Charge Payment",
        reference: "PAY-2024-005",
        description: "Payment for AC-2024-001",
        debit: 0,
        credit: 850.50,
        status: "Approved",
      },
      {
        id: "TXN-013",
        date: "2024-06-01",
        type: "Credit Note",
        reference: "CN-2024-001",
        description: "Rebate for early return of items",
        debit: 0,
        credit: 500.00,
        status: "Approved",
      },
      {
        id: "TXN-014",
        date: "2024-06-10",
        type: "Additional Charge",
        reference: "AC-2024-002",
        description: "Missing items - DO-2024-015",
        debit: 400.00,
        credit: 0,
        status: "Pending Approval",
      },
      {
        id: "TXN-015",
        date: "2024-06-15",
        type: "Default Interest",
        reference: "INT-2024-002",
        description: "Late payment interest accumulation",
        debit: 540.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-016",
        date: "2024-07-01",
        type: "Monthly Payment",
        reference: "PAY-2024-006",
        description: "Bulk payment for outstanding invoices",
        debit: 0,
        credit: 4150.00,
        status: "Paid",
      },
    ]),
  },
  "PROJ-2024-005": {
    project: mockProjects[1],
    summary: {
      totalDepositCollected: 10000.00,
      totalMonthlyBilling: 24000.00,
      totalPenalty: 0,
      totalAdditionalCharges: 0,
      totalPaid: 34000.00,
      finalBalance: -5200.00, // Company owes customer (negative balance due to credit notes)
    },
    transactions: calculateRunningBalance([
      {
        id: "TXN-501",
        date: "2024-06-01",
        type: "Deposit",
        reference: "DEP-2024-005",
        description: "Initial deposit for KLCC Extension Works",
        debit: 10000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-502",
        date: "2024-06-05",
        type: "Deposit Payment",
        reference: "PAY-2024-501",
        description: "Deposit payment received",
        debit: 0,
        credit: 10000.00,
        status: "Paid",
      },
      {
        id: "TXN-503",
        date: "2024-07-01",
        type: "Monthly Bill",
        reference: "INV-2024-501",
        description: "Monthly rental - July 2024",
        debit: 12000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-504",
        date: "2024-07-08",
        type: "Monthly Payment",
        reference: "PAY-2024-502",
        description: "Payment for INV-2024-501",
        debit: 0,
        credit: 12000.00,
        status: "Paid",
      },
      {
        id: "TXN-505",
        date: "2024-08-01",
        type: "Monthly Bill",
        reference: "INV-2024-502",
        description: "Monthly rental - August 2024",
        debit: 12000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-506",
        date: "2024-08-10",
        type: "Monthly Payment",
        reference: "PAY-2024-503",
        description: "Payment for INV-2024-502",
        debit: 0,
        credit: 12000.00,
        status: "Paid",
      },
      {
        id: "TXN-507",
        date: "2024-08-25",
        type: "Credit Note",
        reference: "CN-2024-005",
        description: "Project completed early - Refund for unused rental period (15 days)",
        debit: 0,
        credit: 3500.00,
        status: "Approved",
      },
      {
        id: "TXN-508",
        date: "2024-08-26",
        type: "Credit Note",
        reference: "CN-2024-006",
        description: "Goodwill credit - Customer loyalty discount",
        debit: 0,
        credit: 1200.00,
        status: "Approved",
      },
      {
        id: "TXN-509",
        date: "2024-08-27",
        type: "Credit Note",
        reference: "CN-2024-007",
        description: "Refund for returned items in excellent condition",
        debit: 0,
        credit: 500.00,
        status: "Approved",
      },
    ]),
  },
  "PROJ-2024-002": {
    project: mockProjects[1],
    summary: {
      totalDepositCollected: 20000.00,
      totalMonthlyBilling: 72000.00,
      totalPenalty: 0,
      totalAdditionalCharges: 0,
      totalPaid: 80000.00,
      finalBalance: 12000.00,
    },
    transactions: calculateRunningBalance([
      {
        id: "TXN-101",
        date: "2024-03-01",
        type: "Deposit",
        reference: "DEP-2024-002",
        description: "Initial deposit",
        debit: 20000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-102",
        date: "2024-03-05",
        type: "Deposit Payment",
        reference: "PAY-2024-101",
        description: "Deposit payment received",
        debit: 0,
        credit: 20000.00,
        status: "Paid",
      },
      {
        id: "TXN-103",
        date: "2024-04-01",
        type: "Monthly Bill",
        reference: "INV-2024-101",
        description: "Monthly rental - April 2024",
        debit: 18000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-104",
        date: "2024-04-08",
        type: "Monthly Payment",
        reference: "PAY-2024-102",
        description: "Payment for INV-2024-101",
        debit: 0,
        credit: 18000.00,
        status: "Paid",
      },
      {
        id: "TXN-105",
        date: "2024-05-01",
        type: "Monthly Bill",
        reference: "INV-2024-102",
        description: "Monthly rental - May 2024",
        debit: 18000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-106",
        date: "2024-05-10",
        type: "Monthly Payment",
        reference: "PAY-2024-103",
        description: "Payment for INV-2024-102",
        debit: 0,
        credit: 18000.00,
        status: "Paid",
      },
      {
        id: "TXN-107",
        date: "2024-06-01",
        type: "Monthly Bill",
        reference: "INV-2024-103",
        description: "Monthly rental - June 2024",
        debit: 18000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-108",
        date: "2024-06-12",
        type: "Monthly Payment",
        reference: "PAY-2024-104",
        description: "Payment for INV-2024-103",
        debit: 0,
        credit: 18000.00,
        status: "Paid",
      },
      {
        id: "TXN-109",
        date: "2024-07-01",
        type: "Monthly Bill",
        reference: "INV-2024-104",
        description: "Monthly rental - July 2024",
        debit: 18000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-110",
        date: "2024-07-15",
        type: "Monthly Payment",
        reference: "PAY-2024-105",
        description: "Payment for INV-2024-104",
        debit: 0,
        credit: 6000.00,
        status: "Paid",
      },
    ]),
  },
  "PROJ-2023-045": {
    project: mockProjects[3],
    summary: {
      totalDepositCollected: 25000.00,
      totalMonthlyBilling: 56000.00,
      totalPenalty: 0,
      totalAdditionalCharges: 1500.00,
      totalPaid: 57500.00,
      finalBalance: 0, // Project closed, fully settled
    },
    transactions: calculateRunningBalance([
      {
        id: "TXN-301",
        date: "2023-11-10",
        type: "Deposit",
        reference: "DEP-2023-045",
        description: "Initial project deposit - Pavilion Exterior Works",
        debit: 25000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-302",
        date: "2023-11-15",
        type: "Deposit Payment",
        reference: "PAY-2023-301",
        description: "Deposit payment received",
        debit: 0,
        credit: 25000.00,
        status: "Paid",
      },
      {
        id: "TXN-303",
        date: "2023-12-01",
        type: "Monthly Bill",
        reference: "INV-2023-301",
        description: "Monthly rental - December 2023",
        debit: 14000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-304",
        date: "2023-12-08",
        type: "Monthly Payment",
        reference: "PAY-2023-302",
        description: "Payment for INV-2023-301",
        debit: 0,
        credit: 14000.00,
        status: "Paid",
      },
      {
        id: "TXN-305",
        date: "2024-01-01",
        type: "Monthly Bill",
        reference: "INV-2024-301",
        description: "Monthly rental - January 2024",
        debit: 14000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-306",
        date: "2024-01-10",
        type: "Monthly Payment",
        reference: "PAY-2024-301",
        description: "Payment for INV-2024-301",
        debit: 0,
        credit: 14000.00,
        status: "Paid",
      },
      {
        id: "TXN-307",
        date: "2024-02-01",
        type: "Monthly Bill",
        reference: "INV-2024-302",
        description: "Monthly rental - February 2024",
        debit: 14000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-308",
        date: "2024-02-12",
        type: "Monthly Payment",
        reference: "PAY-2024-302",
        description: "Payment for INV-2024-302",
        debit: 0,
        credit: 14000.00,
        status: "Paid",
      },
      {
        id: "TXN-309",
        date: "2024-03-01",
        type: "Monthly Bill",
        reference: "INV-2024-303",
        description: "Monthly rental - March 2024",
        debit: 14000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-310",
        date: "2024-03-15",
        type: "Monthly Payment",
        reference: "PAY-2024-303",
        description: "Payment for INV-2024-303",
        debit: 0,
        credit: 14000.00,
        status: "Paid",
      },
      {
        id: "TXN-311",
        date: "2024-04-15",
        type: "Additional Charge",
        reference: "AC-2024-301",
        description: "Minor damages upon return inspection",
        debit: 1500.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-312",
        date: "2024-04-20",
        type: "Additional Charge Payment",
        reference: "PAY-2024-304",
        description: "Payment for AC-2024-301",
        debit: 0,
        credit: 1500.00,
        status: "Approved",
      },
      {
        id: "TXN-313",
        date: "2024-06-25",
        type: "Credit Note",
        reference: "CN-2024-301",
        description: "Project closure - Full deposit refund",
        debit: 0,
        credit: 25000.00,
        status: "Approved",
      },
      {
        id: "TXN-314",
        date: "2024-06-30",
        type: "Deposit Payment",
        reference: "REF-2024-301",
        description: "Deposit refund processed to customer",
        debit: 25000.00,
        credit: 0,
        status: "Refunded",
      },
      {
        id: "TXN-315",
        date: "2024-06-30",
        type: "Monthly Payment",
        reference: "PAY-2024-305",
        description: "Final settlement - Deposit offset against refund",
        debit: 0,
        credit: 25000.00,
        status: "Paid",
      },
    ]),
  },
  "PROJ-2024-008": {
    project: mockProjects[4],
    summary: {
      totalDepositCollected: 8000.00,
      totalMonthlyBilling: 32000.00,
      totalPenalty: 0,
      totalAdditionalCharges: 0,
      totalPaid: 40000.00,
      finalBalance: 0, // All paid
    },
    transactions: calculateRunningBalance([
      {
        id: "TXN-401",
        date: "2024-04-15",
        type: "Deposit",
        reference: "DEP-2024-008",
        description: "Initial project deposit - Residential Renovation",
        debit: 8000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-402",
        date: "2024-04-18",
        type: "Deposit Payment",
        reference: "PAY-2024-401",
        description: "Deposit payment received",
        debit: 0,
        credit: 8000.00,
        status: "Paid",
      },
      {
        id: "TXN-403",
        date: "2024-05-01",
        type: "Monthly Bill",
        reference: "INV-2024-401",
        description: "Monthly rental - May 2024",
        debit: 8000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-404",
        date: "2024-05-05",
        type: "Monthly Payment",
        reference: "PAY-2024-402",
        description: "Payment for INV-2024-401",
        debit: 0,
        credit: 8000.00,
        status: "Paid",
      },
      {
        id: "TXN-405",
        date: "2024-06-01",
        type: "Monthly Bill",
        reference: "INV-2024-402",
        description: "Monthly rental - June 2024",
        debit: 8000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-406",
        date: "2024-06-08",
        type: "Monthly Payment",
        reference: "PAY-2024-403",
        description: "Payment for INV-2024-402",
        debit: 0,
        credit: 8000.00,
        status: "Paid",
      },
      {
        id: "TXN-407",
        date: "2024-07-01",
        type: "Monthly Bill",
        reference: "INV-2024-403",
        description: "Monthly rental - July 2024",
        debit: 8000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-408",
        date: "2024-07-10",
        type: "Monthly Payment",
        reference: "PAY-2024-404",
        description: "Payment for INV-2024-403",
        debit: 0,
        credit: 8000.00,
        status: "Paid",
      },
      {
        id: "TXN-409",
        date: "2024-08-01",
        type: "Monthly Bill",
        reference: "INV-2024-404",
        description: "Monthly rental - August 2024",
        debit: 8000.00,
        credit: 0,
        status: "Unpaid",
      },
      {
        id: "TXN-410",
        date: "2024-08-12",
        type: "Monthly Payment",
        reference: "PAY-2024-405",
        description: "Payment for INV-2024-404",
        debit: 0,
        credit: 8000.00,
        status: "Paid",
      },
    ]),
  },
};

export function StatementOfAccount() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [soaData, setSOAData] = useState<SOAData | null>(null);

  const handleCustomerChange = (customer: Customer) => {
    setSelectedCustomer(customer);
    // No need to reset project when customer changes since we're selecting project first
  };

  const handleProjectChange = (project: Project) => {
    setSelectedProject(project);
    setSOAData(mockSOAData[project.id] || null);
  };

  const handleExportPDF = () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    toast.success("Exporting statement as PDF...");
    // Implement PDF export logic
  };

  const handlePrint = () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    window.print();
  };

  const handleViewTransactionDetails = (transaction: Transaction) => {
    console.log("View transaction details:", transaction);
    // Implement transaction details modal
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>Statement of Account (SOA)</h1>
          <p className="text-[#374151]">
            View complete financial health and transaction history for customer projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            disabled={!selectedProject}
            className="bg-[#F15929] hover:bg-[#D14721] text-white h-10 px-4 rounded-md"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!selectedProject}
            variant="outline"
            className="h-10 px-4 border-[#D1D5DB] rounded-md hover:bg-[#F9FAFB]"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Customer & Project Selector */}
      <ProjectSelector
        customers={mockCustomers}
        projects={mockProjects}
        selectedCustomer={selectedCustomer}
        selectedProject={selectedProject}
        onCustomerChange={handleCustomerChange}
        onProjectChange={handleProjectChange}
      />

      {/* Content - Only show when project is selected */}
      {soaData && (
        <>
          {/* Financial Summary Cards */}
          <FinancialSummaryCards summary={soaData.summary} />

          {/* Project Financial Status Indicator */}
          <div
            className={`p-6 rounded-lg border-2 ${
              soaData.summary.finalBalance > 0
                ? "border-[#DC2626] bg-[#FEF2F2]"
                : "border-[#10B981] bg-[#F0FDF4]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">
                  Project Financial Status
                </p>
                <p
                  className={`text-3xl ${
                    soaData.summary.finalBalance > 0
                      ? "text-[#DC2626]"
                      : "text-[#10B981]"
                  }`}
                >
                  {soaData.summary.finalBalance > 0 ? (
                    <>⚠️ Customer Owes: RM{soaData.summary.finalBalance.toFixed(2)}</>
                  ) : (
                    <>✓ Customer Has Credit: RM{Math.abs(soaData.summary.finalBalance).toFixed(2)}</>
                  )}
                </p>
              </div>
              <div className="text-right text-sm text-[#6B7280]">
                <p>Formula: Total Charged - Total Paid</p>
                <p className="mt-1">
                  RM{(
                    soaData.summary.totalDepositCollected +
                    soaData.summary.totalMonthlyBilling +
                    soaData.summary.totalPenalty +
                    soaData.summary.totalAdditionalCharges
                  ).toFixed(2)}{" "}
                  - RM{soaData.summary.totalPaid.toFixed(2)} = RM
                  {soaData.summary.finalBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <TransactionLedger
            transactions={soaData.transactions}
            onViewDetails={handleViewTransactionDetails}
          />
        </>
      )}

      {/* Empty State */}
      {!selectedProject && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-[#F9FAFB] rounded-full flex items-center justify-center mb-4">
            <FileText className="h-10 w-10 text-[#9CA3AF]" />
          </div>
          <h3 className="text-[#231F20] mb-2">
            No Project Selected
          </h3>
          <p className="text-[#6B7280] max-w-md">
            Please select a project from the dropdown above to view its complete statement of account and transaction history. The customer will be automatically identified.
          </p>
        </div>
      )}
    </div>
  );
}