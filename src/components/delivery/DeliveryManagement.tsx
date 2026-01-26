import { useState, useEffect } from 'react';
import {
  Truck, Package, CheckCircle2, Clock, AlertCircle, Plus, 
  Search, Filter, Eye, FileText, Download, ClipboardCheck,
  PackageCheck, MapPin, Calendar as CalendarIcon, User,
  Warehouse, TrendingRight, MoreVertical, Edit
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { DeliveryWorkflow } from './DeliveryWorkflow';
import { DeliveryDetails } from './DeliveryDetails';
import { toast } from 'sonner';

export interface DeliveryItem {
  id: string;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  unit: string;
  availableStock: number;
  weight?: string;
  dimensions?: string;
}

export interface DeliveryOrder {
  id: string;
  doNumber: string;
  orderId: string;
  agreementId: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  siteAddress: string;
  type: 'delivery' | 'pickup';  // Type of delivery
  items: DeliveryItem[];
  
  // Workflow status
  status: 
    | 'pending'                // DO created, waiting for packing list
    | 'packing_list_issued'    // Packing list generated
    | 'stock_checked'          // Stock availability verified
    | 'packing_loading'        // Items being packed and loaded to lorry
    | 'in_transit'             // On the way (delivery only)
    | 'ready_for_pickup'       // Ready for customer pickup (pickup only)
    | 'completed';             // Customer signed and OTP verified
  
  // Packing list
  packingListNumber?: string;
  packingListDate?: string;
  
  // Stock check
  stockCheckDate?: string;
  stockCheckBy?: string;
  stockCheckNotes?: string;
  allItemsAvailable?: boolean;
  
  // Schedule
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  scheduleConfirmedAt?: string;
  scheduleConfirmedBy?: string;
  
  // Packing & Loading
  packingStartedAt?: string;
  packingStartedBy?: string;
  loadingCompletedAt?: string;
  loadingCompletedBy?: string;
  packingPhotos?: string[];
  
  // Driver (for delivery only)
  driverName?: string;
  driverContact?: string;
  vehicleNumber?: string;
  driverSignature?: string;
  driverAcknowledgedAt?: string;
  dispatchedAt?: string;
  
  // Delivery Order (DO)
  doIssuedAt?: string;
  doIssuedBy?: string;
  
  // Delivery
  deliveredAt?: string;
  deliveryPhotos?: string[];
  
  // Customer acknowledgement (Sign & OTP)
  customerAcknowledgedAt?: string;
  customerSignature?: string;
  customerSignedBy?: string;
  customerOTP?: string;
  verifiedOTP?: boolean;
  
  // Inventory
  inventoryUpdatedAt?: string;
  inventoryStatus?: 'HQ' | 'Rental';
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}


export function DeliveryManagement() {
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'workflow' | 'details'>('list');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);

  useEffect(() => {
    // Check if we need to clear old sample data (one-time cleanup)
    const hasCleared = localStorage.getItem('deliveryOrdersCleared');
    if (!hasCleared) {
      localStorage.removeItem('deliveryOrders');
      localStorage.setItem('deliveryOrdersCleared', 'true');
      setDeliveries([]);
    } else {
      // Load from localStorage for user-added data
      const saved = localStorage.getItem('deliveryOrders');
      if (saved) {
        setDeliveries(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    let filtered = deliveries;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.doNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.orderId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    setFilteredDeliveries(filtered);
  }, [deliveries, searchQuery, statusFilter]);

  const saveDeliveries = (updated: DeliveryOrder[]) => {
    setDeliveries(updated);
    localStorage.setItem('deliveryOrders', JSON.stringify(updated));
  };

  const handleCreateNew = () => {
    setSelectedDelivery(null);
    setViewMode('workflow');
  };

  const handleViewDetails = (delivery: DeliveryOrder) => {
    setSelectedDelivery(delivery);
    setViewMode('details');
  };

  const handleProcessDelivery = (delivery: DeliveryOrder) => {
    setSelectedDelivery(delivery);
    setViewMode('workflow');
  };

  const handleSaveDelivery = (delivery: DeliveryOrder) => {
    const isNew = !deliveries.find(d => d.id === delivery.id);
    
    if (isNew) {
      saveDeliveries([...deliveries, delivery]);
      toast.success('Delivery order created successfully');
    } else {
      saveDeliveries(deliveries.map(d => d.id === delivery.id ? delivery : d));
      toast.success('Delivery order updated successfully');
    }
    
    setViewMode('list');
    setSelectedDelivery(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedDelivery(null);
  };

  const getStatusBadge = (status: DeliveryOrder['status']) => {
    const config = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      packing_list_issued: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Packing List' },
      stock_checked: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Stock Checked' },
      packing_loading: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Packing & Loading' },
      in_transit: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Transit' },
      ready_for_pickup: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Ready for Pickup' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    };

    const statusConfig = config[status];
    if (!statusConfig) {
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
    
    const { bg, text, label } = statusConfig;
    return <Badge className={`${bg} ${text}`}>{label}</Badge>;
  };

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending' || d.status === 'packing_list_issued').length,
    inProgress: deliveries.filter(d => 
      d.status === 'stock_checked' || d.status === 'packing_loading' || d.status === 'in_transit' || d.status === 'ready_for_pickup'
    ).length,
    completed: deliveries.filter(d => d.status === 'completed').length,
  };

  if (viewMode === 'workflow') {
    return (
      <DeliveryWorkflow
        delivery={selectedDelivery}
        onSave={handleSaveDelivery}
        onBack={handleBack}
      />
    );
  }

  if (viewMode === 'details' && selectedDelivery) {
    return (
      <DeliveryDetails
        delivery={selectedDelivery}
        onProcess={() => setViewMode('workflow')}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#231F20]">Delivery Management</h1>
        <p className="text-gray-600">Manage delivery orders, packing, and dispatch</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Package className="size-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="size-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Truck className="size-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search by DO number, customer, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="packing_list_issued">Packing List Issued</SelectItem>
                <SelectItem value="stock_checked">Stock Checked</SelectItem>
                <SelectItem value="packing_loading">Packing & Loading</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DO Number</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Package className="size-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No delivery orders found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first delivery order to get started'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-gray-400" />
                        <span className="text-[#231F20]">{delivery.doNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[#231F20]">{delivery.customerName}</p>
                    </TableCell>
                    <TableCell>
                      {delivery.scheduledDate ? (
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="size-4 text-gray-400" />
                          <div>
                            <p className="text-[#231F20]">{new Date(delivery.scheduledDate).toLocaleDateString()}</p>
                            {delivery.scheduledTimeSlot && (
                              <p className="text-sm text-gray-500">{delivery.scheduledTimeSlot}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not scheduled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={delivery.type === 'delivery' ? 'border-blue-500 text-blue-700' : 'border-purple-500 text-purple-700'}>
                        {delivery.type === 'delivery' ? 'Delivery' : 'Pickup'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleViewDetails(delivery)}>
                            <Eye className="size-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {delivery.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleProcessDelivery(delivery)}>
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
        </CardContent>
      </Card>
    </div>
  );
}