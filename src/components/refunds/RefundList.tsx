import { useState } from "react";
import { Plus, Eye, MoreVertical, CheckCircle, XCircle, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { RejectionModal } from "../monthly-rental/RejectionModal";
import { formatRfqDate } from "../../lib/rfqDate";
import type { Refund, RefundStatus } from "../../types/refund";

const PAGE_SIZES = [5, 10, 25, 50] as const;
type OrderBy = "latest" | "earliest";

function invoiceTypeLabel(invoiceType: string): string {
  switch (invoiceType) {
    case "deposit":
      return "Deposit";
    case "monthlyRental":
      return "Monthly Rental";
    case "additionalCharge":
      return "Additional Charge";
    default:
      return invoiceType;
  }
}

interface RefundSummary {
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
}

interface RefundListProps {
  refunds: Refund[];
  total?: number;
  page?: number;
  pageSize?: number;
  orderBy?: OrderBy;
  searchQuery?: string;
  statusFilter?: string;
  onSearchChange?: (value: string) => void;
  onStatusFilterChange?: (value: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onOrderByChange?: (orderBy: OrderBy) => void;
  loading?: boolean;
  onCreateNew: () => void;
  onViewDetails: (refund: Refund) => void;
  userRole?: "super_user" | "Admin" | "Finance" | "Sales" | "Customer" | "Other";
  onApprove?: (refundId: string) => void;
  onReject?: (refundId: string, reason: string) => void;
  isProcessing?: boolean;
  summary?: RefundSummary | null;
}

export function RefundList({ refunds, total = 0, page = 1, pageSize = 10, orderBy = "latest", searchQuery = "", statusFilter = "all", onSearchChange, onStatusFilterChange, onPageChange, onPageSizeChange, onOrderByChange, loading, onCreateNew, onViewDetails, userRole = "Other", onApprove, onReject, isProcessing = false, summary }: RefundListProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);

  const displayRefunds = refunds;

  const totalAmount = summary?.totalAmount ?? refunds.reduce((acc, r) => acc + r.amount, 0);
  const pendingCount = summary?.pendingCount ?? refunds.filter((r) => r.status === "Pending Approval").length;
  const approvedCount = summary?.approvedCount ?? refunds.filter((r) => r.status === "Approved").length;

  const canApproveReject = userRole === "super_user" || userRole === "Admin" || userRole === "Finance";
  const canCreateRefund = userRole === "super_user" || userRole === "Admin" || userRole === "Sales";

  const handleApproveClick = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowApproveDialog(true);
  };

  const handleRejectClick = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowRejectModal(true);
  };

  const handleApprove = () => {
    if (selectedRefund && onApprove) {
      onApprove(selectedRefund.id);
      setShowApproveDialog(false);
      setSelectedRefund(null);
    }
  };

  const handleReject = (reason: string) => {
    if (selectedRefund && onReject) {
      onReject(selectedRefund.id, reason);
      setShowRejectModal(false);
      setSelectedRefund(null);
    }
  };

  const handleApproveDialogClose = () => {
    setShowApproveDialog(false);
    setSelectedRefund(null);
  };

  const handleRejectModalClose = () => {
    setShowRejectModal(false);
    setSelectedRefund(null);
  };
  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case "Draft":
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">Draft</Badge>;
      case "Pending Approval":
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Pending Approval</Badge>;
      case "Approved":
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Approved</Badge>;
      case "Rejected":
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Rejected</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1>Refund Management</h1>
          <p className="text-[#374151]">Process and track refund requests across all invoice types</p>
        </div>
        {canCreateRefund && (
          <Button
            onClick={onCreateNew}
            className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Issue New Refund
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">{total > 0 ? total : refunds.length}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#F59E0B]">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#059669]">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">
              RM{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search by Refund ID, invoice, or customer..."
            className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange?.(v)}>
          <SelectTrigger className="w-[200px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[18px]">Refund Listing</CardTitle>
          {(onPageSizeChange != null || onOrderByChange != null) && (
            <div className="flex items-center gap-3 text-sm text-[#6B7280]">
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Refund ID</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Invoice Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-[#6B7280] h-32">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : displayRefunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-[#6B7280] h-32">
                    No refund records found. {total === 0 ? 'Click "Issue New Refund" to create one.' : 'Try adjusting your search or filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayRefunds.map((refund) => (
                  <TableRow key={refund.id} className="h-14 hover:bg-[#F3F4F6]">
                    <TableCell className="text-[#111827]">{refund.refundNumber}</TableCell>
                    <TableCell className="text-[#374151]">{refund.originalInvoice}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                        {invoiceTypeLabel(refund.invoiceType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#374151]">{refund.customerName}</TableCell>
                    <TableCell className="text-[#111827]">
                      RM{refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell className="text-[#374151]">
                      {formatRfqDate(refund.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]" disabled={isProcessing}>
                            <MoreVertical className="h-4 w-4 text-[#6B7280]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuItem onClick={() => onViewDetails(refund)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canApproveReject && refund.status === "Pending Approval" && (onApprove || onReject) && (
                            <>
                              <DropdownMenuSeparator />
                              {onApprove && (
                                <DropdownMenuItem
                                  onClick={() => handleApproveClick(refund)}
                                  disabled={isProcessing}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-[#10B981]" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {onReject && (
                                <DropdownMenuItem
                                  onClick={() => handleRejectClick(refund)}
                                  disabled={isProcessing}
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-[#DC2626]" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {onPageChange != null && total > 0 && (() => {
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            if (totalPages <= 1) return null;
            return (
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
            );
          })()}
        </CardContent>
      </Card>

      {selectedRefund && (
        <AlertDialog open={showApproveDialog} onOpenChange={(open) => !open && handleApproveDialogClose()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Refund</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this refund of RM
                {selectedRefund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                for {selectedRefund.customerName}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleApproveDialogClose}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApprove}
                className="bg-[#059669] hover:bg-[#047857]"
                disabled={isProcessing}
              >
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedRefund && (
        <RejectionModal
          isOpen={showRejectModal}
          onClose={handleRejectModalClose}
          onReject={handleReject}
          invoiceNumber={selectedRefund.refundNumber}
          entityType="refund"
        />
      )}
    </div>
  );
}
