import { Eye, FileText, Download, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Transaction } from "../../types/statementOfAccount";
import { TransactionTypeBadge } from "./TransactionTypeBadge";
import { TransactionStatusBadge } from "./TransactionStatusBadge";

type SOAAction = "view" | "viewDocument" | "downloadReceipt";

interface TransactionLedgerProps {
  transactions: Transaction[];
  onViewDetails?: (transaction: Transaction) => void;
  onNavigate?: (transaction: Transaction, action: SOAAction) => void;
}

export function TransactionLedger({
  transactions,
  onViewDetails,
  onNavigate,
}: TransactionLedgerProps) {
  const handleViewDetails = (transaction: Transaction) => {
    if (onNavigate && transaction.entityType && transaction.entityId) {
      onNavigate(transaction, "view");
    } else if (onViewDetails) {
      onViewDetails(transaction);
    }
  };

  const handleViewDocument = (transaction: Transaction) => {
    if (onNavigate && transaction.entityType && transaction.entityId) {
      onNavigate(transaction, "viewDocument");
    }
  };

  const handleDownload = (transaction: Transaction) => {
    if (onNavigate && transaction.entityType && transaction.entityId) {
      onNavigate(transaction, "downloadReceipt");
    }
  };

  return (
    <Card className="border-[#E5E7EB]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[18px]">
          Transaction Ledger ({transactions.length} entries)
        </CardTitle>
        <div className="text-xs text-[#6B7280] bg-[#F9FAFB] px-3 py-1.5 rounded-md border border-[#E5E7EB]">
          <strong>Formula:</strong> Balance = Previous Balance + Debit - Credit
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-[#E5E7EB]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead className="text-[#374151]">Date</TableHead>
                <TableHead className="text-[#374151]">Transaction Type</TableHead>
                <TableHead className="text-[#374151]">Description</TableHead>
                <TableHead className="text-[#374151] text-right">Debit (RM)</TableHead>
                <TableHead className="text-[#374151] text-right">Credit (RM)</TableHead>
                <TableHead className="text-[#374151] text-right">Balance (RM)</TableHead>
                <TableHead className="text-[#374151]">Status</TableHead>
                <TableHead className="text-[#374151] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-[#9CA3AF]">
                    No transactions found for this project
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction, index) => (
                  <TableRow key={transaction.id} className="hover:bg-[#F9FAFB]">
                    <TableCell className="text-[#374151] whitespace-nowrap">
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge type={transaction.type} />
                    </TableCell>
                    <TableCell className="text-[#374151] max-w-xs truncate">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-right text-[#DC2626]">
                      {transaction.debit > 0 ? transaction.debit.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-[#10B981]">
                      {transaction.credit > 0 ? transaction.credit.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell 
                      className={`text-right ${
                        transaction.balance > 0 
                          ? 'text-[#DC2626]' 
                          : transaction.balance < 0 
                          ? 'text-[#10B981]' 
                          : 'text-[#374151]'
                      }`}
                    >
                      {transaction.balance > 0 && '+'}
                      {transaction.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]">
                            <MoreVertical className="h-4 w-4 text-[#6B7280]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDocument(transaction)}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Document
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(transaction)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Receipt
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}