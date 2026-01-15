import { useState } from "react";
import { AdditionalChargesList } from "./additional-charges/AdditionalChargesList";
import { AdditionalChargesDetail } from "./additional-charges/AdditionalChargesDetail";
import { AdditionalCharge } from "../types/additionalCharge";

export function AdditionalCharges() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedCharge, setSelectedCharge] = useState<AdditionalCharge | null>(null);

  const handleViewDetails = (charge: AdditionalCharge) => {
    setSelectedCharge(charge);
    setView("detail");
  };

  const handleBack = () => {
    setSelectedCharge(null);
    setView("list");
  };

  const handleUpdate = (updatedCharge: AdditionalCharge) => {
    // In a real app, this would update the backend
    // For now, we just update the local state
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

  return <AdditionalChargesList onViewDetails={handleViewDetails} />;
}
