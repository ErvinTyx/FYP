import { AdditionalChargeStatus } from "../../types/additionalCharge";

interface AdditionalChargeStatusBadgeProps {
  status: AdditionalChargeStatus;
}

export function AdditionalChargeStatusBadge({ status }: AdditionalChargeStatusBadgeProps) {
  const statusConfig = {
    "Pending Payment": {
      bg: "bg-[#FEF3C7]",
      text: "text-[#92400E]",
      label: "Pending Payment",
    },
    "Pending Approval": {
      bg: "bg-[#DBEAFE]",
      text: "text-[#1E40AF]",
      label: "Pending Approval",
    },
    "Approved": {
      bg: "bg-[#D1FAE5]",
      text: "text-[#065F46]",
      label: "Approved",
    },
    "Rejected": {
      bg: "bg-[#FEE2E2]",
      text: "text-[#991B1B]",
      label: "Rejected",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
