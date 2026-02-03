import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Info, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  OpenRepairSlip, 
  RepairItem, 
  RepairActionEntry,
  ConditionReport, 
  getRepairActionsForItem,
  ScaffoldingRepairAction
} from '../../types/inspection';

// Interface for scaffolding items with damage repairs from database
interface ScaffoldingDamageRepair {
  description: string;
  repairChargePerUnit: number;
  partsLabourCostPerUnit: number;
}

interface ScaffoldingItemWithRepairs {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  price: number;
  originPrice: number;
  damageRepairs?: ScaffoldingDamageRepair[];
}

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
  
  // Scaffolding items with damage repairs from database
  const [scaffoldingItems, setScaffoldingItems] = useState<ScaffoldingItemWithRepairs[]>([]);
  const [loadingScaffoldingItems, setLoadingScaffoldingItems] = useState(true);

  // Fetch scaffolding items with damage repairs from database
  useEffect(() => {
    const fetchScaffoldingItems = async () => {
      try {
        const response = await fetch('/api/scaffolding', {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          setScaffoldingItems(result.data || []);
        } else {
          console.error('Failed to fetch scaffolding items');
        }
      } catch (error) {
        console.error('Error fetching scaffolding items:', error);
      } finally {
        setLoadingScaffoldingItems(false);
      }
    };
    fetchScaffoldingItems();
  }, []);

  // Get repair actions from database for a specific scaffolding item
  const getRepairActionsFromDB = (scaffoldingItemId: string, scaffoldingItemName: string): ScaffoldingRepairAction[] => {
    // First try to find by ID
    let scaffoldingItem = scaffoldingItems.find(s => s.id === scaffoldingItemId);
    
    // If not found by ID, try to match by name
    if (!scaffoldingItem && scaffoldingItemName) {
      scaffoldingItem = scaffoldingItems.find(s => 
        s.name.toLowerCase() === scaffoldingItemName.toLowerCase() ||
        scaffoldingItemName.toLowerCase().includes(s.name.toLowerCase())
      );
    }

    // If scaffolding item found and has damage repairs, use them
    if (scaffoldingItem?.damageRepairs && scaffoldingItem.damageRepairs.length > 0) {
      return scaffoldingItem.damageRepairs.map(dr => ({
        action: dr.description,
        costPerUnit: dr.repairChargePerUnit,
        costType: 'per-item' as const, // Database entries are per-item
      }));
    }

    // Fallback to hardcoded values if no database entries
    return getRepairActionsForItem(scaffoldingItemName);
  };

  // Get write-off cost (originPrice) from database for a scaffolding item
  const getWriteOffCostFromDB = (scaffoldingItemId: string, scaffoldingItemName: string, fallbackPrice: number): number => {
    // First try to find by ID
    let scaffoldingItem = scaffoldingItems.find(s => s.id === scaffoldingItemId);
    
    // If not found by ID, try to match by name
    if (!scaffoldingItem && scaffoldingItemName) {
      scaffoldingItem = scaffoldingItems.find(s => 
        s.name.toLowerCase() === scaffoldingItemName.toLowerCase() ||
        scaffoldingItemName.toLowerCase().includes(s.name.toLowerCase())
      );
    }

    // Return originPrice if available, otherwise price, otherwise fallback
    if (scaffoldingItem) {
      return scaffoldingItem.originPrice > 0 ? scaffoldingItem.originPrice : scaffoldingItem.price;
    }

    return fallbackPrice;
  };

  useEffect(() => {
    // Wait for scaffolding items to load before initializing repair items
    if (conditionReport && !repairSlip && conditionReport.items && !loadingScaffoldingItems) {
      const damagedItems = (conditionReport.items || []).filter(item => item.repairRequired);
      const initialItems: RepairItem[] = damagedItems.map(item => {
        const qtyRepair = Number(item.quantityRepair || 0);
        const qtyWriteOff = Number(item.quantityWriteOff || 0);
        const totalQty = qtyRepair + qtyWriteOff;
        
        // Get write-off cost from database (originPrice) instead of condition report price
        const writeOffPrice = getWriteOffCostFromDB(
          item.scaffoldingItemId, 
          item.scaffoldingItemName, 
          Number(item.originalItemPrice || 0)
        );
        
        return {
          id: `repair-item-${Date.now()}-${Math.random()}`,
          inspectionItemId: item.id,
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: totalQty,
          quantityRepair: qtyRepair,
          quantityWriteOff: qtyWriteOff,
          quantityRepaired: 0,
          quantityRemaining: qtyRepair,
          damageType: 'other',
          damageDescription: item.damageDescription || '',
          repairActions: [],
          repairActionEntries: [],
          repairStatus: 'pending',
          writeOffCostPerUnit: writeOffPrice,
          writeOffTotalCost: qtyWriteOff * writeOffPrice,
          totalRepairCost: 0,
          costPerUnit: 0,
          totalCost: qtyWriteOff * writeOffPrice,
          beforeImages: item.images.map(img => img.url),
          afterImages: [],
        };
      });
      setRepairItems(initialItems);
    }
  }, [conditionReport, repairSlip, loadingScaffoldingItems, scaffoldingItems]);

  useEffect(() => {
    const total = repairItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    setFormData(prev => ({ ...prev, estimatedCost: Number.isFinite(total) ? total : 0 }));
  }, [repairItems]);

  const getAvailableConditionReportItems = (currentRepairItemId: string) => {
    if (!conditionReport || !conditionReport.items) return [];
    const selectedIds = repairItems.filter(ri => ri.id !== currentRepairItemId && ri.inspectionItemId).map(ri => ri.inspectionItemId);
    return conditionReport.items.filter(item => item.repairRequired && !selectedIds.includes(item.id));
  };

  const handleAddItem = () => {
    const newItem: RepairItem = {
      id: `repair-item-${Date.now()}-${Math.random()}`,
      inspectionItemId: '',
      scaffoldingItemId: '',
      scaffoldingItemName: '',
      quantity: 0,
      quantityRepair: 0,
      quantityWriteOff: 0,
      quantityRepaired: 0,
      quantityRemaining: 0,
      damageType: 'other',
      damageDescription: '',
      repairActions: [],
      repairActionEntries: [],
      repairStatus: 'pending',
      writeOffCostPerUnit: 0,
      writeOffTotalCost: 0,
      totalRepairCost: 0,
      costPerUnit: 0,
      totalCost: 0,
      beforeImages: [],
      afterImages: [],
    };
    setRepairItems([...repairItems, newItem]);
  };

  const handleSelectConditionReportItem = (repairItemId: string, inspectionItemId: string) => {
    if (!conditionReport || !conditionReport.items) return;
    const selectedItem = conditionReport.items.find(item => item.id === inspectionItemId);
    if (!selectedItem) return;
    const qtyRepair = Number(selectedItem.quantityRepair || 0);
    const qtyWriteOff = Number(selectedItem.quantityWriteOff || 0);
    const totalQty = qtyRepair + qtyWriteOff;
    
    // Get write-off cost from database (originPrice) instead of condition report price
    const writeOffPrice = getWriteOffCostFromDB(
      selectedItem.scaffoldingItemId, 
      selectedItem.scaffoldingItemName, 
      Number(selectedItem.originalItemPrice || 0)
    );
    
    setRepairItems(repairItems.map(item => {
      if (item.id === repairItemId) {
        return {
          ...item,
          inspectionItemId: selectedItem.id,
          scaffoldingItemId: selectedItem.scaffoldingItemId,
          scaffoldingItemName: selectedItem.scaffoldingItemName,
          quantity: totalQty,
          quantityRepair: qtyRepair,
          quantityWriteOff: qtyWriteOff,
          quantityRemaining: qtyRepair,
          damageDescription: selectedItem.damageDescription || '',
          writeOffCostPerUnit: writeOffPrice,
          writeOffTotalCost: qtyWriteOff * writeOffPrice,
          totalCost: qtyWriteOff * writeOffPrice,
          repairActionEntries: [],
          beforeImages: selectedItem.images.map(img => img.url),
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setRepairItems(repairItems.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, field: 'quantityRepair' | 'quantityWriteOff', value: number) => {
    setRepairItems(repairItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        updated.quantity = updated.quantityRepair + updated.quantityWriteOff;
        updated.quantityRemaining = updated.quantityRepair;
        updated.writeOffTotalCost = updated.quantityWriteOff * updated.writeOffCostPerUnit;
        updated.totalCost = updated.totalRepairCost + updated.writeOffTotalCost;
        return updated;
      }
      return item;
    }));
  };

  const handleUpdateRepairActionEntry = (itemId: string, actionId: string, field: keyof RepairActionEntry, value: number) => {
    setRepairItems(repairItems.map(item => {
      if (item.id === itemId) {
        const entries = item.repairActionEntries.map(entry => {
          if (entry.id === actionId) {
            const updated = { ...entry, [field]: value };
            // Calculate total cost based only on issue quantity
            updated.totalCost = (updated.issueQuantity || 0) * updated.costPerUnit;
            return updated;
          }
          return entry;
        });
        const totalRepairCost = entries.reduce((sum, e) => sum + e.totalCost, 0);
        return { ...item, repairActionEntries: entries, totalRepairCost, totalCost: totalRepairCost + item.writeOffTotalCost };
      }
      return item;
    }));
  };

  const handleToggleRepairAction = (itemId: string, repairAction: ScaffoldingRepairAction) => {
    setRepairItems(repairItems.map(item => {
      if (item.id === itemId) {
        const existingEntry = item.repairActionEntries.find(e => e.action === repairAction.action);
        let newEntries: RepairActionEntry[];
        if (existingEntry) {
          newEntries = item.repairActionEntries.filter(e => e.action !== repairAction.action);
        } else {
          newEntries = [...item.repairActionEntries, {
            id: `action-${Date.now()}-${Math.random()}`,
            action: repairAction.action,
            affectedItems: 0,
            issueQuantity: 0,
            costPerUnit: repairAction.costPerUnit,
            totalCost: 0,
          }];
        }
        const totalRepairCost = newEntries.reduce((sum, e) => sum + e.totalCost, 0);
        return { ...item, repairActionEntries: newEntries, repairActions: newEntries.map(e => e.action), totalRepairCost, totalCost: totalRepairCost + item.writeOffTotalCost };
      }
      return item;
    }));
  };

  const handleUpdateItem = (itemId: string, field: keyof RepairItem, value: any) => {
    setRepairItems(repairItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const handleUpdateWriteOffCost = (itemId: string, newPrice: number) => {
    setRepairItems(repairItems.map(item => {
      if (item.id === itemId) {
        const writeOffTotal = item.quantityWriteOff * newPrice;
        return { ...item, writeOffCostPerUnit: newPrice, writeOffTotalCost: writeOffTotal, totalCost: item.totalRepairCost + writeOffTotal };
      }
      return item;
    }));
  };

  const handleSubmit = () => {
    if (!formData.rcfNumber) { toast.error('RCF Number is required'); return; }
    if (repairItems.length === 0) { toast.error('At least one repair item is required'); return; }
    const invalidItems = repairItems.filter(item => !item.scaffoldingItemName || (item.quantityRepair === 0 && item.quantityWriteOff === 0));
    if (invalidItems.length > 0) { toast.error('Please complete all repair item details'); return; }
    const itemsNeedingActions = repairItems.filter(item => item.quantityRepair > 0 && item.repairActionEntries.length === 0);
    if (itemsNeedingActions.length > 0) { toast.error('Please add at least one repair action for items marked for repair'); return; }

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="size-5" /></Button>
          <div>
            <h1 className="text-[#231F20]">{repairSlip ? 'Edit Repair Slip' : 'Create Repair Slip'}</h1>
            <p className="text-gray-600">{conditionReport ? `From RCF: ${conditionReport.rcfNumber}` : 'Enter repair details'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-[#F15929] hover:bg-[#d94d1f]">{repairSlip ? 'Update' : 'Create'} Repair Slip</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ORP Number</Label>
              <Input value={formData.orpNumber} onChange={(e) => setFormData({ ...formData, orpNumber: e.target.value })} placeholder="ORP-XXXXX" />
            </div>
            <div className="space-y-2">
              <Label>RCF Number</Label>
              <Input value={formData.rcfNumber} onChange={(e) => setFormData({ ...formData, rcfNumber: e.target.value })} placeholder="RCF-XXXXX" disabled={!!conditionReport} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as OpenRepairSlip['priority'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} placeholder="Technician name" />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Repair Notes</Label>
            <Textarea value={formData.repairNotes} onChange={(e) => setFormData({ ...formData, repairNotes: e.target.value })} placeholder="Additional notes..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Repair Items</CardTitle>
            <Button onClick={handleAddItem} variant="outline" size="sm"><Plus className="size-4 mr-2" />Add Item</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {repairItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No repair items added. Click "Add Item" to add repair items.</div>
          ) : (
            repairItems.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <h4 className="text-[#231F20] font-medium">Item #{index + 1}</h4>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="size-4" /></Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Scaffolding Item</Label>
                    {conditionReport ? (
                      <Select value={item.inspectionItemId || ''} onValueChange={(value) => handleSelectConditionReportItem(item.id, value)}>
                        <SelectTrigger><SelectValue placeholder="Select from condition report" /></SelectTrigger>
                        <SelectContent>
                          {getAvailableConditionReportItems(item.id).map((crItem) => (
                            <SelectItem key={crItem.id} value={crItem.id}>{crItem.scaffoldingItemName} (Qty: {(crItem.quantityRepair || 0) + (crItem.quantityWriteOff || 0)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={item.scaffoldingItemName} onChange={(e) => handleUpdateItem(item.id, 'scaffoldingItemName', e.target.value)} placeholder="e.g., Crab Ledger 1.50m" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Total Quantity</Label>
                    <Input type="number" value={item.quantity} disabled className="bg-gray-200" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Damage Description</Label>
                  <Textarea value={item.damageDescription} onChange={(e) => handleUpdateItem(item.id, 'damageDescription', e.target.value)} placeholder="Describe the damage..." rows={2} />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center gap-2"><Info className="size-4 text-blue-500" /><span className="text-sm font-medium">Quantity Breakdown</span></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>For Repair</Label>
                      <Input type="number" value={item.quantityRepair} onChange={(e) => handleUpdateQuantity(item.id, 'quantityRepair', parseInt(e.target.value) || 0)} min="0" />
                      <p className="text-xs text-gray-500">Items that can be repaired</p>
                    </div>
                    <div className="space-y-2">
                      <Label>For Write-off</Label>
                      <Input type="number" value={item.quantityWriteOff} onChange={(e) => handleUpdateQuantity(item.id, 'quantityWriteOff', parseInt(e.target.value) || 0)} min="0" />
                      <p className="text-xs text-gray-500">Items beyond repair</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Write-off Cost/Unit (RM)</Label>
                      <Input type="number" value={Number(item.writeOffCostPerUnit || 0).toFixed(2)} onChange={(e) => handleUpdateWriteOffCost(item.id, parseFloat(e.target.value) || 0)} />
                      <p className="text-xs text-gray-500">From inventory origin price. Write-off: RM {Number(item.writeOffTotalCost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {item.quantityRepair > 0 && item.scaffoldingItemName && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label>Repair Actions Required</Label>
                      <span className="text-xs text-gray-500">(Click to add/remove - from inventory database)</span>
                    </div>
                    {loadingScaffoldingItems ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">Loading repair actions...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {getRepairActionsFromDB(item.scaffoldingItemId, item.scaffoldingItemName).map((repairAction) => {
                            const isSelected = item.repairActionEntries.some(e => e.action === repairAction.action);
                            return (
                              <Badge key={repairAction.action} variant={isSelected ? 'default' : 'outline'} className={`cursor-pointer ${isSelected ? 'bg-[#F15929] hover:bg-[#d94d1f]' : 'hover:bg-gray-100'}`} onClick={() => handleToggleRepairAction(item.id, repairAction)}>
                                {repairAction.action} (RM {repairAction.costPerUnit.toFixed(2)}/{repairAction.costType === 'per-bend' ? 'bend' : 'item'})
                              </Badge>
                            );
                          })}
                        </div>
                        {getRepairActionsFromDB(item.scaffoldingItemId, item.scaffoldingItemName).length === 0 && (
                          <p className="text-sm text-amber-600">No repair actions defined for this item in inventory. Please add repair types in the Inventory module.</p>
                        )}
                      </>
                    )}
                    {item.repairActionEntries.length > 0 && (
                      <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">Repair Action Details</span>
                        {item.repairActionEntries.map((entry) => {
                          const actionInfo = getRepairActionsFromDB(item.scaffoldingItemId, item.scaffoldingItemName).find(a => a.action === entry.action);
                          const isBendType = actionInfo?.costType === 'per-bend';
                          const qty = entry.issueQuantity; // single quantity for both display and cost
                          return (
                            <div key={entry.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white rounded border">
                              <div><Label className="text-xs">{entry.action}</Label><p className="text-xs text-gray-500">RM {entry.costPerUnit.toFixed(2)}/{isBendType ? 'bend' : 'item'}</p></div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Affected Items</Label>
                                  <Input type="number" value={entry.affectedItems || 0} onChange={(e) => handleUpdateRepairActionEntry(item.id, entry.id, 'affectedItems', parseInt(e.target.value) || 0)} min="0" max={item.quantityRepair} className="h-8 text-sm" />
                                  <p className="text-xs text-gray-400">Items affected</p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Issue Qty</Label>
                                  <Input type="number" value={entry.issueQuantity || 0} onChange={(e) => handleUpdateRepairActionEntry(item.id, entry.id, 'issueQuantity', parseInt(e.target.value) || 0)} min="0" max={item.quantityRepair} className="h-8 text-sm" />
                                  <p className="text-xs text-gray-400">{isBendType ? 'Bends' : 'Issues'} per item</p>
                                </div>
                              </div>
                              <div className="space-y-1"><Label className="text-xs">Cost</Label><div className="h-8 flex items-center text-sm font-medium text-green-700">RM {Number(entry.totalCost || 0).toFixed(2)}</div><p className="text-xs text-gray-400">{entry.issueQuantity || 0} × RM {entry.costPerUnit.toFixed(2)}</p></div>
                            </div>
                          );
                        })}
                        <div className="flex justify-end pt-2 border-t"><span className="text-sm font-medium text-blue-700">Total Repair Cost: RM {Number(item.totalRepairCost || 0).toFixed(2)}</span></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Repair Status</Label>
                    <Select value={item.repairStatus} onValueChange={(value) => handleUpdateItem(item.id, 'repairStatus', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Cost (RM)</Label>
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <div className="flex justify-between text-sm"><span>Repair Cost:</span><span>RM {Number(item.totalRepairCost || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm"><span>Write-off Cost:</span><span>RM {Number(item.writeOffTotalCost || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold text-[#F15929] pt-2 border-t mt-2"><span>Total:</span><span>RM {Number(item.totalCost || 0).toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {repairItems.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-bold"><span className="text-[#231F20]">Estimated Total Cost:</span><span className="text-[#F15929]">RM {Number(formData.estimatedCost || 0).toFixed(2)}</span></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
