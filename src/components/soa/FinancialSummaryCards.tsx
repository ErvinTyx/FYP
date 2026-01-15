import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CreditCard, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SOASummary } from "../../types/statementOfAccount";

interface FinancialSummaryCardsProps {
  summary: SOASummary;
}

export function FinancialSummaryCards({ summary }: FinancialSummaryCardsProps) {
  const isCustomerOwes = summary.finalBalance > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Deposit Collected */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#6B7280] flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#F15929]" />
            Total Deposit Collected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl text-[#231F20]">
            RM{summary.totalDepositCollected.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Total Monthly Billing */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#6B7280] flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#F15929]" />
            Total Monthly Billing Issued
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl text-[#231F20]">
            RM{summary.totalMonthlyBilling.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Total Penalty / Default Interest */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#6B7280] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#DC2626]" />
            Total Penalty / Default Interest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl text-[#DC2626]">
            RM{summary.totalPenalty.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Total Additional Charges */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#6B7280] flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#F15929]" />
            Total Additional Charges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl text-[#231F20]">
            RM{summary.totalAdditionalCharges.toFixed(2)}
          </p>
          <p className="text-xs text-[#6B7280] mt-1">
            Damage / Repair / Missing / Cleaning
          </p>
        </CardContent>
      </Card>

      {/* Total Paid Amount */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#6B7280] flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[#10B981]" />
            Total Paid Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl text-[#10B981]">
            RM{summary.totalPaid.toFixed(2)}
          </p>
          <p className="text-xs text-[#6B7280] mt-1">All Payments Received</p>
        </CardContent>
      </Card>

      {/* Final Balance */}
      <Card className={`border-2 ${isCustomerOwes ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-[#10B981] bg-[#F0FDF4]'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#6B7280] flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${isCustomerOwes ? 'text-[#DC2626]' : 'text-[#10B981]'}`} />
            Final Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl ${isCustomerOwes ? 'text-[#DC2626]' : 'text-[#10B981]'}`}>
            {isCustomerOwes ? '' : '-'}RM{Math.abs(summary.finalBalance).toFixed(2)}
          </p>
          <p className={`text-sm mt-2 ${isCustomerOwes ? 'text-[#DC2626]' : 'text-[#10B981]'}`}>
            {isCustomerOwes ? '⚠️ Customer Owes' : '✓ Customer Has Credit'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
