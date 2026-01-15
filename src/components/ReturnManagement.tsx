import { useState } from "react";
import { 
  Package, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Eye,
  AlertTriangle, ClipboardCheck, ArrowRight, Plus, PackageCheck, Truck,
  MoreVertical, Edit, FileText
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
import { toast } from "sonner@2.0.3";
import { format } from "date-fns";
import { ReturnWorkflow, Return, ReturnItem } from "./return/ReturnWorkflow";
import { ReturnDetails } from "./return/ReturnDetails";

const mockReturns: Return[] = [
  {
    id: 'RET-2026-001',
    customer: 'ABC Construction Sdn Bhd',
    customerContact: '+60 12-345-6789',
    orderId: 'ORD-2026-156',
    returnType: 'Full',
    transportationType: 'Transportation Needed',
    items: [
      { id: 'ITM-001', name: 'Steel Pipe Scaffolding 6m', category: 'Pipes', quantity: 100, quantityReturned: 0, status: 'Pending' },
      { id: 'ITM-002', name: 'Coupler Standard', category: 'Connectors', quantity: 200, quantityReturned: 0, status: 'Pending' },
      { id: 'ITM-003', name: 'Base Plate', category: 'Accessories', quantity: 50, quantityReturned: 0, status: 'Pending' },
    ],
    requestDate: '2026-12-02',
    status: 'Requested'
  },
  {
    id: 'RET-2026-002',
    customer: 'Megah Engineering Sdn Bhd',
    customerContact: '+60 13-456-7890',
    orderId: 'ORD-2026-145',
    returnType: 'Partial',
    transportationType: 'Self Return',
    items: [
      { id: 'ITM-004', name: 'Aluminum Tube 4m', category: 'Tubes', quantity: 100, quantityReturned: 0, status: 'Pending' },
      { id: 'ITM-005', name: 'Edge Protection', category: 'Safety', quantity: 60, quantityReturned: 0, status: 'Pending' },
    ],
    requestDate: '2026-12-05',
    status: 'Requested'
  },
  {
    id: 'RET-2026-003',
    customer: 'DEF Builders',
    customerContact: '+60 14-567-8901',
    orderId: 'ORD-2026-134',
    returnType: 'Full',
    transportationType: 'Self Return',
    items: [
      { id: 'ITM-006', name: 'Ringlock System 2m', category: 'Systems', quantity: 150, quantityReturned: 0, status: 'Pending' },
      { id: 'ITM-007', name: 'Ledger 1.5m', category: 'Systems', quantity: 120, quantityReturned: 0, status: 'Pending' },
      { id: 'ITM-008', name: 'Diagonal Brace', category: 'Support', quantity: 100, quantityReturned: 0, status: 'Pending' },
    ],
    requestDate: '2026-12-08',
    status: 'Requested'
  },
  {
    id: 'RET-2026-004',
    customer: 'Sunrise Development Sdn Bhd',
    customerContact: '+60 15-678-9012',
    orderId: 'ORD-2026-178',
    returnType: 'Partial',
    transportationType: 'Transportation Needed',
    items: [
      { id: 'ITM-009', name: 'Heavy Duty Tube 6m', category: 'Tubes', quantity: 120, quantityReturned: 0, status: 'Pending' },
      { id: 'ITM-010', name: 'Beam Clamp', category: 'Connectors', quantity: 90, quantityReturned: 0, status: 'Pending' },
    ],
    requestDate: '2026-12-10',
    status: 'Requested'
  },
];

export function ReturnManagement() {
  const [returns, setReturns] = useState<Return[]>(mockReturns);
  const [viewMode, setViewMode] = useState<'list' | 'workflow' | 'details'>('list');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);

  const getReturnStatusBadge = (status: Return['status']) => {
    const statusConfig = {
      'Requested': { color: 'bg-[#3B82F6] hover:bg-[#2563EB]', text: 'Requested' },
      'Approved': { color: 'bg-[#10B981] hover:bg-[#059669]', text: 'Approved' },
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

  const handleSaveReturn = (returnOrder: Return) => {
    const isNew = !returns.find(r => r.id === returnOrder.id);
    
    if (isNew) {
      setReturns([returnOrder, ...returns]);
      toast.success('Return created successfully');
    } else {
      setReturns(returns.map(r => r.id === returnOrder.id ? returnOrder : r));
      toast.success('Return updated successfully');
    }
    
    setViewMode('list');
    setSelectedReturn(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedReturn(null);
  };

  const handleViewGRN = (returnOrder: Return) => {
    if (returnOrder.grnNumber) {
      toast.success(`Viewing GRN: ${returnOrder.grnNumber}`);
      // In a real implementation, this would open a GRN document viewer
    } else {
      toast.error('GRN not yet generated for this return');
    }
  };

  // Stats
  const requestedReturns = returns.filter(r => r.status === 'Requested').length;
  const inProgressReturns = returns.filter(r => 
    r.status !== 'Requested' && r.status !== 'Completed'
  ).length;
  const completedReturns = returns.filter(r => r.status === 'Completed').length;
  const disputeReturns = returns.filter(r => r.status === 'Dispute Raised').length;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Return Management</h1>
        <p className="text-[#374151]">Comprehensive return processing with GRN & RCF generation</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Requested Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#3B82F6]" />
              <p className="text-[#111827]">{requestedReturns}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#F59E0B]" />
              <p className="text-[#111827]">{inProgressReturns}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#059669]" />
              <p className="text-[#111827]">{completedReturns}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
              <p className="text-[#111827]">{disputeReturns}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Returns Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle>All Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transportation</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((returnItem) => (
                <TableRow key={returnItem.id}>
                  <TableCell className="text-[#231F20]">{returnItem.id}</TableCell>
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
                  <TableCell className="text-[#6B7280]">
                    {format(new Date(returnItem.requestDate), 'PP')}
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
                          View Details
                        </DropdownMenuItem>
                        {returnItem.status !== 'Completed' && (
                          <DropdownMenuItem onClick={() => handleProcessReturn(returnItem)}>
                            <Edit className="size-4 mr-2" />
                            Process
                          </DropdownMenuItem>
                        )}
                        {(returnItem.status === 'Customer Notified' || returnItem.status === 'Completed') && returnItem.grnNumber && (
                          <DropdownMenuItem onClick={() => handleViewGRN(returnItem)}>
                            <FileText className="size-4 mr-2" />
                            View GRN
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}