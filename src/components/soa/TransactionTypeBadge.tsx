import { TransactionType } from "../../types/statementOfAccount";

interface TransactionTypeBadgeProps {
  type: TransactionType;
}

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  const getTypeStyles = () => {
    switch (type) {
      case "Deposit":
      case "Deposit Payment":
        return "bg-[#DBEAFE] text-[#1E40AF]";
      case "Deposit Refund":
        return "bg-[#FEF3C7] text-[#92400E]";
      case "Monthly Bill":
        return "bg-[#E0E7FF] text-[#3730A3]";
      case "Monthly Payment":
        return "bg-[#D1FAE5] text-[#065F46]";
      case "Default Interest":
        return "bg-[#FEE2E2] text-[#991B1B]";
      case "Additional Charge":
        return "bg-[#FFEDD5] text-[#9A3412]";
      case "Additional Charge Payment":
        return "bg-[#D1FAE5] text-[#065F46]";
      case "Credit Note":
        return "bg-[#F3E8FF] text-[#6B21A8]";
      case "Adjustment":
        return "bg-[#F1F5F9] text-[#475569]";
      default:
        return "bg-[#F3F4F6] text-[#374151]";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs whitespace-nowrap ${getTypeStyles()}`}
    >
      {type}
    </span>
  );
}
