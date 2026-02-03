import { useState, useCallback } from "react";
import { AdditionalChargesList } from "./additional-charges/AdditionalChargesList";
import { AdditionalChargesDetail } from "./additional-charges/AdditionalChargesDetail";
import { AdditionalCharge } from "../types/additionalCharge";

export function AdditionalCharges() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedCharge, setSelectedCharge] = useState<AdditionalCharge | null>(null);
  const [listKey, setListKey] = useState(0);

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
