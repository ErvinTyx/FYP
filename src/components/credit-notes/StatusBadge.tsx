import { Badge } from "../ui/badge";
import { CreditNote } from "../../types/creditNote";

interface StatusBadgeProps {
  status: CreditNote['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'Approved':
      return (
        <Badge className="bg-[#059669] hover:bg-[#047857] text-white">
          Approved
        </Badge>
      );
    case 'Pending Approval':
      return (
        <Badge className="bg-[#F59E0B] hover:bg-[#D97706] text-white">
          Pending Approval
        </Badge>
      );
    case 'Draft':
      return (
        <Badge className="bg-[#6B7280] hover:bg-[#4B5563] text-white">
          Draft
        </Badge>
      );
    case 'Rejected':
      return (
        <Badge className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">
          Rejected
        </Badge>
      );
  }
}
