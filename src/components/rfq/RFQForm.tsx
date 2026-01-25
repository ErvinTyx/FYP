import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RFQ, RFQItem, SCAFFOLDING_TYPES, RFQNotification, NotificationChange } from '../../types/rfq';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';

interface RFQFormProps {
  rfq: RFQ | null;
  onSave: (rfq: RFQ) => void;
  onCancel: () => void;
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
    createdBy: 'Current User', // In real app, get from auth
  });

  const [items, setItems] = useState<RFQItem[]>([]);
  const [originalRFQ, setOriginalRFQ] = useState<RFQ | null>(null);

  useEffect(() => {
    if (rfq) {
      setOriginalRFQ(JSON.parse(JSON.stringify(rfq))); // Deep clone for comparison
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
      setItems(rfq.items);
    }
  }, [rfq]);

  const addItem = () => {
    const newItem: RFQItem = {
      id: `item-${Date.now()}`,
      scaffoldingItemId: '',
      scaffoldingItemName: '',
      quantity: 1,
      unit: '',
      unitPrice: 0,
      totalPrice: 0,
      notes: ''
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof RFQItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // If scaffolding item changed, update related fields
        if (field === 'scaffoldingItemId') {
          const scaffoldingItem = SCAFFOLDING_TYPES.find(s => s.id === value);
          if (scaffoldingItem) {
            updated.scaffoldingItemName = scaffoldingItem.name;
            updated.unit = scaffoldingItem.unit;
            updated.unitPrice = scaffoldingItem.basePrice;
          }
        }
        
        // Calculate total price
        updated.totalPrice = updated.quantity * updated.unitPrice;
        
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      items: items,
      totalAmount: calculateTotal()
    }));
  }, [items]);

  const detectChanges = (oldRFQ: RFQ, newRFQ: RFQ): NotificationChange[] => {
    const changes: NotificationChange[] = [];

    // Detect item additions
    newRFQ.items.forEach(newItem => {
      const oldItem = oldRFQ.items.find(i => i.id === newItem.id);
      if (!oldItem) {
        changes.push({
          field: 'items',
          oldValue: null,
          newValue: newItem,
          description: `Added item: ${newItem.scaffoldingItemName} (Qty: ${newItem.quantity})`
        });
      }
    });

    // Detect item removals
    oldRFQ.items.forEach(oldItem => {
      const newItem = newRFQ.items.find(i => i.id === oldItem.id);
      if (!newItem) {
        changes.push({
          field: 'items',
          oldValue: oldItem,
          newValue: null,
          description: `Removed item: ${oldItem.scaffoldingItemName}`
        });
      }
    });

    // Detect item modifications
    newRFQ.items.forEach(newItem => {
      const oldItem = oldRFQ.items.find(i => i.id === newItem.id);
      if (oldItem) {
        if (oldItem.quantity !== newItem.quantity) {
          changes.push({
            field: 'item_quantity',
            oldValue: oldItem.quantity,
            newValue: newItem.quantity,
            description: `Modified ${newItem.scaffoldingItemName}: quantity changed from ${oldItem.quantity} to ${newItem.quantity}`
          });
        }
        if (oldItem.scaffoldingItemId !== newItem.scaffoldingItemId) {
          changes.push({
            field: 'item_type',
            oldValue: oldItem.scaffoldingItemName,
            newValue: newItem.scaffoldingItemName,
            description: `Modified item: changed from ${oldItem.scaffoldingItemName} to ${newItem.scaffoldingItemName}`
          });
        }
        if (oldItem.unitPrice !== newItem.unitPrice) {
          changes.push({
            field: 'item_price',
            oldValue: oldItem.unitPrice,
            newValue: newItem.unitPrice,
            description: `Modified ${newItem.scaffoldingItemName}: price changed from RM ${Number(oldItem.unitPrice).toFixed(2)} to RM ${Number(newItem.unitPrice).toFixed(2)}`
          });
        }
      }
    });

    // Detect basic field changes
    const fieldChanges: { field: keyof RFQ; label: string }[] = [
      { field: 'status', label: 'Status' },
      { field: 'customerName', label: 'Customer Name' },
      { field: 'projectName', label: 'Project Name' },
      { field: 'requiredDate', label: 'Required Date' },
    ];

    fieldChanges.forEach(({ field, label }) => {
      if (oldRFQ[field] !== newRFQ[field]) {
        changes.push({
          field: field as string,
          oldValue: oldRFQ[field],
          newValue: newRFQ[field],
          description: `${label} changed from "${oldRFQ[field]}" to "${newRFQ[field]}"`
        });
      }
    });

    return changes;
  };

  const createNotification = (rfq: RFQ, changes: NotificationChange[], isNew: boolean) => {
    const notifications: RFQNotification[] = JSON.parse(localStorage.getItem('rfqNotifications') || '[]');
    
    let notificationType: RFQNotification['type'] = 'updated';
    let message = `RFQ ${rfq.rfqNumber} was updated`;

    if (isNew) {
      notificationType = 'created';
      message = `New RFQ ${rfq.rfqNumber} was created`;
    } else if (changes.some(c => c.field === 'items' && c.oldValue === null)) {
      notificationType = 'item_added';
      message = `Items added to RFQ ${rfq.rfqNumber}`;
    } else if (changes.some(c => c.field === 'items' && c.newValue === null)) {
      notificationType = 'item_removed';
      message = `Items removed from RFQ ${rfq.rfqNumber}`;
    } else if (changes.some(c => c.field.startsWith('item_'))) {
      notificationType = 'item_modified';
      message = `Items modified in RFQ ${rfq.rfqNumber}`;
    } else if (changes.some(c => c.field === 'status')) {
      notificationType = 'status_changed';
      message = `RFQ ${rfq.rfqNumber} status changed`;
    }

    const notification: RFQNotification = {
      id: `notif-${Date.now()}`,
      rfqId: rfq.id,
      rfqNumber: rfq.rfqNumber,
      type: notificationType,
      message,
      changes,
      createdBy: 'Current User', // In real app, get from auth
      createdAt: new Date().toISOString(),
      read: false
    };

    notifications.unshift(notification);
    localStorage.setItem('rfqNotifications', JSON.stringify(notifications));
  };

  const handleSubmit = (status: 'draft' | 'submitted') => {
    // Validation
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || !formData.projectName || !formData.projectLocation) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (items.some(item => !item.scaffoldingItemId || item.quantity <= 0)) {
      toast.error('Please complete all item details');
      return;
    }

    const isNew = !rfq;
    const rfqNumber = rfq?.rfqNumber || `RFQ-${Date.now().toString().slice(-8)}`;
    const now = new Date().toISOString();

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

    // Detect changes and create notification
    if (originalRFQ) {
      const changes = detectChanges(originalRFQ, newRFQ);
      if (changes.length > 0) {
        createNotification(newRFQ, changes, false);
      }
    } else {
      // New RFQ - include item details in notification
      const itemDescriptions = items.map(item => 
        `${item.scaffoldingItemName} (Qty: ${item.quantity})`
      ).join(', ');
      
      createNotification(newRFQ, [{
        field: 'created',
        oldValue: null,
        newValue: newRFQ,
        description: `RFQ created with ${items.length} item${items.length > 1 ? 's' : ''}: ${itemDescriptions}`
      }], true);
    }

    onSave(newRFQ);
    
    // Show toast with item summary
    const itemSummary = items.length <= 3 
      ? items.map(i => i.scaffoldingItemName).join(', ')
      : `${items.slice(0, 2).map(i => i.scaffoldingItemName).join(', ')} +${items.length - 2} more`;
    
    toast.success(
      status === 'draft' ? 'RFQ saved as draft' : 'RFQ submitted successfully',
      {
        description: `Items: ${itemSummary}`
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-[#231F20]">{rfq ? 'Edit RFQ' : 'New RFQ'}</h1>
          <p className="text-gray-600">
            {rfq ? `Editing ${rfq.rfqNumber}` : 'Create a new request for quotation'}
          </p>
        </div>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone *</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+60 12-345 6789"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectLocation">Project Location *</Label>
              <Input
                id="projectLocation"
                value={formData.projectLocation}
                onChange={(e) => setFormData({ ...formData, projectLocation: e.target.value })}
                placeholder="Enter project location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestedDate">Requested Date</Label>
              <Input
                id="requestedDate"
                type="date"
                value={formData.requestedDate}
                onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredDate">Required Date *</Label>
              <Input
                id="requiredDate"
                type="date"
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or requirements"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scaffolding Items */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Scaffolding Items</CardTitle>
            <Button onClick={addItem} size="sm" className="bg-[#F15929] hover:bg-[#d94d1f]">
              <Plus className="size-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items added yet. Click "Add Item" to start.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-4">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2 space-y-2">
                      <Label>Scaffolding Type *</Label>
                      <Select
                        value={item.scaffoldingItemId}
                        onValueChange={(value) => updateItem(item.id, 'scaffoldingItemId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select scaffolding type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SCAFFOLDING_TYPES.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name} - RM {type.basePrice.toFixed(2)}/{type.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Unit Price (RM)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600">Total Price:</span>
                    <span className="text-[#231F20]">RM {Number(item.totalPrice).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {items.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t-2">
              <span className="text-[#231F20]">Grand Total:</span>
              <span className="text-[#231F20]">RM {Number(calculateTotal()).toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit('draft')}
          className="border-[#F15929] text-[#F15929] hover:bg-[#F15929]/10"
        >
          <Save className="size-4 mr-2" />
          Save as Draft
        </Button>
        <Button
          onClick={() => handleSubmit('submitted')}
          className="bg-[#F15929] hover:bg-[#d94d1f]"
        >
          <Send className="size-4 mr-2" />
          Submit RFQ
        </Button>
      </div>
    </div>
  );
}