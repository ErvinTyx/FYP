import { Badge } from "../ui/badge";
import { Deposit } from "../../types/deposit";

interface DepositStatusBadgeProps {
  status: Deposit['status'];
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
  }
}