import { useState, useCallback, useEffect, useRef } from "react";
import { FileDown, Printer, FileText, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { ProjectSelector } from "./ProjectSelector";
import { FinancialSummaryCards } from "./FinancialSummaryCards";
import { TransactionLedger } from "./TransactionLedger";
import { Project, SOAData, Transaction, Customer, SOAEntityType } from "../../types/statementOfAccount";
import { toast } from "sonner";
import { generateSOAPdf } from "../../lib/soa-pdf";
import { downloadPDF } from "../../lib/report-pdf-generator";

const ENTITY_TYPE_TO_PAGE: Record<SOAEntityType, string> = {
  deposit: "manage-deposits",
  monthlyRental: "monthly-rental",
  additionalCharge: "additional-charges",
  creditNote: "credit-notes",
  refund: "refund-management",
};

interface StatementOfAccountProps {
  onNavigateToPage?: (page: string, entityId: string, action: "view" | "viewDocument" | "downloadReceipt") => void;
}

export function StatementOfAccount({ onNavigateToPage }: StatementOfAccountProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [soaData, setSOAData] = useState<SOAData | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSOA, setLoadingSOA] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchProjects = useCallback(async (search?: string) => {
    setLoadingProjects(true);
    try {
      const url = search?.trim()
        ? `/api/soa/projects?search=${encodeURIComponent(search.trim())}`
        : "/api/soa/projects";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.projects)) {
        setProjects(json.projects);
        const custMap = new Map<string, Customer>();
        json.projects.forEach((p: Project) => {
          if (!custMap.has(p.customerId)) {
            custMap.set(p.customerId, {
              id: p.customerId,
              name: p.customerName,
              type: "Company",
              email: "",
              phone: "",
            });
          }
        });
        setCustomers(Array.from(custMap.values()));
      } else {
        setProjects([]);
        setCustomers([]);
      }
    } catch {
      setProjects([]);
      setCustomers([]);
      toast.error("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects(searchQuery);
  }, [searchQuery, fetchProjects]);

  const handleCustomerChange = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleProjectChange = useCallback(async (project: Project) => {
    setSelectedProject(project);
    setSOAData(null);
    setLoadingSOA(true);
    try {
      const res = await fetch(`/api/soa/transactions?agreementId=${encodeURIComponent(project.id)}`);
      const json = await res.json();
      if (json.success && json.project && json.summary && Array.isArray(json.transactions)) {
        setSOAData({
          project: json.project,
          summary: json.summary,
          transactions: json.transactions,
        });
        setSelectedCustomer({
          id: project.customerId,
          name: project.customerName,
          type: "Company",
          email: "",
          phone: "",
        });
      } else {
        setSOAData(null);
        toast.error(json.message || "Failed to load statement");
      }
    } catch {
      setSOAData(null);
      toast.error("Failed to load statement");
    } finally {
      setLoadingSOA(false);
    }
  }, []);

  const handleExportPDF = () => {
    if (!soaData) {
      toast.error("Please select a project and wait for data to load");
      return;
    }
    try {
      const blob = generateSOAPdf(soaData);
      const name = `Statement-of-Account-${soaData.project.projectName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPDF(blob, name);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  const handlePrint = () => {
    if (!soaData) {
      toast.error("Please select a project first");
      return;
    }
    window.print();
  };

  const handleViewTransactionDetails = (transaction: Transaction) => {
    // Used by TransactionLedger for View; navigation is handled via onNavigate
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header - hidden when printing */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1>Statement of Account (SOA)</h1>
          <p className="text-[#374151]">
            View complete financial health and transaction history for customer projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            disabled={!soaData}
            className="bg-[#F15929] hover:bg-[#D14721] text-white h-10 px-4 rounded-md"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!soaData}
            variant="outline"
            className="h-10 px-4 border-[#D1D5DB] rounded-md hover:bg-[#F9FAFB]"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Customer & Project Selector - hidden when printing */}
      <div className="print:hidden">
        <ProjectSelector
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          customers={customers}
          projects={projects}
          selectedCustomer={selectedCustomer}
          selectedProject={selectedProject}
          onCustomerChange={handleCustomerChange}
          onProjectChange={handleProjectChange}
          loadingProjects={loadingProjects}
        />
      </div>

      {/* Loading SOA */}
      {selectedProject && loadingSOA && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#F15929]" />
        </div>
      )}

      {/* Content - Printable SOA (project detail + all transactions) */}
      {soaData && !loadingSOA && (
        <div ref={printRef} className="space-y-6">
          {/* Project detail for print and screen */}
          <div className="p-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
            <h2 className="text-lg font-semibold text-[#231F20] mb-2">Statement of Account</h2>
            <p className="text-[#374151]"><strong>Project:</strong> {soaData.project.projectName}</p>
            <p className="text-[#374151]"><strong>Customer:</strong> {soaData.project.customerName}</p>
            <p className="text-[#374151]"><strong>Period:</strong> {soaData.project.startDate}{soaData.project.endDate ? ` - ${soaData.project.endDate}` : " (Ongoing)"} · <strong>Status:</strong> {soaData.project.status}</p>
          </div>
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
            onNavigate={
              onNavigateToPage
                ? (transaction, action) => {
                    if (transaction.entityType && transaction.entityId) {
                      const page = ENTITY_TYPE_TO_PAGE[transaction.entityType];
                      onNavigateToPage(page, transaction.entityId, action);
                    }
                  }
                : undefined
            }
          />
        </div>
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