import { useState, useCallback, useEffect } from "react";
import { RefundList } from "./RefundList";
import { CreateRefund } from "./CreateRefund";
import { RefundDetails } from "./RefundDetails";
import type { Refund } from "../../types/refund";

type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

interface RefundManagementMainProps {
  userRole?: "Admin" | "Finance" | "Staff" | "Customer" | "super_user";
  initialOpenFromSOA?: { entityId: string; action: SOANavigationAction } | null;
  onConsumedSOANavigation?: () => void;
}

export function RefundManagementMain({ userRole = "Staff", initialOpenFromSOA, onConsumedSOANavigation }: RefundManagementMainProps) {
  const [currentView, setCurrentView] = useState<"list" | "create" | "details">("list");
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/refunds");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRefunds(json.data);
      } else {
        setRefunds([]);
      }
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // Open entity from SOA navigation
  useEffect(() => {
    if (!initialOpenFromSOA?.entityId || refunds.length === 0) return;
    const found = refunds.find((r) => r.id === initialOpenFromSOA.entityId);
    if (!found) return;
    setSelectedRefundId(initialOpenFromSOA.entityId);
    setCurrentView("details");
    onConsumedSOANavigation?.();
  }, [refunds, initialOpenFromSOA, onConsumedSOANavigation]);

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
      />
    );
  }

  return (
    <RefundList
      refunds={refunds}
      loading={loading}
      onCreateNew={handleCreateNew}
      onViewDetails={handleViewDetails}
    />
  );
}
