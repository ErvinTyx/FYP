import { useState } from 'react';
import { Search, Eye, AlertCircle, Calendar, TrendingUp, FileText, MoreVertical, Edit, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { formatRfqDate } from '../../lib/rfqDate';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MonthlyRentalStatusBadge } from './MonthlyRentalStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { MonthlyRentalInvoice } from '../../types/monthly-rental';
import { ApprovalModal } from './ApprovalModal';
import { RejectionModal } from './RejectionModal';

const PAGE_SIZES = [5, 10, 25, 50] as const;
type OrderBy = 'latest' | 'earliest';

interface MonthlyRentalInvoiceListProps {
  invoices: MonthlyRentalInvoice[];
  total?: number;
  page?: number;
  pageSize?: number;
  orderBy?: OrderBy;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onOrderByChange?: (orderBy: OrderBy) => void;
  onView: (id: string) => void;
  onEditPayment?: (id: string) => void;
  onApprove?: (invoiceId: string, referenceNumber: string) => void;
  onReject?: (invoiceId: string, reason: string) => void;
  userRole: 'super_user' | 'Admin' | 'Finance' | 'Staff' | 'Customer';
  isProcessing?: boolean;
}

export function MonthlyRentalInvoiceList({ invoices, total = 0, page = 1, pageSize = 10, orderBy = 'latest', onPageChange, onPageSizeChange, onOrderByChange, onView, onEditPayment, onApprove, onReject, userRole, isProcessing }: MonthlyRentalInvoiceListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<MonthlyRentalInvoice | null>(null);
  
  const canApproveReject = (userRole === 'super_user' || userRole === 'Admin' || userRole === 'Finance');
  
  const handleApproveClick = (invoice: MonthlyRentalInvoice) => {
    setSelectedInvoice(invoice);
    setIsApprovalModalOpen(true);
  };
  
  const handleRejectClick = (invoice: MonthlyRentalInvoice) => {
    setSelectedInvoice(invoice);
    setIsRejectionModalOpen(true);
  };
  
  const handleApprove = (referenceNumber: string) => {
    if (selectedInvoice && onApprove) {
      onApprove(selectedInvoice.id, referenceNumber);
      setIsApprovalModalOpen(false);
      setSelectedInvoice(null);
    }
  };
  
  const handleReject = (reason: string) => {
    if (selectedInvoice && onReject) {
      onReject(selectedInvoice.id, reason);
      setIsRejectionModalOpen(false);
      setSelectedInvoice(null);
    }
  };
  
  const handleApprovalModalClose = () => {
    setIsApprovalModalOpen(false);
    setSelectedInvoice(null);
  };
  
  const handleRejectionModalClose = () => {
    setIsRejectionModalOpen(false);
    setSelectedInvoice(null);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const deliveryRequestId = invoice.deliveryRequest?.requestId || '';
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deliveryRequestId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalCount = total > 0 ? total : invoices.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  const pendingPaymentCount = invoices.filter(inv => inv.status === 'Pending Payment').length;
  const pendingApprovalCount = invoices.filter(inv => inv.status === 'Pending Approval').length;
  const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
  const paidAmount = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueCount = invoices.filter(inv => inv.status === 'Overdue').length;

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
            <CardTitle className="text-[14px] text-[#6B7280]">Paid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[#059669]" />
              </div>
              <div>
                <p className="text-[#111827]">{paidCount}</p>
                <p className="text-[12px] text-[#059669]">RM{paidAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#FFEDD5] flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-[#EA580C]" />
              </div>
              <div>
                <p className="text-[#111827]">{overdueCount}</p>
                <p className="text-[12px] text-[#EA580C]">Need attention</p>
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
            placeholder="Search by invoice number, customer name, or DO number..."
            className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[18px]">Monthly Rental Invoices</CardTitle>
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
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => onPageSizeChange(Number(v) as 5 | 10 | 25 | 50)}
                  >
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
                <TableHead>Customer</TableHead>
                <TableHead>DO Number</TableHead>
                <TableHead>Billing Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const isOverdue = invoice.status === 'Overdue';
                  return (
                    <TableRow key={invoice.id} className="h-14 hover:bg-[#F3F4F6]">
                      <TableCell className="text-[#374151]">
                        {invoice.customerName}
                      </TableCell>
                      <TableCell className="text-[#374151]">
                        {invoice.deliveryRequest?.requestId || invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-[#374151]">
                        {invoice.billingMonth}/{invoice.billingYear}
                      </TableCell>
                      <TableCell className="text-[#111827]">
                        RM{invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <MonthlyRentalStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        <div className={isOverdue ? "text-[#EA580C]" : "text-[#374151]"}>
                          {formatRfqDate(invoice.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]" disabled={isProcessing}>
                              <MoreVertical className="h-4 w-4 text-[#6B7280]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem onClick={() => onView(invoice.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            
                            {/* Upload proof for Pending Payment, Overdue, or Rejected */}
                            {(invoice.status === 'Pending Payment' || invoice.status === 'Rejected' || invoice.status === 'Overdue') && onEditPayment && (
                              <DropdownMenuItem
                                onClick={() => onEditPayment(invoice.id)}
                                disabled={isProcessing}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                {invoice.status === 'Rejected' ? 'Re-Upload Proof' : 'Upload Proof'}
                              </DropdownMenuItem>
                            )}
                            
                            {/* Approve/Reject actions for Pending Approval */}
                            {canApproveReject && invoice.status === 'Pending Approval' && (onApprove || onReject) && (
                              <>
                                <DropdownMenuSeparator />
                                {onApprove && (
                                  <DropdownMenuItem
                                    onClick={() => handleApproveClick(invoice)}
                                    disabled={isProcessing}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-[#10B981]" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {onReject && (
                                  <DropdownMenuItem
                                    onClick={() => handleRejectClick(invoice)}
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

      {/* Approval Modal */}
      {selectedInvoice && (
        <ApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={handleApprovalModalClose}
          onApprove={handleApprove}
          invoiceNumber={selectedInvoice.invoiceNumber}
          customerName={selectedInvoice.customerName}
          amount={selectedInvoice.totalAmount}
        />
      )}

      {/* Rejection Modal */}
      {selectedInvoice && (
        <RejectionModal
          isOpen={isRejectionModalOpen}
          onClose={handleRejectionModalClose}
          onReject={handleReject}
          invoiceNumber={selectedInvoice.invoiceNumber}
        />
      )}
    </div>
  );
}