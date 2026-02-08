import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Check, PackageCheck, Calendar as CalendarIcon,
  ClipboardCheck, Truck, FileSignature, Upload, X, Image as ImageIcon,
  ArrowRight, User, Phone, MapPin, AlertCircle, Download, FileText, CheckCircle2,
  Loader2, PackageX, Eye, AlertTriangle, Package
} from 'lucide-react';
import { uploadReturnPhotos } from '@/lib/upload';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollableTimePicker } from '../ui/scrollable-time-picker';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { GRNViewer } from './GRNViewer';
import { RCFViewer } from './RCFViewer';

export type ItemConditionStatus = 'Good' | 'Repair' | 'Replace';

export interface StatusBreakdown {
  Good: number;
  Repair: number;
  Replace: number;
}

export interface ReturnItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  quantityReturned: number;
  status: ItemConditionStatus; // Primary/majority status for display
  statusBreakdown?: StatusBreakdown; // Detailed breakdown by quantity
  notes?: string;
}

interface ReturnPhoto {
  url: string;
  uploadedAt: string;
  description: string;
  uploadedBy?: string;
}

export interface Return {
  id: string;
  orderId: string;
  grnNumber?: string;
  rcfNumber?: string;
  customer: string;
  customerContact?: string;
  pickupAddress?: string;
  returnType: 'Partial' | 'Full';
  transportationType: 'Self Return' | 'Transportation Needed';
  items: ReturnItem[];
  requestDate: string;
  status: 
    | 'Requested' 
    | 'Approved' 
    | 'Pickup Scheduled'
    | 'Pickup Confirmed'
    | 'Driver Recording'
    | 'In Transit' 
    | 'Received at Warehouse'
    | 'Under Inspection'
    | 'Sorting Complete'
    | 'Customer Notified'
    | 'Dispute Raised'
    | 'Completed';
  driverRecordPhotos?: ReturnPhoto[];
  warehousePhotos?: ReturnPhoto[];
  damagePhotos?: ReturnPhoto[];
  externalGoodsPhotos?: ReturnPhoto[];
  productionNotes?: string;
  customerNotificationSent?: boolean;
  customerDispute?: {
    raised: boolean;
    description: string;
    raisedAt: string;
    resolved: boolean;
  };
  hasExternalGoods?: boolean;
  externalGoodsNotes?: string;
  inventoryUpdated?: boolean;
  soaUpdated?: boolean;
  pickupDate?: string;
  pickupTimeSlot?: string;
  pickupDriver?: string;
  driverContact?: string;
}

interface ReturnWorkflowProps {
  returnOrder: Return | null;
  onSave: (returnOrder: Return) => Promise<void>;
  onBack: () => void;
}

