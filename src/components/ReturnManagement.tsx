import { useState, useEffect, useCallback } from "react";
import { 
  Package, Calendar as CalendarIcon, AlertCircle, Eye,
  ClipboardCheck, ArrowRight, Plus, PackageCheck, Truck,
  MoreVertical, Edit, FileText, Loader2, Search, Filter,
  FileSpreadsheet, Download
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ReportPDFGenerator, downloadPDF } from "../lib/report-pdf-generator";
import { generateTableExcel, downloadExcel } from "../lib/report-excel-generator";
import { ReportTablePagination } from "./reports/ReportTablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ReturnWorkflow, Return, ReturnItem } from "./return/ReturnWorkflow";
import { ReturnDetails } from "./return/ReturnDetails";

// Filter options: only statuses set in Return Management page workflow (ReturnWorkflow). Excludes Requested, Driver Recording (step only; saved as In Transit), Dispute Raised (not set in this flow).
const RETURN_PROCESS_STATUSES: Return['status'][] = [
  'Pending',
  'Pickup Scheduled',
  'Pickup Confirmed',
  'In Transit',
  'Received at Warehouse',
  'Under Inspection',
  'Sorting Complete',
  'Customer Notified',
  'Completed',
];

export function ReturnManagement() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'workflow' | 'details'>('list');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  // Fetch returns from API
  const fetchReturns = useCallback(async () => {
    try {
      const response = await fetch('/api/return');
      const data = await response.json();
      if (data.success) {
        // Transform API data to match Return interface
        const transformedReturns: Return[] = data.returnRequests
          .filter((req: { status: string }) => 
            // Only show returns that have moved past 'Requested' status (i.e., Agreed or later)
            req.status !== 'Requested' && req.status !== 'Quoted'
          )
          .map((req: {
            id: string;
            requestId: string;
            customerName: string;
            customerPhone?: string;
            agreementNo: string;
            setName: string;
            returnType: string;
            collectionMethod: string;
            requestDate: string;
            status: string;
            pickupAddress: string;
            grnNumber?: string;
            rcfNumber?: string;
            pickupDriver?: string;
            driverContact?: string;
            pickupDate?: string;
            pickupTimeSlot?: string;
            customerNotificationSent?: boolean;
            hasExternalGoods?: boolean;
            externalGoodsNotes?: string;
            externalGoodsPhotos?: unknown;
            productionNotes?: string;
            inventoryUpdated?: boolean;
            soaUpdated?: boolean;
            driverRecordPhotos?: unknown;
            warehousePhotos?: unknown;
            damagePhotos?: unknown;
            items: Array<{
              id: string;
              name: string;
              quantity: number;
              quantityReturned: number;
              status: string;
              notes?: string;
              statusBreakdown?: { Good: number; Damaged: number; Replace: number };
            }>;
          }) => ({
            id: req.id,
            orderId: req.requestId, // Standard Return ID (RET-XXX format)
            customer: req.customerName,
            customerContact: req.customerPhone || '',
            returnType: req.returnType === 'full' ? 'Full' : req.returnType === 'partial' ? 'Partial' : req.returnType as 'Full' | 'Partial',
            transportationType: req.collectionMethod === 'transport' ? 'Transportation Needed' : req.collectionMethod === 'self-return' ? 'Self Return' : req.collectionMethod as 'Self Return' | 'Transportation Needed',
            requestDate: req.requestDate,
            status: mapApiStatusToWorkflowStatus(req.status),
            pickupAddress: req.pickupAddress,
            grnNumber: req.grnNumber,
            rcfNumber: req.rcfNumber,
            pickupDriver: req.pickupDriver,
            driverContact: req.driverContact,
            pickupDate: req.pickupDate,
            pickupTimeSlot: req.pickupTimeSlot,
            customerNotificationSent: req.customerNotificationSent,
            hasExternalGoods: req.hasExternalGoods,
            externalGoodsNotes: req.externalGoodsNotes,
            externalGoodsPhotos: req.externalGoodsPhotos as Return['externalGoodsPhotos'],
            productionNotes: req.productionNotes,
            inventoryUpdated: req.inventoryUpdated,
            soaUpdated: req.soaUpdated,
            driverRecordPhotos: req.driverRecordPhotos as Return['driverRecordPhotos'],
            warehousePhotos: req.warehousePhotos as Return['warehousePhotos'],
            damagePhotos: req.damagePhotos as Return['damagePhotos'],
            items: req.items.map((item) => ({
              id: item.id,
              name: item.name,
              category: 'Scaffolding',
              quantity: item.quantity,
              quantityReturned: item.quantityReturned || item.quantity,
              status: (item.status || 'Good') as ReturnItem['status'],
              notes: item.notes,
              statusBreakdown: item.statusBreakdown,
            })),
          }));
        setReturns(transformedReturns);
      } else {
        console.error('Failed to fetch returns:', data.message);
        toast.error('Failed to load returns');
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Error loading returns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Map API status to workflow status
  const mapApiStatusToWorkflowStatus = (apiStatus: string): Return['status'] => {
    const statusMap: Record<string, Return['status']> = {
      'Requested': 'Requested',
      'Quoted': 'Requested',
      'Agreed': 'Requested', // Start from step 1 (Schedule Date & Time)
      'Scheduled': 'Pickup Scheduled',
      'In Transit': 'In Transit',
      'Received': 'Received at Warehouse',
      'Customer Notified': 'Customer Notified',
      'GRN Generated': 'Under Inspection',
      'Cancelled': 'Completed',
      // Direct workflow statuses
      'Approved': 'Pending',
      'Pending': 'Pending',
      'Pickup Scheduled': 'Pickup Scheduled',
      'Pickup Confirmed': 'Pickup Confirmed',
      'Driver Recording': 'Driver Recording',
      'Received at Warehouse': 'Received at Warehouse',
      'Under Inspection': 'Under Inspection',
      'Sorting Complete': 'Sorting Complete',
      'Dispute Raised': 'Dispute Raised',
      'Completed': 'Completed',
    };
    return statusMap[apiStatus] || 'Requested';
  };

  // Load returns on mount
  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Save return to database
  const saveReturnToDatabase = async (returnOrder: Return): Promise<boolean> => {
    try {
      // #region agent log
      const itemsPayload = returnOrder.items?.map(item => ({
        id: item.id,
        quantityReturned: item.quantityReturned,
        status: item.status,
        notes: item.notes,
        hasStatusBreakdown: !!item.statusBreakdown,
        statusBreakdown: item.statusBreakdown,
      }));
      fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReturnManagement.tsx:saveReturnToDatabase',message:'PUT payload items',data:{itemCount:returnOrder.items?.length,firstItem:itemsPayload?.[0],allHaveBreakdown:itemsPayload?.every(i=>i.hasStatusBreakdown)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/return', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: returnOrder.id,
          status: returnOrder.status,
          grnNumber: returnOrder.grnNumber,
          rcfNumber: returnOrder.rcfNumber,
          pickupDriver: returnOrder.pickupDriver,
          driverContact: returnOrder.driverContact,
          pickupDate: returnOrder.pickupDate,
          pickupTimeSlot: returnOrder.pickupTimeSlot,
          customerNotificationSent: returnOrder.customerNotificationSent,
          hasExternalGoods: returnOrder.hasExternalGoods,
          externalGoodsNotes: returnOrder.externalGoodsNotes,
          externalGoodsPhotos: returnOrder.externalGoodsPhotos,
          productionNotes: returnOrder.productionNotes,
          inventoryUpdated: returnOrder.inventoryUpdated,
          soaUpdated: returnOrder.soaUpdated,
          driverRecordPhotos: returnOrder.driverRecordPhotos,
          warehousePhotos: returnOrder.warehousePhotos,
          damagePhotos: returnOrder.damagePhotos,
          items: returnOrder.items?.map(item => ({
            id: item.id,
            quantityReturned: item.quantityReturned,
            status: item.status,
            notes: item.notes,
            statusBreakdown: item.statusBreakdown,
          })),
        }),
      });
      const data = await response.json();
      
      return data.success;
    } catch (error) {
      console.error('Error saving return to database:', error);
      return false;
    }
  };

  const getReturnStatusBadge = (status: Return['status']) => {
    const statusConfig = {
      'Requested': { color: 'bg-[#3B82F6] hover:bg-[#2563EB]', text: 'Requested' },
      'Pending': { color: 'bg-[#10B981] hover:bg-[#059669]', text: 'Pending' },
      'Pickup Scheduled': { color: 'bg-[#8B5CF6] hover:bg-[#7C3AED]', text: 'Pickup Scheduled' },
      'Pickup Confirmed': { color: 'bg-[#8B5CF6] hover:bg-[#7C3AED]', text: 'Pickup Confirmed' },
      'Driver Recording': { color: 'bg-[#F59E0B] hover:bg-[#D97706]', text: 'Driver Recording' },
      'In Transit': { color: 'bg-[#F59E0B] hover:bg-[#D97706]', text: 'In Transit' },
      'Received at Warehouse': { color: 'bg-[#06B6D4] hover:bg-[#0891B2]', text: 'Received at Warehouse' },
      'Under Inspection': { color: 'bg-[#F59E0B] hover:bg-[#D97706]', text: 'Under Inspection' },
      'Sorting Complete': { color: 'bg-[#10B981] hover:bg-[#059669]', text: 'Sorting Complete' },
      'Customer Notified': { color: 'bg-[#10B981] hover:bg-[#059669]', text: 'Customer Notified' },
      'Dispute Raised': { color: 'bg-[#DC2626] hover:bg-[#B91C1C]', text: 'Dispute Raised' },
      'Completed': { color: 'bg-[#059669] hover:bg-[#047857]', text: 'Completed' },
    };
    const config = statusConfig[status] || statusConfig['Requested'];
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const handleViewDetails = (returnOrder: Return) => {
    setSelectedReturn(returnOrder);
    setViewMode('details');
  };

  const handleProcessReturn = (returnOrder: Return) => {
    setSelectedReturn(returnOrder);
    setViewMode('workflow');
  };

  const handleSaveReturn = async (returnOrder: Return) => {
    // Save to database
    const success = await saveReturnToDatabase(returnOrder);
    
    if (success) {
      // Refresh data from database
      await fetchReturns();
      // Update selected return with latest data
      setSelectedReturn(returnOrder);
      // Only show toast for completed, otherwise silent save
      if (returnOrder.status === 'Completed') {
        toast.success('Return completed successfully');
        setViewMode('list');
        setSelectedReturn(null);
      }
    } else {
      throw new Error('Failed to save return to database');
    }
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedReturn(null);
  };

  // Filter returns based on search term and status filter
  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = 
      (returnItem.orderId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      returnItem.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const paginatedReturns = filteredReturns.slice((page - 1) * pageSize, page * pageSize);
  const dateStr = new Date().toISOString().split('T')[0];

  const exportToPDF = () => {
    const headers = ['Return ID', 'Customer', 'Type', 'Transportation', 'Scheduled Date', 'Status'];
    const rows = filteredReturns.map(r => [
      r.orderId || r.id,
      r.customer,
      r.returnType,
      r.transportationType === 'Transportation Needed' ? 'Transport' : 'Self Return',
      r.pickupDate ? format(new Date(r.pickupDate), 'dd-MM-yyyy') : (r.requestDate ? format(new Date(r.requestDate), 'dd-MM-yyyy') : ''),
      r.status,
    ]);
    const generator = new ReportPDFGenerator();
    const blob = generator.generateSimpleTableReport({ title: 'Return Management' }, headers, rows);
    downloadPDF(blob, `Return_Management_${dateStr}.pdf`);
    toast.success('Exported to PDF');
  };

  const exportToExcel = () => {
    const headers = ['Return ID', 'Customer', 'Type', 'Transportation', 'Scheduled Date', 'Status'];
    const rows = filteredReturns.map(r => [
      r.orderId || r.id,
      r.customer,
      r.returnType,
      r.transportationType === 'Transportation Needed' ? 'Transport' : 'Self Return',
      r.pickupDate ? format(new Date(r.pickupDate), 'dd-MM-yyyy') : (r.requestDate ? format(new Date(r.requestDate), 'dd-MM-yyyy') : ''),
      r.status,
    ]);
    const blob = generateTableExcel(headers, rows, { title: 'Return Management' });
    downloadExcel(blob, `Return_Management_${dateStr}.xlsx`);
    toast.success('Exported to Excel');
  };

  // Show workflow view
  if (viewMode === 'workflow') {
    return (
      <ReturnWorkflow
        returnOrder={selectedReturn}
        onSave={handleSaveReturn}
        onBack={handleBack}
      />
    );
  }

  // Show details view
  if (viewMode === 'details' && selectedReturn) {
    return (
      <ReturnDetails
        returnOrder={selectedReturn}
        onProcess={() => setViewMode('workflow')}
        onBack={handleBack}
      />
    );
  }

  // Show list view
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#231F20]">Return Management</h1>
        <p className="text-gray-600">Comprehensive return processing with GRN & RCF generation</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by Return ID or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-64">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {RETURN_PROCESS_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToExcel} disabled={filteredReturns.length === 0}>
              <FileSpreadsheet className="size-4 mr-2" /> Export to Excel
            </Button>
            <Button className="bg-[#F15929] hover:bg-[#d94d1f]" onClick={exportToPDF} disabled={filteredReturns.length === 0}>
              <Download className="size-4 mr-2" /> Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transportation</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="size-8 animate-spin text-[#F15929] mx-auto mb-4" />
                    <span className="text-gray-600">Loading returns...</span>
                  </TableCell>
                </TableRow>
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Package className="size-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No returns found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Returns will appear here once they are agreed upon in Delivery & Return Management
                    </p>
                  </TableCell>
                </TableRow>
              ) : filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Search className="size-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No matching returns found</p>
                    <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReturns.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-gray-400" />
                        <span className="text-[#231F20] font-mono text-sm">{returnItem.orderId || returnItem.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[#231F20]">{returnItem.customer}</p>
                        {returnItem.customerContact && (
                          <p className="text-sm text-[#6B7280]">{returnItem.customerContact}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={returnItem.returnType === 'Full' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}>
                        {returnItem.returnType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {returnItem.transportationType === 'Transportation Needed' ? (
                          <Truck className="size-4 text-[#F59E0B]" />
                        ) : (
                          <PackageCheck className="size-4 text-[#10B981]" />
                        )}
                        <span className="text-sm text-[#6B7280]">
                          {returnItem.transportationType === 'Transportation Needed' ? 'Transport' : 'Self Return'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[#231F20]">{format(new Date(returnItem.pickupDate || returnItem.requestDate), 'dd-MM-yyyy')}</p>
                        {returnItem.pickupDate && returnItem.pickupTimeSlot && (
                          <p className="text-sm text-gray-500">{returnItem.pickupTimeSlot}</p>
                        )}
                        {!returnItem.pickupDate && (
                          <p className="text-xs text-amber-500">Pending schedule</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getReturnStatusBadge(returnItem.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(returnItem)}>
                            <Eye className="size-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {returnItem.status !== 'Completed' && (
                            <DropdownMenuItem onClick={() => handleProcessReturn(returnItem)}>
                              <Edit className="size-4 mr-2" />
                              Process
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredReturns.length > 0 && (
            <ReportTablePagination
              totalRows={filteredReturns.length}
              rowsPerPage={pageSize}
              currentPage={page}
              onPageChange={setPage}
              onRowsPerPageChange={(n) => { setPageSize(n); setPage(1); }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}