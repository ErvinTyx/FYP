import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { RefundList } from "./RefundList";
import { CreateRefund } from "./CreateRefund";
import { RefundDetails } from "./RefundDetails";
import { RefundReceiptPrint } from "./RefundReceiptPrint";
import type { Refund, RelatedCreditNote } from "../../types/refund";

type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

interface RefundManagementMainProps {
  userRole?: "Admin" | "Finance" | "Sales" | "Customer" | "super_user" | "Other";
  initialOpenFromSOA?: { entityId: string; action: SOANavigationAction } | null;
  onConsumedSOANavigation?: () => void;
}

type OrderBy = "latest" | "earliest";

type RefundWithCreditNotes = Refund & { relatedCreditNotes?: RelatedCreditNote[] };

export function RefundManagementMain({ userRole = "Other", initialOpenFromSOA, onConsumedSOANavigation }: RefundManagementMainProps) {
  const [currentView, setCurrentView] = useState<"list" | "create" | "details" | "receipt">("list");
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [receiptRefund, setReceiptRefund] = useState<RefundWithCreditNotes | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderBy, setOrderBy] = useState<OrderBy>("latest");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), orderBy });
      const res = await fetch(`/api/refunds?${params}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRefunds(json.data);
        setTotal(typeof json.total === "number" ? json.total : json.data.length);
      } else {
        setRefunds([]);
        setTotal(0);
      }
    } catch {
      setRefunds([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, orderBy]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // Open entity from SOA navigation
  useEffect(() => {
    if (!initialOpenFromSOA?.entityId || refunds.length === 0) return;
    const found = refunds.find((r) => r.id === initialOpenFromSOA.entityId);
    if (!found) return;
    setSelectedRefundId(initialOpenFromSOA.entityId);
    if (initialOpenFromSOA.action === "viewDocument" || initialOpenFromSOA.action === "downloadReceipt") {
      setCurrentView("receipt");
    } else {
      setCurrentView("details");
    }
    onConsumedSOANavigation?.();
  }, [refunds, initialOpenFromSOA, onConsumedSOANavigation]);

  // Fetch refund for receipt view
  const fetchReceiptRefund = useCallback(async (refundId: string) => {
    setReceiptLoading(true);
    try {
      const res = await fetch(`/api/refunds/${refundId}?includeCreditNotes=true`);
      const json = await res.json();
      if (json.success && json.data) {
        setReceiptRefund(json.data);
      } else {
        setReceiptRefund(null);
      }
    } catch {
      setReceiptRefund(null);
    } finally {
      setReceiptLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === "receipt" && selectedRefundId) {
      fetchReceiptRefund(selectedRefundId);
    } else {
      setReceiptRefund(null);
    }
  }, [currentView, selectedRefundId, fetchReceiptRefund]);

  const handlePrintReceipt = useCallback((refundId: string) => {
    setSelectedRefundId(refundId);
    setCurrentView("receipt");
  }, []);

  const handleBackFromReceipt = useCallback(() => {
    setCurrentView("details");
    setReceiptRefund(null);
  }, []);

  const handleCreateNew = () => {
    setCurrentView("create");
  };

  const handleViewDetails = (refund: Refund) => {
    setSelectedRefundId(refund.id);
    setCurrentView("details");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedRefundId(null);
  };

  const handleSaveRefund = () => {
    fetchRefunds();
    setCurrentView("list");
  };

  const handleRefetchList = useCallback(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleApprove = useCallback(
    async (refundId: string) => {
      setIsProcessing(true);
      try {
        const res = await fetch(`/api/refunds/${refundId}/approve`, { method: "PUT" });
        const json = await res.json();
        if (!json.success) {
          toast.error(json.message || "Failed to approve");
          return;
        }
        toast.success("Refund approved successfully");
        await fetchRefunds();
      } catch {
        toast.error("Failed to approve");
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchRefunds]
  );

  const handleReject = useCallback(
    async (refundId: string, reason: string) => {
      setIsProcessing(true);
      try {
        const res = await fetch(`/api/refunds/${refundId}/reject`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        const json = await res.json();
        if (!json.success) {
          toast.error(json.message || "Failed to reject");
          return;
        }
        toast.success("Refund rejected");
        await fetchRefunds();
      } catch {
        toast.error("Failed to reject");
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchRefunds]
  );

  if (currentView === "create") {
    return <CreateRefund onBack={handleBackToList} onSave={handleSaveRefund} />;
  }

  if (currentView === "details" && selectedRefundId) {
    return (
      <RefundDetails
        refundId={selectedRefundId}
        userRole={userRole}
        onBack={handleBackToList}
        onRefetchList={handleRefetchList}
        onPrintReceipt={handlePrintReceipt}
      />
    );
  }

  if (currentView === "receipt" && selectedRefundId) {
    if (receiptLoading) {
      return (
        <div className="flex items-center justify-center min-h-[200px] text-[#6B7280]">
          Loading refund receipt...
        </div>
      );
    }
    if (receiptRefund) {
      return (
        <RefundReceiptPrint
          refund={receiptRefund}
          onBack={handleBackFromReceipt}
        />
      );
    }
    return (
      <div className="flex items-center justify-center min-h-[200px] text-[#6B7280]">
        Refund not found.
      </div>
    );
  }

  return (
    <RefundList
      refunds={refunds}
      total={total}
      page={page}
      pageSize={pageSize}
      orderBy={orderBy}
      onPageChange={setPage}
      onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
      onOrderByChange={(o) => { setOrderBy(o); setPage(1); }}
      loading={loading}
      onCreateNew={handleCreateNew}
      onViewDetails={handleViewDetails}
      userRole={userRole}
      onApprove={handleApprove}
      onReject={handleReject}
      isProcessing={isProcessing}
    />
  );
}
