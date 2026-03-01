import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Send, Loader2, Calendar as CalendarIcon } from 'lucide-react';
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
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { useSession } from 'next-auth/react';
import { projectNameContainsWord, isWithinCharLimit, isWithinWordLimit, countWords, truncateToWords, RFQ_VALIDATION } from '../../lib/rfq-validation';

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
  reservedQuantity?: number;
  price: number;
  status: string;
  location: string | null;
  itemStatus: string;
}

interface RFQFormProps {
  rfq: RFQ | null;
  onSave: (rfq: RFQ) => void;
  onCancel: () => void;
  /** When extending from another RFQ, show "Extend RFQ" title */
  mode?: 'create' | 'edit' | 'extend';
}

interface UISet {
  id: string;
  setName: string;
  requiredDate: string;
  rentalMonths: number;
  items: RFQItem[];
}

/** Format YYYY-MM-DD or Date to dd/mm/yyyy */
function formatDateToDDMMYYYY(isoOrDate: string | Date): string {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string'
    ? new Date(isoOrDate.includes('T') ? isoOrDate : isoOrDate + 'T12:00:00')
    : isoOrDate;
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function RFQForm({ rfq, onSave, onCancel, mode }: RFQFormProps) {
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
  /** While user is typing rental duration, hold the raw string; on blur we commit a number (min 1). */
  const [rentalDurationEditing, setRentalDurationEditing] = useState<{ setId: string; value: string } | null>(null);
  /** Which set's Required Date popover is open (null = none). */
  const [requiredDatePopoverSetId, setRequiredDatePopoverSetId] = useState<string | null>(null);

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
    setUiSets(uiSets.map(set => {
      if (set.id !== setId) return set;
      const updatedSet = { ...set, [field]: value };
      if (field === 'rentalMonths') {
        const months = Math.min(RFQ_VALIDATION.RENTAL_MONTHS_MAX, Math.max(RFQ_VALIDATION.RENTAL_MONTHS_MIN, Number(updatedSet.rentalMonths) || 1));
        updatedSet.rentalMonths = months;
        const durationInDays = months * 30;
        updatedSet.items = updatedSet.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice * durationInDays,
        }));
      }
      return updatedSet;
    }));
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
                  const availableForRfq = Math.max(
                    0,
                    Number(scaffoldingItem.available || 0) - Number(scaffoldingItem.reservedQuantity || 0)
                  );
                  updated.scaffoldingItemName = scaffoldingItem.name;
                  updated.unit = 'piece';
                  updated.unitPrice = scaffoldingItem.price;
                  if (updated.quantity > availableForRfq) {
                    updated.quantity = availableForRfq;
                    toast.error(`Quantity exceeds available stock (${availableForRfq}).`);
                  }
                }
              }
              if (field === 'quantity') {
                const nextQuantity = Number(value) || 0;
                const scaffoldingItem = getScaffoldingItem(updated.scaffoldingItemId);
                if (scaffoldingItem) {
                  const availableForRfq = Math.max(
                    0,
                    Number(scaffoldingItem.available || 0) - Number(scaffoldingItem.reservedQuantity || 0)
                  );
                  if (nextQuantity > availableForRfq) {
                    updated.quantity = availableForRfq;
                    toast.error(`Quantity exceeds available stock (${availableForRfq}).`);
                  } else {
                    updated.quantity = nextQuantity;
                  }
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
    if (!projectNameContainsWord(formData.projectName)) {
      toast.error('Project name must contain at least one words (cannot be only numbers or special characters)');
      return;
    }
    if (!isWithinCharLimit(formData.projectName, RFQ_VALIDATION.MAX_CHARS)) {
      toast.error(`Project name must be ${RFQ_VALIDATION.MAX_CHARS} characters or fewer`);
      return;
    }
    if (!isWithinWordLimit(formData.projectLocation, RFQ_VALIDATION.MAX_PROJECT_LOCATION_WORDS)) {
      toast.error(`Project location must be ${RFQ_VALIDATION.MAX_PROJECT_LOCATION_WORDS} words or fewer`);
      return;
    }
    if (formData.notes && !isWithinCharLimit(formData.notes, RFQ_VALIDATION.MAX_CHARS)) {
      toast.error(`Notes must be ${RFQ_VALIDATION.MAX_CHARS} characters or fewer`);
      return;
    }
    if (uiSets.length === 0) {
      toast.error('Please add at least one set');
      return;
    }
    for (const set of uiSets) {
      if (!isWithinCharLimit(set.setName, RFQ_VALIDATION.MAX_CHARS)) {
        toast.error(`Set name must be ${RFQ_VALIDATION.MAX_CHARS} characters or fewer`);
        return;
      }
      if (set.items.length === 0) {
        toast.error(`Set "${set.setName}" has no items. Please add items or remove the set.`);
        return;
      }
      if (!set.requiredDate) {
        toast.error(`Set "${set.setName}": Please set the required date`);
        return;
      }
      if (mode === 'extend') {
        const reqDate = new Date(set.requiredDate + 'T12:00:00');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (reqDate < todayStart) {
          toast.error(`Set "${set.setName}": Required date must be today or later for Extend RFQ.`);
          return;
        }
      }
      if (!set.rentalMonths || set.rentalMonths <= 0) {
        toast.error(`Set "${set.setName}": Please set a valid rental duration`);
        return;
      }
      if (set.rentalMonths > RFQ_VALIDATION.RENTAL_MONTHS_MAX) {
        toast.error(`Set "${set.setName}": Rental duration cannot exceed ${RFQ_VALIDATION.RENTAL_MONTHS_MAX} months`);
        return;
      }
      if (set.items.some(item => !item.scaffoldingItemId || item.quantity <= 0)) {
        toast.error(`Set "${set.setName}": Please complete all item details`);
        return;
      }
      for (const item of set.items) {
        const scaffoldingItem = getScaffoldingItem(item.scaffoldingItemId);
        if (scaffoldingItem) {
          const availableForRfq = Math.max(
            0,
            Number(scaffoldingItem.available || 0) - Number(scaffoldingItem.reservedQuantity || 0)
          );
          if (item.quantity > availableForRfq) {
            toast.error(`Set "${set.setName}": "${scaffoldingItem.name}" has only ${availableForRfq} available.`);
            return;
          }
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

  // For Extend RFQ, Required Date must be today or later (past dates disabled; today is selectable)
  const requiredDateDisabled =
    mode === 'extend'
      ? (date: Date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return d.getTime() < today.getTime(); // disable only strictly before today
        }
      : formData.requestedDate
        ? { before: new Date(formData.requestedDate + 'T12:00:00') }
        : undefined;

  return (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-[#231F20]">
            {mode === 'extend' ? 'Extend RFQ' : rfq ? 'Edit RFQ' : 'New RFQ'}
          </h1>
          <p className="text-gray-600">
            {mode === 'extend' ? 'Create a new RFQ with customer and project from the selected RFQ' : rfq ? `Editing ${rfq.rfqNumber}` : 'Create a new request for quotation'}
          </p>
        </div>
      </div>

      <Card className={mode === 'extend' ? 'bg-gray-50/80 opacity-95 pointer-events-none' : ''}>
        <CardHeader><CardTitle className={mode === 'extend' ? 'text-gray-500' : ''}>Customer Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerSelect" className={mode === 'extend' ? 'text-gray-500' : ''}>Select Customer *</Label>
              <Select value={selectedCustomerId} onValueChange={handleCustomerChange} disabled={loadingCustomers || mode === 'extend'}>
                <SelectTrigger className={mode === 'extend' ? 'bg-gray-100' : ''}>
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
              <Label htmlFor="customerEmail" className={mode === 'extend' ? 'text-gray-500' : ''}>Email *</Label>
              <Input id="customerEmail" type="email" value={formData.customerEmail} readOnly placeholder="Auto-filled from customer selection" className={mode === 'extend' ? 'bg-gray-100' : 'bg-gray-50'} disabled={mode === 'extend'} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone" className={mode === 'extend' ? 'text-gray-500' : ''}>Phone *</Label>
              <Input id="customerPhone" value={formData.customerPhone} readOnly placeholder="Auto-filled from customer selection" className={mode === 'extend' ? 'bg-gray-100' : 'bg-gray-50'} disabled={mode === 'extend'} />
            </div>
          </div>
          {mode === 'extend' && (
            <p className="text-xs text-gray-500">Pre-filled from the project you selected. Only scaffolding sets can be edited.</p>
          )}
        </CardContent>
      </Card>

      <Card className={mode === 'extend' ? 'bg-gray-50/80 opacity-95 pointer-events-none' : ''}>
        <CardHeader><CardTitle className={mode === 'extend' ? 'text-gray-500' : ''}>Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName" className={mode === 'extend' ? 'text-gray-500' : ''}>Project Name *</Label>
              <Input id="projectName" maxLength={RFQ_VALIDATION.MAX_CHARS} value={formData.projectName} onChange={(e) => setFormData({ ...formData, projectName: e.target.value.slice(0, RFQ_VALIDATION.MAX_CHARS) })} placeholder="Enter project name (must contain letters)" readOnly={mode === 'extend'} disabled={mode === 'extend'} className={mode === 'extend' ? 'bg-gray-100' : ''} />
              {formData.projectName.length === RFQ_VALIDATION.MAX_CHARS && (
                <p className="text-xs text-amber-600">You have reached the limit (only {RFQ_VALIDATION.MAX_CHARS} characters).</p>
              )}
              {formData.projectName.length > 0 && formData.projectName.length < RFQ_VALIDATION.MAX_CHARS && (
                <p className="text-xs text-gray-500">Must contain at least one letter.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectLocation" className={mode === 'extend' ? 'text-gray-500' : ''}>Project Location *</Label>
              <Input id="projectLocation" value={formData.projectLocation} onChange={(e) => setFormData({ ...formData, projectLocation: truncateToWords(e.target.value, RFQ_VALIDATION.MAX_PROJECT_LOCATION_WORDS) })} placeholder="Enter project location (max 70 words)" readOnly={mode === 'extend'} disabled={mode === 'extend'} className={mode === 'extend' ? 'bg-gray-100' : ''} />
              {countWords(formData.projectLocation) >= RFQ_VALIDATION.MAX_PROJECT_LOCATION_WORDS && (
                <p className="text-xs text-amber-600">You have reached the limit (only {RFQ_VALIDATION.MAX_PROJECT_LOCATION_WORDS} words).</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestedDate" className={mode === 'extend' ? 'text-gray-500' : ''}>Requested Date</Label>
              <Input id="requestedDate" type="text" value={formatDateToDDMMYYYY(formData.requestedDate)} readOnly placeholder="dd/mm/yyyy" className={mode === 'extend' ? 'bg-gray-100' : 'bg-gray-50'} disabled={mode === 'extend'} />
              <p className="text-xs text-gray-500">Always set to today's date</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className={mode === 'extend' ? 'text-gray-500' : ''}>Notes</Label>
              <Textarea id="notes" maxLength={RFQ_VALIDATION.MAX_CHARS} value={formData.notes ?? ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, RFQ_VALIDATION.MAX_CHARS) })} placeholder="Additional notes or requirements" rows={3} readOnly={mode === 'extend'} disabled={mode === 'extend'} className={mode === 'extend' ? 'bg-gray-100' : ''} />
              {(formData.notes || '').length === RFQ_VALIDATION.MAX_CHARS && (
                <p className="text-xs text-amber-600">You have reached the limit (only {RFQ_VALIDATION.MAX_CHARS} characters).</p>
              )}
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
              <CalendarIcon className="size-12 mx-auto mb-3 text-gray-400" />
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
                            <Input maxLength={RFQ_VALIDATION.MAX_CHARS} value={set.setName} onChange={(e) => updateSet(set.id, 'setName', e.target.value.slice(0, RFQ_VALIDATION.MAX_CHARS))} placeholder="e.g., Phase 1" />
                            {set.setName.length === RFQ_VALIDATION.MAX_CHARS && (
                              <p className="text-xs text-amber-600">You have reached the limit (only {RFQ_VALIDATION.MAX_CHARS} characters).</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeSet(set.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Required Date *</Label>
                          <Popover open={requiredDatePopoverSetId === set.id} onOpenChange={(open) => setRequiredDatePopoverSetId(open ? set.id : null)}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 size-4 text-[#6B7280]" />
                                {set.requiredDate ? formatDateToDDMMYYYY(set.requiredDate) : 'dd/mm/yyyy'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={set.requiredDate ? new Date(set.requiredDate + 'T12:00:00') : undefined}
                                onSelect={(date) => {
                                  if (!date) return;
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, '0');
                                  const d = String(date.getDate()).padStart(2, '0');
                                  updateSet(set.id, 'requiredDate', `${y}-${m}-${d}`);
                                  setRequiredDatePopoverSetId(null);
                                }}
                                disabled={requiredDateDisabled}
                              />
                            </PopoverContent>
                          </Popover>
                          {mode === 'extend' && (
                            <p className="text-xs text-gray-500">Must be today or later.</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Rental Duration (months) *</Label>
                          <Input
                            type="number"
                            min={RFQ_VALIDATION.RENTAL_MONTHS_MIN}
                            max={RFQ_VALIDATION.RENTAL_MONTHS_MAX}
                            value={rentalDurationEditing?.setId === set.id ? rentalDurationEditing.value : String(set.rentalMonths)}
                            onFocus={() => setRentalDurationEditing({ setId: set.id, value: String(set.rentalMonths) })}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (rentalDurationEditing?.setId === set.id) {
                                setRentalDurationEditing({ setId: set.id, value: raw });
                              }
                            }}
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              const num = parseInt(raw, 10);
                              const committed = raw === '' || Number.isNaN(num)
                                ? RFQ_VALIDATION.RENTAL_MONTHS_MIN
                                : Math.min(RFQ_VALIDATION.RENTAL_MONTHS_MAX, Math.max(RFQ_VALIDATION.RENTAL_MONTHS_MIN, num));
                              updateSet(set.id, 'rentalMonths', committed);
                              setRentalDurationEditing(null);
                            }}
                            placeholder="1–12"
                          />
                          <p className="text-xs text-gray-500">Rental duration: {RFQ_VALIDATION.RENTAL_MONTHS_MIN}–{RFQ_VALIDATION.RENTAL_MONTHS_MAX} months.</p>
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
                                    {scaffoldingTypes.map(type => {
                                      const availableForRfq = Math.max(
                                        0,
                                        Number(type.available || 0) - Number(type.reservedQuantity || 0)
                                      );
                                      const isUnavailable = availableForRfq <= 0;
                                      return (
                                        <SelectItem key={type.id} value={type.id} disabled={isUnavailable}>
                                          {type.itemCode} - {type.name} - RM {type.price.toFixed(2)}/piece
                                          {` (Available: ${availableForRfq})`}
                                          {isUnavailable ? ' - Unavailable' : ''}
                                        </SelectItem>
                                      );
                                    })}
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