import { useState } from 'react';
import { Search, Eye, AlertCircle, Calendar, TrendingUp, FileText, MoreVertical, Edit } from 'lucide-react';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
  userRole: 'super_user' | 'Admin' | 'Finance' | 'Staff' | 'Customer';
}

export function MonthlyRentalInvoiceList({ invoices, total = 0, page = 1, pageSize = 10, orderBy = 'latest', onPageChange, onPageSizeChange, onOrderByChange, onView, onEditPayment, userRole }: MonthlyRentalInvoiceListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = invoices.filter(invoice => {
    const deliveryRequestId = invoice.deliveryRequest?.requestId || '';
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deliveryRequestId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: MonthlyRentalInvoice['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Paid</Badge>;
      case 'Pending Payment':
        return <Badge className="bg-[#EEF5FF] hover:bg-[#E6F0FF] text-[#2F6AE0]">Pending Payment</Badge>;
      case 'Pending Approval':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Pending Approval</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">Rejected</Badge>;
      case 'Overdue':
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white">Overdue</Badge>;
      case 'Completed':
        return <Badge className="bg-gray-600 hover:bg-gray-700 text-white">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalCount = total > 0 ? total : invoices.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const stats = {
    total: totalCount,
    pending: invoices.filter(inv => inv.status === 'Pending Payment').length,
    pendingApproval: invoices.filter(inv => inv.status === 'Pending Approval').length,
    paid: invoices.filter(inv => inv.status === 'Paid').length,
    rejected: invoices.filter(inv => inv.status === 'Rejected').length,
    overdue: invoices.filter(inv => inv.status === 'Overdue').length,
    totalRevenue: invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Overdue Warning - Moved to Top */}
      {stats.overdue > 0 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-orange-900">
                  You have {stats.overdue} overdue invoice{stats.overdue > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Please review and follow up on overdue payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-600">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-600">{stats.pendingApproval}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-600">{stats.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Card */}
      <Card className="border-[#F15929] bg-gradient-to-br from-[#FFF7F5] to-white">
        <CardHeader>
          <CardTitle className="text-[18px] text-[#231F20] flex items-center gap-2">
            <TrendingUp className="size-5 text-[#F15929]" />
            Total Paid Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#F15929]">RM {stats.totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-[#E5E7EB]">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Search by invoice number, customer name, or DO number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-10 bg-white border-[#D1D5DB] rounded-md">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending Payment">Pending Payment</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
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
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <TableHead>Customer</TableHead>
                  <TableHead>DO Number</TableHead>
                  <TableHead>Billing Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="h-14 hover:bg-[#F3F4F6]">
                    <TableCell className="text-[#111827]">
                      {invoice.customerName}
                    </TableCell>
                    <TableCell className="text-[#374151]">{invoice.deliveryRequest?.requestId || invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-[#374151]">
                      {invoice.billingMonth}/{invoice.billingYear}
                    </TableCell>
                    <TableCell className="text-[#111827]">
                      RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-[#374151]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onView(invoice.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {(invoice.status === 'Pending Payment' || invoice.status === 'Rejected' || invoice.status === 'Overdue') && onEditPayment && (
                            <DropdownMenuItem
                              onClick={() => onEditPayment(invoice.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {invoice.status === 'Rejected' ? 'Re-upload Payment Proof' : 'Upload Payment Proof'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {onPageChange != null && totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                    aria-disabled={page <= 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-sm text-[#6B7280]">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1); }}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                    aria-disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
}