import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ConditionReport, InspectionItem, InspectionImage } from '../../types/inspection';

// Interface for scaffolding items from API
interface ScaffoldingItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  price: number;
  originPrice?: number; // Original/replacement price
  status: string;
  location: string;
  itemStatus: string;
  imageUrl?: string;
}

// Select component removed - items come from return request only
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { uploadInspectionPhotos } from '@/lib/upload';

// Interface for return request items to auto-populate
interface ReturnRequestItemData {
  id: string;
  name: string;
  scaffoldingItemId?: string;
  quantity: number;
  quantityReturned: number;
}

interface ConditionReportFormProps {
  report: ConditionReport | null;
  onSave: (report: ConditionReport) => void;
  onCancel: () => void;
  // Optional: Auto-populate from return request
  returnRequestItems?: ReturnRequestItemData[];
  returnRequestId?: string;
  customerName?: string;
  agreementNo?: string;
}

interface StaffUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
}

interface ReturnPhoto {
  url: string;
  uploadedAt?: string;
  description?: string;
  uploadedBy?: string;
}

export function ConditionReportForm({ 
  report, 
  onSave, 
  onCancel,
  returnRequestItems,
  returnRequestId,
  customerName: propCustomerName,
  agreementNo 
}: ConditionReportFormProps) {
  const [formData, setFormData] = useState({
    rcfNumber: '',
    deliveryOrderNumber: '',
    customerName: '',
    returnedBy: '',
    returnDate: new Date().toISOString().split('T')[0],
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectedBy: 'Current User',
    status: 'pending' as 'pending' | 'in-progress' | 'completed',
    notes: ''
  });

  const [items, setItems] = useState<InspectionItem[]>([]);
  const [scaffoldingItems, setScaffoldingItems] = useState<ScaffoldingItem[]>([]);
  const [loadingScaffoldingItems, setLoadingScaffoldingItems] = useState(true);
  const [staffUsers, setStaffUsers] = useState<StaffUserSummary[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [damagePhotosFromReturn, setDamagePhotosFromReturn] = useState<InspectionImage[]>([]);
  
  // When editing, use report.returnRequestId so we can fetch driver name and damage photos from return
  const effectiveReturnRequestId = returnRequestId || report?.returnRequestId;
  
  // Store original return quantities for validation
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  // Fetch scaffolding items from API
  useEffect(() => {
    const fetchScaffoldingItems = async () => {
      try {
        const response = await fetch('/api/scaffolding', {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          console.log('Scaffolding items API response:', result);
          setScaffoldingItems(result.data || []);
        } else {
          const errorResult = await response.json();
          console.error('Failed to fetch scaffolding items:', response.status, errorResult);
          toast.error('Failed to load scaffolding items');
        }
      } catch (error) {
        console.error('Error fetching scaffolding items:', error);
        toast.error('Error loading scaffolding items');
      } finally {
        setLoadingScaffoldingItems(false);
      }
    };
    fetchScaffoldingItems();
  }, []);

  const normalizeReturnPhotos = (photos: unknown, prefix: string): InspectionImage[] => {
    if (!photos || !Array.isArray(photos)) return [];
    const normalized: InspectionImage[] = [];
    photos.forEach((photo, index) => {
      if (typeof photo === 'string') {
        normalized.push({
          id: `return-${prefix}-${index}`,
          url: photo,
          caption: `${prefix} photo`,
          uploadedAt: new Date().toISOString(),
        });
        return;
      }
      const p = photo as ReturnPhoto;
      if (!p.url) return;
      normalized.push({
        id: `return-${prefix}-${index}`,
        url: p.url,
        caption: p.description || `${prefix} photo`,
        uploadedAt: p.uploadedAt || new Date().toISOString(),
      });
    });
    return normalized;
  };

  // Fetch return photos and driver name for condition report (damage photos from return only; driver = Returned By)
  // When editing an auto-created report, use report.returnRequestId so this still runs
  useEffect(() => {
    const fetchReturnPhotos = async () => {
      if (!effectiveReturnRequestId) return;
      try {
        const response = await fetch('/api/return');
        const result = await response.json();
        if (!result.success || !result.returnRequests) return;
        const matched = result.returnRequests.find((req: { id: string; requestId: string }) =>
          req.id === effectiveReturnRequestId || req.requestId === effectiveReturnRequestId
        );
        if (!matched) return;
        // Driver name from return management = "Returned By" (not customer name)
        const driverName = (matched as { pickupDriver?: string }).pickupDriver;
        if (driverName) {
          setFormData(prev => ({ ...prev, returnedBy: driverName }));
        }
        // Damage photos from return only (no driver recording or warehouse receipt)
        const damageOnly = normalizeReturnPhotos((matched as { damagePhotos?: unknown }).damagePhotos, 'Damage');
        setDamagePhotosFromReturn(damageOnly);
      } catch (error) {
        console.error('Error fetching return photos:', error);
      }
    };
    fetchReturnPhotos();
  }, [effectiveReturnRequestId]);

  // Fetch staff users for inspector selection
  useEffect(() => {
    const fetchStaffUsers = async () => {
      try {
        setLoadingStaff(true);
        const response = await fetch('/api/user-management');
        const result = await response.json();
        if (result.success && result.users) {
          const allowedRoles = new Set(['super_user', 'admin', 'operations', 'production']);
          const staff = result.users.filter((user: StaffUserSummary) =>
            user.roles?.some(role => allowedRoles.has(role))
          );
          setStaffUsers(staff);
        } else {
          toast.error('Failed to load staff users');
        }
      } catch (error) {
        console.error('Error fetching staff users:', error);
        toast.error('Failed to load staff users');
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaffUsers();
  }, []);

  // Auto-populate items from return request
  useEffect(() => {
    if (returnRequestItems && returnRequestItems.length > 0 && !report && scaffoldingItems.length > 0) {
      // Build quantity map for validation
      const quantityMap: Record<string, number> = {};
      
      const autoItems: InspectionItem[] = returnRequestItems.map((returnItem, index) => {
        // Find matching scaffolding item
        const scaffoldingItem = scaffoldingItems.find(
          (s: ScaffoldingItem) => s.id === returnItem.scaffoldingItemId || s.name === returnItem.name
        );
        
        const returnedQty = returnItem.quantityReturned || returnItem.quantity;
        quantityMap[returnItem.scaffoldingItemId || returnItem.name] = returnedQty;
        
        // Use originPrice for write-off cost calculations, fallback to price if not set
        const itemPrice = scaffoldingItem?.originPrice && scaffoldingItem.originPrice > 0 
          ? scaffoldingItem.originPrice 
          : (scaffoldingItem?.price || 0);
        
        return {
          id: `item-${Date.now()}-${index}`,
          scaffoldingItemId: returnItem.scaffoldingItemId || scaffoldingItem?.id || '',
          scaffoldingItemName: returnItem.name || scaffoldingItem?.name || '',
          quantity: returnedQty,
          quantityGood: returnedQty, // Default all to good, user can adjust
          quantityRepair: 0,
          quantityWriteOff: 0,
          condition: 'good' as const,
          damageDescription: '',
          images: [],
          repairRequired: false,
          estimatedRepairCost: 0,
          originalItemPrice: scaffoldingItem?.originPrice || scaffoldingItem?.price || 0,
          inspectionChecklist: {
            structuralIntegrity: false,
            surfaceCondition: false,
            connectionsSecure: false,
            noCorrosion: false,
            safetyCompliance: false,
            completeParts: false,
          }
        };
      });
      
      setItems(autoItems);
      setReturnQuantities(quantityMap);
      
      // Also set customer name and agreement number if provided
      if (propCustomerName || agreementNo) {
        setFormData(prev => ({
          ...prev,
          customerName: propCustomerName || prev.customerName,
          deliveryOrderNumber: agreementNo || prev.deliveryOrderNumber,
        }));
      }
      
      toast.success(`${autoItems.length} item(s) auto-populated from return request`);
    }
  }, [returnRequestItems, report, scaffoldingItems, propCustomerName, agreementNo]);

  // Do not auto-apply return photos to per-item images; damage photos from return are shown in their own section

  useEffect(() => {
    if (report) {
      setFormData({
        rcfNumber: report.rcfNumber,
        deliveryOrderNumber: report.deliveryOrderNumber,
        customerName: report.customerName,
        returnedBy: report.returnedBy || '',
        returnDate: report.returnDate,
        inspectionDate: report.inspectionDate,
        inspectedBy: report.inspectedBy,
        status: report.status,
        notes: report.notes || ''
      });
      setItems(report.items || []);
    }
  }, [report]);

  // Ensure write-off price uses latest origin price (read-only field)
  useEffect(() => {
    if (scaffoldingItems.length === 0 || items.length === 0) return;
    let hasChanges = false;
    const nextItems = items.map(item => {
      if (item.originalItemPrice && item.originalItemPrice > 0) {
        return item;
      }
      const scaffoldingItem = scaffoldingItems.find(
        (s: ScaffoldingItem) => s.id === item.scaffoldingItemId || s.name === item.scaffoldingItemName
      );
      if (!scaffoldingItem) return item;
      const originPrice = scaffoldingItem.originPrice && scaffoldingItem.originPrice > 0
        ? scaffoldingItem.originPrice
        : (scaffoldingItem.price || 0);
      if (originPrice === (item.originalItemPrice || 0)) return item;
      hasChanges = true;
      return { ...item, originalItemPrice: originPrice };
    });
    if (hasChanges) {
      setItems(nextItems);
    }
  }, [scaffoldingItems, items]);

  // Items are auto-populated from return request only - no manual add/remove

  const updateItem = (id: string, field: keyof InspectionItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Update scaffolding item name and original price when ID changes
        if (field === 'scaffoldingItemId') {
          const selectedItem = scaffoldingItems.find((s: ScaffoldingItem) => s.id === value);
          if (selectedItem) {
            updated.scaffoldingItemName = selectedItem.name;
            // Use originPrice for write-off cost, fallback to price if not set
            updated.originalItemPrice = (selectedItem.originPrice && selectedItem.originPrice > 0) 
              ? selectedItem.originPrice 
              : (selectedItem.price || 0);
          }
        }
        
        // Validate quantity breakdown without changing total
        if (field === 'quantityGood' || field === 'quantityRepair' || field === 'quantityWriteOff') {
          const newTotal = (updated.quantityGood || 0) + (updated.quantityRepair || 0) + (updated.quantityWriteOff || 0);
          
          // Validate against return quantity if available
          const maxQuantity = returnQuantities[item.scaffoldingItemId] || returnQuantities[item.scaffoldingItemName] || item.quantity;
          
          if (newTotal > maxQuantity) {
            const remaining = maxQuantity - newTotal;
            toast.error(`Breakdown exceeds limit by ${Math.abs(remaining)}. Current: ${newTotal}, Max: ${maxQuantity}`);
            return item; // Don't update if exceeds limit
          }
          
          // Show helpful warning if breakdown doesn't match total
          if (newTotal < maxQuantity) {
            const remaining = maxQuantity - newTotal;
            toast.info(`Remaining: ${remaining} items not assigned (Good: ${updated.quantityGood}, Repair: ${updated.quantityRepair}, Write-off: ${updated.quantityWriteOff})`, {
              duration: 3000
            });
          }
          
          // Keep the original quantity unchanged - only validate the breakdown
          // DO NOT update: updated.quantity = newTotal;
          
        // Auto-set repair required
          updated.repairRequired = (updated.quantityRepair || 0) > 0 || (updated.quantityWriteOff || 0) > 0;
        updated.estimatedRepairCost = 0;
          
          // Set condition based on quantities
          if ((updated.quantityWriteOff || 0) > 0) {
            updated.condition = 'beyond-repair';
          } else if ((updated.quantityRepair || 0) > 0) {
            updated.condition = 'major-damage';
          } else {
            updated.condition = 'good';
          }
        }

        // Update original price (no cost calculations in condition report)
        if (field === 'originalItemPrice') {
          updated.estimatedRepairCost = 0;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const updateChecklist = (itemId: string, field: string, value: boolean) => {
    setItems(items.map(item => {
      if (item.id === itemId && item.inspectionChecklist) {
        return {
          ...item,
          inspectionChecklist: {
            ...item.inspectionChecklist,
            [field]: value
          }
        };
      }
      return item;
    }));
  };

  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  const handleImageUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    setUploadingItemId(itemId);
    try {
      // Upload files to server
      const results = await uploadInspectionPhotos(fileArray, 'before');
      
      const successfulUploads = results.filter(r => r.success && r.url);
      const failedCount = results.filter(r => !r.success).length;
      
      if (failedCount > 0) {
        toast.error(`${failedCount} file(s) failed to upload`);
      }
      
      if (successfulUploads.length > 0) {
        const newImages: InspectionImage[] = successfulUploads.map((result, index) => ({
          id: `img-${Date.now()}-${index}`,
          url: result.url!,
          caption: result.originalName || `Image ${index + 1}`,
          uploadedAt: new Date().toISOString()
        }));

        setItems(items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              images: [...item.images, ...newImages]
            };
          }
          return item;
        }));
        
        toast.success(`${successfulUploads.length} image(s) uploaded to server`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingItemId(null);
      event.target.value = '';
    }
  };

  const removeImage = (itemId: string, imageId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          images: item.images.filter(img => img.id !== imageId)
        };
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    if (!items || items.length === 0) {
      return { totalItemsInspected: 0, totalGood: 0, totalRepair: 0, totalWriteOff: 0, totalDamaged: 0, totalRepairCost: 0 };
    }
    const totalItemsInspected = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalGood = items.reduce((sum, item) => sum + (item.quantityGood || 0), 0);
    const totalRepair = items.reduce((sum, item) => sum + (item.quantityRepair || 0), 0);
    const totalWriteOff = items.reduce((sum, item) => sum + (item.quantityWriteOff || 0), 0);
    const totalDamaged = totalRepair + totalWriteOff;
    const totalRepairCost = 0;
    return { totalItemsInspected, totalGood, totalRepair, totalWriteOff, totalDamaged, totalRepairCost };
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.rcfNumber || !formData.deliveryOrderNumber || !formData.customerName || !formData.returnedBy) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one inspection item');
      return;
    }

    if (items.some(item => !item.scaffoldingItemId)) {
      toast.error('Please complete all item details');
      return;
    }

    if (items.some(item => item.quantity === 0)) {
      toast.error('Please enter quantities for all items');
      return;
    }

    const totals = calculateTotals();
    const now = new Date().toISOString();

    const cleanedItems = items.map(item => ({
      ...item,
      damageDescription: '',
      estimatedRepairCost: 0,
    }));

    const newReport: ConditionReport = {
      id: report?.id || `cr-${Date.now()}`,
      ...formData,
      items: cleanedItems,
      ...totals,
      createdAt: report?.createdAt || now,
      updatedAt: now
    };

    onSave(newReport);
    toast.success('Condition report saved successfully');
  };

  const getConditionColor = (condition: InspectionItem['condition']) => {
    const colors = {
      'good': 'bg-green-100 text-green-800',
      'minor-damage': 'bg-yellow-100 text-yellow-800',
      'major-damage': 'bg-orange-100 text-orange-800',
      'beyond-repair': 'bg-red-100 text-red-800'
    };
    return colors[condition];
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-[#231F20]">{report ? 'Edit Condition Report' : 'New Condition Report'}</h1>
          <p className="text-gray-600">Inspection based on Return Completion Form (RCF)</p>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Return Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rcfNumber">RCF Number *</Label>
              <Input
                id="rcfNumber"
                value={formData.rcfNumber}
                onChange={(e) => setFormData({ ...formData, rcfNumber: e.target.value })}
                placeholder="RCF-XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryOrderNumber">Delivery Order (DO) Number *</Label>
              <Input
                id="deliveryOrderNumber"
                value={formData.deliveryOrderNumber}
                onChange={(e) => setFormData({ ...formData, deliveryOrderNumber: e.target.value })}
                placeholder="DO-XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnedBy">Returned By *</Label>
              <Input
                id="returnedBy"
                value={formData.returnedBy}
                onChange={(e) => setFormData({ ...formData, returnedBy: e.target.value })}
                placeholder="Driver name (from return management)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDate">Return Date</Label>
              <Input
                id="returnDate"
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input
                id="inspectionDate"
                type="date"
                value={formData.inspectionDate}
                onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectedBy">Inspected By</Label>
              <Select
                value={formData.inspectedBy}
                onValueChange={(value) => setFormData({ ...formData, inspectedBy: value })}
                disabled={loadingStaff}
              >
                <SelectTrigger id="inspectedBy">
                  <SelectValue placeholder={loadingStaff ? 'Loading staff...' : 'Select inspector'} />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map(user => {
                    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    const label = fullName || user.email;
                    return (
                      <SelectItem key={user.id} value={label}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Overall condition notes, special observations..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inspection Items */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Inspection Items</CardTitle>
            <Badge className="bg-blue-100 text-blue-700">
              {items.length} item(s) from Return Request
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items to inspect.</p>
              <p className="text-sm mt-2">Items are automatically loaded from the Return Request.</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <h4 className="text-[#231F20]">Item {index + 1}</h4>
                  <Badge variant="outline" className="whitespace-nowrap">
                    From Return
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Scaffolding Item</Label>
                    <Input
                      value={item.scaffoldingItemName || 'Unknown Item'}
                      disabled
                      className="bg-gray-100 font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Total Quantity
                      {returnRequestItems && (
                        <span className="text-xs text-blue-600 ml-2">
                          (Max: {returnQuantities[item.scaffoldingItemId] || returnQuantities[item.scaffoldingItemName] || item.quantity})
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      disabled
                      className="bg-gray-200"
                    />
                  </div>
                </div>

                {/* Quantity Breakdown */}
                <div className="p-3 bg-white rounded border">
                  {/* Show max quantity if from return request */}
                  {(() => {
                    const maxQty = returnQuantities[item.scaffoldingItemId] || returnQuantities[item.scaffoldingItemName];
                    const currentTotal = (item.quantityGood || 0) + (item.quantityRepair || 0) + (item.quantityWriteOff || 0);
                    return maxQty ? (
                      <div className={`mb-3 p-2 rounded text-sm ${currentTotal === maxQty ? 'bg-green-50 text-green-700' : currentTotal > maxQty ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        <span className="font-medium">Returned Quantity: {maxQty}</span>
                        <span className="ml-3">|</span>
                        <span className="ml-3">Inspected: {currentTotal}</span>
                        <span className="ml-3">|</span>
                        <span className="ml-3">Remaining: {maxQty - currentTotal}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-green-600">Good</Label>
                      <Input
                        type="number"
                        min="0"
                        max={returnQuantities[item.scaffoldingItemId] || returnQuantities[item.scaffoldingItemName] || undefined}
                        value={item.quantityGood || 0}
                        disabled
                        className="bg-gray-100"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-orange-600">Need Repair</Label>
                      <Input
                        type="number"
                        min="0"
                        max={returnQuantities[item.scaffoldingItemId] || returnQuantities[item.scaffoldingItemName] || undefined}
                        value={item.quantityRepair || 0}
                        disabled
                        className="bg-gray-100"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-red-600">Write Off</Label>
                      <Input
                        type="number"
                        min="0"
                        max={returnQuantities[item.scaffoldingItemId] || returnQuantities[item.scaffoldingItemName] || undefined}
                        value={item.quantityWriteOff || 0}
                        disabled
                        className="bg-gray-100"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Inspection Checklist */}
                <div className="space-y-3 p-3 bg-white rounded border">
                  <Label className="text-[#231F20]">Item Inspection Checklist</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`structural-${item.id}`}
                        checked={item.inspectionChecklist?.structuralIntegrity || false}
                        onCheckedChange={(checked) => updateChecklist(item.id, 'structuralIntegrity', !!checked)}
                      />
                      <label htmlFor={`structural-${item.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-gray-400" />
                        Structural Integrity
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`surface-${item.id}`}
                        checked={item.inspectionChecklist?.surfaceCondition || false}
                        onCheckedChange={(checked) => updateChecklist(item.id, 'surfaceCondition', !!checked)}
                      />
                      <label htmlFor={`surface-${item.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-gray-400" />
                        Surface Condition
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`connections-${item.id}`}
                        checked={item.inspectionChecklist?.connectionsSecure || false}
                        onCheckedChange={(checked) => updateChecklist(item.id, 'connectionsSecure', !!checked)}
                      />
                      <label htmlFor={`connections-${item.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-gray-400" />
                        Connections Secure
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`corrosion-${item.id}`}
                        checked={item.inspectionChecklist?.noCorrosion || false}
                        onCheckedChange={(checked) => updateChecklist(item.id, 'noCorrosion', !!checked)}
                      />
                      <label htmlFor={`corrosion-${item.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-gray-400" />
                        No Corrosion
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`safety-${item.id}`}
                        checked={item.inspectionChecklist?.safetyCompliance || false}
                        onCheckedChange={(checked) => updateChecklist(item.id, 'safetyCompliance', !!checked)}
                      />
                      <label htmlFor={`safety-${item.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-gray-400" />
                        Safety Compliance
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`complete-${item.id}`}
                        checked={item.inspectionChecklist?.completeParts || false}
                        onCheckedChange={(checked) => updateChecklist(item.id, 'completeParts', !!checked)}
                      />
                      <label htmlFor={`complete-${item.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-gray-400" />
                        Complete Parts
                      </label>
                    </div>
                  </div>
                </div>

                {item.repairRequired && (
                  <>
                    {/* Image Upload */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Damage Photos</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`file-${item.id}`)?.click()}
                          disabled={uploadingItemId === item.id}
                        >
                          {uploadingItemId === item.id ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="size-4 mr-2" />
                          )}
                          {uploadingItemId === item.id ? 'Uploading...' : 'Upload Images'}
                        </Button>
                        <input
                          id={`file-${item.id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleImageUpload(item.id, e)}
                          disabled={uploadingItemId === item.id}
                        />
                      </div>

                      {item.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {item.images.map(image => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.url}
                                alt={image.caption || 'Damage photo'}
                                className="w-full h-24 object-cover rounded border"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeImage(item.id, image.id)}
                                className="absolute top-1 right-1 size-6 p-0 bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="size-4" />
                              </Button>
                              <p className="text-xs text-gray-600 mt-1 truncate">{image.caption}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                  <Badge className={getConditionColor(item.condition)}>
                    {item.condition.replace('-', ' ').toUpperCase()}
                  </Badge>
                  {item.repairRequired && (
                    <Badge className="bg-amber-100 text-amber-800">
                      REPAIR REQUIRED
                    </Badge>
                  )}
                  {item.images.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <ImageIcon className="size-3" />
                      {item.images.length} photo(s)
                    </Badge>
                  )}
                  {item.quantityRepair > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 ml-auto">
                      Repair: {item.quantityRepair} items
                    </Badge>
                  )}
                  {item.quantityWriteOff > 0 && (
                    <Badge className="bg-red-100 text-red-800 ml-auto">
                      Write-off: {item.quantityWriteOff} items
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Damage Photos from Return: above Total Items Inspected, not inside each item; auto-fetched from return */}
          {items.length > 0 && effectiveReturnRequestId && (
            <div className="space-y-3 p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-5 text-gray-600" />
                <h3 className="text-[#231F20] font-medium">Damage Photos from Return</h3>
              </div>
              <p className="text-sm text-gray-600">Auto-fetched from return management (damage photos only)</p>
              {damagePhotosFromReturn.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {damagePhotosFromReturn.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt={image.caption || 'Damage photo from return'}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <p className="text-xs text-gray-600 mt-1 truncate">{image.caption}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No damage photos from return</p>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-[#231F20]">Total Items Inspected:</span>
                <span className="text-[#231F20]">{totals.totalItemsInspected}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#231F20]">Good Condition:</span>
                <span className="text-[#231F20]">{totals.totalGood}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#231F20]">Need Repair:</span>
                <span className="text-[#231F20]">{totals.totalRepair}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#231F20]">Write-off:</span>
                <span className="text-[#231F20]">{totals.totalWriteOff}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="bg-[#F15929] hover:bg-[#d94d1f]">
          <Save className="size-4 mr-2" />
          Save Condition Report
        </Button>
      </div>
    </div>
  );
}