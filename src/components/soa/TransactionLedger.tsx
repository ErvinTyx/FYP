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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
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

const PAGE_SIZES = [5, 10, 25, 50] as const;
type OrderBy = "latest" | "earliest";

type SOAAction = "view" | "viewDocument" | "downloadReceipt";

interface TransactionLedgerProps {
  transactions: Transaction[];
  total?: number;
  page?: number;
  pageSize?: number;
  orderBy?: OrderBy;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onOrderByChange?: (orderBy: OrderBy) => void;
  onViewDetails?: (transaction: Transaction) => void;
  onNavigate?: (transaction: Transaction, action: SOAAction) => void;
}

export function TransactionLedger({
  transactions,
  total = 0,
  page = 1,
  pageSize = 10,
  orderBy = "latest",
  onPageChange,
  onPageSizeChange,
  onOrderByChange,
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

  const totalCount = total > 0 ? total : transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <Card className="border-[#E5E7EB]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-[18px]">
          Transaction Ledger ({totalCount} entries)
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          {(onOrderByChange != null || onPageSizeChange != null) && (
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              {onOrderByChange != null && (
                <>
                  <span>Order:</span>
                  <Select value={orderBy} onValueChange={(v) => onOrderByChange(v as OrderBy)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest first</SelectItem>
                      <SelectItem value="earliest">Earliest first</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {onPageSizeChange != null && (
                <>
                  <span>Rows per page:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v) as 5 | 10 | 25 | 50)}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          )}
          <div className="text-xs text-[#6B7280] bg-[#F9FAFB] px-3 py-1.5 rounded-md border border-[#E5E7EB]">
            <strong>Formula:</strong> Balance = Previous Balance + Debit - Credit
          </div>
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
        {onPageChange != null && totalCount > 0 && totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                  aria-disabled={page <= 1}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-2 text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1); }}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  aria-disabled={page >= totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}