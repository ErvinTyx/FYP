import { AdditionalChargeStatus } from "../../types/additionalCharge";

interface AdditionalChargeStatusBadgeProps {
  status: AdditionalChargeStatus;
  /** When true, show as Overdue (e.g. due date passed and still pending) */
  isOverdue?: boolean;
}

export function AdditionalChargeStatusBadge({ status, isOverdue }: AdditionalChargeStatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
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
    "Paid": {
      bg: "bg-[#D1FAE5]",
      text: "text-[#065F46]",
      label: "Paid",
    },
    "Rejected": {
      bg: "bg-[#FEE2E2]",
      text: "text-[#991B1B]",
      label: "Rejected",
    },
    Overdue: {
      bg: "bg-[#FEE2E2]",
      text: "text-[#DC2626]",
      label: "Overdue",
    },
  };

  const displayStatus = isOverdue && (status === "Pending Payment" || status === "Pending Approval")
    ? "Overdue"
    : status;
  const config = statusConfig[displayStatus] ?? statusConfig["Pending Payment"];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
