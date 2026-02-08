import { useState } from "react";
import { Search, Eye, FileText, Calendar, DollarSign, AlertCircle, MoreVertical, Upload, CalendarClock, XCircle, Ban } from "lucide-react";
import { formatRfqDate } from "../../lib/rfqDate";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { DepositStatusBadge } from "./DepositStatusBadge";
import { UploadProofModal } from "./UploadProofModal";
import { Deposit } from "../../types/deposit";

const PAGE_SIZES = [5, 10, 25, 50] as const;
type OrderBy = "latest" | "earliest";

interface DepositListProps {
  deposits: Deposit[];
  total?: number;
  page?: number;
  pageSize?: number;
  orderBy?: OrderBy;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onOrderByChange?: (orderBy: OrderBy) => void;
  onView: (id: string) => void;
  onUploadProof?: (depositId: string, file: File) => void;
  onResetDueDate?: (depositId: string, newDueDate: string) => void;
  onMarkExpired?: (depositId: string) => void;
  userRole: "super_user" | "Admin" | "Finance" | "Staff" | "Customer";
  isProcessing?: boolean;
}

export function DepositList({ deposits, total = 0, page = 1, pageSize = 10, orderBy = "latest", onPageChange, onPageSizeChange, onOrderByChange, onView, onUploadProof, onResetDueDate, onMarkExpired, userRole, isProcessing }: DepositListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDepositForUpload, setSelectedDepositForUpload] = useState<Deposit | null>(null);
  const [resetDueDateModalOpen, setResetDueDateModalOpen] = useState(false);
  const [selectedDepositForReset, setSelectedDepositForReset] = useState<Deposit | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [confirmExpireModalOpen, setConfirmExpireModalOpen] = useState(false);
  const [selectedDepositForExpire, setSelectedDepositForExpire] = useState<Deposit | null>(null);

  const filteredDeposits = deposits.filter((deposit) => {
    const depositNumber = deposit.depositNumber || deposit.depositId || '';
    const invoiceNo = deposit.invoiceNo || deposit.agreement?.agreementNumber || '';
    const customerName = deposit.customerName || deposit.agreement?.hirer || '';
    
    const matchesSearch =
      depositNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || deposit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingPaymentCount = deposits.filter((d) => d.status === "Pending Payment").length;
  const pendingApprovalCount = deposits.filter((d) => d.status === "Pending Approval").length;
  const paidCount = deposits.filter((d) => d.status === "Paid").length;
  const paidAmount = deposits
    .filter((d) => d.status === "Paid")
    .reduce((sum, d) => sum + d.depositAmount, 0);

  // Count overdue and expired deposits
  const overdueCount = deposits.filter((d) => d.status === "Overdue").length;
  const expiredCount = deposits.filter((d) => d.status === "Expired").length;
  
  const canManageDeposits = userRole === "super_user" || userRole === "Admin" || userRole === "Finance";

  const handleResetDueDate = () => {
    if (selectedDepositForReset && onResetDueDate && newDueDate) {
      onResetDueDate(selectedDepositForReset.id, newDueDate);
      setResetDueDateModalOpen(false);
      setSelectedDepositForReset(null);
      setNewDueDate("");
    }
  };

  const handleMarkExpired = () => {
    if (selectedDepositForExpire && onMarkExpired) {
      onMarkExpired(selectedDepositForExpire.id);
      setConfirmExpireModalOpen(false);
      setSelectedDepositForExpire(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-[#111827]">{pendingPaymentCount}</p>
                <p className="text-[12px] text-[#6B7280]">Awaiting payment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-[#111827]">{pendingApprovalCount}</p>
                <p className="text-[12px] text-[#6B7280]">Need review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Paid Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[#059669]" />
              </div>
              <div>
                <p className="text-[#111827]">{paidCount}</p>
                <p className="text-[12px] text-[#059669]">RM{paidAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Overdue / Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#FFEDD5] flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-[#EA580C]" />
              </div>
              <div>
                <p className="text-[#111827]">{overdueCount + expiredCount}</p>
                <p className="text-[12px] text-[#EA580C]">{overdueCount} overdue, {expiredCount} expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search by deposit ID, invoice, or customer..."
            className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending Payment">Pending Payment</SelectItem>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[18px]">Deposit List</CardTitle>
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
                <TableHead>Invoice No.</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Deposit Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">
                    No deposits found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeposits.map((deposit) => {
                  const displayInvoiceNo = deposit.invoiceNo || deposit.agreement?.agreementNumber || deposit.depositNumber || '-';
                  const displayCustomerName = deposit.customerName || deposit.agreement?.hirer || 'Unknown';
                  const displayLastUpdated = deposit.lastUpdated || deposit.updatedAt || deposit.createdAt;
                  const isOverdueOrExpired = deposit.status === "Overdue" || deposit.status === "Expired";
                  
                  return (
                    <TableRow key={deposit.id} className="h-14 hover:bg-[#F3F4F6]">
                      <TableCell className="text-[#374151]">
                        {displayInvoiceNo}
                      </TableCell>
                      <TableCell className="text-[#374151]">
                        {displayCustomerName}
                      </TableCell>
                      <TableCell className="text-[#111827]">
                        RM{deposit.depositAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DepositStatusBadge status={deposit.status} />
                      </TableCell>
                      <TableCell>
                        <div className={isOverdueOrExpired ? "text-[#EA580C]" : "text-[#374151]"}>
                          {formatRfqDate(deposit.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#374151]">
                        {formatRfqDate(displayLastUpdated)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]" disabled={isProcessing}>
                              <MoreVertical className="h-4 w-4 text-[#6B7280]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem onClick={() => onView(deposit.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            
                            {/* Upload proof for Pending Payment, Overdue, or Rejected */}
                            {onUploadProof && (deposit.status === "Pending Payment" || deposit.status === "Rejected" || deposit.status === "Overdue") && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedDepositForUpload(deposit);
                                  setUploadModalOpen(true);
                                }}
                                disabled={isProcessing}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {deposit.status === "Rejected" ? "Re-Upload Proof" : "Upload Proof"}
                              </DropdownMenuItem>
                            )}
                            
                            {/* Admin actions for Overdue deposits */}
                            {canManageDeposits && deposit.status === "Overdue" && (
                              <>
                                <DropdownMenuSeparator />
                                {onResetDueDate && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedDepositForReset(deposit);
                                      // Set default new due date to 14 days from now
                                      const defaultDate = new Date();
                                      defaultDate.setDate(defaultDate.getDate() + 14);
                                      setNewDueDate(defaultDate.toISOString().split('T')[0]);
                                      setResetDueDateModalOpen(true);
                                    }}
                                    disabled={isProcessing}
                                  >
                                    <CalendarClock className="mr-2 h-4 w-4" />
                                    Reset Due Date
                                  </DropdownMenuItem>
                                )}
                                {onMarkExpired && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedDepositForExpire(deposit);
                                      setConfirmExpireModalOpen(true);
                                    }}
                                    disabled={isProcessing}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Mark as Expired
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
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

      {/* Upload Proof Modal */}
      {uploadModalOpen && selectedDepositForUpload && onUploadProof && (
        <UploadProofModal
          open={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedDepositForUpload(null);
          }}
          onSubmit={(file) => {
            onUploadProof(selectedDepositForUpload.id, file);
            setUploadModalOpen(false);
            setSelectedDepositForUpload(null);
          }}
          depositInvoiceNo={selectedDepositForUpload.invoiceNo || selectedDepositForUpload.depositNumber || ''}
          isReupload={selectedDepositForUpload.status === "Rejected"}
        />
      )}

      {/* Reset Due Date Modal */}
      <Dialog open={resetDueDateModalOpen} onOpenChange={setResetDueDateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Due Date</DialogTitle>
            <DialogDescription>
              Set a new due date for this overdue deposit. The deposit will return to "Pending Payment" status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-due-date" className="text-right">
                New Due Date
              </Label>
              <Input
                id="new-due-date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="col-span-3"
              />
            </div>
            {selectedDepositForReset && (
              <div className="text-sm text-gray-500">
                <p>Deposit: {selectedDepositForReset.depositNumber || selectedDepositForReset.depositId}</p>
                <p>Customer: {selectedDepositForReset.customerName || selectedDepositForReset.agreement?.hirer}</p>
                <p>Amount: RM{selectedDepositForReset.depositAmount.toLocaleString()}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setResetDueDateModalOpen(false);
                setSelectedDepositForReset(null);
                setNewDueDate("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetDueDate}
              disabled={!newDueDate || isProcessing}
              className="bg-[#F15929] hover:bg-[#D14620] text-white"
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Reset Due Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Mark as Expired Modal */}
      <Dialog open={confirmExpireModalOpen} onOpenChange={setConfirmExpireModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Mark as Expired</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this deposit as expired? This action indicates the deposit is no longer active and cannot be reversed easily.
            </DialogDescription>
          </DialogHeader>
          {selectedDepositForExpire && (
            <div className="py-4 space-y-2 text-sm">
              <p><strong>Deposit:</strong> {selectedDepositForExpire.depositNumber || selectedDepositForExpire.depositId}</p>
              <p><strong>Customer:</strong> {selectedDepositForExpire.customerName || selectedDepositForExpire.agreement?.hirer}</p>
              <p><strong>Amount:</strong> RM{selectedDepositForExpire.depositAmount.toLocaleString()}</p>
              <p><strong>Original Due Date:</strong> {formatRfqDate(selectedDepositForExpire.dueDate)}</p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setConfirmExpireModalOpen(false);
                setSelectedDepositForExpire(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMarkExpired}
              disabled={isProcessing}
              variant="destructive"
            >
              <Ban className="mr-2 h-4 w-4" />
              Mark as Expired
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}