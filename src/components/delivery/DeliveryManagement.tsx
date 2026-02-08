import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Package, CheckCircle2, Clock, AlertCircle, Plus, 
  Search, Filter, Eye, FileText, Download, ClipboardCheck,
  PackageCheck, MapPin, Calendar as CalendarIcon, User,
  Warehouse, TrendingRight, MoreVertical, Edit, Loader2
} from 'lucide-react';
import { formatRfqDate } from '../../lib/rfqDate';
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

// Compute default scheduled date: 1 day before the required date (from scheduledPeriod string)
const getDefaultScheduledDate = (scheduledPeriod: string | undefined): string | undefined => {
  if (!scheduledPeriod) return undefined;

  try {
    // Parse format: "7 Feb 2026" (single date) or "1 Jan 2026 - 31 Mar 2026" (range)
    const dateStr = scheduledPeriod.split(' - ')[0].trim();
    const dateMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);

    if (!dateMatch) {
      // Fallback to Date parsing if format doesn't match
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      date.setDate(date.getDate() - 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    const dayNum = parseInt(dateMatch[1], 10);
    const monthName = dateMatch[2];
    const yearNum = parseInt(dateMatch[3], 10);
    
    const monthMap: Record<string, number> = {
      'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    };
    const monthNum = monthMap[monthName];
    if (!monthNum) return undefined;
    
    // Create date in UTC, subtract 1 day, format as YYYY-MM-DD
    const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    date.setUTCDate(date.getUTCDate() - 1);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  } catch {
    return undefined;
  }
};

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
  setIds?: string[]; // IDs of all sets that share this DO number (for combined orders)
  
  // Workflow status (matching database values)
  status: 
    | 'Pending'                // DO created, waiting for packing list
    | 'Packing List Issued'    // Packing list generated
    | 'Stock Checked'          // Stock availability verified
    | 'Packing & Loading'      // Items being packed and loaded to lorry
    | 'In Transit'             // On the way (delivery only)
    | 'Ready for Pickup'       // Ready for customer pickup (pickup only)
    | 'Completed';             // Customer signed and OTP verified
  
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
  const [isLoading, setIsLoading] = useState(true);

  // Fetch delivery orders from API (only those with DO Generated status)
  const fetchDeliveryOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/delivery');
      const data = await response.json();
      
      if (data.success) {
        // Transform API data to DeliveryOrder format
        // Group sets by DO number and combine items from all sets with the same DO number
        const deliveryOrders: DeliveryOrder[] = [];
        
        // Valid statuses for delivery management
        const validStatuses = [
          'Confirmed', 'DO Generated',  // RFQ statuses that allow DO
          'Pending', 'Packing List Issued', 'Stock Checked', 'Packing & Loading',  // Delivery workflow statuses
          'In Transit', 'Ready for Pickup', 'Completed'  // Delivery completion statuses
        ];
        
        // Group sets by DO number
        const doGroups = new Map<string, Array<{req: any, set: any}>>();
        
        for (const req of data.deliveryRequests) {
          for (const set of req.sets) {
            const isDoGenerated = !!set.doNumber;
            const hasValidStatus = validStatuses.includes(set.status);
            
            if (hasValidStatus && isDoGenerated) {
              const doNumber = set.doNumber || `DO-${req.agreementNo}-${set.setName.replace('Set ', '')}`;
              if (!doGroups.has(doNumber)) {
                doGroups.set(doNumber, []);
              }
              doGroups.get(doNumber)!.push({ req, set });
            }
          }
        }
        
        // Status priority order (most advanced to least advanced)
        const statusPriority: Record<string, number> = {
          'Completed': 7,
          'In Transit': 6,
          'Ready for Pickup': 6,
          'Packing & Loading': 5,
          'Stock Checked': 4,
          'Packing List Issued': 3,
          'Pending': 2,
          'DO Generated': 1,
          'Confirmed': 1,
        };
        
        // Create one DeliveryOrder per DO number
        for (const [doNumber, sets] of doGroups) {
          const firstSet = sets[0];
          const req = firstSet.req;
          
          // Combine items from all sets
          const combinedItems = new Map<string, DeliveryItem>();
          for (const { set } of sets) {
            for (const item of set.items) {
              const key = item.scaffoldingItemId || item.id;
              const itemData = {
                id: item.id,
                scaffoldingItemId: item.scaffoldingItemId || item.id,
                scaffoldingItemName: item.name,
                quantity: item.quantity,
                unit: 'pcs' as const,
                availableStock: item.availableStock ?? 0,
              };
              
              if (combinedItems.has(key)) {
                // Sum quantities for duplicate items
                const existing = combinedItems.get(key)!;
                existing.quantity += itemData.quantity;
                // Use the maximum available stock
                existing.availableStock = Math.max(existing.availableStock, itemData.availableStock);
              } else {
                combinedItems.set(key, itemData);
              }
            }
          }
          
          // Determine status using priority (most advanced status)
          let combinedStatus = 'Pending';
          let maxPriority = 0;
          for (const { set } of sets) {
            const setStatus = (['DO Generated', 'Confirmed'].includes(set.status) ? 'Pending' : (set.status || 'Pending')) as DeliveryOrder['status'];
            const priority = statusPriority[setStatus] || 0;
            if (priority > maxPriority) {
              maxPriority = priority;
              combinedStatus = setStatus;
            }
          }
          
          // Aggregate other fields
          // Use earliest scheduled date
          let earliestScheduledDate: string | undefined;
          let earliestDate: Date | null = null;
          for (const { set } of sets) {
            const scheduledDate = ((set.scheduleConfirmedAt || set.scheduleConfirmedBy) && set.deliveryDate && typeof set.deliveryDate === 'string' && set.deliveryDate.trim() !== '') 
              ? set.deliveryDate 
              : getDefaultScheduledDate(set.scheduledPeriod);
            if (scheduledDate) {
              const date = new Date(scheduledDate);
              if (!earliestDate || date < earliestDate) {
                earliestDate = date;
                earliestScheduledDate = scheduledDate;
              }
            }
          }
          
          // Use most recent timestamps for workflow steps
          const getLatestTimestamp = (field: string) => {
            let latest: string | undefined;
            let latestDate: Date | null = null;
            for (const { set } of sets) {
              const value = set[field];
              if (value) {
                const date = new Date(value);
                if (!latestDate || date > latestDate) {
                  latestDate = date;
                  latest = value;
                }
              }
            }
            return latest;
          };
          
          // Combine notes
          const combinedNotes = sets
            .map(({ set }) => set.notes)
            .filter((note): note is string => !!note)
            .join('; ');
          
          // Use values from most advanced set for workflow fields
          const mostAdvancedSet = sets.reduce((prev, curr) => {
            const prevStatus = prev.set.status || 'Pending';
            const currStatus = curr.set.status || 'Pending';
            const prevPriority = statusPriority[prevStatus] || 0;
            const currPriority = statusPriority[currStatus] || 0;
            return currPriority > prevPriority ? curr : prev;
          }).set;
          
          deliveryOrders.push({
            id: doNumber, // Use DO number as unique ID
            doNumber: doNumber,
            setIds: sets.map(({ set }) => set.id), // Store all set IDs for this DO
            orderId: req.requestId,
            agreementId: req.agreementNo,
            customerName: req.customerName,
            customerContact: req.customerPhone || '',
            customerAddress: req.deliveryAddress,
            siteAddress: req.deliveryAddress,
            type: req.deliveryType as 'delivery' | 'pickup',
            items: Array.from(combinedItems.values()),
            status: combinedStatus as DeliveryOrder['status'],
            packingListNumber: mostAdvancedSet.packingListNumber,
            packingListDate: mostAdvancedSet.packingListDate,
            stockCheckDate: mostAdvancedSet.stockCheckDate,
            stockCheckBy: mostAdvancedSet.stockCheckBy,
            stockCheckNotes: mostAdvancedSet.stockCheckNotes,
            allItemsAvailable: sets.every(({ set }) => set.allItemsAvailable !== false),
            scheduledDate: earliestScheduledDate,
            scheduledTimeSlot: mostAdvancedSet.scheduledTimeSlot,
            scheduleConfirmedAt: getLatestTimestamp('scheduleConfirmedAt'),
            scheduleConfirmedBy: mostAdvancedSet.scheduleConfirmedBy,
            packingStartedAt: getLatestTimestamp('packingStartedAt'),
            packingStartedBy: mostAdvancedSet.packingStartedBy,
            loadingCompletedAt: getLatestTimestamp('loadingCompletedAt'),
            loadingCompletedBy: mostAdvancedSet.loadingCompletedBy,
            packingPhotos: mostAdvancedSet.packingPhotos as string[] | undefined,
            driverName: mostAdvancedSet.driverName,
            driverContact: mostAdvancedSet.driverContact,
            vehicleNumber: mostAdvancedSet.vehicleNumber,
            driverSignature: mostAdvancedSet.driverSignature,
            driverAcknowledgedAt: getLatestTimestamp('driverAcknowledgedAt'),
            dispatchedAt: getLatestTimestamp('dispatchedAt'),
            doIssuedAt: getLatestTimestamp('doIssuedAt'),
            doIssuedBy: mostAdvancedSet.doIssuedBy,
            deliveredAt: getLatestTimestamp('deliveredAt'),
            deliveryPhotos: mostAdvancedSet.deliveryPhotos as string[] | undefined,
            customerAcknowledgedAt: getLatestTimestamp('customerAcknowledgedAt'),
            customerSignature: mostAdvancedSet.customerSignature,
            customerSignedBy: mostAdvancedSet.customerSignedBy,
            customerOTP: mostAdvancedSet.customerOTP,
            verifiedOTP: mostAdvancedSet.verifiedOTP,
            inventoryUpdatedAt: getLatestTimestamp('inventoryUpdatedAt'),
            inventoryStatus: mostAdvancedSet.inventoryStatus as 'HQ' | 'Rental' | undefined,
            createdBy: mostAdvancedSet.createdBy || 'System',
            createdAt: sets[0].set.createdAt || new Date().toISOString(),
            updatedAt: getLatestTimestamp('updatedAt') || new Date().toISOString(),
            notes: combinedNotes || mostAdvancedSet.notes,
          });
        }
        
        setDeliveries(deliveryOrders);
      } else {
        console.error('Failed to fetch delivery orders:', data.message);
        toast.error('Failed to load delivery orders');
      }
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      toast.error('Error loading delivery orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveryOrders();
  }, [fetchDeliveryOrders]);

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

  // Save delivery order to database via API
  // Custom error class to pass insufficient stock details
  class InsufficientStockError extends Error {
    insufficientItems: { name: string; required: number; available: number }[];
    constructor(message: string, items: { name: string; required: number; available: number }[]) {
      super(message);
      this.name = 'InsufficientStockError';
      this.insufficientItems = items;
    }
  }

  const saveDeliveryToApi = async (delivery: DeliveryOrder): Promise<boolean> => {
    try {
      // If setIds are provided (combined order), update all sets with the same DO number
      // Otherwise, try to extract setId from ID (backward compatibility)
      let setIdsToUpdate: string[] = [];
      
      if (delivery.setIds && delivery.setIds.length > 0) {
        // Combined order: update all sets with this DO number
        setIdsToUpdate = delivery.setIds;
      } else {
        // Fallback: try to extract setId from ID (for backward compatibility)
        // This handles cases where the ID might still be in the old format
        const parts = delivery.id.split('-');
        if (parts.length > 1) {
          // Old format: requestId-setId
          setIdsToUpdate = [delivery.id.split('-').slice(1).join('-')];
        } else {
          // New format: DO number as ID - need to find sets by DO number
          // Query API to find sets with this DO number
          const findResponse = await fetch('/api/delivery');
          const findData = await findResponse.json();
          if (findData.success) {
            for (const req of findData.deliveryRequests) {
              for (const set of req.sets) {
                if (set.doNumber === delivery.doNumber) {
                  setIdsToUpdate.push(set.id);
                }
              }
            }
          }
        }
      }
      
      if (setIdsToUpdate.length === 0) {
        console.error('No sets found to update for DO:', delivery.doNumber);
        return false;
      }
      
      // Update all sets with the same DO number
      const updatePromises = setIdsToUpdate.map(setId => {
        return fetch('/api/delivery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setId,
            status: delivery.status,
            doNumber: delivery.doNumber,
            packingListNumber: delivery.packingListNumber,
            packingListDate: delivery.packingListDate,
            stockCheckDate: delivery.stockCheckDate,
            stockCheckBy: delivery.stockCheckBy,
            stockCheckNotes: delivery.stockCheckNotes,
            allItemsAvailable: delivery.allItemsAvailable,
            // Only send scheduledTimeSlot if it has a value (prevent null overwrites)
            ...(delivery.scheduledTimeSlot && { scheduledTimeSlot: delivery.scheduledTimeSlot }),
            deliveryDate: delivery.scheduledDate,
            scheduleConfirmedAt: delivery.scheduleConfirmedAt,
            scheduleConfirmedBy: delivery.scheduleConfirmedBy,
            packingStartedAt: delivery.packingStartedAt,
            packingStartedBy: delivery.packingStartedBy,
            loadingCompletedAt: delivery.loadingCompletedAt,
            loadingCompletedBy: delivery.loadingCompletedBy,
            packingPhotos: delivery.packingPhotos,
            driverName: delivery.driverName,
            driverContact: delivery.driverContact,
            vehicleNumber: delivery.vehicleNumber,
            driverSignature: delivery.driverSignature,
            driverAcknowledgedAt: delivery.driverAcknowledgedAt,
            dispatchedAt: delivery.dispatchedAt,
            doIssuedAt: delivery.doIssuedAt,
            doIssuedBy: delivery.doIssuedBy,
            deliveredAt: delivery.deliveredAt,
            deliveryPhotos: delivery.deliveryPhotos,
            customerAcknowledgedAt: delivery.customerAcknowledgedAt,
            customerSignature: delivery.customerSignature,
            customerSignedBy: delivery.customerSignedBy,
            customerOTP: delivery.customerOTP,
            verifiedOTP: delivery.verifiedOTP,
            inventoryUpdatedAt: delivery.inventoryUpdatedAt,
            inventoryStatus: delivery.inventoryStatus,
            notes: delivery.notes,
          }),
        });
      });
      
      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      // Check for insufficient stock errors
      for (const result of results) {
        if (!result.success && result.insufficientItems) {
          throw new InsufficientStockError(result.message, result.insufficientItems);
        }
      }
      
      // Return true if all updates succeeded
      return results.every(r => r.success);
    } catch (error) {
      // Re-throw InsufficientStockError to be handled by caller
      if (error instanceof InsufficientStockError) {
        throw error;
      }
      console.error('Error saving delivery to API:', error);
      return false;
    }
  };

  const saveDeliveries = async (updated: DeliveryOrder[]) => {
    setDeliveries(updated);
    // Note: Individual saves happen through saveDeliveryToApi
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
    // Get the latest data from state
    const latestDelivery = deliveries.find(d => d.id === delivery.id);
    if (latestDelivery) {
      setSelectedDelivery(latestDelivery);
    } else {
      setSelectedDelivery(delivery);
    }
    setViewMode('workflow');
  };

  const handleSaveDelivery = async (delivery: DeliveryOrder) => {
    const isNew = !deliveries.find(d => d.id === delivery.id);
    
    // Save to API - may throw InsufficientStockError
    const success = await saveDeliveryToApi(delivery);
    
    if (success) {
      if (isNew) {
        setDeliveries([...deliveries, delivery]);
      } else {
        setDeliveries(deliveries.map(d => d.id === delivery.id ? delivery : d));
      }
      // Update selected delivery with latest data
      setSelectedDelivery(delivery);
      return; // Success - don't navigate away, let workflow handle navigation
    } else {
      throw new Error('Failed to save delivery order to database');
    }
  };

  const handleBack = () => {
    // Refresh deliveries from API
    fetchDeliveryOrders();
    setViewMode('list');
    setSelectedDelivery(null);
  };

  const getStatusBadge = (status: DeliveryOrder['status']) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      'Pending': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      'Packing List Issued': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Packing List' },
      'Stock Checked': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Stock Checked' },
      'Packing & Loading': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Packing & Loading' },
      'In Transit': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Transit' },
      'Ready for Pickup': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Ready for Pickup' },
      'Completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
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
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Packing List Issued">Packing List Issued</SelectItem>
                <SelectItem value="Stock Checked">Stock Checked</SelectItem>
                <SelectItem value="Packing & Loading">Packing & Loading</SelectItem>
                <SelectItem value="In Transit">In Transit</SelectItem>
                <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
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
                            <p className="text-[#231F20]">{formatRfqDate(delivery.scheduledDate)}</p>
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
                          {delivery.status !== 'Completed' && (
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