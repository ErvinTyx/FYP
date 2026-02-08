import { useState, useCallback, useEffect } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { ProjectSelector } from "./ProjectSelector";
import { FinancialSummaryCards } from "./FinancialSummaryCards";
import { TransactionLedger } from "./TransactionLedger";
import { Project, SOAData, Transaction, Customer, SOAEntityType } from "../../types/statementOfAccount";
import { toast } from "sonner";

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

type OrderBy = "latest" | "earliest";

export function StatementOfAccount({ onNavigateToPage }: StatementOfAccountProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [soaData, setSOAData] = useState<SOAData | null>(null);
  const [soaTotal, setSoaTotal] = useState(0);
  const [soaPage, setSoaPage] = useState(1);
  const [soaPageSize, setSoaPageSize] = useState(10);
  const [soaOrderBy, setSoaOrderBy] = useState<OrderBy>("latest");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSOA, setLoadingSOA] = useState(false);

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

  const handleProjectChange = useCallback((project: Project) => {
    setSelectedProject(project);
    setSOAData(null);
    setSoaPage(1);
    setSelectedCustomer({
      id: project.customerId,
      name: project.customerName,
      type: "Company",
      email: "",
      phone: "",
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    let cancelled = false;
    setLoadingSOA(true);
    const params = new URLSearchParams({
      agreementId: selectedProject.id,
      page: String(soaPage),
      pageSize: String(soaPageSize),
      orderBy: soaOrderBy,
    });
    fetch(`/api/soa/transactions?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.project && json.summary && Array.isArray(json.transactions)) {
          setSOAData({
            project: json.project,
            summary: json.summary,
            transactions: json.transactions,
          });
          setSoaTotal(typeof json.total === "number" ? json.total : json.transactions.length);
        } else {
          setSOAData(null);
          setSoaTotal(0);
          toast.error(json.message || "Failed to load statement");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSOAData(null);
          setSoaTotal(0);
          toast.error("Failed to load statement");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSOA(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProject, soaPage, soaPageSize, soaOrderBy]);

  const handleExportCSV = () => {
    if (!soaData) {
      toast.error("Please select a project and wait for data to load");
      return;
    }
    try {
      // Build CSV header
      const headers = ["Date", "Transaction Type", "Reference", "Description", "Debit (RM)", "Credit (RM)", "Balance (RM)", "Status"];
      
      // Build CSV rows
      const rows = soaData.transactions.map((tx) => [
        tx.date,
        tx.type,
        tx.reference,
        `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes in description
        tx.debit > 0 ? tx.debit.toFixed(2) : "",
        tx.credit > 0 ? tx.credit.toFixed(2) : "",
        tx.balance.toFixed(2),
        tx.status,
      ]);

      // Add summary section
      const summaryRows = [
        [],
        ["Summary"],
        ["Total Deposit Collected", "", "", "", soaData.summary.totalDepositCollected.toFixed(2)],
        ["Total Monthly Billing", "", "", "", soaData.summary.totalMonthlyBilling.toFixed(2)],
        ["Total Penalty", "", "", "", soaData.summary.totalPenalty.toFixed(2)],
        ["Total Additional Charges", "", "", "", soaData.summary.totalAdditionalCharges.toFixed(2)],
        ["Total Paid", "", "", "", "", soaData.summary.totalPaid.toFixed(2)],
        ["Final Balance", "", "", "", "", "", soaData.summary.finalBalance.toFixed(2)],
      ];

      // Combine all
      const csvContent = [
        [`Statement of Account - ${soaData.project.projectName}`],
        [`Customer: ${soaData.project.customerName}`],
        [`Period: ${soaData.project.startDate}${soaData.project.endDate ? ` - ${soaData.project.endDate}` : " (Ongoing)"}`],
        [`Status: ${soaData.project.status}`],
        [],
        headers,
        ...rows,
        ...summaryRows,
      ]
        .map((row) => row.join(","))
        .join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Statement-of-Account-${soaData.project.projectName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("CSV downloaded");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  const handleViewTransactionDetails = (transaction: Transaction) => {
    // Used by TransactionLedger for View; navigation is handled via onNavigate
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
            onClick={handleExportCSV}
            disabled={!soaData}
            className="bg-[#F15929] hover:bg-[#D14721] text-white h-10 px-4 rounded-md"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export as CSV
          </Button>
        </div>
      </div>

      {/* Customer & Project Selector */}
      <div>
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

      {/* Content - SOA (project detail + all transactions) */}
      {soaData && !loadingSOA && (
        <div className="space-y-6">
          {/* Project detail for print and screen */}
          <div className="p-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
            <h2 className="text-lg font-semibold text-[#231F20] mb-2">Statement of Account</h2>
            <p className="text-[#374151]"><strong>Project:</strong> {soaData.project.projectName}</p>
            <p className="text-[#374151]"><strong>Customer:</strong> {soaData.project.customerName}</p>
            <p className="text-[#374151]"><strong>Period:</strong> {soaData.project.startDate}{soaData.project.endDate ? ` - ${soaData.project.endDate}` : " (Ongoing)"} · <strong>Status:</strong> {soaData.project.status}</p>
          </div>
          {/* Financial Summary Cards */}
          <FinancialSummaryCards summary={soaData.summary} />

          

          {/* Transaction Ledger */}
          <TransactionLedger
            transactions={soaData.transactions}
            total={soaTotal}
            page={soaPage}
            pageSize={soaPageSize}
            orderBy={soaOrderBy}
            onPageChange={setSoaPage}
            onPageSizeChange={(n) => { setSoaPageSize(n); setSoaPage(1); }}
            onOrderByChange={(o) => { setSoaOrderBy(o); setSoaPage(1); }}
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