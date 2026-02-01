import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Send, Loader2, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RFQ, RFQItem, RFQSet, RFQNotification, NotificationChange } from '../../types/rfq';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

interface DatabaseScaffoldingItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  price: number;
  status: string;
  location: string | null;
  itemStatus: string;
}

interface RFQFormProps {
  rfq: RFQ | null;
  onSave: (rfq: RFQ) => void;
  onCancel: () => void;
}

interface UISet {
  id: string;
  setName: string;
  deliverDate: string;
  returnDate: string;
  items: RFQItem[];
}

export function RFQForm({ rfq, onSave, onCancel }: RFQFormProps) {
  const [formData, setFormData] = useState<Omit<RFQ, 'id' | 'rfqNumber' | 'createdAt' | 'updatedAt'>>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectName: '',
    projectLocation: '',
    requestedDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    status: 'draft',
    items: [],
    totalAmount: 0,
    notes: '',
    createdBy: 'Current User',
  });

  const [uiSets, setUiSets] = useState<UISet[]>([]);
  const [originalRFQ, setOriginalRFQ] = useState<RFQ | null>(null);
  const [scaffoldingTypes, setScaffoldingTypes] = useState<DatabaseScaffoldingItem[]>([]);
  const [loadingScaffolding, setLoadingScaffolding] = useState(true);

  useEffect(() => {
    const fetchScaffoldingItems = async () => {
      try {
        setLoadingScaffolding(true);
        const response = await fetch('/api/scaffolding');
        const result = await response.json();
        if (result.success && result.data) {
          setScaffoldingTypes(result.data);
        } else {
          toast.error('Failed to load scaffolding items');
        }
      } catch (error) {
        toast.error('Failed to load scaffolding items');
      } finally {
        setLoadingScaffolding(false);
      }
    };
    fetchScaffoldingItems();
  }, []);

  // Convert flat items to UI sets for display
  const itemsToUiSets = (items: RFQItem[]): UISet[] => {
    const setMap = new Map<string, UISet>();
    items.forEach(item => {
      const key = item.setName;
      if (!setMap.has(key)) {
        setMap.set(key, {
          id: `set-${key}-${Date.now()}`,
          setName: item.setName,
          deliverDate: item.deliverDate,
          returnDate: item.returnDate,
          items: []
        });
      }
      setMap.get(key)!.items.push(item);
    });
    return Array.from(setMap.values());
  };

  // Convert UI sets back to flat items for API
  const uiSetsToItems = (sets: UISet[]): RFQItem[] => {
    const items: RFQItem[] = [];
    sets.forEach(set => {
      set.items.forEach(item => {
        items.push({
          ...item,
          setName: set.setName,
          deliverDate: set.deliverDate,
          returnDate: set.returnDate,
        });
      });
    });
    return items;
  };

  useEffect(() => {
    if (rfq) {
      setOriginalRFQ(JSON.parse(JSON.stringify(rfq)));
      setFormData({
        customerName: rfq.customerName,
        customerEmail: rfq.customerEmail,
        customerPhone: rfq.customerPhone,
        projectName: rfq.projectName,
        projectLocation: rfq.projectLocation,
        requestedDate: rfq.requestedDate,
        requiredDate: rfq.requiredDate,
        status: rfq.status,
        items: rfq.items,
        totalAmount: rfq.totalAmount,
        notes: rfq.notes,
        createdBy: rfq.createdBy,
      });
      setUiSets(itemsToUiSets(rfq.items || []));
    }
  }, [rfq]);

  const calculateDuration = (deliverDate: string, returnDate: string): number => {
    if (!deliverDate || !returnDate) return 0;
    const start = new Date(deliverDate);
    const end = new Date(returnDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const addSet = () => {
    const minDeliverDate = formData.requestedDate || new Date().toISOString().split('T')[0];
    const newSet: UISet = {
      id: `set-${Date.now()}`,
      setName: `Set ${uiSets.length + 1}`,
      deliverDate: minDeliverDate,
      returnDate: formData.requiredDate || minDeliverDate,
      items: []
    };
    setUiSets([...uiSets, newSet]);
  };

  const removeSet = (setId: string) => {
    setUiSets(uiSets.filter(s => s.id !== setId));
  };

  const updateSet = (setId: string, field: keyof UISet, value: any) => {
    setUiSets(uiSets.map(set => set.id === setId ? { ...set, [field]: value } : set));
  };

  const addItemToSet = (setId: string) => {
    const set = uiSets.find(s => s.id === setId);
    if (!set) return;
    const newItem: RFQItem = {
      id: `item-${Date.now()}`,
      setName: set.setName,
      deliverDate: set.deliverDate,
      returnDate: set.returnDate,
      scaffoldingItemId: '',
      scaffoldingItemName: '',
      quantity: 1,
      unit: '',
      unitPrice: 0,
      totalPrice: 0,
      notes: ''
    };
    setUiSets(uiSets.map(s => s.id === setId ? { ...s, items: [...s.items, newItem] } : s));
  };

  const removeItemFromSet = (setId: string, itemId: string) => {
    setUiSets(uiSets.map(set => set.id === setId ? { ...set, items: set.items.filter(item => item.id !== itemId) } : set));
  };

  const updateItemInSet = (setId: string, itemId: string, field: keyof RFQItem, value: any) => {
    setUiSets(uiSets.map(set => {
      if (set.id === setId) {
        return {
          ...set,
          items: set.items.map(item => {
            if (item.id === itemId) {
              const updated = { ...item, [field]: value };
              if (field === 'scaffoldingItemId') {
                const scaffoldingItem = scaffoldingTypes.find(s => s.id === value);
                if (scaffoldingItem) {
                  updated.scaffoldingItemName = scaffoldingItem.name;
                  updated.unit = 'piece';
                  updated.unitPrice = scaffoldingItem.price;
                }
              }
              const duration = calculateDuration(set.deliverDate, set.returnDate);
              updated.totalPrice = updated.quantity * updated.unitPrice * duration;
              return updated;
            }
            return item;
          })
        };
      }
      return set;
    }));
  };


  useEffect(() => {
    const items = uiSetsToItems(uiSets);
    setFormData(prev => ({ ...prev, items, totalAmount: calculateTotal() }));
  }, [uiSets]);

  const calculateTotal = () => {
    return uiSets.reduce((sum, set) => {
      const duration = calculateDuration(set.deliverDate, set.returnDate);
      return sum + set.items.reduce((itemSum, item) => {
        const itemTotal = item.quantity * item.unitPrice * duration;
        return itemSum + itemTotal;
      }, 0);
    }, 0);
  };

  const getTotalItemCount = () => {
    return uiSets.reduce((sum, set) => sum + set.items.length, 0);
  };

  const createNotification = (rfq: RFQ, changes: NotificationChange[], isNew: boolean) => {
    const notifications: RFQNotification[] = JSON.parse(localStorage.getItem('rfqNotifications') || '[]');
    let notificationType: RFQNotification['type'] = 'updated';
    let message = `RFQ ${rfq.rfqNumber} was updated`;
    if (isNew) {
      notificationType = 'created';
      message = `New RFQ ${rfq.rfqNumber} was created`;
    } else if (changes.some(c => c.field === 'status')) {
      notificationType = 'status_changed';
      message = `RFQ ${rfq.rfqNumber} status changed`;
    } else if (changes.some(c => c.field === 'items')) {
      notificationType = 'item_modified';
      message = `Items modified in RFQ ${rfq.rfqNumber}`;
    }
    const notification: RFQNotification = {
      id: `notif-${Date.now()}`,
      rfqId: rfq.id,
      rfqNumber: rfq.rfqNumber,
      type: notificationType,
      message,
      changes,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      read: false
    };
    notifications.unshift(notification);
    localStorage.setItem('rfqNotifications', JSON.stringify(notifications));
  };

  const handleSubmit = (status: 'draft' | 'submitted') => {
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || !formData.projectName || !formData.projectLocation) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!formData.requiredDate) {
      toast.error('Please set the required date');
      return;
    }
    if (formData.requestedDate && formData.requiredDate) {
      const reqDate = new Date(formData.requestedDate);
      const reqByDate = new Date(formData.requiredDate);
      if (reqByDate < reqDate) {
        toast.error('Required date must be on or after the requested date');
        return;
      }
    }
    if (uiSets.length === 0) {
      toast.error('Please add at least one set');
      return;
    }
    for (const set of uiSets) {
      if (set.items.length === 0) {
        toast.error(`Set "${set.setName}" has no items. Please add items or remove the set.`);
        return;
      }
      if (!set.deliverDate || !set.returnDate) {
        toast.error(`Set "${set.setName}" is missing deliver or return date`);
        return;
      }
      const deliverDate = new Date(set.deliverDate);
      const returnDate = new Date(set.returnDate);
      if (returnDate < deliverDate) {
        toast.error(`Set "${set.setName}": Return date must be on or after deliver date`);
        return;
      }
      if (set.items.some(item => !item.scaffoldingItemId || item.quantity <= 0)) {
        toast.error(`Set "${set.setName}": Please complete all item details`);
        return;
      }
    }
    const isNew = !rfq;
    const rfqNumber = rfq?.rfqNumber || `RFQ-${Date.now().toString().slice(-8)}`;
    const now = new Date().toISOString();
    const items = uiSetsToItems(uiSets);
    
    // Debug logging
    console.log('[RFQForm] uiSets:', uiSets);
    console.log('[RFQForm] items from uiSetsToItems:', items);
    
    const newRFQ: RFQ = {
      id: rfq?.id || `rfq-${Date.now()}`,
      rfqNumber,
      ...formData,
      status,
      items,
      totalAmount: calculateTotal(),
      createdAt: rfq?.createdAt || now,
      updatedAt: now
    };
    
    console.log('[RFQForm] newRFQ being saved:', newRFQ);
    const totalItems = getTotalItemCount();
    createNotification(newRFQ, [{
      field: isNew ? 'created' : 'updated',
      oldValue: null,
      newValue: newRFQ,
      description: isNew ? `RFQ created with ${uiSets.length} set(s) and ${totalItems} item(s)` : `RFQ updated with ${uiSets.length} set(s) and ${totalItems} item(s)`
    }], isNew);
    onSave(newRFQ);
    toast.success(status === 'draft' ? 'RFQ saved as draft' : 'RFQ submitted successfully', {
      description: `${uiSets.length} set(s), ${totalItems} item(s), Total: RM ${calculateTotal().toFixed(2)}`
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-[#231F20]">{rfq ? 'Edit RFQ' : 'New RFQ'}</h1>
          <p className="text-gray-600">{rfq ? `Editing ${rfq.rfqNumber}` : 'Create a new request for quotation'}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input id="customerName" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} placeholder="Enter customer name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email *</Label>
              <Input id="customerEmail" type="email" value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} placeholder="customer@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone *</Label>
              <Input id="customerPhone" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} placeholder="+60 12-345 6789" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input id="projectName" value={formData.projectName} onChange={(e) => setFormData({ ...formData, projectName: e.target.value })} placeholder="Enter project name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectLocation">Project Location *</Label>
              <Input id="projectLocation" value={formData.projectLocation} onChange={(e) => setFormData({ ...formData, projectLocation: e.target.value })} placeholder="Enter project location" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestedDate">Requested Date</Label>
              <Input id="requestedDate" type="date" value={formData.requestedDate} onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredDate">Required Date *</Label>
              <Input id="requiredDate" type="date" value={formData.requiredDate} min={formData.requestedDate} onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes or requirements" rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Scaffolding Sets</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Create sets with different delivery and return dates, then add items to each set</p>
            </div>
            <Button onClick={addSet} size="sm" className="bg-[#F15929] hover:bg-[#d94d1f]">
              <Plus className="size-4 mr-2" />Create Set
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {uiSets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
              <Calendar className="size-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No sets created yet</p>
              <p className="text-sm">Click "Create Set" to add a set with delivery and return dates</p>
            </div>
          ) : (
            <div className="space-y-6">
              {uiSets.map((set: UISet, setIndex: number) => (
                <div key={set.id} className="border-2 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Set Name *</Label>
                          <Input value={set.setName} onChange={(e) => updateSet(set.id, 'setName', e.target.value)} placeholder="e.g., Phase 1" />
                        </div>
                        <div className="space-y-2">
                          <Label>Deliver Date *</Label>
                          <Input type="date" value={set.deliverDate} min={formData.requestedDate} onChange={(e) => updateSet(set.id, 'deliverDate', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Return Date *</Label>
                          <Input type="date" value={set.returnDate} min={set.deliverDate} onChange={(e) => updateSet(set.id, 'returnDate', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <div className="h-10 flex items-center">
                            <Badge variant="secondary" className="text-sm">{calculateDuration(set.deliverDate, set.returnDate)} days</Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeSet(set.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-[#231F20]">Items in {set.setName}</h4>
                      <Button onClick={() => addItemToSet(set.id)} size="sm" variant="outline" className="border-[#F15929] text-[#F15929] hover:bg-[#F15929]/10">
                        <Plus className="size-4 mr-2" />Add Item
                      </Button>
                    </div>
                    {set.items.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 border border-dashed rounded-lg">No items in this set. Click "Add Item" to add scaffolding items.</div>
                    ) : (
                      <div className="space-y-3">
                        {set.items.map((item, itemIndex) => (
                          <div key={item.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-medium text-gray-600">Item {itemIndex + 1}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeItemFromSet(set.id, item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0">
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="lg:col-span-2 space-y-1">
                                <Label className="text-xs">Scaffolding Type *</Label>
                                <Select value={item.scaffoldingItemId} onValueChange={(value) => updateItemInSet(set.id, item.id, 'scaffoldingItemId', value)} disabled={loadingScaffolding}>
                                  <SelectTrigger className="h-9">
                                    {loadingScaffolding ? (<div className="flex items-center gap-2"><Loader2 className="size-3 animate-spin" /><span className="text-sm">Loading...</span></div>) : (<SelectValue placeholder="Select scaffolding type" />)}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {scaffoldingTypes.map(type => (<SelectItem key={type.id} value={type.id}>{type.itemCode} - {type.name} - RM {type.price.toFixed(2)}/piece</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Quantity *</Label>
                                <Input type="number" min="1" className="h-9" value={item.quantity} onChange={(e) => updateItemInSet(set.id, item.id, 'quantity', parseInt(e.target.value) || 0)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Unit Price (RM)</Label>
                                <Input type="number" step="0.01" className="h-9" value={item.unitPrice} onChange={(e) => updateItemInSet(set.id, item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <span className="text-sm text-[#231F20] font-medium">Total: RM {Number(item.totalPrice).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {set.items.length > 0 && (
                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="font-medium text-gray-600">Set Subtotal:</span>
                        <span className="font-medium text-[#231F20]">RM {set.items.reduce((sum, item) => sum + Number(item.totalPrice), 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {uiSets.length > 0 && getTotalItemCount() > 0 && (
            <div className="flex justify-between items-center pt-4 border-t-2 border-[#F15929]">
              <div>
                <span className="text-lg font-bold text-[#231F20]">Grand Total:</span>
                <span className="text-sm text-gray-500 ml-2">({uiSets.length} set(s), {getTotalItemCount()} item(s))</span>
              </div>
              <span className="text-lg font-bold text-[#F15929]">RM {calculateTotal().toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={() => handleSubmit('draft')} className="border-[#F15929] text-[#F15929] hover:bg-[#F15929]/10">
          <Save className="size-4 mr-2" />Save as Draft
        </Button>
        <Button onClick={() => handleSubmit('submitted')} className="bg-[#F15929] hover:bg-[#d94d1f]">
          <Send className="size-4 mr-2" />Submit RFQ
        </Button>
      </div>
    </div>
  );
}