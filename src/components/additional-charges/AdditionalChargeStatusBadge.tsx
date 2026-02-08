import { Badge } from "../ui/badge";
import { AdditionalChargeStatus } from "../../types/additionalCharge";

interface AdditionalChargeStatusBadgeProps {
  status: AdditionalChargeStatus;
  /** When true, show as Overdue (e.g. due date passed and still pending) */
  isOverdue?: boolean;
}

export function AdditionalChargeStatusBadge({ status, isOverdue }: AdditionalChargeStatusBadgeProps) {
  const displayStatus = isOverdue && (status === "Pending Payment" || status === "Pending Approval")
    ? "Overdue"
    : status;

  switch (displayStatus) {
    case 'Pending Payment':
      return (
        <Badge className="bg-[#F5A623] hover:bg-[#D88F1C] text-white">
          Pending Payment
        </Badge>
      );
    case 'Pending Approval':
      return (
        <Badge className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
          Pending Approval
        </Badge>
      );
    case 'Paid':
      return (
        <Badge className="bg-[#059669] hover:bg-[#047857] text-white">
          Paid
        </Badge>
      );
    case 'Rejected':
      return (
        <Badge className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">
          Rejected
        </Badge>
      );
    case 'Overdue':
      return (
        <Badge className="bg-[#EA580C] hover:bg-[#C2410C] text-white">
          Overdue
        </Badge>
      );
    default:
      return (
        <Badge className="bg-[#9CA3AF] hover:bg-[#6B7280] text-white">
          {displayStatus}
        </Badge>
      );
  }
}
