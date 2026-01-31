import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
          originalItemPrice: scaffoldingItem?.price || 0,
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
            updated.originalItemPrice = selectedItem.price || 0;
          }
        }
        
        // Auto-calculate total quantity with validation
        if (field === 'quantityGood' || field === 'quantityRepair' || field === 'quantityWriteOff') {
          const newTotal = (updated.quantityGood || 0) + (updated.quantityRepair || 0) + (updated.quantityWriteOff || 0);
          
          // Validate against return quantity if available
          const maxQuantity = returnQuantities[item.scaffoldingItemId] || returnQuantities[item.scaffoldingItemName] || item.quantity;
          
          if (newTotal > maxQuantity) {
            toast.error(`Total quantity (${newTotal}) cannot exceed returned quantity (${maxQuantity})`);
            return item; // Don't update if exceeds limit
          }
          
          updated.quantity = newTotal;
          
          // Auto-set repair required and calculate costs
          updated.repairRequired = (updated.quantityRepair || 0) > 0 || (updated.quantityWriteOff || 0) > 0;
          
          // Calculate estimated repair cost
          const repairCost = (updated.quantityRepair || 0) * (updated.originalItemPrice || 0) * 0.6;
          const writeOffCost = (updated.quantityWriteOff || 0) * (updated.originalItemPrice || 0) * 1.2;
          updated.estimatedRepairCost = repairCost + writeOffCost;
          
          // Set condition based on quantities
          if ((updated.quantityWriteOff || 0) > 0) {
            updated.condition = 'beyond-repair';
          } else if ((updated.quantityRepair || 0) > 0) {
            updated.condition = 'major-damage';
          } else {
            updated.condition = 'good';
          }
        }

        // Update original price and recalculate costs
        if (field === 'originalItemPrice') {
          const repairCost = (updated.quantityRepair || 0) * (value || 0) * 0.6;
          const writeOffCost = (updated.quantityWriteOff || 0) * (value || 0) * 1.2;
          updated.estimatedRepairCost = repairCost + writeOffCost;
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
    const totalRepairCost = items.reduce((sum, item) => sum + item.estimatedRepairCost, 0);
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

    const newReport: ConditionReport = {
      id: report?.id || `cr-${Date.now()}`,
      ...formData,
      items,
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
                placeholder="Person who returned the items"
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
              <Input
                id="inspectedBy"
                value={formData.inspectedBy}
                onChange={(e) => setFormData({ ...formData, inspectedBy: e.target.value })}
                placeholder="Inspector name"
              />
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
                    <Label>Original Item Price (RM)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.originalItemPrice || 0}
                      onChange={(e) => updateItem(item.id, 'originalItemPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500">Auto-populated from RFQ</p>
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
                        onChange={(e) => updateItem(item.id, 'quantityGood', parseInt(e.target.value) || 0)}
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
                        onChange={(e) => updateItem(item.id, 'quantityRepair', parseInt(e.target.value) || 0)}
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
                        onChange={(e) => updateItem(item.id, 'quantityWriteOff', parseInt(e.target.value) || 0)}
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
                    <div className="space-y-2">
                      <Label>Damage Description</Label>
                      <Textarea
                        value={item.damageDescription}
                        onChange={(e) => updateItem(item.id, 'damageDescription', e.target.value)}
                        placeholder="Describe the damage in detail..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Estimated Repair Cost (RM) - Auto Calculated</Label>
                      <Input
                        type="number"
                        value={Number(item.estimatedRepairCost || 0).toFixed(2)}
                        disabled
                        className="bg-gray-200"
                      />
                      <p className="text-xs text-gray-500">
                        Repair: 60% × Price × Qty | Write-off: 120% × Price × Qty
                      </p>
                    </div>

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
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-[#231F20]">Estimated Total Repair Cost:</span>
                <span className="text-[#231F20]">RM {Number(totals.totalRepairCost || 0).toFixed(2)}</span>
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