export function ReturnWorkflow({ returnOrder, onSave, onBack }: ReturnWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Return>>(returnOrder || {
    items: [],
    status: 'Requested',
    returnType: 'Full',
    transportationType: 'Self Return',
    requestDate: new Date().toISOString(),
    orderId: '',
  });

  // Pickup scheduling
  const [pickupDate, setPickupDate] = useState<Date>();
  const [pickupTimeSlot, setPickupTimeSlot] = useState('');
  
  // Photos
  const [driverPhotos, setDriverPhotos] = useState<string[]>([]);
  const [warehousePhotos, setWarehousePhotos] = useState<string[]>([]);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [externalGoodsPhotos, setExternalGoodsPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalGoodsFileInputRef = useRef<HTMLInputElement>(null);
  
  // Inspection
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [hasExternalGoods, setHasExternalGoods] = useState(false);
  const [externalGoodsNotes, setExternalGoodsNotes] = useState('');
  
  // Item statuses for inspection - now supports quantity breakdown
  const [itemStatusBreakdowns, setItemStatusBreakdowns] = useState<Record<string, StatusBreakdown>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  
  // RCF Dialog
  const [isRCFDialogOpen, setIsRCFDialogOpen] = useState(false);
  
  // Document Viewers
  const [showGRNViewer, setShowGRNViewer] = useState(false);
  const [showRCFViewer, setShowRCFViewer] = useState(false);
  
  // Saving state for API persistence
  const [isSaving, setIsSaving] = useState(false);

  // Validation error states for each step
  const [step1Errors, setStep1Errors] = useState<{
    pickupDate?: string;
    pickupTimeSlot?: string;
  }>({});

  const [step2Errors, setStep2Errors] = useState<{
    pickupDriver?: string;
    driverContact?: string;
  }>({});

  const [step3Errors, setStep3Errors] = useState<{
    photos?: string;
  }>({});

  const [step4Errors, setStep4Errors] = useState<{
    photos?: string;
  }>({});

  const [step5Errors, setStep5Errors] = useState<{
    items?: { [itemId: string]: string };
    externalGoodsNotes?: string;
    externalGoodsPhotos?: string;
    damagePhotos?: string;
    general?: string;
  }>({});

  useEffect(() => {
    if (returnOrder) {
      setFormData(returnOrder);
      // Set current step based on status and transportation type
      // Transportation Needed has 8 steps, Self Return has 6 steps
      const isTransportNeeded = returnOrder.transportationType === 'Transportation Needed';
      
      const statusToStep: Record<Return['status'], number> = {
        'Requested': 1,
        'Approved': isTransportNeeded ? 2 : 2,
        'Pickup Scheduled': 2,
        'Pickup Confirmed': 3,
        'Driver Recording': 3,
        'In Transit': 4,  // After driver recording, items are in transit → step 4 (Receive at Warehouse)
        'Received at Warehouse': isTransportNeeded ? 5 : 3,
        'Under Inspection': isTransportNeeded ? 5 : 3,
        'Sorting Complete': isTransportNeeded ? 6 : 4,
        'Customer Notified': isTransportNeeded ? 7 : 5,
        'Dispute Raised': isTransportNeeded ? 7 : 5,
        'Completed': isTransportNeeded ? 8 : 6,
      };
      
      // Determine the correct step based on status and document/action completion progress
      // The status represents the current state, but we need to advance if the action for that state is complete
      let mappedStep = statusToStep[returnOrder.status] || 1;
      
      // If GRN exists and status is 'Under Inspection', inspection is complete → advance to RCF step
      if (returnOrder.status === 'Under Inspection' && returnOrder.grnNumber) {
        mappedStep = isTransportNeeded ? 6 : 4;
      }
      
      // If RCF exists and status is 'Sorting Complete', RCF is complete → advance to Customer Notification step
      if (returnOrder.status === 'Sorting Complete' && returnOrder.rcfNumber) {
        mappedStep = isTransportNeeded ? 7 : 5;
      }
      
      // If customer notification sent and status is 'Customer Notified' → advance to Complete step
      if (returnOrder.status === 'Customer Notified' && returnOrder.customerNotificationSent) {
        mappedStep = isTransportNeeded ? 8 : 6;
      }
      
      setCurrentStep(mappedStep);
      
      // Pre-fill dates and time slot from existing data
      if (returnOrder.pickupDate) {
        setPickupDate(new Date(returnOrder.pickupDate));
      } else if (returnOrder.transportationType === 'Transportation Needed' && returnOrder.status === 'Requested') {
        // Auto-fill with default date (3 days from today) for new requests
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        setPickupDate(defaultDate);
      }
      
      if (returnOrder.pickupTimeSlot) {
        setPickupTimeSlot(returnOrder.pickupTimeSlot);
      } else if (returnOrder.transportationType === 'Transportation Needed' && returnOrder.status === 'Requested') {
        // Auto-fill with default time (12:00) for new requests
        setPickupTimeSlot('12:00');
      }
      
      // Pre-fill item statuses with breakdown
      const breakdowns: Record<string, StatusBreakdown> = {};
      const notes: Record<string, string> = {};
      returnOrder.items?.forEach(item => {
        // If item has existing breakdown, use it; otherwise create from status
        if (item.statusBreakdown) {
          breakdowns[item.id] = item.statusBreakdown;
        } else {
          // Initialize with all quantity as the current status, or Good if pending
          breakdowns[item.id] = {
            'Good': item.status === 'Good' ? item.quantityReturned : 0,
            'Repair': item.status === 'Repair' ? item.quantityReturned : 0,
            'Replace': item.status === 'Replace' ? item.quantityReturned : 0,
          };
        }
        if (item.notes) notes[item.id] = item.notes;
      });
      setItemStatusBreakdowns(breakdowns);
      setItemNotes(notes);
      
      if (returnOrder.productionNotes) {
        setInspectionNotes(returnOrder.productionNotes);
      }
      if (returnOrder.hasExternalGoods) {
        setHasExternalGoods(returnOrder.hasExternalGoods);
      }
      if (returnOrder.externalGoodsNotes) {
        setExternalGoodsNotes(returnOrder.externalGoodsNotes);
      }
      if (returnOrder.externalGoodsPhotos) {
        setExternalGoodsPhotos(
          Array.isArray(returnOrder.externalGoodsPhotos)
            ? returnOrder.externalGoodsPhotos.map((p: string | { url: string }) => typeof p === 'string' ? p : p.url)
            : []
        );
      }
      if (returnOrder.damagePhotos) {
        setDamagePhotos(
          Array.isArray(returnOrder.damagePhotos)
            ? returnOrder.damagePhotos.map((p: string | { url: string }) => typeof p === 'string' ? p : p.url)
            : []
        );
      }
    }
  }, [returnOrder]);

  // Steps depend on transportation type
  const getSteps = () => {
    if (formData.transportationType === 'Transportation Needed') {
      return [
        { number: 1, title: 'Schedule Date & Time' },
        { number: 2, title: 'Confirm Pickup' },
        { number: 3, title: 'Driver Recording' },
        { number: 4, title: 'Receive at Warehouse' },
        { number: 5, title: 'Inspection & GRN' },
        { number: 6, title: 'Generate RCF' },
        { number: 7, title: 'Notify Customer' },
        { number: 8, title: 'Complete' },
      ];
    } else {
      return [
        { number: 1, title: 'Approve Return' },
        { number: 2, title: 'Receive at Warehouse' },
        { number: 3, title: 'Inspection & GRN' },
        { number: 4, title: 'Generate RCF' },
        { number: 5, title: 'Notify Customer' },
        { number: 6, title: 'Complete' },
      ];
    }
  };

  const steps = getSteps();

  // Validate Step 1: Schedule Pickup
  const validateStep1 = (): boolean => {
    const errors: typeof step1Errors = {};
    let isValid = true;

    if (formData.transportationType === 'Transportation Needed') {
      if (!pickupDate) {
        errors.pickupDate = 'Please select a pickup date';
        isValid = false;
      }
      
      if (!pickupTimeSlot) {
        errors.pickupTimeSlot = 'Please select a pickup time';
        isValid = false;
      }
    }

    setStep1Errors(errors);
    return isValid;
  };

  // Clear Step 1 error for a specific field
  const clearStep1Error = (field: keyof typeof step1Errors) => {
    setStep1Errors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleApproveAndSchedule = async () => {
    if (formData.transportationType === 'Transportation Needed') {
      // Validate Step 1
      if (!validateStep1()) {
        return;
      }
      
      const finalTimeSlot = pickupTimeSlot;
      
      const updatedData = {
        ...formData,
        status: 'Pickup Scheduled' as const,
        pickupDate: pickupDate!.toISOString(),
        pickupTimeSlot: finalTimeSlot,
      };
      setFormData(updatedData);
      
      setIsSaving(true);
      try {
        await onSave(updatedData as Return); // Save to database
        toast.success('Return approved and pickup scheduled');
        setStep1Errors({});
        setCurrentStep(2);
      } catch {
        toast.error('Failed to save. Please try again.');
      } finally {
        setIsSaving(false);
      }
    } else {
      const updatedData = {
        ...formData,
        status: 'Approved' as const,
      };
      setFormData(updatedData);
      
      setIsSaving(true);
      try {
        await onSave(updatedData as Return); // Save to database
        toast.success('Return approved - awaiting customer self-return');
        setCurrentStep(2);
      } catch {
        toast.error('Failed to save. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Validate Step 2: Confirm Pickup
  const validateStep2 = (): boolean => {
    const errors: typeof step2Errors = {};
    let isValid = true;

    if (!formData.pickupDriver?.trim()) {
      errors.pickupDriver = 'Driver name is required';
      isValid = false;
    }

    if (!formData.driverContact?.trim()) {
      errors.driverContact = 'Driver contact is required';
      isValid = false;
    } else {
      // Optional phone format validation
      const phoneRegex = /^[\d\s+\-()]+$/;
      if (!phoneRegex.test(formData.driverContact)) {
        errors.driverContact = 'Invalid phone number format';
        isValid = false;
      }
    }

    setStep2Errors(errors);
    return isValid;
  };

  // Clear Step 2 error for a specific field
  const clearStep2Error = (field: keyof typeof step2Errors) => {
    setStep2Errors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleConfirmPickup = async () => {
    if (!validateStep2()) {
      return;
    }
    
    const updatedData = {
      ...formData,
      status: 'Pickup Confirmed' as const,
    };
    setFormData(updatedData);
    
    setIsSaving(true);
    try {
      await onSave(updatedData as Return); // Save to database
      toast.success('Pickup confirmed');
      setStep2Errors({});
      setCurrentStep(3);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate Step 3: Driver Recording
  const validateStep3 = (): boolean => {
    const errors: typeof step3Errors = {};
    let isValid = true;

    if (driverPhotos.length === 0) {
      errors.photos = 'Please upload at least one photo of the goods';
      isValid = false;
    }

    setStep3Errors(errors);
    return isValid;
  };

  // Clear Step 3 error
  const clearStep3Error = () => {
    setStep3Errors({});
  };

  const handleDriverRecording = async () => {
    if (!validateStep3()) {
      return;
    }
    
    const photos: ReturnPhoto[] = driverPhotos.map((url, index) => ({
      url,
      uploadedAt: new Date().toISOString(),
      description: `Driver photo ${index + 1}`,
      uploadedBy: formData.pickupDriver || 'Driver',
    }));
    
    const updatedData = {
      ...formData,
      driverRecordPhotos: photos,
      status: 'In Transit' as const,
    };
    setFormData(updatedData);
    
    setIsSaving(true);
    try {
      await onSave(updatedData as Return); // Save to database
      toast.success('Driver recording saved - items in transit');
      setStep3Errors({});
      setCurrentStep(4);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate Step 4/2: Receive at Warehouse
  const validateStep4 = (): boolean => {
    const errors: typeof step4Errors = {};
    let isValid = true;

    if (warehousePhotos.length === 0) {
      errors.photos = 'Please upload at least one photo of received goods';
      isValid = false;
    }

    setStep4Errors(errors);
    return isValid;
  };

  // Clear Step 4 error
  const clearStep4Error = () => {
    setStep4Errors({});
  };

  const handleReceiveAtWarehouse = async () => {
    if (!validateStep4()) {
      return;
    }
    
    const photos: ReturnPhoto[] = warehousePhotos.map((url, index) => ({
      url,
      uploadedAt: new Date().toISOString(),
      description: `Warehouse photo ${index + 1}`,
      uploadedBy: 'Warehouse Staff',
    }));
    
    const updatedData = {
      ...formData,
      warehousePhotos: photos,
      status: 'Received at Warehouse' as const,
    };
    setFormData(updatedData);
    
    setIsSaving(true);
    try {
      await onSave(updatedData as Return); // Save to database
      toast.success('Goods received at warehouse');
      setStep4Errors({});
      
      if (formData.transportationType === 'Transportation Needed') {
        setCurrentStep(5);
      } else {
        setCurrentStep(3);
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get primary status from breakdown (highest quantity)
  const getPrimaryStatus = (breakdown: StatusBreakdown): ItemConditionStatus => {
    const entries = Object.entries(breakdown) as [ItemConditionStatus, number][];
    const nonZero = entries.filter(([_, qty]) => qty > 0);
    if (nonZero.length === 0) return 'Good';
    // Return the status with highest quantity
    return nonZero.reduce((a, b) => a[1] >= b[1] ? a : b)[0];
  };

  // Helper to validate breakdown totals match returned quantity
  const validateBreakdown = (breakdown: StatusBreakdown, expectedTotal: number): boolean => {
    const total = Object.values(breakdown).reduce((sum, qty) => sum + qty, 0);
    return total === expectedTotal;
  };

  // Validate Step 5/3: Inspection & GRN
  const validateStep5 = (): boolean => {
    const errors: typeof step5Errors = {};
    const itemErrors: { [itemId: string]: string } = {};
    let isValid = true;

    // Validate all items have breakdown that totals to quantityReturned
    formData.items?.forEach(item => {
      const breakdown = itemStatusBreakdowns[item.id];
      if (!breakdown) {
        itemErrors[item.id] = 'No status set';
        isValid = false;
      } else {
        const total = Object.values(breakdown).reduce((sum, qty) => sum + qty, 0);
        if (total !== item.quantityReturned) {
          itemErrors[item.id] = `Total (${total}) doesn't match returned quantity (${item.quantityReturned})`;
          isValid = false;
        }
      }
    });

    if (Object.keys(itemErrors).length > 0) {
      errors.items = itemErrors;
    }

    // Validate damage photos required when any item has Repair or Replace
    const hasRepairOrReplace = formData.items?.some(item => {
      const bd = itemStatusBreakdowns[item.id];
      return bd && ((bd.Repair || 0) > 0 || (bd.Replace || 0) > 0);
    });
    if (hasRepairOrReplace && damagePhotos.length === 0) {
      errors.damagePhotos = 'Photos are required when items need repair or replacement';
      isValid = false;
    }

    // Validate external goods notes and photos if checkbox is checked
    if (hasExternalGoods) {
      if (!externalGoodsNotes.trim()) {
        errors.externalGoodsNotes = 'Please describe the external goods';
        isValid = false;
      }
      if (externalGoodsPhotos.length === 0) {
        errors.externalGoodsPhotos = 'Please upload at least one photo of the external goods';
        isValid = false;
      }
    }

    setStep5Errors(errors);
    return isValid;
  };

  // Clear Step 5 item error
  const clearStep5ItemError = (itemId: string) => {
    setStep5Errors(prev => {
      if (!prev.items) return prev;
      const newItemErrors = { ...prev.items };
      delete newItemErrors[itemId];
      return {
        ...prev,
        items: Object.keys(newItemErrors).length > 0 ? newItemErrors : undefined,
      };
    });
  };

  // Clear Step 5 field error
  const clearStep5Error = (field: 'externalGoodsNotes' | 'externalGoodsPhotos' | 'damagePhotos' | 'general') => {
    setStep5Errors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleCompleteInspection = async () => {
    // Validate Step 5
    if (!validateStep5()) {
      return;
    }
    
    // Update items with statuses and notes
    const updatedItems = formData.items?.map(item => {
      const breakdown = itemStatusBreakdowns[item.id];
      return {
        ...item,
        status: getPrimaryStatus(breakdown),
        statusBreakdown: breakdown,
        notes: itemNotes[item.id] || undefined,
      };
    });
    
    // Generate GRN
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    const updatedData = {
      ...formData,
      items: updatedItems,
      productionNotes: inspectionNotes,
      hasExternalGoods,
      externalGoodsNotes: hasExternalGoods ? externalGoodsNotes : undefined,
      externalGoodsPhotos: hasExternalGoods ? externalGoodsPhotos : undefined,
      damagePhotos,
      grnNumber,
      status: 'Under Inspection' as const,
    };
    setFormData(updatedData);
    
    setIsSaving(true);
    try {
      await onSave(updatedData as Return); // Save to database
      toast.success(`GRN ${grnNumber} generated`);
      setStep5Errors({});
      
      if (formData.transportationType === 'Transportation Needed') {
        setCurrentStep(6);
      } else {
        setCurrentStep(4);
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateRCF = async () => {
    const rcfNumber = `RCF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    const updatedData = {
      ...formData,
      rcfNumber,
      status: 'Sorting Complete' as const,
    };
    setFormData(updatedData);
    
    setIsSaving(true);
    try {
      await onSave(updatedData as Return); // Save to database - this also auto-creates condition report
      toast.success(`RCF ${rcfNumber} generated`);
      // Show additional toast about condition report creation
      toast.success('Condition Report created in Inspection & Maintenance module', {
        description: 'Items are now ready for detailed inspection',
        duration: 5000,
      });
      setIsRCFDialogOpen(false);
      
      if (formData.transportationType === 'Transportation Needed') {
        setCurrentStep(7);
      } else {
        setCurrentStep(5);
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotifyCustomer = async () => {
    const updatedData = {
      ...formData,
      customerNotificationSent: true,
      inventoryUpdated: true,
      status: 'Customer Notified' as const,
    };
    setFormData(updatedData);
    
    setIsSaving(true);
    try {
      await onSave(updatedData as Return); // Save to database
      toast.success('Customer notification sent — good items added back to inventory');
      
      if (formData.transportationType === 'Transportation Needed') {
        setCurrentStep(8);
      } else {
        setCurrentStep(6);
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    const updatedData = {
      ...formData,
      inventoryUpdated: true,
      status: 'Completed' as const,
    };
    setFormData(updatedData);
    
    setIsSaving(true);
    try {
      await onSave(updatedData as Return); // Save to database
      alert('Update inventory successfully');
      toast.success('Return process completed');
      // Navigation handled by onSave for completed status
    } catch {
      toast.error('Failed to complete. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate files before uploading
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Determine photo type based on current step
    const isTransportNeeded = formData.transportationType === 'Transportation Needed';
    let photoType: 'driver' | 'warehouse' | 'damage';
    
    if (isTransportNeeded) {
      if (currentStep === 3) photoType = 'driver';
      else if (currentStep === 4) photoType = 'warehouse';
      else photoType = 'damage';
    } else {
      if (currentStep === 2) photoType = 'warehouse';
      else photoType = 'damage';
    }

    setIsUploading(true);
    try {
      // Upload files to server
      const results = await uploadReturnPhotos(validFiles, photoType);
      
      const successfulUploads = results.filter(r => r.success && r.url);
      const failedCount = results.filter(r => !r.success).length;
      
      if (failedCount > 0) {
        toast.error(`${failedCount} file(s) failed to upload`);
      }
      
      if (successfulUploads.length > 0) {
        const newPhotoUrls = successfulUploads.map(r => r.url!);
        
        // Update the appropriate photo array
        if (photoType === 'driver') {
          setDriverPhotos([...driverPhotos, ...newPhotoUrls]);
        } else if (photoType === 'warehouse') {
          setWarehousePhotos([...warehousePhotos, ...newPhotoUrls]);
        } else {
          setDamagePhotos([...damagePhotos, ...newPhotoUrls]);
          clearStep5Error('damagePhotos');
        }
        
        toast.success(`${successfulUploads.length} photo(s) uploaded to server`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleExternalGoodsPhotoUpload = () => {
    externalGoodsFileInputRef.current?.click();
  };

  const onExternalGoodsFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const results = await uploadReturnPhotos(validFiles, 'external-goods');
      const successfulUploads = results.filter(r => r.success && r.url);
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount > 0) {
        toast.error(`${failedCount} file(s) failed to upload`);
      }

      if (successfulUploads.length > 0) {
        const newPhotoUrls = successfulUploads.map(r => r.url!);
        setExternalGoodsPhotos(prev => [...prev, ...newPhotoUrls]);
        clearStep5Error('externalGoodsPhotos');
        toast.success(`${successfulUploads.length} photo(s) uploaded`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index: number, type: 'driver' | 'warehouse' | 'damage' | 'external-goods') => {
    if (type === 'driver') {
      setDriverPhotos(driverPhotos.filter((_, i) => i !== index));
    } else if (type === 'warehouse') {
      setWarehousePhotos(warehousePhotos.filter((_, i) => i !== index));
    } else if (type === 'external-goods') {
      setExternalGoodsPhotos(externalGoodsPhotos.filter((_, i) => i !== index));
    } else {
      setDamagePhotos(damagePhotos.filter((_, i) => i !== index));
    }
    toast.success('Photo removed');
  };

  const getItemStatusBadge = (status: ReturnItem['status']) => {
    const config = {
      'Pending': { color: 'bg-gray-100 text-gray-800', icon: Package },
      'Good': { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      'Repair': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      'Replace': { color: 'bg-amber-100 text-amber-800', icon: PackageX },
    };
    const { color, icon: Icon } = config[status] || config['Pending'];
    return (
      <Badge className={color}>
        <Icon className="size-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-[#231F20]">
            {returnOrder ? `Process Return - ${returnOrder.orderId || returnOrder.id}` : 'New Return'}
          </h1>
          <p className="text-gray-600">
            {formData.customer} ({formData.transportationType})
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : currentStep === step.number
                        ? 'bg-[#F15929] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="size-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className="text-xs text-center mt-2 max-w-24">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 mx-2 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {/* Step 1: Approve & Schedule (Transport Needed) or Approve (Self Return) */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-[#F15929]" />
              Step 1: {formData.transportationType === 'Transportation Needed' ? 'Schedule Pickup Date & Time' : 'Approve Return Request'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {formData.transportationType === 'Transportation Needed' 
                ? 'Review the return request and schedule a pickup time with the customer.'
                : 'Approve the return request. Customer will self-deliver the items to warehouse.'}
            </p>

            {/* Return Details */}
            <div className="p-4 bg-gray-50 border rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <p className="text-[#231F20]">{formData.customer}</p>
                </div>
                <div>
                  <span className="text-gray-600">Order ID:</span>
                  <p className="text-[#231F20]">{formData.orderId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Return Type:</span>
                  <p className="text-[#231F20]">{formData.returnType}</p>
                </div>
                <div>
                  <span className="text-gray-600">Transportation:</span>
                  <p className="text-[#231F20]">{formData.transportationType}</p>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <Label>Items to Return</Label>
              {formData.items && formData.items.length > 0 ? (
                formData.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-[#231F20]">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Category: {item.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#231F20]">Qty: {item.quantityReturned}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="size-12 text-gray-400 mx-auto mb-4" />
                  <p>No items to return</p>
                </div>
              )}
            </div>

            {formData.transportationType === 'Transportation Needed' && (
              <>
                <div className="space-y-2">
                  <Label className={step1Errors.pickupDate ? 'text-red-600' : ''}>Pickup Date *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={pickupDate ? format(pickupDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        setPickupDate(e.target.value ? new Date(e.target.value) : undefined);
                        if (e.target.value) clearStep1Error('pickupDate');
                      }}
                      className={`flex-1 ${step1Errors.pickupDate ? 'border-red-500 bg-red-50' : ''}`}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" type="button">
                          <CalendarIcon className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={(date) => {
                            setPickupDate(date);
                            if (date) clearStep1Error('pickupDate');
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {step1Errors.pickupDate && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertCircle className="size-3 mr-1" />
                      {step1Errors.pickupDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <ScrollableTimePicker
                    value={pickupTimeSlot || '12:00'}
                    onChange={(time) => {
                      setPickupTimeSlot(time);
                      if (time) clearStep1Error('pickupTimeSlot');
                    }}
                    label="Pickup Time *"
                  />
                  {step1Errors.pickupTimeSlot && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertCircle className="size-3 mr-1" />
                      {step1Errors.pickupTimeSlot}
                    </p>
                  )}
                </div>
              </>
            )}

            <Button
              onClick={handleApproveAndSchedule}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              {isSaving ? 'Saving...' : (formData.transportationType === 'Transportation Needed' ? 'Confirm Schedule & Proceed' : 'Approve Return')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirm Pickup (Transport Needed only) */}
      {currentStep === 2 && formData.transportationType === 'Transportation Needed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-5 text-[#F15929]" />
              Step 2: Confirm Pickup Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Assign a driver and vehicle for the pickup.
            </p>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <CalendarIcon className="size-4 inline mr-1" />
                Scheduled Pickup: {pickupDate && format(pickupDate, 'PPP')} {formData.pickupTimeSlot || pickupTimeSlot.replace('custom:', '')}
              </p>
            </div>

            <div className="space-y-2">
              <Label className={step2Errors.pickupDriver ? 'text-red-600' : ''}>Driver Name *</Label>
              <Input
                value={formData.pickupDriver || ''}
                onChange={(e) => {
                  setFormData({ ...formData, pickupDriver: e.target.value });
                  if (e.target.value.trim()) clearStep2Error('pickupDriver');
                }}
                placeholder="Enter driver name"
                className={step2Errors.pickupDriver ? 'border-red-500 bg-red-50' : ''}
              />
              {step2Errors.pickupDriver && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step2Errors.pickupDriver}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className={step2Errors.driverContact ? 'text-red-600' : ''}>Driver Contact *</Label>
              <Input
                value={formData.driverContact || ''}
                onChange={(e) => {
                  setFormData({ ...formData, driverContact: e.target.value });
                  if (e.target.value.trim()) clearStep2Error('driverContact');
                }}
                placeholder="+60 12-345-6789"
                className={step2Errors.driverContact ? 'border-red-500 bg-red-50' : ''}
              />
              {step2Errors.driverContact && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step2Errors.driverContact}
                </p>
              )}
            </div>

            <Button
              onClick={handleConfirmPickup}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Confirm Pickup'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Driver Recording (Transport Needed only) */}
      {currentStep === 3 && formData.transportationType === 'Transportation Needed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-[#F15929]" />
              Step 3: Driver Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Driver should take photos of the goods before loading for transport.
            </p>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <User className="size-4 inline mr-1" />
                Driver: {formData.pickupDriver}
              </p>
              <p className="text-sm text-amber-800">
                <Phone className="size-4 inline mr-1" />
                Contact: {formData.driverContact}
              </p>
            </div>

            <div className="space-y-2">
              <Label className={step3Errors.photos ? 'text-red-600' : ''}>Driver Photos (Required) *</Label>
              <Button 
                variant="outline" 
                onClick={() => {
                  handlePhotoUpload();
                  if (driverPhotos.length > 0) clearStep3Error();
                }} 
                className={`w-full ${step3Errors.photos ? 'border-red-500 bg-red-50' : ''}`}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  onFileSelect(e);
                  clearStep3Error();
                }}
                className="hidden"
              />
              {step3Errors.photos && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step3Errors.photos}
                </p>
              )}
              {driverPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {driverPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img src={photo} alt={`Driver ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 size-6 p-0"
                        onClick={() => removePhoto(index, 'driver')}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleDriverRecording}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Recording & Mark In Transit'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4 (Transport) / Step 2 (Self): Receive at Warehouse */}
      {((currentStep === 4 && formData.transportationType === 'Transportation Needed') || 
        (currentStep === 2 && formData.transportationType === 'Self Return')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-5 text-[#F15929]" />
              {formData.transportationType === 'Transportation Needed' ? 'Step 4' : 'Step 2'}: Receive at Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Confirm receipt of goods at warehouse and upload photos.
            </p>

            <div className="space-y-2">
              <Label className={step4Errors.photos ? 'text-red-600' : ''}>Warehouse Receipt Photos (Required) *</Label>
              <Button 
                variant="outline" 
                onClick={() => {
                  handlePhotoUpload();
                  if (warehousePhotos.length > 0) clearStep4Error();
                }} 
                className={`w-full ${step4Errors.photos ? 'border-red-500 bg-red-50' : ''}`}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  onFileSelect(e);
                  clearStep4Error();
                }}
                className="hidden"
              />
              {step4Errors.photos && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step4Errors.photos}
                </p>
              )}
              {warehousePhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {warehousePhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img src={photo} alt={`Warehouse ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 size-6 p-0"
                        onClick={() => removePhoto(index, 'warehouse')}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleReceiveAtWarehouse}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Confirm Receipt at Warehouse'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5 (Transport) / Step 3 (Self): Inspection & GRN */}
      {((currentStep === 5 && formData.transportationType === 'Transportation Needed') || 
        (currentStep === 3 && formData.transportationType === 'Self Return')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-[#F15929]" />
              {formData.transportationType === 'Transportation Needed' ? 'Step 5' : 'Step 3'}: Inspection & Generate GRN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Inspect all returned items and set their condition status. GRN will be auto-generated.
            </p>

            {/* Item Inspection */}
            <div className="space-y-4">
              <Label>Item Condition Assessment</Label>
              {formData.items?.map((item) => {
                const breakdown = itemStatusBreakdowns[item.id] || {
                  'Good': 0,
                  'Repair': 0,
                  'Replace': 0,
                };
                const totalAssigned = Object.values(breakdown).reduce((sum, qty) => sum + qty, 0);
                const remaining = item.quantityReturned - totalAssigned;

                const updateBreakdown = (status: ItemConditionStatus, value: number) => {
                  const newValue = Math.max(0, Math.min(value, item.quantityReturned));
                  setItemStatusBreakdowns({
                    ...itemStatusBreakdowns,
                    [item.id]: {
                      ...breakdown,
                      [status]: newValue,
                    },
                  });
                  // Clear error when user updates breakdown
                  clearStep5ItemError(item.id);
                };

                const setAllToStatus = (status: ItemConditionStatus) => {
                  setItemStatusBreakdowns({
                    ...itemStatusBreakdowns,
                    [item.id]: {
                      'Good': status === 'Good' ? item.quantityReturned : 0,
                      'Repair': status === 'Repair' ? item.quantityReturned : 0,
                      'Replace': status === 'Replace' ? item.quantityReturned : 0,
                    },
                  });
                  // Clear error when user sets status
                  clearStep5ItemError(item.id);
                };

                const hasItemError = step5Errors.items?.[item.id];

                return (
                  <div key={item.id} className={`p-4 border rounded-lg space-y-4 ${hasItemError ? 'border-red-500 bg-red-50/30' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#231F20]">{item.name}</p>
                        <p className="text-sm text-gray-500">Category: {item.category}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-100 text-blue-800">
                          Total: {item.quantityReturned}
                        </Badge>
                        {remaining !== 0 && (
                          <p className={`text-xs mt-1 ${remaining > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                            {remaining > 0 ? `${remaining} unassigned` : `${Math.abs(remaining)} over-assigned`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 self-center">Quick set all:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        onClick={() => setAllToStatus('Good')}
                      >
                        All Good
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                        onClick={() => setAllToStatus('Repair')}
                      >
                        All Repair
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                        onClick={() => setAllToStatus('Replace')}
                      >
                        All Replace
                      </Button>
                    </div>
                    
                    {/* Status Quantity Inputs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-green-600" />
                          Good
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantityReturned}
                          value={breakdown['Good']}
                          onChange={(e) => updateBreakdown('Good', parseInt(e.target.value) || 0)}
                          className="h-9 text-center bg-green-50 border-green-200 focus:ring-green-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <AlertCircle className="size-3 text-red-600" />
                          Repair
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantityReturned}
                          value={breakdown['Repair']}
                          onChange={(e) => updateBreakdown('Repair', parseInt(e.target.value) || 0)}
                          className="h-9 text-center bg-red-50 border-red-200 focus:ring-red-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <PackageX className="size-3 text-amber-600" />
                          Replace
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantityReturned}
                          value={breakdown['Replace']}
                          onChange={(e) => updateBreakdown('Replace', parseInt(e.target.value) || 0)}
                          className="h-9 text-center bg-amber-50 border-amber-200 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Validation Status */}
                    <div className={`text-xs p-2 rounded ${
                      totalAssigned === item.quantityReturned 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      Assigned: {totalAssigned} / {item.quantityReturned}
                      {totalAssigned === item.quantityReturned && ' ✓'}
                    </div>
                    
                    {/* Inline Error Message */}
                    {hasItemError && (
                      <p className="text-xs text-red-600 flex items-center">
                        <AlertCircle className="size-3 mr-1" />
                        {hasItemError}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Notes (Optional)</Label>
                      <Textarea
                        value={itemNotes[item.id] || ''}
                        onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                        placeholder="Any specific notes about this item..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Production/Inspection Notes</Label>
              <Textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="General notes about the inspection..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="externalGoods"
                checked={hasExternalGoods}
                onCheckedChange={(checked) => setHasExternalGoods(checked as boolean)}
              />
              <Label htmlFor="externalGoods" className="cursor-pointer">
                External goods detected (not from our inventory)
              </Label>
            </div>

            {hasExternalGoods && (
              <div className="space-y-4 border border-amber-200 bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="size-4" />
                  <span className="text-sm font-medium">External Goods Documentation</span>
                </div>

                {/* External Goods Notes */}
                <div className="space-y-2">
                  <Label className={step5Errors.externalGoodsNotes ? 'text-red-600' : ''}>External Goods Notes *</Label>
                  <Textarea
                    value={externalGoodsNotes}
                    onChange={(e) => {
                      setExternalGoodsNotes(e.target.value);
                      if (e.target.value.trim()) clearStep5Error('externalGoodsNotes');
                    }}
                    placeholder="Describe the external goods..."
                    rows={2}
                    className={step5Errors.externalGoodsNotes ? 'border-red-500 bg-red-50' : 'bg-white'}
                  />
                  {step5Errors.externalGoodsNotes && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertCircle className="size-3 mr-1" />
                      {step5Errors.externalGoodsNotes}
                    </p>
                  )}
                </div>

                {/* External Goods Photos */}
                <div className="space-y-2">
                  <Label className={step5Errors.externalGoodsPhotos ? 'text-red-600' : ''}>External Goods Photos *</Label>
                  <Button variant="outline" onClick={handleExternalGoodsPhotoUpload} className="w-full bg-white" disabled={isUploading}>
                    {isUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                    {isUploading ? 'Uploading...' : 'Upload External Goods Photos'}
                  </Button>
                  <input
                    ref={externalGoodsFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onExternalGoodsFileSelect}
                    className="hidden"
                  />
                  {step5Errors.externalGoodsPhotos && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertCircle className="size-3 mr-1" />
                      {step5Errors.externalGoodsPhotos}
                    </p>
                  )}
                  {externalGoodsPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {externalGoodsPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img src={photo} alt={`External goods ${index + 1}`} className="w-full h-24 object-cover rounded" />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 size-6 p-0"
                            onClick={() => removePhoto(index, 'external-goods')}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Damage Photos */}
            <div className="space-y-2">
              {(() => {
                const needsPhotos = formData.items?.some(item => {
                  const bd = itemStatusBreakdowns[item.id];
                  return bd && ((bd.Repair || 0) > 0 || (bd.Replace || 0) > 0);
                });
                return (
                  <Label className={step5Errors.damagePhotos ? 'text-red-600' : ''}>
                    Damage Photos {needsPhotos ? '(Required)' : '(Optional)'}
                  </Label>
                );
              })()}
              <Button variant="outline" onClick={handlePhotoUpload} className="w-full" disabled={isUploading}>
                {isUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                {isUploading ? 'Uploading...' : 'Upload Damage Photos'}
              </Button>
              {step5Errors.damagePhotos && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {step5Errors.damagePhotos}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onFileSelect}
                className="hidden"
              />
              {damagePhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {damagePhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img src={photo} alt={`Damage ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 size-6 p-0"
                        onClick={() => removePhoto(index, 'damage')}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleCompleteInspection}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileText className="size-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Complete Inspection & Generate GRN'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 6 (Transport) / Step 4 (Self): Generate RCF */}
      {((currentStep === 6 && formData.transportationType === 'Transportation Needed') || 
        (currentStep === 4 && formData.transportationType === 'Self Return')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-[#F15929]" />
              {formData.transportationType === 'Transportation Needed' ? 'Step 6' : 'Step 4'}: Generate RCF (Return Condition Form)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Review inspection results and generate RCF for items requiring repair or replacement.
            </p>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-green-800">
                <CheckCircle2 className="size-4 inline mr-1" />
                GRN Generated: {formData.grnNumber}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGRNViewer(true)}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <Eye className="size-4 mr-1" />
                View GRN
              </Button>
            </div>

            {/* Summary of Items: Good / Damage / Repair counts for each item */}
            <div className="space-y-2">
              <Label>Items Summary</Label>
              {formData.items?.map((item) => {
                const bd = item.statusBreakdown;
                const good = bd?.Good ?? 0;
                const damage = bd?.Repair ?? 0;
                const repair = bd?.Replace ?? 0;
                return (
                  <div key={item.id} className="flex flex-col gap-2 p-3 border rounded-lg">
                    <p className="text-sm font-medium text-[#231F20]">{item.name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-green-600" /> Good: <strong>{good}</strong></span>
                      <span className="flex items-center gap-1"><AlertCircle className="size-3.5 text-red-600" /> Damage: <strong>{damage}</strong></span>
                      <span className="flex items-center gap-1"><PackageX className="size-3.5 text-amber-600" /> Repair: <strong>{repair}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={() => setIsRCFDialogOpen(true)}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
            >
              <FileText className="size-4 mr-2" />
              Generate RCF
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 7 (Transport) / Step 5 (Self): Notify Customer */}
      {((currentStep === 7 && formData.transportationType === 'Transportation Needed') || 
        (currentStep === 5 && formData.transportationType === 'Self Return')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[#F15929]" />
              {formData.transportationType === 'Transportation Needed' ? 'Step 7' : 'Step 5'}: Notify Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Send notification to customer about the return inspection results.
            </p>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  <FileText className="size-4 inline mr-1" />
                  GRN: {formData.grnNumber}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGRNViewer(true)}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <Eye className="size-4 mr-1" />
                  View
                </Button>
              </div>
              {formData.rcfNumber && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-800">
                    <FileText className="size-4 inline mr-1" />
                    RCF: {formData.rcfNumber}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRCFViewer(true)}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <Eye className="size-4 mr-1" />
                    View
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notification Summary</Label>
              <div className="p-3 border rounded-lg space-y-2 text-sm">
                <p>Customer: {formData.customer}</p>
                <p>Order ID: {formData.orderId}</p>
                <p>Items Returned: {formData.items?.length} items</p>
                {(() => {
                  let totalGood = 0, totalRepair = 0, totalReplace = 0;
                  formData.items?.forEach(item => {
                    const bd = itemStatusBreakdowns[item.id] || item.statusBreakdown;
                    if (bd) {
                      totalGood += bd.Good || 0;
                      totalRepair += bd.Repair || 0;
                      totalReplace += bd.Replace || 0;
                    }
                  });
                  return (
                    <>
                      <p>Good: {totalGood} qty</p>
                      <p>Repair: {totalRepair} qty</p>
                      <p>Replace: {totalReplace} qty</p>
                    </>
                  );
                })()}
              </div>
            </div>

            <Button
              onClick={handleNotifyCustomer}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Send Customer Notification
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 8 (Transport) / Step 6 (Self): Complete */}
      {((currentStep === 8 && formData.transportationType === 'Transportation Needed') || 
        (currentStep === 6 && formData.transportationType === 'Self Return')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" />
              {formData.transportationType === 'Transportation Needed' ? 'Step 8' : 'Step 6'}: Complete Return Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 mb-2">
                <CheckCircle2 className="size-5 inline mr-2" />
                Return process is ready to be completed
              </p>
              <ul className="text-sm text-green-700 space-y-1 ml-7">
                <li>✓ Items inspected and sorted</li>
                <li>✓ GRN generated</li>
                {formData.rcfNumber && <li>✓ RCF generated</li>}
                <li>✓ Customer notified</li>
              </ul>
            </div>

            {/* Document Review */}
            <div className="p-4 border rounded-lg space-y-3">
              <Label className="text-[#231F20]">Generated Documents</Label>
              <div className="flex flex-wrap gap-2">
                {formData.grnNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGRNViewer(true)}
                    className="text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <Eye className="size-4 mr-1" />
                    View GRN ({formData.grnNumber})
                  </Button>
                )}
                {formData.rcfNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRCFViewer(true)}
                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    <Eye className="size-4 mr-1" />
                    View RCF ({formData.rcfNumber})
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <Label className="text-[#231F20]">Final Actions</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Update Inventory</span>
                  <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                </div>
              </div>
            </div>

            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Complete Return & Update Records
            </Button>
          </CardContent>
        </Card>
      )}

      {/* RCF Generation Dialog */}
      <Dialog open={isRCFDialogOpen} onOpenChange={setIsRCFDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate RCF (Return Condition Form)</DialogTitle>
            <DialogDescription>
              Review the condition of returned items and generate RCF document
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {formData.items?.map((item) => {
                const bd = itemStatusBreakdowns[item.id] || item.statusBreakdown;
                return (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[#231F20]">{item.name}</p>
                      <p className="text-xs text-gray-500">Total Qty: {item.quantityReturned}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1">Note: {item.notes}</p>
                      )}
                    </div>
                    {bd && (
                      <div className="flex gap-2 mt-2">
                        {(bd.Good || 0) > 0 && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Good: {bd.Good}</Badge>
                        )}
                        {(bd.Repair || 0) > 0 && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Repair: {bd.Repair}</Badge>
                        )}
                        {(bd.Replace || 0) > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">Replace: {bd.Replace}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {formData.productionNotes && (
              <div className="p-3 bg-gray-50 border rounded-lg">
                <Label className="text-sm">Inspection Notes:</Label>
                <p className="text-sm text-gray-700 mt-1">{formData.productionNotes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateRCF}
                className="bg-[#F15929] hover:bg-[#d94d1f] flex-1"
              >
                <FileText className="size-4 mr-2" />
                Generate RCF
              </Button>
              <Button
                onClick={() => setIsRCFDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GRN Viewer Modal */}
      {showGRNViewer && formData.grnNumber && (
        <GRNViewer
          grnNumber={formData.grnNumber}
          returnData={{
            orderId: formData.orderId || '',
            customer: formData.customer || '',
            customerContact: formData.customerContact,
            pickupAddress: formData.pickupAddress,
            returnType: formData.returnType || 'Full',
            transportationType: formData.transportationType || 'Self Return',
            items: (formData.items || []) as ReturnItem[],
            requestDate: formData.requestDate || new Date().toISOString(),
            pickupDate: formData.pickupDate,
            pickupTimeSlot: formData.pickupTimeSlot,
            pickupDriver: formData.pickupDriver,
            driverContact: formData.driverContact,
            warehousePhotos: formData.warehousePhotos,
          }}
          onClose={() => setShowGRNViewer(false)}
        />
      )}

      {/* RCF Viewer Modal */}
      {showRCFViewer && formData.rcfNumber && (
        <RCFViewer
          rcfNumber={formData.rcfNumber}
          grnNumber={formData.grnNumber}
          returnData={{
            orderId: formData.orderId || '',
            customer: formData.customer || '',
            items: (formData.items || []) as ReturnItem[],
            productionNotes: formData.productionNotes,
            hasExternalGoods: formData.hasExternalGoods,
            externalGoodsNotes: formData.externalGoodsNotes,
            damagePhotos: formData.damagePhotos,
          }}
          onClose={() => setShowRCFViewer(false)}
        />
      )}
    </div>
  );
}