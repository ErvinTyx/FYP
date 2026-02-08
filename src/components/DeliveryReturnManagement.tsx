import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, Truck, Package, CheckCircle, Clock, XCircle, Phone, Mail, MapPin, Calendar as CalendarIcon, User, ArrowRight, Download, Upload, Check, X, Loader, AlertCircle } from 'lucide-react';
import DeliveryOrderGeneration from './DeliveryOrderGeneration';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { z } from 'zod';
import { toast } from 'sonner';

// ==================== VALIDATION SCHEMAS ====================

// Delivery Request Validation Schema
const deliverySetItemSchema = z.object({
  scaffoldingItemId: z.string().min(1, 'Please select an item'),
  name: z.string(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const deliverySetSchema = z.object({
  setName: z.string().min(1, 'Set name is required'),
  requiredDate: z.date({ required_error: 'Required date is required' }),
  items: z.array(deliverySetItemSchema).min(1, 'At least one item is required'),
}).refine(
  (data) => data.items.some(item => item.scaffoldingItemId?.trim()),
  { message: 'At least one item must be selected', path: ['items'] }
);

const deliveryRequestSchema = z.object({
  agreementId: z.string().min(1, 'Please select a rental agreement'),
  deliveryType: z.enum(['delivery', 'pickup'], { required_error: 'Please select a delivery type' }),
  sets: z.array(deliverySetSchema).min(1, 'At least one delivery set is required'),
});

// Return Request Validation Schema
const returnItemSchema = z.object({
  scaffoldingItemId: z.string().min(1, 'Please select an item'),
  name: z.string(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const returnRequestSchema = z.object({
  agreementId: z.string().min(1, 'Please select a rental agreement'),
  doNumber: z.string().min(1, 'Please select a delivery order'),
  deliverySetId: z.string().min(1, 'Please select a set'),
  setName: z.string().min(1, 'Please select a set to return'),
  returnType: z.enum(['full', 'partial'], { required_error: 'Please select a return type' }),
  collectionMethod: z.enum(['transport', 'self-return'], { required_error: 'Please select a collection method' }),
  reason: z.string().min(1, 'Please enter a reason for return').max(500, 'Reason must be 500 characters or less'),
  items: z.array(returnItemSchema).min(1, 'At least one item is required'),
}).refine(
  (data) => data.items.some(item => item.scaffoldingItemId?.trim()),
  { message: 'At least one item must be selected', path: ['items'] }
);

// Validation Error Types
interface DeliveryFormErrors {
  agreementId?: string;
  deliveryType?: string;
  sets?: {
    general?: string;
    [setIndex: number]: {
      requiredDate?: string;
      items?: string;
      itemErrors?: { [itemIndex: number]: { scaffoldingItemId?: string; quantity?: string } };
    };
  };
  general?: string;
}

interface ReturnFormErrors {
  agreementId?: string;
  doNumber?: string;
  doSetId?: string; // Keep for backward compatibility
  deliverySetId?: string;
  returnType?: string;
  collectionMethod?: string;
  reason?: string;
  items?: string;
  itemErrors?: { [itemIndex: number]: { scaffoldingItemId?: string; quantity?: string } };
  general?: string;
}

type DeliveryType = 'delivery' | 'pickup';
type DeliveryStatus = 'Pending' | 'Quoted' | 'DO Generated' | 'Confirmed' | 'Packing List Issued' | 'Packing & Loading' | 'Driver Acknowledged' | 'In Transit' | 'Delivered' | 'Customer Confirmed' | 'Cancelled';
type ReturnStatus = 'Requested' | 'Quoted' | 'Agreed' | 'Scheduled' | 'In Transit' | 'Received' | 'Customer Notified' | 'GRN Generated' | 'Cancelled';
type ReturnType = 'partial' | 'full';
type CollectionMethod = 'transport' | 'self-return';

interface RentalAgreement {
  id: string;
  agreementNumber: string;
  projectName: string;
  hirer: string;
  hirerPhone: string | null;
  location: string | null;
  status: string;
  rfqId: string | null;
}

interface ScaffoldingItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
}

interface RFQItem {
  id: string;
  scaffoldingItemId: string;
  scaffoldingItemName: string;
  quantity: number;
  unit: string;
  setName: string;
  requiredDate: string;
}

interface RFQ {
  id: string;
  rfqNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  projectLocation: string;
  status: string;
  items: RFQItem[];
}

interface DeliverySet {
  id: string;
  setName: string;
  items: { name: string; quantity: number; scaffoldingItemId?: string }[];
  scheduledPeriod: string;
  status: DeliveryStatus;
  quotedAmount?: number;
  deliveryFee?: number;
  deliveryDate?: string;
  packingListIssued?: boolean;
  driverAcknowledged?: boolean;
  customerAcknowledged?: boolean;
  otp?: string;
  signedDO?: string;
  doNumber?: string; // DO number for tracking when DO is generated
  additionalChargeStatus?: string | null;
}

interface ReturnRequest {
  id: string;
  requestId: string;
  customerName: string;
  agreementNo: string;
  setName: string;
  items: { name: string; quantity: number; scaffoldingItemId?: string }[];
  requestDate: string;
  scheduledDate?: string;
  status: ReturnStatus;
  reason: string;
  pickupAddress: string;
  customerPhone: string;
  customerEmail: string;
  pickupFee?: number;
  returnType: ReturnType;
  collectionMethod: CollectionMethod;
  deliverySetId?: string;
  additionalChargeStatus?: string | null;
}

interface DeliveryRequest {
  id: string;
  requestId: string;
  customerName: string;
  agreementNo: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryType: DeliveryType;
  sets: DeliverySet[];
  requestDate: string;
  totalSets: number;
  deliveredSets: number;
  pickupTime?: string;
}

// Calculate scheduled date: 1 day before the required date
const calculateScheduledDateFromPeriod = (period: string): string | undefined => {
  if (!period) return undefined;
  try {
    // Parse single date format like "7 Feb 2026" (also handles legacy "1 Jan 2026 - 31 Mar 2026")
    const dateStr = period.split(' - ')[0].trim();
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    // Subtract 1 day
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  } catch {
    return undefined;
  }
};

// Interface for grouped RFQ set
interface GroupedRFQSet {
  setName: string;
  requiredDate: string;
  items: RFQItem[];
}

// Helper function to group RFQ items by setName
const groupRFQItemsBySet = (items: RFQItem[]): GroupedRFQSet[] => {
  const setMap = new Map<string, GroupedRFQSet>();
  
  for (const item of items) {
    const setName = item.setName || 'Set A';
    
    if (!setMap.has(setName)) {
      setMap.set(setName, {
        setName,
        requiredDate: item.requiredDate || '',
        items: [],
      });
    }
    
    setMap.get(setName)!.items.push(item);
  }
  
  // Sort sets alphabetically by setName
  return Array.from(setMap.values()).sort((a, b) => a.setName.localeCompare(b.setName));
};

interface DeliveryReturnManagementProps {
  onNavigateToDeliveryManagement?: () => void;
}

export default function DeliveryReturnManagement({ 
  onNavigateToDeliveryManagement 
}: DeliveryReturnManagementProps) {
  const [activeTab, setActiveTab] = useState<'delivery' | 'return'>('delivery');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [selectedSet, setSelectedSet] = useState<DeliverySet | null>(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showReturnQuotationModal, setShowReturnQuotationModal] = useState(false);
  const [showPackingListModal, setShowPackingListModal] = useState(false);
  const [showDriverAckModal, setShowDriverAckModal] = useState(false);
  const [showCustomerAckModal, setShowCustomerAckModal] = useState(false);
  const [showPickupTimeModal, setShowPickupTimeModal] = useState(false);
  const [showDOModal, setShowDOModal] = useState(false);
  const [selectedDORequest, setSelectedDORequest] = useState<DeliveryRequest | null>(null);
  const [showScheduleReturnModal, setShowScheduleReturnModal] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState<ReturnRequest | null>(null);
  const [showReturnDetailsModal, setShowReturnDetailsModal] = useState(false);
  const [showViewDOModal, setShowViewDOModal] = useState(false);
  const [selectedViewDO, setSelectedViewDO] = useState<{ request: DeliveryRequest; set: DeliverySet } | null>(null);
  const [showReturnDOModal, setShowReturnDOModal] = useState(false);
  const [showViewReturnDOModal, setShowViewReturnDOModal] = useState(false);
  const [showViewGRNModal, setShowViewGRNModal] = useState(false);

  // Form states
  const [deliveryFee, setDeliveryFee] = useState('');
  const [pickupFee, setPickupFee] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [customerOTP, setCustomerOTP] = useState('');

  // Data state - fetched from API
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create modal states
  const [showCreateDeliveryModal, setShowCreateDeliveryModal] = useState(false);
  const [showCreateReturnModal, setShowCreateReturnModal] = useState(false);
  const [rentalAgreements, setRentalAgreements] = useState<RentalAgreement[]>([]);
  const [scaffoldingItems, setScaffoldingItems] = useState<ScaffoldingItem[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>('');
  const [selectedRfqId, setSelectedRfqId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Create Delivery Form states
  const [newDeliveryForm, setNewDeliveryForm] = useState({
    customerEmail: '',
    deliveryType: 'delivery' as DeliveryType,
  });
  const [deliverySets, setDeliverySets] = useState<{
    setName: string;
    scheduledPeriod: string;
    requiredDate?: Date;
    items: { name: string; quantity: number; scaffoldingItemId: string }[];
  }[]>([{ setName: 'Set A', scheduledPeriod: '', requiredDate: undefined, items: [{ name: '', quantity: 1, scaffoldingItemId: '' }] }]);
  const [selectedSetNames, setSelectedSetNames] = useState<Set<string>>(new Set());

  // Create Return Form states
  const [newReturnForm, setNewReturnForm] = useState({
    setName: '',
    reason: '',
    returnType: 'full' as ReturnType,
    collectionMethod: 'transport' as CollectionMethod,
  });
  const [returnItems, setReturnItems] = useState<{ name: string; quantity: number; scaffoldingItemId: string }[]>([
    { name: '', quantity: 1, scaffoldingItemId: '' },
  ]);
  const [selectedDOSetId, setSelectedDOSetId] = useState<string>(''); // Keep for backward compatibility, will be removed
  const [selectedReturnAgreementId, setSelectedReturnAgreementId] = useState<string>('');
  const [selectedDONumbers, setSelectedDONumbers] = useState<string[]>([]);
  const [selectedReturnSetId, setSelectedReturnSetId] = useState<string>(''); // Keep for backward compatibility
  // Track multiple selected sets with their items
  const [selectedReturnSets, setSelectedReturnSets] = useState<Array<{
    setId: string;
    setName: string;
    items: Array<{ name: string; quantity: number; scaffoldingItemId: string }>;
  }>>([]);

  // Validation error states
  const [deliveryFormErrors, setDeliveryFormErrors] = useState<DeliveryFormErrors>({});
  const [returnFormErrors, setReturnFormErrors] = useState<ReturnFormErrors>({});
  const [deliveryFormTouched, setDeliveryFormTouched] = useState<{
    agreementId?: boolean;
    deliveryType?: boolean;
    sets?: { [setIndex: number]: { requiredDate?: boolean; items?: { [itemIndex: number]: boolean } } };
  }>({});
  const [returnFormTouched, setReturnFormTouched] = useState<{
    agreementId?: boolean;
    doNumber?: boolean;
    deliverySetId?: boolean;
    doSetId?: boolean; // Keep for backward compatibility
    reason?: boolean;
    items?: { [itemIndex: number]: boolean };
  }>({});

  // Modal validation error states
  const [quotationModalErrors, setQuotationModalErrors] = useState<{ deliveryFee?: string; general?: string }>({});
  const [returnQuotationModalErrors, setReturnQuotationModalErrors] = useState<{ pickupFee?: string; general?: string }>({});
  const [driverAckModalErrors, setDriverAckModalErrors] = useState<{ driverName?: string; vehicleNumber?: string; general?: string }>({});
  const [customerAckModalErrors, setCustomerAckModalErrors] = useState<{ otp?: string; general?: string }>({});
  const [pickupTimeModalErrors, setPickupTimeModalErrors] = useState<{ date?: string; time?: string; general?: string }>({});

  // Helper: look up the RFQ linked to a rental agreement from the separately-fetched rfqs state
  const getRfqForAgreement = useCallback((agreementId: string): RFQ | undefined => {
    const agreement = rentalAgreements.find(a => a.id === agreementId);
    if (!agreement?.rfqId) return undefined;
    return rfqs.find(r => r.id === agreement.rfqId);
  }, [rentalAgreements, rfqs]);

  // Helper: get set names already covered by existing delivery requests for a given agreement
  const getUsedSetNames = useCallback((agreementNo: string): Set<string> => {
    const used = new Set<string>();
    deliveryRequests
      .filter(dr => dr.agreementNo === agreementNo)
      .forEach(dr => dr.sets.forEach(s => used.add(s.setName)));
    return used;
  }, [deliveryRequests]);

  // Fetch delivery requests from API
  const fetchDeliveryRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/delivery');
      const data = await response.json();
      if (data.success) {
        setDeliveryRequests(data.deliveryRequests);
      } else {
        console.error('Failed to fetch delivery requests:', data.message);
      }
    } catch (error) {
      console.error('Error fetching delivery requests:', error);
    }
  }, []);

  // Fetch return requests from API
  const fetchReturnRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/return');
      const data = await response.json();
      if (data.success) {
        setReturnRequests(data.returnRequests);
      } else {
        console.error('Failed to fetch return requests:', data.message);
      }
    } catch (error) {
      console.error('Error fetching return requests:', error);
    }
  }, []);

  // Fetch rental agreements for dropdown (Active agreements with linked RFQ)
  const fetchRentalAgreements = useCallback(async () => {
    try {
      // Fetch Active agreements with linked RFQ (items come from the separately-fetched rfqs state)
      const response = await fetch('/api/rental-agreement?status=Active&withRfqOnly=true');
      const data = await response.json();
      if (data.success) {
        // Filter to only include agreements that have a linked RFQ
        const validAgreements = data.agreements.filter(
          (agreement: RentalAgreement) => agreement.rfqId
        );
        setRentalAgreements(validAgreements);
      } else {
        console.error('Failed to fetch rental agreements:', data.message);
      }
    } catch (error) {
      console.error('Error fetching rental agreements:', error);
    }
  }, []);

  // Fetch scaffolding items for dropdown
  const fetchScaffoldingItems = useCallback(async () => {
    try {
      const response = await fetch('/api/scaffolding');
      const data = await response.json();
      if (data.success) {
        setScaffoldingItems(data.data);
      } else {
        console.error('Failed to fetch scaffolding items:', data.message);
      }
    } catch (error) {
      console.error('Error fetching scaffolding items:', error);
    }
  }, []);

  // Fetch all RFQs (items and sets are sourced from here for delivery/return forms)
  const fetchRfqs = useCallback(async () => {
    try {
      const response = await fetch('/api/rfq');
      const data = await response.json();
      if (data.success) {
        setRfqs(data.data);
      } else {
        console.error('Failed to fetch RFQs:', data.message);
      }
    } catch (error) {
      console.error('Error fetching RFQs:', error);
    }
  }, []);

  // Generate request ID based on agreement number (with counter for multiple requests per agreement)
  const generateDeliveryRequestId = (agreementNumber: string) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const existingCount = deliveryRequests.filter(dr => dr.agreementNo === agreementNumber).length;
    const suffix = existingCount > 0 ? `-${existingCount + 1}` : '';
    return `DEL-${agreementNumber}-${date}${suffix}`;
  };

  const generateReturnRequestId = (agreementNo: string) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `RET-${agreementNo}-${date}-${time}`;
  };

  // Validate Delivery Form
  const validateDeliveryForm = (): boolean => {
    const errors: DeliveryFormErrors = {};
    let isValid = true;

    // Validate agreement selection
    if (!selectedAgreementId) {
      errors.agreementId = 'Please select a rental agreement';
      isValid = false;
    } else {
      const rfq = getRfqForAgreement(selectedAgreementId);
      if (!rfq) {
        errors.agreementId = 'Selected agreement must have a linked quotation';
        isValid = false;
      }
    }

    // Validate at least one set is selected
    if (selectedSetNames.size === 0) {
      errors.sets = { ...errors.sets, general: 'Please select at least one set to include in this delivery request' };
      isValid = false;
    }

    // Validate selected sets are not duplicates of existing delivery requests
    const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
    if (agreement) {
      const usedNames = getUsedSetNames(agreement.agreementNumber);
      const duplicates = [...selectedSetNames].filter(name => usedNames.has(name));
      if (duplicates.length > 0) {
        errors.sets = { ...errors.sets, general: `Sets already requested: ${duplicates.join(', ')}` };
        isValid = false;
      }
    }

    // Validate delivery type
    if (!newDeliveryForm.deliveryType) {
      errors.deliveryType = 'Please select a delivery type';
      isValid = false;
    }

    // Validate delivery sets
    const setsErrors: DeliveryFormErrors['sets'] = {};
    let hasValidSet = false;

    deliverySets.forEach((set, setIndex) => {
      // Only validate sets that are selected
      if (!selectedSetNames.has(set.setName)) return;

      const setErrors: NonNullable<DeliveryFormErrors['sets']>[number] = {};
      const itemErrors: NonNullable<NonNullable<DeliveryFormErrors['sets']>[number]['itemErrors']> = {};

      // Validate required date
      if (!set.requiredDate) {
        setErrors.requiredDate = 'Required date is required';
        isValid = false;
      }

      // Validate items
      const hasValidItems = set.items.some(item => item.scaffoldingItemId?.trim());
      if (!hasValidItems) {
        setErrors.items = 'At least one item must be selected';
        isValid = false;
      }

      // Validate individual items
      set.items.forEach((item, itemIndex) => {
        const itemError: { scaffoldingItemId?: string; quantity?: string } = {};
        
        if (item.scaffoldingItemId?.trim() && item.quantity < 1) {
          itemError.quantity = 'Quantity must be at least 1';
          isValid = false;
        }

        // Check if quantity exceeds quoted quantity
        const rfqForValidation = getRfqForAgreement(selectedAgreementId);
        const rfqItems = rfqForValidation?.items || [];
        const quotedItem = rfqItems.find(ri => ri.scaffoldingItemId === item.scaffoldingItemId);
        if (quotedItem && item.quantity > quotedItem.quantity) {
          itemError.quantity = `Quantity cannot exceed quoted amount (${quotedItem.quantity})`;
          isValid = false;
        }

        if (Object.keys(itemError).length > 0) {
          itemErrors[itemIndex] = itemError;
        }
      });

      if (Object.keys(itemErrors).length > 0) {
        setErrors.itemErrors = itemErrors;
      }

      if (Object.keys(setErrors).length > 0) {
        setsErrors[setIndex] = setErrors;
      }

      // Check if this set is valid (has required date and items)
      if (set.requiredDate && hasValidItems) {
        hasValidSet = true;
      }
    });

    if (!hasValidSet && selectedSetNames.size > 0 && !errors.agreementId) {
      errors.general = 'Please complete at least one delivery set with dates and items';
      isValid = false;
    }

    if (Object.keys(setsErrors).length > 0) {
      errors.sets = setsErrors;
    }

    setDeliveryFormErrors(errors);
    return isValid;
  };

  // Clear delivery form error for a specific field
  const clearDeliveryError = (field: keyof DeliveryFormErrors) => {
    setDeliveryFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Clear delivery set error
  const clearDeliverySetError = (setIndex: number, field: string) => {
    setDeliveryFormErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.sets && newErrors.sets[setIndex]) {
        const setErrors = { ...newErrors.sets[setIndex] };
        delete (setErrors as Record<string, unknown>)[field];
        if (Object.keys(setErrors).length === 0) {
          const { [setIndex]: _, ...restSets } = newErrors.sets;
          newErrors.sets = Object.keys(restSets).length > 0 ? restSets : undefined;
        } else {
          newErrors.sets = { ...newErrors.sets, [setIndex]: setErrors };
        }
      }
      return newErrors;
    });
  };

  // Create Delivery Request handler
  const handleCreateDeliveryRequest = async () => {
    // Mark all fields as touched for validation display
    setDeliveryFormTouched({
      agreementId: true,
      deliveryType: true,
      sets: deliverySets.reduce((acc, _, idx) => ({
        ...acc,
        [idx]: { requiredDate: true, items: {} }
      }), {}),
    });

    // Validate the form
    if (!validateDeliveryForm()) {
      return;
    }

    const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
    const rfq = getRfqForAgreement(selectedAgreementId);
    if (!agreement || !rfq) {
      return;
    }

    // Get valid sets: must be selected AND have required data
    const validSets = deliverySets.filter(set => 
      selectedSetNames.has(set.setName) &&
      set.requiredDate &&
      set.items.some(item => item.scaffoldingItemId?.trim())
    );

    setIsCreating(true);
    try {
      const requestId = generateDeliveryRequestId(agreement.agreementNumber);
      
      const response = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          customerName: rfq.customerName,
          agreementNo: agreement.agreementNumber,
          customerPhone: rfq.customerPhone || '',
          customerEmail: rfq.customerEmail,
          deliveryAddress: rfq.projectLocation || '',
          deliveryType: newDeliveryForm.deliveryType,
          rfqId: rfq.id,
          sets: validSets.map(set => ({
            setName: set.setName,
            scheduledPeriod: set.scheduledPeriod,
            items: set.items.filter(item => item.scaffoldingItemId?.trim()).map(item => ({
              name: item.name,
              quantity: item.quantity,
              scaffoldingItemId: item.scaffoldingItemId,
            })),
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchDeliveryRequests();
        setShowCreateDeliveryModal(false);
        setSelectedAgreementId('');
        setNewDeliveryForm({ customerEmail: '', deliveryType: 'delivery' });
        setDeliverySets([{ setName: 'Set A', scheduledPeriod: '', requiredDate: undefined, items: [{ name: '', quantity: 1, scaffoldingItemId: '' }] }]);
        setSelectedSetNames(new Set());
        setDeliveryFormErrors({});
        setDeliveryFormTouched({});
      } else {
        setDeliveryFormErrors({ general: data.message || 'Failed to create delivery request' });
      }
    } catch (error) {
      console.error('Error creating delivery request:', error);
      setDeliveryFormErrors({ general: 'An error occurred while creating the delivery request' });
    } finally {
      setIsCreating(false);
    }
  };

  // Validate Return Form
  const validateReturnForm = (): boolean => {
    const errors: ReturnFormErrors = {};
    let isValid = true;

    // Validate Agreement selection
    if (!selectedReturnAgreementId) {
      errors.agreementId = 'Please select a rental agreement';
      isValid = false;
    }

    // Validate DO selection
    if (selectedDONumbers.length === 0) {
      errors.doNumber = 'Please select a delivery order';
      isValid = false;
    }

    // Validate Set selection (at least one set must be selected)
    if (selectedReturnSets.length === 0) {
      errors.deliverySetId = 'Please select at least one set to return';
      isValid = false;
    }

    // Validate return type
    if (!newReturnForm.returnType) {
      errors.returnType = 'Please select a return type';
      isValid = false;
    }

    // Validate collection method
    if (!newReturnForm.collectionMethod) {
      errors.collectionMethod = 'Please select a collection method';
      isValid = false;
    }

    // Validate reason
    if (!newReturnForm.reason.trim()) {
      errors.reason = 'Please enter a reason for return';
      isValid = false;
    } else if (newReturnForm.reason.length > 500) {
      errors.reason = 'Reason must be 500 characters or less';
      isValid = false;
    }

    // Validate items for all selected sets
    const hasValidItems = selectedReturnSets.some(setData => 
      setData.items.some(item => item.scaffoldingItemId?.trim())
    );
    if (!hasValidItems) {
      errors.items = 'At least one item must be selected for return';
      isValid = false;
    }

    // Validate individual items against returnable quantities
    const itemErrors: ReturnFormErrors['itemErrors'] = {};

    // Validate items for each selected set
    selectedReturnSets.forEach((selectedSetData, setIndex) => {
      const alreadyReturned: Record<string, number> = {};
      returnRequests
        .filter(rr => rr.deliverySetId === selectedSetData.setId)
        .forEach(rr => rr.items.forEach(ri => {
          if (ri.scaffoldingItemId) {
            alreadyReturned[ri.scaffoldingItemId] = (alreadyReturned[ri.scaffoldingItemId] || 0) + ri.quantity;
          }
        }));

      // Find the selected set's original items
      const originalSet = deliveryRequests.flatMap(req =>
        req.sets.filter(set => set.id === selectedSetData.setId).map(set => ({ ...set, parentReq: req }))
      )[0];
      const doItems = originalSet?.items || [];

      // Validate items for this set
      selectedSetData.items.forEach((item, itemIndex) => {
        const itemError: { scaffoldingItemId?: string; quantity?: string } = {};
        
        if (item.scaffoldingItemId?.trim() && item.quantity < 1) {
          itemError.quantity = 'Quantity must be at least 1';
          isValid = false;
        }

        // Check if quantity exceeds returnable quantity
        if (item.scaffoldingItemId?.trim()) {
          const doItem = doItems.find(di => di.scaffoldingItemId === item.scaffoldingItemId);
          const delivered = doItem?.quantity || 0;
          const returned = alreadyReturned[item.scaffoldingItemId] || 0;
          const returnable = delivered - returned;
          if (item.quantity > returnable) {
            itemError.quantity = `Quantity cannot exceed returnable amount (${returnable})`;
            isValid = false;
          }
        }

        if (Object.keys(itemError).length > 0) {
          if (!errors.itemErrors) errors.itemErrors = {};
          // Use a composite key: setIndex-itemIndex
          errors.itemErrors[`${setIndex}-${itemIndex}`] = itemError;
        }
      });
    });


    setReturnFormErrors(errors);
    return isValid;
  };

  // Clear return form error for a specific field
  const clearReturnError = (field: keyof ReturnFormErrors) => {
    setReturnFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Clear return item error
  const clearReturnItemError = (itemKey: string | number) => {
    setReturnFormErrors(prev => {
      if (!prev.itemErrors) return prev;
      const newItemErrors = { ...prev.itemErrors };
      delete newItemErrors[itemKey];
      return {
        ...prev,
        itemErrors: Object.keys(newItemErrors).length > 0 ? newItemErrors : undefined,
      };
    });
  };

  // Create Return Request handler
  const handleCreateReturnRequest = async () => {
    // Mark all fields as touched for validation display
    setReturnFormTouched({
      agreementId: true,
      doNumber: true,
      deliverySetId: true,
      reason: true,
      items: {},
    });

    // Validate the form
    if (!validateReturnForm()) {
      return;
    }

    setIsCreating(true);
    try {
      // Get the parent delivery request (all sets should be from the same agreement/DO)
      const firstSetId = selectedReturnSets[0]?.setId;
      if (!firstSetId) {
        setReturnFormErrors({ general: 'No sets selected' });
        setIsCreating(false);
        return;
      }

      const firstSet = deliveryRequests.flatMap(req =>
        req.sets.filter(set => set.id === firstSetId).map(set => ({ ...set, parentReq: req }))
      )[0];
      if (!firstSet) {
        setReturnFormErrors({ general: 'Selected set not found' });
        setIsCreating(false);
        return;
      }

      const parentReq = firstSet.parentReq;

      // Create return requests for each selected set
      const createPromises = selectedReturnSets.map(async (setData) => {
        const set = deliveryRequests.flatMap(req =>
          req.sets.filter(s => s.id === setData.setId).map(s => ({ set: s, parentReq: req }))
        )[0];
        
        if (!set) {
          throw new Error(`Set ${setData.setId} not found`);
        }

        // Get valid items for this set
        const validItems = setData.items.filter(item => item.scaffoldingItemId?.trim());

        // Generate unique request ID for each set
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const requestId = `RET-${parentReq.agreementNo}-${timestamp}-${randomSuffix}`;

        const response = await fetch('/api/return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            customerName: parentReq.customerName,
            agreementNo: parentReq.agreementNo,
            setName: setData.setName,
            reason: newReturnForm.reason,
            pickupAddress: parentReq.deliveryAddress || '',
            customerPhone: parentReq.customerPhone || '',
            customerEmail: parentReq.customerEmail,
            returnType: newReturnForm.returnType,
            collectionMethod: newReturnForm.collectionMethod,
            deliverySetId: setData.setId,
            items: validItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              scaffoldingItemId: item.scaffoldingItemId,
            })),
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || `Failed to create return request for ${setData.setName}`);
        }
        return data;
      });

      // Wait for all return requests to be created
      await Promise.all(createPromises);

      // Refresh data
      await Promise.all([fetchReturnRequests(), fetchDeliveryRequests()]);
      
      // Reset form
      setShowCreateReturnModal(false);
      setSelectedReturnAgreementId('');
      setSelectedDONumbers([]);
      setSelectedReturnSetId('');
      setSelectedDOSetId(''); // Clear for backward compatibility
      setSelectedReturnSets([]);
      setNewReturnForm({ setName: '', reason: '', returnType: 'full', collectionMethod: 'transport' });
      setReturnItems([{ name: '', quantity: 1, scaffoldingItemId: '' }]);
      setReturnFormErrors({});
      setReturnFormTouched({});
      
      toast.success(`Successfully created ${selectedReturnSets.length} return request(s)`);
    } catch (error) {
      console.error('Error creating return requests:', error);
      setReturnFormErrors({ general: error instanceof Error ? error.message : 'An error occurred while creating the return requests' });
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchDeliveryRequests(), fetchReturnRequests(), fetchRentalAgreements(), fetchScaffoldingItems(), fetchRfqs()]);
      setIsLoading(false);
    };
    fetchData();
  }, [fetchDeliveryRequests, fetchReturnRequests, fetchRentalAgreements, fetchScaffoldingItems, fetchRfqs]);

  // Recalculate selectedReturnSets when returnRequests or deliveryRequests change
  // This ensures returnable quantities are updated after creating return requests
  useEffect(() => {
    if (selectedReturnSets.length === 0 || selectedDONumbers.length === 0) return;

    // Calculate already-returned quantities per delivery set
    const returnedBySet: Record<string, Record<string, number>> = {};
    returnRequests.forEach(rr => {
      if (rr.deliverySetId) {
        if (!returnedBySet[rr.deliverySetId]) returnedBySet[rr.deliverySetId] = {};
        rr.items.forEach(ri => {
          if (ri.scaffoldingItemId) {
            returnedBySet[rr.deliverySetId][ri.scaffoldingItemId] = (returnedBySet[rr.deliverySetId][ri.scaffoldingItemId] || 0) + ri.quantity;
          }
        });
      }
    });

    // Find the selected DO group
    const selectedAgreement = rentalAgreements.find(a => a.id === selectedReturnAgreementId);
    if (!selectedAgreement) return;

    const agreementDeliveryRequests = deliveryRequests.filter(req => req.agreementNo === selectedAgreement.agreementNumber);
    const completedStatuses = ['Completed', 'Customer Confirmed', 'Delivered'];

    // Group sets by DO number
    const doGroups = new Map<string, {
      doNumber: string;
      sets: Array<{
        id: string;
        setName: string;
        items: { name: string; quantity: number; scaffoldingItemId?: string }[];
        status: DeliveryStatus;
      }>;
    }>();

    agreementDeliveryRequests.forEach(req => {
      req.sets
        .filter(set => set.doNumber && completedStatuses.includes(set.status))
        .forEach(set => {
          const doNum = set.doNumber!;
          if (!doGroups.has(doNum)) {
            doGroups.set(doNum, {
              doNumber: doNum,
              sets: [],
            });
          }
          const group = doGroups.get(doNum)!;
          const returned = returnedBySet[set.id] || {};
          const hasReturnable = set.items.some(item => {
            const returnedQty = item.scaffoldingItemId ? (returned[item.scaffoldingItemId] || 0) : 0;
            return item.quantity - returnedQty > 0;
          });
          if (hasReturnable) {
            group.sets.push({
              id: set.id,
              setName: set.setName,
              items: set.items,
              status: set.status,
            });
          }
        });
    });

    const selectedDOGroups = Array.from(doGroups.values()).filter(d => selectedDONumbers.includes(d.doNumber));
    if (selectedDOGroups.length === 0) {
      // If DOs no longer exist or have no returnable items, clear selected sets
      setSelectedReturnSets([]);
      return;
    }

    // Recalculate items for each selected set
    setSelectedReturnSets(prev => {
      return prev
        .map(setData => {
          const originalSet = selectedDOGroups
            .flatMap(group => group.sets)
            .find(s => s.id === setData.setId);
          if (!originalSet) return null; // Set no longer exists

          const returned = returnedBySet[setData.setId] || {};
          const items = originalSet.items
            .map(item => {
              const returnedQty = item.scaffoldingItemId ? (returned[item.scaffoldingItemId] || 0) : 0;
              const returnable = item.quantity - returnedQty;
              return {
                name: item.name,
                quantity: Math.min(setData.items.find(i => i.scaffoldingItemId === item.scaffoldingItemId)?.quantity || returnable, returnable),
                scaffoldingItemId: item.scaffoldingItemId || '',
              };
            })
            .filter(item => {
              const returnedQty = item.scaffoldingItemId ? (returnedBySet[setData.setId]?.[item.scaffoldingItemId] || 0) : 0;
              const originalItem = originalSet.items.find(i => i.scaffoldingItemId === item.scaffoldingItemId);
              const returnable = (originalItem?.quantity || 0) - returnedQty;
              return returnable > 0;
            });

          // If no returnable items left, remove this set
          if (items.length === 0) return null;

          return {
            ...setData,
            items,
          };
        })
        .filter((set): set is NonNullable<typeof set> => set !== null);
    });
  }, [returnRequests, deliveryRequests, selectedReturnAgreementId, selectedDONumbers, rentalAgreements]);

  const getStatusColor = (status: DeliveryStatus | ReturnStatus) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-800';
      case 'Requested': return 'bg-gray-100 text-gray-800';
      case 'Quoted': return 'bg-blue-100 text-blue-800';
      case 'Agreed': return 'bg-green-100 text-green-800';
      case 'Scheduled': return 'bg-purple-100 text-purple-800';
      case 'DO Generated': return 'bg-green-100 text-green-800';
      case 'Confirmed': return 'bg-purple-100 text-purple-800';
      case 'Packing List Issued': return 'bg-indigo-100 text-indigo-800';
      case 'Packing & Loading': return 'bg-yellow-100 text-yellow-800';
      case 'Driver Acknowledged': return 'bg-cyan-100 text-cyan-800';
      case 'In Transit': return 'bg-orange-100 text-orange-800';
      case 'Received': return 'bg-teal-100 text-teal-800';
      case 'Customer Notified': return 'bg-indigo-100 text-indigo-800';
      case 'GRN Generated': return 'bg-green-100 text-green-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Customer Confirmed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleIssueQuotation = (request: DeliveryRequest) => {
    setSelectedRequest(request);
    setSelectedSet(null); // No longer needed for request-level quotation
    setShowQuotationModal(true);
  };

  const handleConfirmQuotation = async () => {
    // Validate delivery fee
    const errors: typeof quotationModalErrors = {};
    let isValid = true;

    if (!deliveryFee) {
      errors.deliveryFee = 'Delivery fee is required';
      isValid = false;
    } else if (isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) < 0) {
      errors.deliveryFee = 'Please enter a valid positive number';
      isValid = false;
    }

    setQuotationModalErrors(errors);

    if (!isValid || !selectedRequest) {
      return;
    }

    try {
      // Update all sets in the request to 'Quoted' status
      const updatePromises = selectedRequest.sets
        .filter(set => set.status !== 'Cancelled')
        .map(set => 
          fetch('/api/delivery', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setId: set.id,
              deliveryFee: parseFloat(deliveryFee),
              status: 'Quoted',
            }),
          })
        );

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      if (results.every(r => r.success)) {
        await fetchDeliveryRequests();
        setShowQuotationModal(false);
        setDeliveryFee('');
        setQuotationModalErrors({});
        toast.success('Quotation issued for all sets in the request');
      } else {
        setQuotationModalErrors({ general: 'Failed to issue quotation for some sets' });
      }
    } catch (error) {
      console.error('Error issuing quotation:', error);
      setQuotationModalErrors({ general: 'An error occurred while issuing quotation' });
    }
  };

  const handleAgreeDeliveryQuotation = async (request: DeliveryRequest, set: DeliverySet) => {
    try {
      const response = await fetch('/api/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: set.id,
          status: 'Confirmed',
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchDeliveryRequests();
        toast.success('Customer agreed to quotation. You can now generate the Delivery Order.');
      } else {
        toast.error('Failed to update status: ' + data.message);
      }
    } catch (error) {
      console.error('Error agreeing to quotation:', error);
      toast.error('An error occurred while updating status');
    }
  };

  const handleDisagreeDeliveryQuotation = async (request: DeliveryRequest, set: DeliverySet) => {
    try {
      const response = await fetch('/api/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: set.id,
          status: 'Pending',
          deliveryFee: null, // Clear the previous quote
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchDeliveryRequests();
        toast.warning('Customer disagreed with quotation. Please issue a new quotation.');
      } else {
        toast.error('Failed to update status: ' + data.message);
      }
    } catch (error) {
      console.error('Error disagreeing quotation:', error);
      toast.error('An error occurred');
    }
  };

  const handleIssueReturnQuotation = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowReturnQuotationModal(true);
  };

  const handleConfirmReturnQuotation = async () => {
    // Validate pickup fee
    const errors: typeof returnQuotationModalErrors = {};
    let isValid = true;

    if (!pickupFee) {
      errors.pickupFee = 'Pickup fee is required';
      isValid = false;
    } else if (isNaN(parseFloat(pickupFee)) || parseFloat(pickupFee) < 0) {
      errors.pickupFee = 'Please enter a valid positive number';
      isValid = false;
    }

    setReturnQuotationModalErrors(errors);

    if (!isValid || !selectedReturnRequest) {
      return;
    }

    try {
      const response = await fetch('/api/return', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReturnRequest.id,
          pickupFee: parseFloat(pickupFee),
          status: 'Quoted',
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchReturnRequests();
        setShowReturnQuotationModal(false);
        setPickupFee('');
        setReturnQuotationModalErrors({});
      } else {
        setReturnQuotationModalErrors({ general: data.message || 'Failed to issue quotation' });
      }
    } catch (error) {
      console.error('Error issuing return quotation:', error);
      setReturnQuotationModalErrors({ general: 'An error occurred while issuing return quotation' });
    }
  };

  const handleAgreeReturnQuotation = async (request: ReturnRequest) => {
    try {
      const response = await fetch('/api/return', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Agreed',
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchReturnRequests();
        toast.success('Customer agreed to return quotation. It is now available in Return Management.');
      } else {
        toast.error('Failed to update status: ' + data.message);
      }
    } catch (error) {
      console.error('Error agreeing to quotation:', error);
      toast.error('An error occurred while updating status');
    }
  };

  const handleDisagreeReturnQuotation = async (request: ReturnRequest) => {
    try {
      const response = await fetch('/api/return', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Requested',
          pickupFee: null, // Clear the previous quote
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchReturnRequests();
        toast.warning('Customer disagreed with quotation. Please issue a new quotation.');
      } else {
        toast.error('Failed to update status: ' + data.message);
      }
    } catch (error) {
      console.error('Error disagreeing quotation:', error);
      toast.error('An error occurred');
    }
  };

  const handleIssuePackingList = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowPackingListModal(true);
  };

  const handleConfirmPackingList = async () => {
    if (selectedRequest && selectedSet) {
      try {
        const response = await fetch('/api/delivery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setId: selectedSet.id,
            packingListIssued: true,
            status: 'Packing List Issued',
          }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchDeliveryRequests();
          setShowPackingListModal(false);
          toast.success('Packing list issued successfully!');
        } else {
          toast.error('Failed to issue packing list: ' + data.message);
        }
      } catch (error) {
        console.error('Error issuing packing list:', error);
        toast.error('An error occurred while issuing packing list');
      }
    }
  };

  const handleUpdatePackingLoading = async (request: DeliveryRequest, set: DeliverySet) => {
    try {
      const response = await fetch('/api/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: set.id,
          status: 'Packing & Loading',
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchDeliveryRequests();
        toast.success('Status updated to Packing & Loading');
      } else {
        toast.error('Failed to update status: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('An error occurred while updating status');
    }
  };

  const handleDriverAcknowledge = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowDriverAckModal(true);
  };

  const handleConfirmDriverAck = async () => {
    // Validate driver details
    const errors: typeof driverAckModalErrors = {};
    let isValid = true;

    if (!driverName?.trim()) {
      errors.driverName = 'Driver name is required';
      isValid = false;
    }

    if (!vehicleNumber?.trim()) {
      errors.vehicleNumber = 'Vehicle number is required';
      isValid = false;
    }

    setDriverAckModalErrors(errors);

    if (!isValid || !selectedRequest || !selectedSet) {
      return;
    }

    try {
      const response = await fetch('/api/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: selectedSet.id,
          driverName: driverName,
          vehicleNumber: vehicleNumber,
          driverAcknowledgedAt: new Date().toISOString(),
          status: 'Driver Acknowledged',
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchDeliveryRequests();
        setShowDriverAckModal(false);
        setDriverName('');
        setVehicleNumber('');
        setDriverAckModalErrors({});
      } else {
        setDriverAckModalErrors({ general: data.message || 'Failed to acknowledge driver' });
      }
    } catch (error) {
      console.error('Error acknowledging driver:', error);
      setDriverAckModalErrors({ general: 'An error occurred while acknowledging driver' });
    }
  };

  const handleCustomerAcknowledge = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowCustomerAckModal(true);
  };

  const handleConfirmCustomerAck = async () => {
    // Validate OTP
    const errors: typeof customerAckModalErrors = {};
    let isValid = true;

    if (!customerOTP?.trim()) {
      errors.otp = 'Please enter the OTP';
      isValid = false;
    } else if (!/^\d{4,6}$/.test(customerOTP)) {
      errors.otp = 'OTP must be 4-6 digits';
      isValid = false;
    }

    setCustomerAckModalErrors(errors);

    if (!isValid || !selectedRequest || !selectedSet) {
      return;
    }

    try {
      const response = await fetch('/api/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: selectedSet.id,
          customerAcknowledgedAt: new Date().toISOString(),
          customerOTP: customerOTP,
          verifiedOTP: true,
          status: 'Customer Confirmed',
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchDeliveryRequests();
        setShowCustomerAckModal(false);
        setCustomerOTP('');
        setCustomerAckModalErrors({});
      } else {
        setCustomerAckModalErrors({ general: data.message || 'Failed to confirm customer' });
      }
    } catch (error) {
      console.error('Error confirming customer:', error);
      setCustomerAckModalErrors({ general: 'An error occurred while confirming customer' });
    }
  };

  const handleConfirmPickupTime = (request: DeliveryRequest) => {
    setSelectedRequest(request);
    setShowPickupTimeModal(true);
  };

  const handleSavePickupTime = async () => {
    // Validate pickup date and time
    const errors: typeof pickupTimeModalErrors = {};
    let isValid = true;

    if (!pickupDate) {
      errors.date = 'Please select a pickup date';
      isValid = false;
    } else {
      // Check if date is not in the past
      const selectedDate = new Date(pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.date = 'Date must be today or later';
        isValid = false;
      }
    }

    if (!pickupTime) {
      errors.time = 'Please select a pickup time';
      isValid = false;
    }

    setPickupTimeModalErrors(errors);

    if (!isValid || !selectedRequest) {
      return;
    }

    try {
      const response = await fetch('/api/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          pickupTime: `${pickupDate} ${pickupTime}`,
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Update all sets to Confirmed status
        for (const set of selectedRequest.sets) {
          await fetch('/api/delivery', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setId: set.id,
              status: 'Confirmed',
            }),
          });
        }
        await fetchDeliveryRequests();
        setShowPickupTimeModal(false);
        setPickupDate('');
        setPickupTime('');
        setPickupTimeModalErrors({});
      } else {
        setPickupTimeModalErrors({ general: data.message || 'Failed to save pickup time' });
      }
    } catch (error) {
      console.error('Error saving pickup time:', error);
      setPickupTimeModalErrors({ general: 'An error occurred while saving pickup time' });
    }
  };

  const handleGenerateDO = (request: DeliveryRequest) => {
    // Open DO Generation Modal/Component for entire request
    setSelectedDORequest(request);
    setSelectedSet(null); // No longer needed for request-level DO
    setShowDOModal(true);
  };

  const handleDOGenerated = async (request: DeliveryRequest) => {
    try {
      // Validate that request has sets
      if (!request || !request.sets || request.sets.length === 0) {
        toast.error('Invalid request: no sets found');
        return;
      }

      // Generate one DO number for the entire request
      const doNumber = `DO-${request.agreementNo}`;
      
      // Check if DO already exists for this request
      const existingDO = request.sets.find(s => s.doNumber === doNumber);
      if (existingDO) {
        toast.error(`DO number ${doNumber} already exists for this request.`);
        return;
      }

      // Get the earliest scheduled period for delivery date calculation
      const allPeriods = request.sets
        .filter(s => s.scheduledPeriod)
        .map(s => s.scheduledPeriod);
      const earliestPeriod = allPeriods.length > 0 ? allPeriods[0] : null;
      const calculatedScheduledDate = earliestPeriod 
        ? calculateScheduledDateFromPeriod(earliestPeriod)
        : new Date().toISOString().split('T')[0];
      
      // Update all sets in the request to 'DO Generated' status with the same DO number
      const updatePromises = request.sets
        .filter(set => set.status !== 'Cancelled')
        .map(set => 
          fetch('/api/delivery', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setId: set.id,
              status: 'DO Generated',
              doNumber: doNumber,
              doStatus: 'pending',
              doIssuedAt: new Date().toISOString(),
              doIssuedBy: 'System',
              deliveryDate: calculatedScheduledDate || set.deliveryDate,
              createdBy: 'System',
            }),
          })
        );

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      if (results.every(r => r.success)) {
        await fetchDeliveryRequests();
        setShowDOModal(false);
        toast.success(`DO ${doNumber} generated successfully for all sets in the request`);
        // Navigate to Delivery Management page
        if (onNavigateToDeliveryManagement) {
          onNavigateToDeliveryManagement();
        }
      } else {
        const failedCount = results.filter(r => !r.success).length;
        toast.error(`Failed to generate DO for ${failedCount} set(s)`);
      }
    } catch (error) {
      console.error('Error generating DO:', error);
      toast.error('An error occurred while generating DO');
    }
  };

  const handleViewDO = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedViewDO({ request, set });
    setShowViewDOModal(true);
  };

  const handleGenerateReturnDO = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowReturnDOModal(true);
  };

  const handleReturnDOGenerated = async (request: ReturnRequest) => {
    try {
      const response = await fetch('/api/return', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Scheduled', // Return DO generated means pickup is scheduled
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchReturnRequests();
        setShowReturnDOModal(false);
        toast.success('Return DO generated successfully!');
      } else {
        toast.error('Failed to generate Return DO: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating Return DO:', error);
      toast.error('An error occurred while generating Return DO');
    }
  };

  const handleViewReturnDO = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowViewReturnDOModal(true);
  };

  // Request-level action function - determines actions for the entire request
  const getRequestNextAction = (request: DeliveryRequest) => {
    // Filter out cancelled sets
    const activeSets = request.sets.filter(s => s.status !== 'Cancelled');
    if (activeSets.length === 0) return null;

    // Pickup: no quotation needed — go straight from Pending to Generate DO
    if (request.deliveryType === 'pickup') {
      const allPending = activeSets.every(s => s.status === 'Pending');
      const allDOGenerated = activeSets.every(s => s.status === 'DO Generated');
      const hasDO = activeSets.some(s => s.doNumber);

      if (allPending) {
        return { label: 'Generate DO', action: () => handleGenerateDO(request), color: 'green' };
      }
      if (allDOGenerated || hasDO) {
        // Use first set for viewing DO (all sets have same DO number)
        return { label: 'View DO', action: () => handleViewDO(request, activeSets[0]), color: 'green', disabled: false };
      }
      return null;
    }

    // Delivery: full quotation workflow — Pending → Quoted → Confirmed → DO Generated
    if (request.deliveryType === 'delivery') {
      const allPending = activeSets.every(s => s.status === 'Pending');
      const allQuoted = activeSets.every(s => s.status === 'Quoted');
      const allConfirmed = activeSets.every(s => s.status === 'Confirmed');
      const allDOGenerated = activeSets.every(s => s.status === 'DO Generated');
      const hasDO = activeSets.some(s => s.doNumber);
      const allAdditionalChargesApproved = activeSets.every(s => 
        s.additionalChargeStatus === 'approved' || !s.additionalChargeStatus
      );

      if (allPending) {
        return { label: 'Issue Quotation', action: () => handleIssueQuotation(request), color: 'blue' };
      }
      if (allQuoted) {
        // For request-level, we need to handle agree/disagree for all sets
        return {
          agree: { 
            label: 'Agree', 
            action: async () => {
              // Agree for all sets
              try {
                const updatePromises = activeSets.map(set =>
                  fetch('/api/delivery', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      setId: set.id,
                      status: 'Confirmed',
                    }),
                  })
                );
                const responses = await Promise.all(updatePromises);
                const results = await Promise.all(responses.map(r => r.json()));
                if (results.every(r => r.success)) {
                  await fetchDeliveryRequests();
                  toast.success('Customer agreed to quotation for all sets. You can now generate the Delivery Order.');
                } else {
                  toast.error('Failed to confirm some sets');
                }
              } catch (error) {
                console.error('Error agreeing to quotation:', error);
                toast.error('An error occurred while agreeing to quotation');
              }
            }, 
            color: 'green' 
          },
          disagree: { 
            label: 'Disagree', 
            action: async () => {
              // Disagree for all sets
              try {
                const updatePromises = activeSets.map(set =>
                  fetch('/api/delivery', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      setId: set.id,
                      status: 'Pending',
                    }),
                  })
                );
                const responses = await Promise.all(updatePromises);
                const results = await Promise.all(responses.map(r => r.json()));
                if (results.every(r => r.success)) {
                  await fetchDeliveryRequests();
                  toast.success('Customer disagreed with quotation. Request reset to Pending.');
                } else {
                  toast.error('Failed to update some sets');
                }
              } catch (error) {
                console.error('Error disagreeing with quotation:', error);
                toast.error('An error occurred while disagreeing with quotation');
              }
            }, 
            color: 'red' 
          },
        };
      }
      if (allConfirmed && allAdditionalChargesApproved) {
        return { label: 'Generate DO', action: () => handleGenerateDO(request), color: 'green' };
      }
      if (allConfirmed && !allAdditionalChargesApproved) {
        return { label: 'Pending Payment Approval', disabled: true, color: 'gray' };
      }
      if (allDOGenerated || hasDO) {
        // Use first set for viewing DO (all sets have same DO number)
        return { label: 'View DO', action: () => handleViewDO(request, activeSets[0]), color: 'green', disabled: false };
      }
      return null;
    }

    return null;
  };

  // Keep old function for backward compatibility (set-level actions removed from UI)
  const getNextAction = (request: DeliveryRequest, set: DeliverySet) => {
    // This function is kept for any remaining set-level operations but won't be used in UI
    return null;
  };

  const getReturnNextAction = (request: ReturnRequest) => {
    switch (request.status) {
      case 'Requested':
        return { label: 'Issue Quotation', action: () => handleIssueReturnQuotation(request), color: 'blue' };
      case 'Quoted':
        return {
          agree: { label: 'Agree', action: () => handleAgreeReturnQuotation(request), color: 'green' },
          disagree: { label: 'Disagree', action: () => handleDisagreeReturnQuotation(request), color: 'red' },
        };
      case 'Agreed':
        // Self-return has no charge — immediately ready for processing
        if (request.collectionMethod === 'self-return' || request.additionalChargeStatus === 'approved') {
          return { label: 'Ready for Processing', disabled: true, color: 'green' };
        }
        // Transport with charge not yet approved
        return { label: 'Pending Payment Approval', disabled: true, color: 'gray' };
      case 'Cancelled':
        return { label: 'Cancelled', disabled: true, color: 'gray' };
      default:
        return null;
    }
  };

  // Helper function to check if a set meets all three conditions (Quoted + Agreed + DO Generated)
  const isSetReadyForDelivery = (set: DeliverySet) => {
    const isQuoted = set.quotedAmount !== null && set.quotedAmount !== undefined;
    const isAgreed = set.status === 'Confirmed' || set.status === 'DO Generated';
    const isDoGenerated = !!set.doNumber;
    return isQuoted && isAgreed && isDoGenerated;
  };

  const filteredDeliveryRequests = deliveryRequests.filter(req => {
    // Search filter
    const matchesSearch = 
      req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.agreementNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Status filter
    if (filterStatus === 'all') return true;
    if (filterStatus === 'ready') {
      // Only show requests where at least one set is ready for delivery (quoted + agreed + DO generated)
      return req.sets.some(set => isSetReadyForDelivery(set));
    }
    // Filter by specific set status
    return req.sets.some(set => set.status === filterStatus);
  });

  const filteredReturnRequests = returnRequests.filter(req =>
    req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.agreementNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#231F20]">Delivery & Return Management</h1>
          <p className="text-gray-600">Manage delivery and return requests with quotation workflow</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'delivery') {
              setShowCreateDeliveryModal(true);
            } else {
              setShowCreateReturnModal(true);
            }
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg transition-colors"
        >
          <Plus className="size-5" />
          <span>Create {activeTab === 'delivery' ? 'Delivery' : 'Return'} Request</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('delivery')}
          className={`pb-3 px-4 ${
            activeTab === 'delivery'
              ? 'border-b-2 border-[#F15929] text-[#F15929]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Truck className="size-5" />
            <span>Delivery Requests</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`pb-3 px-4 ${
            activeTab === 'return'
              ? 'border-b-2 border-[#F15929] text-[#F15929]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Package className="size-5" />
            <span>Return Requests</span>
          </div>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
          <input
            type="text"
            placeholder="Search by customer, request ID, or agreement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
          />
        </div>
        {activeTab === 'delivery' && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] bg-white"
          >
            <option value="all">All Status</option>
            <option value="ready">Ready for Delivery (Quoted + Agreed + DO)</option>
            <option value="Pending">Pending</option>
            <option value="Quoted">Quoted</option>
            <option value="Confirmed">Confirmed (Agreed)</option>
            <option value="DO Generated">DO Generated</option>
          </select>
        )}
      </div>

      {/* Delivery Requests Tab */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="size-8 animate-spin text-[#F15929]" />
              <span className="ml-3 text-gray-600">Loading delivery requests...</span>
            </div>
          ) : filteredDeliveryRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Truck className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No delivery requests found</p>
            </div>
          ) : filteredDeliveryRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              {/* Request Header */}
              <div className="flex items-start justify-between pb-4 border-b">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg text-[#231F20]">{request.requestId}</h3>
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Delivery
                    </span>
                    {request.sets.some(s => s.doNumber) && (
                      <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-300">
                        DO: {request.sets.find(s => s.doNumber)?.doNumber}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="size-4" />
                      <span>{request.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <FileText className="size-4" />
                      <span>{request.agreementNo}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Phone className="size-4" />
                      <span>{request.customerPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="size-4" />
                      <span>{request.deliveryAddress}</span>
                    </div>
                  </div>
                </div>
                {/* Request-Level Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  {(() => {
                    const nextAction = getRequestNextAction(request);
                    if (!nextAction) return null;
                    
                    // Check if it's the quoted state with agree/disagree options
                    if ('agree' in nextAction && 'disagree' in nextAction) {
                      return (
                        <>
                          <button
                          onClick={nextAction.agree.action}
                          className="px-4 py-2 rounded-lg text-sm text-white"
                          style={{ backgroundColor: '#10b981' }}
                        >
                          {nextAction.agree.label}
                        </button>
                        <button
                          onClick={nextAction.disagree.action}
                          className="px-4 py-2 rounded-lg text-sm text-white"
                          style={{ backgroundColor: '#ef4444' }}
                        >
                          {nextAction.disagree.label}
                        </button>
                      </>
                      );
                    }
                    
                    // Single action button
                    return (
                      <button
                        onClick={nextAction.action}
                        disabled={nextAction.disabled}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          nextAction.disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'text-white'
                        }`}
                        style={{
                          backgroundColor: nextAction.disabled ? undefined : 
                            nextAction.color === 'blue' ? '#3b82f6' :
                            nextAction.color === 'indigo' ? '#6366f1' :
                            nextAction.color === 'yellow' ? '#eab308' :
                            nextAction.color === 'cyan' ? '#06b6d4' :
                            nextAction.color === 'green' ? '#10b981' :
                            nextAction.color === 'gray' ? '#9ca3af' : '#3b82f6'
                        }}
                      >
                        {nextAction.label}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Sets */}
              <div className="space-y-4">
                <h4 className="text-sm text-gray-500">Sets ({request.sets.filter(s => ['Completed', 'Customer Confirmed', 'Delivered'].includes(s.status)).length}/{request.sets.length} delivered)</h4>
                {request.sets.map((set, index) => (
                  <div key={set.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3">
                          <h5 className="text-[#231F20]">{set.setName}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(set.status)}`}>
                            {set.status}
                          </span>
                          {set.doNumber && (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-300">
                              DO: {set.doNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Period: {set.scheduledPeriod}</p>
                        {set.doNumber && (
                          <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                            <FileText className="size-4" />
                            <span>Delivery Order: <strong>{set.doNumber}</strong> generated</span>
                          </div>
                        )}
                        
                        {/* Items */}
                        <div className="bg-gray-50 rounded p-3 space-y-1">
                          <p className="text-xs text-gray-500">Items:</p>
                          {set.items.map((item, idx) => (
                            <p key={idx} className="text-sm text-gray-700">
                              • {item.name} - Qty: {item.quantity}
                            </p>
                          ))}
                        </div>

                        {/* Pricing */}
                        {set.quotedAmount && (
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">
                              Rental: <span className="text-[#F15929]">RM {set.quotedAmount.toLocaleString()}</span>
                            </span>
                            {set.deliveryFee && (
                              <span className="text-gray-600">
                                Delivery Fee: <span className="text-[#F15929]">RM {set.deliveryFee.toLocaleString()}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return Requests Tab */}
      {activeTab === 'return' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="size-8 animate-spin text-[#F15929]" />
              <span className="ml-3 text-gray-600">Loading return requests...</span>
            </div>
          ) : filteredReturnRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No return requests found</p>
            </div>
          ) : filteredReturnRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg text-[#231F20]">{request.requestId}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <User className="size-4" />
                      <span>{request.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="size-4" />
                      <span>{request.agreementNo}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="size-4" />
                      <span>{request.setName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="size-4" />
                      <span>{request.pickupAddress}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-gray-50 rounded p-3 space-y-1">
                    <p className="text-xs text-gray-500">Items to be returned:</p>
                    {request.items.map((item, idx) => (
                      <p key={idx} className="text-sm text-gray-700">
                        • {item.name} - Qty: {item.quantity}
                      </p>
                    ))}
                  </div>

                  {/* Pickup Fee */}
                  {request.pickupFee && (
                    <div className="text-sm">
                      <span className="text-gray-600">
                        Pickup Fee: <span className="text-[#F15929]">RM {request.pickupFee.toLocaleString()}</span>
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-gray-600">Reason: {request.reason}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CalendarIcon className="size-4" />
                    {request.scheduledDate ? (
                      <span>Scheduled: {request.scheduledDate}</span>
                    ) : (
                      <span>Requested: {request.requestDate}</span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center space-x-2">
                  {(() => {
                    const nextAction = getReturnNextAction(request);
                    if (!nextAction) return null;
                    
                    // Check if it's the quoted state with agree/disagree options
                    if ('agree' in nextAction && 'disagree' in nextAction) {
                      return (
                        <>
                          <button
                            onClick={nextAction.agree.action}
                            className="px-4 py-2 rounded-lg text-sm text-white"
                            style={{ backgroundColor: '#10b981' }}
                          >
                            {nextAction.agree.label}
                          </button>
                          <button
                            onClick={nextAction.disagree.action}
                            className="px-4 py-2 rounded-lg text-sm text-white"
                            style={{ backgroundColor: '#ef4444' }}
                          >
                            {nextAction.disagree.label}
                          </button>
                        </>
                      );
                    }
                    
                    // Single action button (existing logic)
                    return (
                      <button
                        onClick={nextAction.action}
                        disabled={nextAction.disabled}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          nextAction.disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : `bg-${nextAction.color}-500 hover:bg-${nextAction.color}-600 text-white`
                        }`}
                        style={{
                          backgroundColor: nextAction.disabled ? undefined : 
                            nextAction.color === 'blue' ? '#3b82f6' :
                            nextAction.color === 'green' ? '#10b981' :
                            nextAction.color === 'gray' ? '#9ca3af' : '#3b82f6'
                        }}
                      >
                        {nextAction.label}
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => {
                      setSelectedReturnRequest(request);
                      setShowReturnDetailsModal(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <FileText className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quotation Modal for Delivery */}
      {showQuotationModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Issue Quotation & Delivery Fee</h3>
            
            {quotationModalErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{quotationModalErrors.general}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Request: {selectedRequest.requestId}</p>
                <p className="text-sm text-gray-600">Customer: {selectedRequest.customerName}</p>
                <p className="text-sm text-gray-600">Sets: {selectedRequest.sets.filter(s => s.status !== 'Cancelled').map(s => s.setName).join(', ')}</p>
              </div>
              <div>
                <label className={`block text-sm mb-2 ${quotationModalErrors.deliveryFee ? 'text-red-600' : 'text-gray-700'}`}>
                  Delivery Fee (RM) *
                </label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => {
                    setDeliveryFee(e.target.value);
                    if (e.target.value) setQuotationModalErrors(prev => ({ ...prev, deliveryFee: undefined }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    quotationModalErrors.deliveryFee ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter delivery fee"
                />
                {quotationModalErrors.deliveryFee && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {quotationModalErrors.deliveryFee}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Note: Sets are quoted sequentially. Set B will only be quoted after Set A is completed, unless customer requests early rental or extension.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowQuotationModal(false);
                  setDeliveryFee('');
                  setQuotationModalErrors({});
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuotation}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg"
              >
                Issue Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Modal for Return */}
      {showReturnQuotationModal && selectedReturnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Issue Return Pickup Quotation</h3>
            
            {returnQuotationModalErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{returnQuotationModalErrors.general}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Request ID: {selectedReturnRequest.requestId}</p>
                <p className="text-sm text-gray-600">Set: {selectedReturnRequest.setName}</p>
                <p className="text-sm text-gray-600">Pickup Address: {selectedReturnRequest.pickupAddress}</p>
              </div>
              <div>
                <label className={`block text-sm mb-2 ${returnQuotationModalErrors.pickupFee ? 'text-red-600' : 'text-gray-700'}`}>
                  Pickup/Transportation Fee (RM) *
                </label>
                <input
                  type="number"
                  value={pickupFee}
                  onChange={(e) => {
                    setPickupFee(e.target.value);
                    if (e.target.value) setReturnQuotationModalErrors(prev => ({ ...prev, pickupFee: undefined }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    returnQuotationModalErrors.pickupFee ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter pickup fee for vehicle"
                />
                {returnQuotationModalErrors.pickupFee && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {returnQuotationModalErrors.pickupFee}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Quote the transportation fee for sending a vehicle to pick up the returned items from the customer site.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReturnQuotationModal(false);
                  setPickupFee('');
                  setReturnQuotationModalErrors({});
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturnQuotation}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg"
              >
                Issue Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Details Modal */}
      {showReturnDetailsModal && selectedReturnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Return Request Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500">Request ID</label>
                <p className="text-sm text-gray-900">{selectedReturnRequest.requestId}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Customer Name</label>
                <p className="text-sm text-gray-900">{selectedReturnRequest.customerName}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Agreement Number</label>
                <p className="text-sm text-gray-900">{selectedReturnRequest.agreementNo}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Set Name</label>
                <p className="text-sm text-gray-900">{selectedReturnRequest.setName}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Pickup Address</label>
                <p className="text-sm text-gray-900">{selectedReturnRequest.pickupAddress}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Request Date</label>
                <p className="text-sm text-gray-900">{selectedReturnRequest.requestDate}</p>
              </div>
              {selectedReturnRequest.scheduledDate && (
                <div>
                  <label className="block text-sm text-gray-500">Scheduled Return Date</label>
                  <p className="text-sm text-gray-900">{selectedReturnRequest.scheduledDate}</p>
                </div>
              )}
              {selectedReturnRequest.pickupFee && (
                <div>
                  <label className="block text-sm text-gray-500">Pickup Fee</label>
                  <p className="text-sm text-gray-900">RM {selectedReturnRequest.pickupFee.toLocaleString()}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-500">Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-xs ${getStatusColor(selectedReturnRequest.status)}`}>
                  {selectedReturnRequest.status}
                </span>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Reason for Return</label>
                <p className="text-sm text-gray-900">{selectedReturnRequest.reason}</p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowReturnDetailsModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DO Generation Modal for Delivery */}
      {showDOModal && selectedDORequest && (
        <DeliveryOrderGeneration
          requestId={selectedDORequest.requestId}
          customerName={selectedDORequest.customerName}
          agreementNo={selectedDORequest.agreementNo}
          setDetails={{
            setName: `All Sets (${selectedDORequest.sets.length})`,
            items: selectedDORequest.sets.flatMap(set => 
              set.items.map(item => ({ ...item, unit: 'pcs' }))
            )
          }}
          deliveryAddress={selectedDORequest.deliveryAddress}
          deliveryDate={new Date().toISOString().split('T')[0]}
          scheduledPeriod={selectedDORequest.sets[0]?.scheduledPeriod || ''}
          customerPhone={selectedDORequest.customerPhone}
          customerEmail={selectedDORequest.customerEmail}
          onClose={() => {
            handleDOGenerated(selectedDORequest);
          }}
        />
      )}

      {/* View DO Modal for Delivery */}
      {showViewDOModal && selectedViewDO && (
        <DeliveryOrderGeneration
          requestId={selectedViewDO.request.requestId}
          customerName={selectedViewDO.request.customerName}
          agreementNo={selectedViewDO.request.agreementNo}
          setDetails={{
            setName: selectedViewDO.set.setName,
            items: selectedViewDO.set.items.map(item => ({ ...item, unit: 'pcs' }))
          }}
          deliveryAddress={selectedViewDO.request.deliveryAddress}
          deliveryDate={selectedViewDO.set.deliveryDate || new Date().toISOString().split('T')[0]}
          scheduledPeriod={selectedViewDO.set.scheduledPeriod}
          customerPhone={selectedViewDO.request.customerPhone}
          customerEmail={selectedViewDO.request.customerEmail}
          onClose={() => setShowViewDOModal(false)}
        />
      )}

      {/* DO Generation Modal for Return */}
      {showReturnDOModal && selectedReturnRequest && (
        <DeliveryOrderGeneration
          requestId={selectedReturnRequest.requestId}
          customerName={selectedReturnRequest.customerName}
          agreementNo={selectedReturnRequest.agreementNo}
          setDetails={{
            setName: selectedReturnRequest.setName,
            items: selectedReturnRequest.items.map(item => ({ ...item, unit: 'pcs' }))
          }}
          deliveryAddress={selectedReturnRequest.pickupAddress}
          deliveryDate={new Date().toISOString().split('T')[0]}
          customerPhone={selectedReturnRequest.customerPhone}
          customerEmail={selectedReturnRequest.customerEmail}
          onClose={() => {
            handleReturnDOGenerated(selectedReturnRequest);
          }}
        />
      )}

      {/* View DO Modal for Return */}
      {showViewReturnDOModal && selectedReturnRequest && (
        <DeliveryOrderGeneration
          requestId={selectedReturnRequest.requestId}
          customerName={selectedReturnRequest.customerName}
          agreementNo={selectedReturnRequest.agreementNo}
          setDetails={{
            setName: selectedReturnRequest.setName,
            items: selectedReturnRequest.items.map(item => ({ ...item, unit: 'pcs' }))
          }}
          deliveryAddress={selectedReturnRequest.pickupAddress}
          deliveryDate={selectedReturnRequest.scheduledDate || new Date().toISOString().split('T')[0]}
          customerPhone={selectedReturnRequest.customerPhone}
          customerEmail={selectedReturnRequest.customerEmail}
          onClose={() => setShowViewReturnDOModal(false)}
        />
      )}

      {/* Create Delivery Request Modal */}
      {showCreateDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8 mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-[#231F20]">Create Delivery Request</h3>
            
            {/* General Error Message */}
            {deliveryFormErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{deliveryFormErrors.general}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Rental Agreement Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Rental Agreement *</label>
                <select
                  value={selectedAgreementId}
                  onChange={(e) => {
                    const agreementId = e.target.value;
                    setSelectedAgreementId(agreementId);
                    clearDeliveryError('agreementId');
                    
                    // Auto-populate delivery sets from RFQ
                    const linkedRfq = rfqs.find(r => {
                      const agr = rentalAgreements.find(a => a.id === agreementId);
                      return agr?.rfqId ? r.id === agr.rfqId : false;
                    });
                    if (linkedRfq?.items && linkedRfq.items.length > 0) {
                      // Group items by setName and create delivery sets
                      const groupedSets = groupRFQItemsBySet(linkedRfq.items);
                      
                      const autoSets = groupedSets.map(group => {
                        const requiredDate = group.requiredDate ? new Date(group.requiredDate) : undefined;
                        
                        // Format scheduled period string from required date
                        const scheduledPeriod = requiredDate && !isNaN(requiredDate.getTime())
                          ? format(requiredDate, 'd MMM yyyy')
                          : '';
                        
                        return {
                          setName: group.setName,
                          scheduledPeriod,
                          requiredDate,
                          items: group.items.map(item => ({
                            name: item.scaffoldingItemName,
                            quantity: item.quantity,
                            scaffoldingItemId: item.scaffoldingItemId,
                          })),
                        };
                      });
                      
                      setDeliverySets(autoSets.length > 0 ? autoSets : [{ setName: 'Set A', scheduledPeriod: '', requiredDate: undefined, items: [{ name: '', quantity: 1, scaffoldingItemId: '' }] }]);

                      // Pre-select only the sets not already used
                      const agr = rentalAgreements.find(a => a.id === agreementId);
                      const usedNames = agr ? getUsedSetNames(agr.agreementNumber) : new Set<string>();
                      setSelectedSetNames(new Set(autoSets.map(s => s.setName).filter(n => !usedNames.has(n))));
                    } else {
                      // Reset to default if no RFQ items
                      setDeliverySets([{ setName: 'Set A', scheduledPeriod: '', requiredDate: undefined, items: [{ name: '', quantity: 1, scaffoldingItemId: '' }] }]);
                      setSelectedSetNames(new Set());
                    }
                    // Clear set errors when agreement changes
                    setDeliveryFormErrors(prev => ({ ...prev, sets: undefined }));
                  }}
                  onBlur={() => setDeliveryFormTouched(prev => ({ ...prev, agreementId: true }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    deliveryFormErrors.agreementId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select Rental Agreement --</option>
                  {(() => {
                    return rentalAgreements
                      .filter((agreement) => {
                        // Only hide if ALL RFQ sets are already covered by existing delivery requests
                        const linkedRfq = rfqs.find(r => agreement.rfqId ? r.id === agreement.rfqId : false);
                        if (!linkedRfq?.items?.length) return true; // show agreements without RFQ items
                        const rfqSetNames = new Set(groupRFQItemsBySet(linkedRfq.items).map(g => g.setName));
                        const usedNames = getUsedSetNames(agreement.agreementNumber);
                        return ![...rfqSetNames].every(name => usedNames.has(name));
                      })
                      .map((agreement) => (
                        <option key={agreement.id} value={agreement.id}>
                          {agreement.agreementNumber} - {agreement.hirer} ({agreement.projectName})
                        </option>
                      ));
                  })()}
                </select>
                {deliveryFormErrors.agreementId && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {deliveryFormErrors.agreementId}
                  </p>
                )}
                {rentalAgreements.length === 0 && !deliveryFormErrors.agreementId && (
                  <p className="text-xs text-amber-600 mt-1">
                    No active rental agreements with quotations available. Please create an active rental agreement with a linked quotation first.
                  </p>
                )}
              </div>

              {/* Auto-populated fields (read-only display) */}
              {selectedAgreementId && (() => {
                const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
                const rfq = getRfqForAgreement(selectedAgreementId);
                if (!agreement || !rfq) return null;
                return (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-500 font-medium">Auto-populated from Agreement & Quotation:</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <span className="text-gray-500">Agreement Number:</span>
                        <span className="ml-2 text-gray-900 font-semibold">{agreement.agreementNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Customer Name:</span>
                        <span className="ml-2 text-gray-900">{rfq.customerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 text-gray-900">{rfq.customerEmail}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 text-gray-900">{rfq.customerPhone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Project:</span>
                        <span className="ml-2 text-gray-900">{rfq.projectName}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Delivery Address:</span>
                        <span className="ml-2 text-gray-900">{rfq.projectLocation || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Request ID:</span>
                        <span className="ml-2 text-gray-900 font-mono">
                          DEL-{agreement.agreementNumber}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                        </span>
                      </div>
                    </div>
                    {/* Show available items from RFQ */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-500 font-medium mb-2">Available Items from Quotation:</p>
                      <div className="space-y-1">
                        {rfq.items.map((item, idx) => (
                          <p key={idx} className="text-sm text-gray-700">
                            • {item.scaffoldingItemName} - Qty: {item.quantity} {item.unit}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Delivery Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Type *</label>
                <select
                  value={newDeliveryForm.deliveryType}
                  onChange={(e) => {
                    setNewDeliveryForm({ ...newDeliveryForm, deliveryType: e.target.value as DeliveryType });
                    clearDeliveryError('deliveryType');
                  }}
                  onBlur={() => setDeliveryFormTouched(prev => ({ ...prev, deliveryType: true }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    deliveryFormErrors.deliveryType ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="delivery">Delivery (Company delivers to customer)</option>
                  <option value="pickup">Pickup (Customer picks up from company)</option>
                </select>
                {deliveryFormErrors.deliveryType && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {deliveryFormErrors.deliveryType}
                  </p>
                )}
              </div>

              {/* Sets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Delivery Sets *</label>
                </div>
                {deliveryFormErrors.sets?.general && (
                  <p className="text-xs text-red-600 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {deliveryFormErrors.sets.general}
                  </p>
                )}

                {deliverySets.map((set, setIndex) => {
                  const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
                  const usedNames = agreement ? getUsedSetNames(agreement.agreementNumber) : new Set<string>();
                  const isAlreadyUsed = usedNames.has(set.setName);
                  const isSelected = selectedSetNames.has(set.setName);
                  const isDisabled = isAlreadyUsed || !isSelected;

                  return (
                  <div key={setIndex} className={`border rounded-lg p-4 space-y-3 ${isAlreadyUsed ? 'border-gray-200 bg-gray-50 opacity-60' : isSelected ? 'border-gray-200' : 'border-gray-200 opacity-50'}`}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isAlreadyUsed}
                        onChange={() => {
                          setSelectedSetNames(prev => {
                            const next = new Set(prev);
                            if (next.has(set.setName)) {
                              next.delete(set.setName);
                            } else {
                              next.add(set.setName);
                            }
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[#F15929] focus:ring-[#F15929]"
                      />
                      <h5 className="font-medium text-gray-700">{set.setName}</h5>
                      {isAlreadyUsed && (
                        <span className="text-xs text-gray-500 italic">(Already requested)</span>
                      )}
                    </div>

                    {/* Required Date (read-only, auto-populated from RFQ) */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Required Date *</label>
                      <input
                        type="text"
                        value={set.requiredDate ? format(set.requiredDate, 'd MMM yyyy') : 'No date set'}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                      />
                    </div>

                    {/* Items in Set - only show items from selected agreement's RFQ */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className={`block text-xs ${deliveryFormErrors.sets?.[setIndex]?.items ? 'text-red-600' : 'text-gray-500'}`}>
                          Items from Quotation *
                        </label>
                      </div>
                      {deliveryFormErrors.sets?.[setIndex]?.items && (
                        <p className="text-xs text-red-600 flex items-center">
                          <AlertCircle className="size-3 mr-1" />
                          {deliveryFormErrors.sets[setIndex].items}
                        </p>
                      )}
                      {set.items.map((item, itemIndex) => {
                        const rfqForItems = getRfqForAgreement(selectedAgreementId);
                        const rfqItems = rfqForItems?.items || [];
                        const itemError = deliveryFormErrors.sets?.[setIndex]?.itemErrors?.[itemIndex];
                        
                        return (
                          <div key={itemIndex} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={item.name ? `${item.name} (Quoted: ${rfqItems.find(ri => ri.scaffoldingItemId === item.scaffoldingItemId)?.quantity ?? ''} ${rfqItems.find(ri => ri.scaffoldingItemId === item.scaffoldingItemId)?.unit ?? ''})` : ''}
                                readOnly
                                disabled
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100 ${
                                  itemError?.scaffoldingItemId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              />
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={() => {}}
                                className={`w-24 px-3 py-2 border rounded-lg text-sm text-center disabled:bg-gray-100 ${
                                  itemError?.quantity ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="Qty"
                                disabled
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!selectedAgreementId && (
                        <p className="text-xs text-gray-500 italic">
                          Please select a rental agreement first to see available items
                        </p>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreateDeliveryModal(false);
                  setSelectedAgreementId('');
                  setNewDeliveryForm({ customerEmail: '', deliveryType: 'delivery' });
                  setDeliverySets([{ setName: 'Set A', scheduledPeriod: '', requiredDate: undefined, items: [{ name: '', quantity: 1, scaffoldingItemId: '' }] }]);
                  setSelectedSetNames(new Set());
                  setDeliveryFormErrors({});
                  setDeliveryFormTouched({});
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDeliveryRequest}
                disabled={isCreating}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCreating && <Loader className="size-4 animate-spin" />}
                <span>Create Delivery Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Return Request Modal */}
      {showCreateReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8 mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-[#231F20]">Create Return Request</h3>
            
            {/* General Error Message */}
            {returnFormErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{returnFormErrors.general}</p>
              </div>
            )}

            <div className="space-y-4">
              {(() => {
                // Derive available DOs: delivery sets with a DO number and delivered/completed status
                const completedStatuses = ['Completed', 'Customer Confirmed', 'Delivered'];
                
                // Calculate already-returned quantities per delivery set
                const returnedBySet: Record<string, Record<string, number>> = {};
                returnRequests.forEach(rr => {
                  if (rr.deliverySetId) {
                    if (!returnedBySet[rr.deliverySetId]) returnedBySet[rr.deliverySetId] = {};
                    rr.items.forEach(ri => {
                      if (ri.scaffoldingItemId) {
                        returnedBySet[rr.deliverySetId][ri.scaffoldingItemId] = (returnedBySet[rr.deliverySetId][ri.scaffoldingItemId] || 0) + ri.quantity;
                      }
                    });
                  }
                });

                // Step 1: Filter agreements that have completed delivery orders
                const agreementsWithCompletedDOs = rentalAgreements.filter(agreement => {
                  return deliveryRequests.some(req => 
                    req.agreementNo === agreement.agreementNumber &&
                    req.sets.some(set => {
                      if (!set.doNumber || !completedStatuses.includes(set.status)) return false;
                      const returned = returnedBySet[set.id] || {};
                      return set.items.some(item => {
                        const returnedQty = item.scaffoldingItemId ? (returned[item.scaffoldingItemId] || 0) : 0;
                        return item.quantity - returnedQty > 0;
                      });
                    })
                  );
                });

                // Step 2: Get selected agreement
                const selectedAgreement = rentalAgreements.find(a => a.id === selectedReturnAgreementId);

                // Step 3: Filter delivery requests by selected agreement and group by DO number
                const agreementDeliveryRequests = selectedAgreement
                  ? deliveryRequests.filter(req => req.agreementNo === selectedAgreement.agreementNumber)
                  : [];

                // Group sets by DO number
                const doGroups = new Map<string, {
                  doNumber: string;
                  sets: Array<{
                    id: string;
                    setName: string;
                    items: { name: string; quantity: number; scaffoldingItemId?: string }[];
                    status: DeliveryStatus;
                  }>;
                  customerName: string;
                  agreementNo: string;
                  deliveryAddress: string;
                  customerPhone: string;
                  customerEmail: string;
                }>();

                agreementDeliveryRequests.forEach(req => {
                  req.sets
                    .filter(set => set.doNumber && completedStatuses.includes(set.status))
                    .forEach(set => {
                      const doNum = set.doNumber!;
                      if (!doGroups.has(doNum)) {
                        doGroups.set(doNum, {
                          doNumber: doNum,
                          sets: [],
                          customerName: req.customerName,
                          agreementNo: req.agreementNo,
                          deliveryAddress: req.deliveryAddress,
                          customerPhone: req.customerPhone,
                          customerEmail: req.customerEmail,
                        });
                      }
                      const group = doGroups.get(doNum)!;
                      // Check if DO has returnable items
                      const returned = returnedBySet[set.id] || {};
                      const hasReturnable = set.items.some(item => {
                        const returnedQty = item.scaffoldingItemId ? (returned[item.scaffoldingItemId] || 0) : 0;
                        return item.quantity - returnedQty > 0;
                      });
                      if (hasReturnable) {
                        group.sets.push({
                          id: set.id,
                          setName: set.setName,
                          items: set.items,
                          status: set.status,
                        });
                      }
                    });
                });

                // Filter out DOs where all sets have no returnable items
                const availableDOs = Array.from(doGroups.values()).filter(doGroup => doGroup.sets.length > 0);

                // Step 4: Get selected DOs and their sets
                const selectedDOGroups = availableDOs.filter(d => selectedDONumbers.includes(d.doNumber));

                return (
                  <>
                    {/* Step 1: Rental Agreement Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Rental Agreement *</label>
                      <select
                        value={selectedReturnAgreementId}
                        onChange={(e) => {
                          const agreementId = e.target.value;
                          setSelectedReturnAgreementId(agreementId);
                          setSelectedDONumbers([]); // Reset DO selection
                          setSelectedReturnSetId(''); // Reset Set selection
                          setSelectedReturnSets([]); // Clear all selected sets
                          setReturnItems([{ name: '', quantity: 1, scaffoldingItemId: '' }]);
                          clearReturnError('agreementId');
                          clearReturnError('doNumber');
                          clearReturnError('deliverySetId');
                          clearReturnError('items');
                        }}
                        onBlur={() => setReturnFormTouched(prev => ({ ...prev, agreementId: true }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                          returnFormErrors.agreementId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">-- Select Rental Agreement --</option>
                        {agreementsWithCompletedDOs.map((agreement) => (
                          <option key={agreement.id} value={agreement.id}>
                            {agreement.agreementNumber} - {agreement.projectName}
                          </option>
                        ))}
                      </select>
                      {returnFormErrors.agreementId && (
                        <p className="text-xs text-red-600 mt-1 flex items-center">
                          <AlertCircle className="size-3 mr-1" />
                          {returnFormErrors.agreementId}
                        </p>
                      )}
                      {agreementsWithCompletedDOs.length === 0 && !returnFormErrors.agreementId && (
                        <p className="text-xs text-amber-600 mt-1">
                          No rental agreements with completed delivery orders available for return.
                        </p>
                      )}
                    </div>

                    {/* Step 2: DO Selection (only shown after agreement is selected) */}
                    {selectedReturnAgreementId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Delivery Order *</label>
                        <div
                          className={`border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto ${
                            returnFormErrors.doNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                        >
                          {availableDOs.map((doGroup) => {
                            const isSelected = selectedDONumbers.includes(doGroup.doNumber);
                            return (
                              <label
                                key={doGroup.doNumber}
                                className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDONumbers(prev => [...prev, doGroup.doNumber]);
                                    } else {
                                      setSelectedDONumbers(prev => prev.filter(n => n !== doGroup.doNumber));
                                      // Remove sets from the deselected DO
                                      setSelectedReturnSets(prev =>
                                        prev.filter(s => !doGroup.sets.some(set => set.id === s.setId))
                                      );
                                    }
                                    setSelectedReturnSetId(''); // Reset Set selection
                                    clearReturnError('doNumber');
                                    clearReturnError('deliverySetId');
                                    clearReturnError('items');
                                  }}
                                  onBlur={() => setReturnFormTouched(prev => ({ ...prev, doNumber: true }))}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900">{doGroup.doNumber}</div>
                                  <div className="text-xs text-gray-500">
                                    {doGroup.customerName} • {doGroup.sets.length} set(s)
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {returnFormErrors.doNumber && (
                          <p className="text-xs text-red-600 mt-1 flex items-center">
                            <AlertCircle className="size-3 mr-1" />
                            {returnFormErrors.doNumber}
                          </p>
                        )}
                        {availableDOs.length === 0 && !returnFormErrors.doNumber && (
                          <p className="text-xs text-amber-600 mt-1">
                            No completed delivery orders available for this agreement.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 3: Set Selection (only shown after DO is selected) - Multi-select with checkboxes */}
                    {selectedDONumbers.length > 0 && selectedDOGroups.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Sets to Return *</label>
                        <div className={`border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto ${
                          returnFormErrors.deliverySetId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}>
                          {selectedDOGroups.flatMap(group =>
                            group.sets.map(set => ({ ...set, doNumber: group.doNumber }))
                          ).map((set) => {
                            const isSelected = selectedReturnSets.some(s => s.setId === set.id);
                            const returned = returnedBySet[set.id] || {};
                            
                            // Calculate returnable items for this set
                            const returnableItems = set.items
                              .map(item => {
                                const returnedQty = item.scaffoldingItemId ? (returned[item.scaffoldingItemId] || 0) : 0;
                                const returnable = item.quantity - returnedQty;
                                return { ...item, returnable };
                              })
                              .filter(item => item.returnable > 0);
                            
                            const hasReturnableItems = returnableItems.length > 0;
                            
                            return (
                              <label 
                                key={set.id} 
                                className={`flex items-start space-x-3 p-2 rounded ${
                                  hasReturnableItems 
                                    ? 'hover:bg-gray-50 cursor-pointer' 
                                    : 'opacity-50 cursor-not-allowed bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={!hasReturnableItems}
                                  onChange={(e) => {
                                    if (e.target.checked && hasReturnableItems) {
                                      // Add set with returnable items
                                      const items = returnableItems.map(item => ({
                                        name: item.name,
                                        quantity: item.returnable,
                                        scaffoldingItemId: item.scaffoldingItemId || '',
                                      }));
                                      
                                      setSelectedReturnSets(prev => [...prev, {
                                        setId: set.id,
                                        setName: set.setName,
                                        items: items,
                                      }]);
                                    } else {
                                      // Remove set
                                      setSelectedReturnSets(prev => prev.filter(s => s.setId !== set.id));
                                    }
                                    clearReturnError('deliverySetId');
                                    clearReturnError('items');
                                  }}
                                  onBlur={() => setReturnFormTouched(prev => ({ ...prev, deliverySetId: true }))}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className={`font-medium text-sm ${hasReturnableItems ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {set.setName} <span className="text-xs text-gray-400">({set.doNumber})</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {hasReturnableItems 
                                      ? `${returnableItems.length} returnable item(s) of ${set.items.length} total`
                                      : 'All items fully returned'
                                    }
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {returnFormErrors.deliverySetId && (
                          <p className="text-xs text-red-600 mt-1 flex items-center">
                            <AlertCircle className="size-3 mr-1" />
                            {returnFormErrors.deliverySetId}
                          </p>
                        )}
                        {selectedReturnSets.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            {selectedReturnSets.length} set(s) selected
                          </p>
                        )}
                      </div>
                    )}

                    {/* Auto-populated fields and items for all selected sets */}
                    {selectedReturnSets.length > 0 && selectedDOGroups.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 font-medium mb-2">Delivery Order Information:</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="col-span-2">
                              <span className="text-gray-500">DO Number:</span>
                              <span className="ml-2 text-gray-900 font-semibold">
                                {selectedDOGroups.map(d => d.doNumber).join(', ')}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Agreement No:</span>
                              <span className="ml-2 text-gray-900">{selectedDOGroups[0]?.agreementNo}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Customer Name:</span>
                              <span className="ml-2 text-gray-900">{selectedDOGroups[0]?.customerName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Email:</span>
                              <span className="ml-2 text-gray-900">{selectedDOGroups[0]?.customerEmail}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <span className="ml-2 text-gray-900">{selectedDOGroups[0]?.customerPhone || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Pickup Address:</span>
                              <span className="ml-2 text-gray-900">{selectedDOGroups[0]?.deliveryAddress || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Show items for each selected set */}
                        {selectedReturnSets.map((setData, setIndex) => {
                          const originalSet = selectedDOGroups
                            .flatMap(group => group.sets)
                            .find(s => s.id === setData.setId);
                          const returned = returnedBySet[setData.setId] || {};
                          
                          // Recalculate returnable items dynamically based on current returnedBySet data
                          const returnableItems = originalSet?.items
                            .map(item => {
                              const returnedQty = item.scaffoldingItemId ? (returned[item.scaffoldingItemId] || 0) : 0;
                              const returnable = item.quantity - returnedQty;
                              return {
                                ...item,
                                returnable,
                                returnedQty,
                              };
                            })
                            .filter(item => item.returnable > 0) || [];
                          
                          // If no returnable items left, show message
                          if (returnableItems.length === 0) {
                            return (
                              <div key={setData.setId} className="border-t border-gray-200 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-gray-900">{setData.setName}</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReturnSets(prev => prev.filter(s => s.setId !== setData.setId));
                                      clearReturnError('deliverySetId');
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                  <p className="text-xs text-amber-700">
                                    All items in this set have been fully returned. Please remove this set.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={setData.setId} className="border-t border-gray-200 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-900">{setData.setName}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReturnSets(prev => prev.filter(s => s.setId !== setData.setId));
                                    clearReturnError('deliverySetId');
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="space-y-2">
                                {returnableItems.map((item, itemIndex) => {
                                  const delivered = item.quantity;
                                  const returnable = item.returnable;
                                  // Find the corresponding item in setData.items to get the current quantity input value
                                  const setDataItem = setData.items.find(i => i.scaffoldingItemId === item.scaffoldingItemId);
                                  const currentQuantity = setDataItem?.quantity || returnable;
                                  // Use a stable index based on scaffoldingItemId for error lookup
                                  const itemErrorKey = setData.items.findIndex(i => i.scaffoldingItemId === item.scaffoldingItemId);
                                  const itemError = returnFormErrors.itemErrors?.[`${setIndex}-${itemErrorKey}`];
                                  
                                  return (
                                    <div key={item.scaffoldingItemId || itemIndex} className="flex items-center space-x-2">
                                      <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700">
                                        {item.name || 'Unknown item'}
                                        <span className="text-xs text-gray-500 ml-2">(Returnable: {returnable} / {delivered})</span>
                                      </div>
                                      <input
                                        type="number"
                                        min="1"
                                        max={returnable || 1}
                                        value={currentQuantity}
                                        onChange={(e) => {
                                          const updated = [...selectedReturnSets];
                                          const itemIdx = updated[setIndex].items.findIndex(i => i.scaffoldingItemId === item.scaffoldingItemId);
                                          if (itemIdx >= 0) {
                                            updated[setIndex].items[itemIdx].quantity = Math.min(parseInt(e.target.value) || 1, returnable);
                                            setSelectedReturnSets(updated);
                                            clearReturnItemError(`${setIndex}-${itemIdx}`);
                                          }
                                        }}
                                        className={`w-24 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] text-sm text-center disabled:bg-gray-100 ${
                                          itemError?.quantity ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                        }`}
                                        placeholder="Qty"
                                        disabled={newReturnForm.returnType === 'full'}
                                      />
                                      {itemError?.quantity && (
                                        <p className="text-xs text-red-600">
                                          {itemError.quantity}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Return Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Return Type *</label>
                      <select
                        value={newReturnForm.returnType}
                        onChange={(e) => {
                          const newReturnType = e.target.value as ReturnType;
                          setNewReturnForm({ ...newReturnForm, returnType: newReturnType });
                          
                          // If switching to "full", set all quantities to returnable amounts
                          if (newReturnType === 'full' && selectedDOGroups.length > 0) {
                            setSelectedReturnSets(prev => prev.map(setData => {
                              const originalSet = selectedDOGroups
                                .flatMap(group => group.sets)
                                .find(s => s.id === setData.setId);
                              const returned = returnedBySet[setData.setId] || {};
                              const items = originalSet?.items.map(item => {
                                const returnedQty = item.scaffoldingItemId ? (returned[item.scaffoldingItemId] || 0) : 0;
                                const returnable = item.quantity - returnedQty;
                                return {
                                  name: item.name,
                                  quantity: returnable,
                                  scaffoldingItemId: item.scaffoldingItemId || '',
                                };
                              }).filter(item => item.quantity > 0) || [];
                              
                              return {
                                ...setData,
                                items: items,
                              };
                            }));
                          }
                          
                          clearReturnError('returnType');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                          returnFormErrors.returnType ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="full">Full Return (All remaining items)</option>
                        <option value="partial">Partial Return (Some items)</option>
                      </select>
                      {returnFormErrors.returnType && (
                        <p className="text-xs text-red-600 mt-1 flex items-center">
                          <AlertCircle className="size-3 mr-1" />
                          {returnFormErrors.returnType}
                        </p>
                      )}
                    </div>

                    {/* Collection Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Collection Method *</label>
                      <select
                        value={newReturnForm.collectionMethod}
                        onChange={(e) => {
                          setNewReturnForm({ ...newReturnForm, collectionMethod: e.target.value as CollectionMethod });
                          clearReturnError('collectionMethod');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                          returnFormErrors.collectionMethod ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="transport">Transport (Company picks up)</option>
                        <option value="self-return">Self Return (Customer delivers)</option>
                      </select>
                      {returnFormErrors.collectionMethod && (
                        <p className="text-xs text-red-600 mt-1 flex items-center">
                          <AlertCircle className="size-3 mr-1" />
                          {returnFormErrors.collectionMethod}
                        </p>
                      )}
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Return *</label>
                      <textarea
                        value={newReturnForm.reason}
                        onChange={(e) => {
                          setNewReturnForm({ ...newReturnForm, reason: e.target.value });
                          if (e.target.value.trim()) {
                            clearReturnError('reason');
                          }
                        }}
                        onBlur={() => setReturnFormTouched(prev => ({ ...prev, reason: true }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                          returnFormErrors.reason ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        rows={3}
                        placeholder="Enter reason for return..."
                      />
                      <div className="flex justify-between items-center mt-1">
                        {returnFormErrors.reason ? (
                          <p className="text-xs text-red-600 flex items-center">
                            <AlertCircle className="size-3 mr-1" />
                            {returnFormErrors.reason}
                          </p>
                        ) : (
                          <span />
                        )}
                        <span className={`text-xs ${newReturnForm.reason.length > 500 ? 'text-red-600' : 'text-gray-400'}`}>
                          {newReturnForm.reason.length}/500
                        </span>
                      </div>
                    </div>

                    {/* Items validation message */}
                    {returnFormErrors.items && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs text-red-600 flex items-center">
                          <AlertCircle className="size-3 mr-1" />
                          {returnFormErrors.items}
                        </p>
                      </div>
                    )}
                    {selectedReturnSets.length === 0 && selectedDONumbers.length > 0 && (
                      <p className="text-xs text-gray-500 italic">
                        Please select at least one set to return
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreateReturnModal(false);
                  setSelectedReturnAgreementId('');
                  setSelectedDONumbers([]);
                  setSelectedReturnSetId('');
                  setSelectedDOSetId(''); // Clear for backward compatibility
                  setSelectedReturnSets([]);
                  setNewReturnForm({ setName: '', reason: '', returnType: 'full', collectionMethod: 'transport' });
                  setReturnItems([{ name: '', quantity: 1, scaffoldingItemId: '' }]);
                  setReturnFormErrors({});
                  setReturnFormTouched({});
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReturnRequest}
                disabled={isCreating}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCreating && <Loader className="size-4 animate-spin" />}
                <span>Create Return Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Acknowledgement Modal */}
      {showDriverAckModal && selectedRequest && selectedSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Driver Acknowledgement</h3>
            
            {driverAckModalErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{driverAckModalErrors.general}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Set: {selectedSet.setName}</p>
                <p className="text-sm text-gray-600">Customer: {selectedRequest.customerName}</p>
              </div>
              <div>
                <label className={`block text-sm mb-2 ${driverAckModalErrors.driverName ? 'text-red-600' : 'text-gray-700'}`}>
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => {
                    setDriverName(e.target.value);
                    if (e.target.value.trim()) setDriverAckModalErrors(prev => ({ ...prev, driverName: undefined }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    driverAckModalErrors.driverName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter driver name"
                />
                {driverAckModalErrors.driverName && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {driverAckModalErrors.driverName}
                  </p>
                )}
              </div>
              <div>
                <label className={`block text-sm mb-2 ${driverAckModalErrors.vehicleNumber ? 'text-red-600' : 'text-gray-700'}`}>
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => {
                    setVehicleNumber(e.target.value);
                    if (e.target.value.trim()) setDriverAckModalErrors(prev => ({ ...prev, vehicleNumber: undefined }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    driverAckModalErrors.vehicleNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="ABC 1234"
                />
                {driverAckModalErrors.vehicleNumber && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {driverAckModalErrors.vehicleNumber}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDriverAckModal(false);
                  setDriverName('');
                  setVehicleNumber('');
                  setDriverAckModalErrors({});
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDriverAck}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Acknowledgement Modal */}
      {showCustomerAckModal && selectedRequest && selectedSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Customer Acknowledgement</h3>
            
            {customerAckModalErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{customerAckModalErrors.general}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Set: {selectedSet.setName}</p>
                <p className="text-sm text-gray-600">Customer: {selectedRequest.customerName}</p>
                <p className="text-sm text-gray-600">DO Number: {selectedSet.doNumber || 'N/A'}</p>
              </div>
              <div>
                <label className={`block text-sm mb-2 ${customerAckModalErrors.otp ? 'text-red-600' : 'text-gray-700'}`}>
                  Enter OTP *
                </label>
                <input
                  type="text"
                  value={customerOTP}
                  onChange={(e) => {
                    setCustomerOTP(e.target.value);
                    if (/^\d{4,6}$/.test(e.target.value)) setCustomerAckModalErrors(prev => ({ ...prev, otp: undefined }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    customerAckModalErrors.otp ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter 4-6 digit OTP"
                  maxLength={6}
                />
                {customerAckModalErrors.otp && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {customerAckModalErrors.otp}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Enter the OTP received by the customer to confirm delivery acknowledgement.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCustomerAckModal(false);
                  setCustomerOTP('');
                  setCustomerAckModalErrors({});
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCustomerAck}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Time Confirmation Modal */}
      {showPickupTimeModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Confirm Pickup Time</h3>
            
            {pickupTimeModalErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{pickupTimeModalErrors.general}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Customer: {selectedRequest.customerName}</p>
                <p className="text-sm text-gray-600">Agreement: {selectedRequest.agreementNo}</p>
              </div>
              <div>
                <label className={`block text-sm mb-2 ${pickupTimeModalErrors.date ? 'text-red-600' : 'text-gray-700'}`}>
                  Pickup Date *
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => {
                    setPickupDate(e.target.value);
                    if (e.target.value) setPickupTimeModalErrors(prev => ({ ...prev, date: undefined }));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    pickupTimeModalErrors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {pickupTimeModalErrors.date && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {pickupTimeModalErrors.date}
                  </p>
                )}
              </div>
              <div>
                <label className={`block text-sm mb-2 ${pickupTimeModalErrors.time ? 'text-red-600' : 'text-gray-700'}`}>
                  Pickup Time *
                </label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => {
                    setPickupTime(e.target.value);
                    if (e.target.value) setPickupTimeModalErrors(prev => ({ ...prev, time: undefined }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] ${
                    pickupTimeModalErrors.time ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {pickupTimeModalErrors.time && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="size-3 mr-1" />
                    {pickupTimeModalErrors.time}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPickupTimeModal(false);
                  setPickupDate('');
                  setPickupTime('');
                  setPickupTimeModalErrors({});
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePickupTime}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg"
              >
                Confirm Pickup Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}