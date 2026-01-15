import { TransactionStatus } from "../../types/statementOfAccount";

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
}

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "Paid":
      case "Approved":
        return "bg-[#D1FAE5] text-[#065F46]";
      case "Unpaid":
        return "bg-[#FEE2E2] text-[#991B1B]";
      case "Pending Approval":
        return "bg-[#FEF3C7] text-[#92400E]";
      case "Rejected":
        return "bg-[#FEE2E2] text-[#DC2626]";
      case "Partial":
        return "bg-[#FFEDD5] text-[#9A3412]";
      default:
        return "bg-[#F3F4F6] text-[#374151]";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusStyles()}`}
    >
      {status}
    </span>
  );
}
