import { Badge } from "../ui/badge";
import { DepositStatus } from "../../types/deposit";

interface DepositStatusBadgeProps {
  status: DepositStatus;
}

export function DepositStatusBadge({ status }: DepositStatusBadgeProps) {
  switch (status) {
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
    case 'Expired':
      return (
        <Badge className="bg-[#6B7280] hover:bg-[#4B5563] text-white">
          Expired
        </Badge>
      );
    default:
      return (
        <Badge className="bg-[#9CA3AF] hover:bg-[#6B7280] text-white">
          {status}
        </Badge>
      );
  }
}