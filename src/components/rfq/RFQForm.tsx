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
import { useSession } from 'next-auth/react';

interface CustomerSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: string;
  roles: string[];
  userType: 'Internal Staff' | 'Individual Customer' | 'Business Customer';
}

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
  requiredDate: string;
  rentalMonths: number;
  items: RFQItem[];
}

export function RFQForm({ rfq, onSave, onCancel }: RFQFormProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<Omit<RFQ, 'id' | 'rfqNumber' | 'createdAt' | 'updatedAt'>>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectName: '',
    projectLocation: '',
    requestedDate: new Date().toISOString().split('T')[0],
    status: 'draft',
    items: [],
    totalAmount: 0,
    notes: '',
    createdBy: session?.user?.id || session?.user?.email || 'Current User',
  });

  const [uiSets, setUiSets] = useState<UISet[]>([]);
  const [originalRFQ, setOriginalRFQ] = useState<RFQ | null>(null);
  const [scaffoldingTypes, setScaffoldingTypes] = useState<DatabaseScaffoldingItem[]>([]);
  const [loadingScaffolding, setLoadingScaffolding] = useState(true);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);

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

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const response = await fetch('/api/user-management');
        const result = await response.json();
        if (result.success && result.users) {
          const customerUsers = result.users.filter((user: CustomerSummary) =>
            user.userType === 'Individual Customer' ||
            user.userType === 'Business Customer' ||
            user.roles?.includes('customer')
          );
          setCustomers(customerUsers);
        } else {
          toast.error('Failed to load customers');
        }
      } catch (error) {
        toast.error('Failed to load customers');
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, [rfq, session]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown';
      setFormData(prev => ({
        ...prev,
        customerName: fullName,
        customerEmail: customer.email,
        customerPhone: customer.phone || '',
      }));
    }
  };

  // Convert flat items to UI sets for display
  const itemsToUiSets = (items: RFQItem[]): UISet[] => {
    const setMap = new Map<string, UISet>();
    items.forEach(item => {
      const key = item.setName;
      if (!setMap.has(key)) {
        setMap.set(key, {
          id: `set-${key}-${Date.now()}`,
          setName: item.setName,
          requiredDate: item.requiredDate || new Date().toISOString().split('T')[0],
          rentalMonths: item.rentalMonths || 1,
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
          requiredDate: set.requiredDate,
          rentalMonths: set.rentalMonths,
        });
      });
    });
    return items;
  };

  // Auto-populate customer info when session becomes available (for customer users creating new RFQ)
  useEffect(() => {
    if (!rfq && !hasAutoPopulated && session?.user && customers.length > 0) {
      const userRoles = session.user.roles || [];
      const isCustomer = userRoles.includes('customer');
      
      // Only auto-populate if user is a customer and form hasn't been auto-populated yet
      if (isCustomer) {
        const currentUserCustomer = customers.find((c: CustomerSummary) =>
          c.email === session.user.email
        );
        
        if (currentUserCustomer) {
          const fullName = `${currentUserCustomer.firstName || ''} ${currentUserCustomer.lastName || ''}`.trim() || 'Unknown';
          setFormData(prev => ({
            ...prev,
            customerName: fullName,
            customerEmail: currentUserCustomer.email,
            customerPhone: currentUserCustomer.phone || '',
            createdBy: session.user.id || session.user.email || 'Current User',
          }));
          setSelectedCustomerId(currentUserCustomer.id);
        } else {
          // If customer record not found but user has customer role, use session data
          const fullName = `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email || 'Unknown';
          setFormData(prev => ({
            ...prev,
            customerName: fullName,
            customerEmail: session.user.email,
            customerPhone: (session.user as any).phone || '',
            createdBy: session.user.id || session.user.email || 'Current User',
          }));
        }
        setHasAutoPopulated(true);
      }
    }
  }, [session, customers, rfq, hasAutoPopulated]);

  useEffect(() => {
    if (rfq) {
      setHasAutoPopulated(true); // Prevent auto-population when editing
      setOriginalRFQ(JSON.parse(JSON.stringify(rfq)));
      setFormData({
        customerName: rfq.customerName,
        customerEmail: rfq.customerEmail,
        customerPhone: rfq.customerPhone,
        projectName: rfq.projectName,
        projectLocation: rfq.projectLocation,
        requestedDate: rfq.requestedDate,
        status: rfq.status,
        items: rfq.items,
        totalAmount: rfq.totalAmount,
        notes: rfq.notes,
        createdBy: rfq.createdBy || session?.user?.id || session?.user?.email || 'Current User',
      });
      setUiSets(itemsToUiSets(rfq.items || []));
      
      // Set selected customer based on RFQ customer data
      const customer = customers.find(c =>
        c.email === rfq.customerEmail &&
        c.phone === rfq.customerPhone
      );
      if (customer) {
        setSelectedCustomerId(customer.id);
      }
    } else {
      // Reset auto-population flag when creating new RFQ
      setHasAutoPopulated(false);
    }
  }, [rfq, customers, session]);

  const addSet = () => {
    const newSet: UISet = {
      id: `set-${Date.now()}`,
      setName: `Set ${uiSets.length + 1}`,
      requiredDate: new Date().toISOString().split('T')[0],
      rentalMonths: 1,
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
      requiredDate: set.requiredDate,
      rentalMonths: set.rentalMonths,
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

  const getScaffoldingItem = (itemId: string) => {
    return scaffoldingTypes.find(item => item.id === itemId);
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
                const scaffoldingItem = getScaffoldingItem(value);
                if (scaffoldingItem) {
                  updated.scaffoldingItemName = scaffoldingItem.name;
                  updated.unit = 'piece';
                  updated.unitPrice = scaffoldingItem.price;
                  if (updated.quantity > scaffoldingItem.available) {
                    updated.quantity = scaffoldingItem.available;
                    toast.error(`Quantity exceeds available stock (${scaffoldingItem.available}).`);
                  }
                }
              }
              if (field === 'quantity') {
                const nextQuantity = Number(value) || 0;
                const scaffoldingItem = getScaffoldingItem(updated.scaffoldingItemId);
                if (scaffoldingItem && nextQuantity > scaffoldingItem.available) {
                  updated.quantity = scaffoldingItem.available;
                  toast.error(`Quantity exceeds available stock (${scaffoldingItem.available}).`);
                } else {
                  updated.quantity = nextQuantity;
                }
              }
              const durationInDays = set.rentalMonths * 30; // Convert months to days
              updated.totalPrice = updated.quantity * updated.unitPrice * durationInDays;
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
      const durationInDays = set.rentalMonths * 30; // Convert months to days
      return sum + set.items.reduce((itemSum, item) => {
        const itemTotal = item.quantity * item.unitPrice * durationInDays;
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
      createdBy: session?.user?.id || session?.user?.email || 'Current User',
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
    if (uiSets.length === 0) {
      toast.error('Please add at least one set');
      return;
    }
    for (const set of uiSets) {
      if (set.items.length === 0) {
        toast.error(`Set "${set.setName}" has no items. Please add items or remove the set.`);
        return;
      }
      if (!set.requiredDate) {
        toast.error(`Set "${set.setName}": Please set the required date`);
        return;
      }
      if (!set.rentalMonths || set.rentalMonths <= 0) {
        toast.error(`Set "${set.setName}": Please set a valid rental duration`);
        return;
      }
      if (set.items.some(item => !item.scaffoldingItemId || item.quantity <= 0)) {
        toast.error(`Set "${set.setName}": Please complete all item details`);
        return;
      }
      for (const item of set.items) {
        const scaffoldingItem = getScaffoldingItem(item.scaffoldingItemId);
        if (scaffoldingItem && item.quantity > scaffoldingItem.available) {
          toast.error(`Set "${set.setName}": "${scaffoldingItem.name}" has only ${scaffoldingItem.available} available.`);
          return;
        }
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
              <Label htmlFor="customerSelect">Select Customer *</Label>
              <Select value={selectedCustomerId} onValueChange={handleCustomerChange} disabled={loadingCustomers}>
                <SelectTrigger>
                  {loadingCustomers ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-3 animate-spin" />
                      <span className="text-sm">Loading customers...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a customer" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.firstName && customer.lastName
                        ? `${customer.firstName} ${customer.lastName}`
                        : customer.email
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email *</Label>
              <Input id="customerEmail" type="email" value={formData.customerEmail} readOnly placeholder="Auto-filled from customer selection" className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone *</Label>
              <Input id="customerPhone" value={formData.customerPhone} readOnly placeholder="Auto-filled from customer selection" className="bg-gray-50" />
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
              <Input id="requestedDate" type="date" value={formData.requestedDate} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">Always set to today's date</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes or requirements" rows={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Scaffolding Sets</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Create sets to organize scaffolding items. Pricing is calculated based on rental duration.</p>
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
              <p className="text-sm">Click "Create Set" to organize scaffolding items</p>
            </div>
          ) : (
            <div className="space-y-6">
              {uiSets.map((set: UISet, setIndex: number) => (
                <div key={set.id} className="border-2 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="space-y-2">
                            <Label>Set Name *</Label>
                            <Input value={set.setName} onChange={(e) => updateSet(set.id, 'setName', e.target.value)} placeholder="e.g., Phase 1" />
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeSet(set.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Required Date *</Label>
                          <Input type="date" value={set.requiredDate} min={formData.requestedDate} onChange={(e) => updateSet(set.id, 'requiredDate', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Rental Duration *</Label>
                          <Select value={set.rentalMonths.toString()} onValueChange={(value) => updateSet(set.id, 'rentalMonths', parseInt(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rental duration" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 6, 12, 18, 24].map(months => (
                                <SelectItem key={months} value={months.toString()}>
                                  {months} {months === 1 ? 'month' : 'months'} ({months * 30} days)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">Minimum rental duration is 1 month (30 days)</p>
                        </div>
                      </div>
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