import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ConditionReport, InspectionItem, InspectionImage } from '../../types/inspection';
import { SCAFFOLDING_TYPES } from '../../types/rfq';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';

interface ConditionReportFormProps {
  report: ConditionReport | null;
  onSave: (report: ConditionReport) => void;
  onCancel: () => void;
}

export function ConditionReportForm({ report, onSave, onCancel }: ConditionReportFormProps) {
  const [formData, setFormData] = useState({
    rcfNumber: '',
    deliveryOrderNumber: '',
    customerName: '',
    returnedBy: '',
    returnDate: new Date().toISOString().split('T')[0],
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectedBy: 'Current User',
    status: 'pending' as const,
    notes: ''
  });

  const [items, setItems] = useState<InspectionItem[]>([]);

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
      setItems(report.items);
    }
  }, [report]);

  const addItem = () => {
    const newItem: InspectionItem = {
      id: `item-${Date.now()}`,
      scaffoldingItemId: '',
      scaffoldingItemName: '',
      quantity: 0,
      quantityGood: 0,
      quantityRepair: 0,
      quantityWriteOff: 0,
      condition: 'good',
      damageDescription: '',
      images: [],
      repairRequired: false,
      estimatedRepairCost: 0,
      originalItemPrice: 0,
      inspectionChecklist: {
        structuralIntegrity: false,
        surfaceCondition: false,
        connectionsSecure: false,
        noCorrosion: false,
        safetyCompliance: false,
        completeParts: false,
      }
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InspectionItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Update scaffolding item name and original price when ID changes
        if (field === 'scaffoldingItemId') {
          const scaffoldingItem = SCAFFOLDING_TYPES.find(s => s.id === value);
          if (scaffoldingItem) {
            updated.scaffoldingItemName = scaffoldingItem.name;
            updated.originalItemPrice = (scaffoldingItem as any).price || 0;
          }
        }
        
        // Auto-calculate total quantity
        if (field === 'quantityGood' || field === 'quantityRepair' || field === 'quantityWriteOff') {
          updated.quantity = (updated.quantityGood || 0) + (updated.quantityRepair || 0) + (updated.quantityWriteOff || 0);
          
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

  const handleImageUpload = (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: InspectionImage = {
          id: `img-${Date.now()}-${Math.random()}`,
          url: e.target?.result as string,
          caption: file.name,
          uploadedAt: new Date().toISOString()
        };

        setItems(items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              images: [...item.images, newImage]
            };
          }
          return item;
        }));
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${files.length} image(s) uploaded`);
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
            <Button onClick={addItem} size="sm" className="bg-[#F15929] hover:bg-[#d94d1f]">
              <Plus className="size-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items added yet. Click &quot;Add Item&quot; to start inspection.
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <h4 className="text-[#231F20]">Item {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Scaffolding Item *</Label>
                    <Select
                      value={item.scaffoldingItemId}
                      onValueChange={(value) => updateItem(item.id, 'scaffoldingItemId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCAFFOLDING_TYPES.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label>Total Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      disabled
                      className="bg-gray-200"
                    />
                  </div>
                </div>

                {/* Quantity Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white rounded border">
                  <div className="space-y-2">
                    <Label className="text-green-600">Good</Label>
                    <Input
                      type="number"
                      min="0"
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
                      value={item.quantityWriteOff || 0}
                      onChange={(e) => updateItem(item.id, 'quantityWriteOff', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
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
                        value={item.estimatedRepairCost.toFixed(2)}
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
                        >
                          <Upload className="size-4 mr-2" />
                          Upload Images
                        </Button>
                        <input
                          id={`file-${item.id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleImageUpload(item.id, e)}
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
                <span className="text-[#231F20]">RM {totals.totalRepairCost.toFixed(2)}</span>
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