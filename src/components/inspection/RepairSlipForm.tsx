import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { OpenRepairSlip, RepairItem, ConditionReport, DAMAGE_TYPES, REPAIR_ACTIONS } from '../../types/inspection';

interface RepairSlipFormProps {
  repairSlip?: OpenRepairSlip | null;
  conditionReport?: ConditionReport | null;
  onSave: (repairSlip: OpenRepairSlip) => void;
  onCancel: () => void;
}

export function RepairSlipForm({ repairSlip, conditionReport, onSave, onCancel }: RepairSlipFormProps) {
  const [formData, setFormData] = useState<Partial<OpenRepairSlip>>({
    orpNumber: repairSlip?.orpNumber || `ORP-${Date.now()}`,
    conditionReportId: repairSlip?.conditionReportId || conditionReport?.id || '',
    rcfNumber: repairSlip?.rcfNumber || conditionReport?.rcfNumber || '',
    status: repairSlip?.status || 'open',
    priority: repairSlip?.priority || 'medium',
    estimatedCost: repairSlip?.estimatedCost || 0,
    actualCost: repairSlip?.actualCost || 0,
    repairNotes: repairSlip?.repairNotes || '',
    assignedTo: repairSlip?.assignedTo || '',
    startDate: repairSlip?.startDate || '',
    createdBy: repairSlip?.createdBy || 'Current User',
  });

  const [repairItems, setRepairItems] = useState<RepairItem[]>(repairSlip?.items || []);

  // Initialize repair items from condition report
  useEffect(() => {
    if (conditionReport && !repairSlip && conditionReport.items) {
      const damagedItems = (conditionReport.items || []).filter(item => item.repairRequired);
      const initialItems: RepairItem[] = damagedItems.map(item => {
        // Auto-populate cost from condition report
        const estimatedRepairCost = Number(item.estimatedRepairCost || 0);
        const damageQty = Number(item.quantityRepair || 0) + Number(item.quantityWriteOff || 0);
        const costPerUnit = damageQty > 0 ? estimatedRepairCost / damageQty : estimatedRepairCost;
        return {
          id: `repair-item-${Date.now()}-${Math.random()}`,
          inspectionItemId: item.id,
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: damageQty, // Only damaged/repair needed items
          quantityRepaired: 0,
          quantityRemaining: damageQty,
          damageType: 'other',
          damageDescription: item.damageDescription || '',
          repairActions: [],
          repairStatus: 'pending',
          costPerUnit: Number.isFinite(costPerUnit) ? costPerUnit : 0,
          totalCost: Number.isFinite(estimatedRepairCost) ? estimatedRepairCost : 0,
          beforeImages: item.images.map(img => img.url),
          afterImages: [],
        };
      });
      setRepairItems(initialItems);
    }
  }, [conditionReport, repairSlip]);

  // Recalculate estimated cost when items change
  useEffect(() => {
    const total = repairItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    setFormData(prev => ({ ...prev, estimatedCost: Number.isFinite(total) ? total : 0 }));
  }, [repairItems]);

  // Get available items from condition report for dropdown, excluding already selected items
  const getAvailableConditionReportItems = (currentRepairItemId: string) => {
    if (!conditionReport || !conditionReport.items) return [];
    
    // Get IDs of items already selected in other repair items (not the current one)
    const selectedInspectionItemIds = repairItems
      .filter(ri => ri.id !== currentRepairItemId && ri.inspectionItemId)
      .map(ri => ri.inspectionItemId);
    
    // Return items that require repair and are not already selected
    return conditionReport.items.filter(item => 
      item.repairRequired && !selectedInspectionItemIds.includes(item.id)
    );
  };

  const handleAddItem = () => {
    const newItem: RepairItem = {
      id: `repair-item-${Date.now()}-${Math.random()}`,
      inspectionItemId: '',
      scaffoldingItemId: '',
      scaffoldingItemName: '',
      quantity: 1,
      quantityRepaired: 0,
      quantityRemaining: 1,
      damageType: 'other',
      damageDescription: '',
      repairActions: [],
      repairStatus: 'pending',
      costPerUnit: 0,
      totalCost: 0,
      beforeImages: [],
      afterImages: [],
    };
    setRepairItems([...repairItems, newItem]);
  };

  // Handle selecting a scaffolding item from condition report dropdown
  const handleSelectConditionReportItem = (repairItemId: string, inspectionItemId: string) => {
    if (!conditionReport || !conditionReport.items) return;
    
    const selectedItem = conditionReport.items.find(item => item.id === inspectionItemId);
    if (!selectedItem) return;

    const estimatedRepairCost = Number(selectedItem.estimatedRepairCost || 0);
    const damageQty = Number(selectedItem.quantityRepair || 0) + Number(selectedItem.quantityWriteOff || 0);
    const costPerUnit = damageQty > 0 ? estimatedRepairCost / damageQty : estimatedRepairCost;

    setRepairItems(repairItems.map(item => {
      if (item.id === repairItemId) {
        return {
          ...item,
          inspectionItemId: selectedItem.id,
          scaffoldingItemId: selectedItem.scaffoldingItemId,
          scaffoldingItemName: selectedItem.scaffoldingItemName,
          quantity: damageQty,
          quantityRemaining: damageQty,
          damageDescription: selectedItem.damageDescription || '',
          costPerUnit: Number.isFinite(costPerUnit) ? costPerUnit : 0,
          totalCost: Number.isFinite(estimatedRepairCost) ? estimatedRepairCost : 0,
          beforeImages: selectedItem.images.map(img => img.url),
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setRepairItems(repairItems.filter(item => item.id !== itemId));
  };

  const handleUpdateItem = (itemId: string, field: keyof RepairItem, value: any) => {
    setRepairItems(repairItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate total cost
        if (field === 'costPerUnit' || field === 'quantity') {
          const costPerUnit = Number((updated as any).costPerUnit || 0);
          const quantity = Number((updated as any).quantity || 0);
          updated.totalCost = Number.isFinite(costPerUnit * quantity) ? costPerUnit * quantity : 0;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleToggleRepairAction = (itemId: string, action: string) => {
    setRepairItems(repairItems.map(item => {
      if (item.id === itemId) {
        const actions = item.repairActions.includes(action)
          ? item.repairActions.filter(a => a !== action)
          : [...item.repairActions, action];
        return { ...item, repairActions: actions };
      }
      return item;
    }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.rcfNumber) {
      toast.error('RCF Number is required');
      return;
    }

    if (repairItems.length === 0) {
      toast.error('At least one repair item is required');
      return;
    }

    const invalidItems = repairItems.filter(
      item => !item.scaffoldingItemName || !item.damageDescription || item.repairActions.length === 0
    );

    if (invalidItems.length > 0) {
      toast.error('Please complete all repair item details');
      return;
    }

    const repairSlipData: OpenRepairSlip = {
      id: repairSlip?.id || `repair-${Date.now()}`,
      orpNumber: formData.orpNumber!,
      conditionReportId: formData.conditionReportId!,
      rcfNumber: formData.rcfNumber!,
      items: repairItems,
      status: formData.status as OpenRepairSlip['status'],
      priority: formData.priority as OpenRepairSlip['priority'],
      assignedTo: formData.assignedTo,
      startDate: formData.startDate,
      completionDate: repairSlip?.completionDate,
      estimatedCost: formData.estimatedCost!,
      actualCost: formData.actualCost!,
      repairNotes: formData.repairNotes,
      invoiceNumber: repairSlip?.invoiceNumber,
      createdBy: formData.createdBy!,
      createdAt: repairSlip?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(repairSlipData);
    toast.success(repairSlip ? 'Repair slip updated successfully' : 'Repair slip created successfully');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-[#231F20]">
              {repairSlip ? 'Edit Repair Slip' : 'Create Repair Slip'}
            </h1>
            <p className="text-gray-600">
              {conditionReport ? `From RCF: ${conditionReport.rcfNumber}` : 'Enter repair details'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-[#F15929] hover:bg-[#d94d1f]">
            {repairSlip ? 'Update' : 'Create'} Repair Slip
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ORP Number</Label>
              <Input
                value={formData.orpNumber}
                onChange={(e) => setFormData({ ...formData, orpNumber: e.target.value })}
                placeholder="ORP-XXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>RCF Number</Label>
              <Input
                value={formData.rcfNumber}
                onChange={(e) => setFormData({ ...formData, rcfNumber: e.target.value })}
                placeholder="RCF-XXXXX"
                disabled={!!conditionReport}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as OpenRepairSlip['priority'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Input
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                placeholder="Technician name"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Repair Notes</Label>
            <Textarea
              value={formData.repairNotes}
              onChange={(e) => setFormData({ ...formData, repairNotes: e.target.value })}
              placeholder="Additional notes about the repair..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Repair Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Repair Items</CardTitle>
            <Button onClick={handleAddItem} variant="outline" size="sm">
              <Plus className="size-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {repairItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No repair items added. Click "Add Item" to add repair items.
            </div>
          ) : (
            repairItems.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-4 relative">
                <div className="flex items-start justify-between">
                  <h4 className="text-[#231F20]">Item #{index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Scaffolding Item</Label>
                    {conditionReport ? (
                      <>
                        <Select
                          value={item.inspectionItemId || ''}
                          onValueChange={(value) => handleSelectConditionReportItem(item.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select from condition report" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableConditionReportItems(item.id).map((crItem) => (
                              <SelectItem key={crItem.id} value={crItem.id}>
                                {crItem.scaffoldingItemName} (Qty: {(crItem.quantityRepair || 0) + (crItem.quantityWriteOff || 0)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">Select from condition report items</p>
                      </>
                    ) : (
                      <Input
                        value={item.scaffoldingItemName}
                        onChange={(e) => handleUpdateItem(item.id, 'scaffoldingItemName', e.target.value)}
                        placeholder="e.g., Standard Frame"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      min="1"
                      disabled={!!conditionReport && !!item.inspectionItemId}
                      className={conditionReport && item.inspectionItemId ? "bg-gray-200" : ""}
                    />
                    {conditionReport && item.inspectionItemId && (
                      <p className="text-xs text-gray-500">Auto-filled from condition report</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Damage Type</Label>
                    <Select
                      value={item.damageType}
                      onValueChange={(value) => handleUpdateItem(item.id, 'damageType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAMAGE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {item.damageType === 'other' && (
                  <div className="space-y-2">
                    <Label>Damage Description</Label>
                    <Textarea
                      value={item.damageDescription}
                      onChange={(e) => handleUpdateItem(item.id, 'damageDescription', e.target.value)}
                      placeholder="Describe the damage..."
                      rows={2}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Repair Actions Required</Label>
                  <div className="flex flex-wrap gap-2">
                    {REPAIR_ACTIONS.map(action => (
                      <Badge
                        key={action}
                        variant={item.repairActions.includes(action) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          item.repairActions.includes(action)
                            ? 'bg-[#F15929] hover:bg-[#d94d1f]'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleToggleRepairAction(item.id, action)}
                      >
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Repair Status</Label>
                    <Select
                      value={item.repairStatus}
                      onValueChange={(value) => handleUpdateItem(item.id, 'repairStatus', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="scrapped">Scrapped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Cost (RM)</Label>
                    <Input
                      type="number"
                      value={Number(item.totalCost || 0).toFixed(2)}
                      disabled
                      className="bg-gray-200"
                    />
                    {conditionReport && (
                      <p className="text-xs text-gray-500">Auto-calculated from condition report</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {repairItems.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-[#231F20]">Estimated Total Cost:</span>
                <span className="text-[#231F20]">RM {Number(formData.estimatedCost || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}