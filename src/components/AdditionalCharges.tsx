import { useState, useCallback, useEffect } from "react";
import { AdditionalChargesList } from "./additional-charges/AdditionalChargesList";
import { AdditionalChargesDetail } from "./additional-charges/AdditionalChargesDetail";
import { AdditionalCharge } from "../types/additionalCharge";

type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

interface AdditionalChargesProps {
  initialOpenFromSOA?: { entityId: string; action: SOANavigationAction } | null;
  onConsumedSOANavigation?: () => void;
}

const API_STATUS_TO_DISPLAY: Record<string, AdditionalCharge["status"]> = {
  pending_payment: "Pending Payment",
  pending_approval: "Pending Approval",
  paid: "Paid",
  rejected: "Rejected",
};

function mapApiToCharge(api: {
  id: string;
  invoiceNo: string;
  doId: string;
  customerName: string;
  returnedDate?: string | null;
  dueDate: string;
  status: string;
  totalCharges: number;
  items: Array<{ id: string; itemName: string; itemType: string; quantity: number; unitPrice: number; amount: number }>;
  approvalDate?: string | null;
  rejectionDate?: string | null;
}): AdditionalCharge {
  return {
    id: api.id,
    invoiceNo: api.invoiceNo,
    doId: api.doId,
    customerName: api.customerName,
    returnedDate: api.returnedDate ?? undefined,
    totalCharges: api.totalCharges,
    status: API_STATUS_TO_DISPLAY[api.status] ?? ("Pending Payment" as AdditionalCharge["status"]),
    dueDate: api.dueDate,
    lastUpdated: api.approvalDate ?? api.rejectionDate ?? api.dueDate,
    items: api.items.map((i) => ({
      id: i.id,
      itemName: i.itemName,
      itemType: i.itemType,
      repairDescription: undefined,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.amount,
    })),
  };
}

export function AdditionalCharges({ initialOpenFromSOA, onConsumedSOANavigation }: AdditionalChargesProps = {}) {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedCharge, setSelectedCharge] = useState<AdditionalCharge | null>(null);
  const [listKey, setListKey] = useState(0);

  // Open entity from SOA navigation (fetch charge by id)
  useEffect(() => {
    if (!initialOpenFromSOA?.entityId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/additional-charges/${initialOpenFromSOA.entityId}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data) {
          setSelectedCharge(mapApiToCharge(json.data));
          setView("detail");
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) onConsumedSOANavigation?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialOpenFromSOA?.entityId, onConsumedSOANavigation]);

  const handleViewDetails = (charge: AdditionalCharge) => {
    setSelectedCharge(charge);
    setView("detail");
  };

  const handleBack = useCallback(() => {
    setSelectedCharge(null);
    setView("list");
    setListKey((k) => k + 1);
  }, []);

  const handleUpdate = (updatedCharge: AdditionalCharge) => {
    setSelectedCharge(updatedCharge);
  };

  if (view === "detail" && selectedCharge) {
    return (
      <AdditionalChargesDetail
        charge={selectedCharge}
        onBack={handleBack}
        onUpdate={handleUpdate}
      />
    );
  }

  return (
    <AdditionalChargesList key={listKey} onViewDetails={handleViewDetails} />
  );
}
