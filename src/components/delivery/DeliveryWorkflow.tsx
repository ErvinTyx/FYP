import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Check, PackageCheck, Calendar as CalendarIcon,
  ClipboardCheck, Truck, FileSignature, Upload, X, Image as ImageIcon,
  ArrowRight, User, Phone, MapPin, AlertCircle, Download, FileText, CheckCircle2,
  Loader2
} from 'lucide-react';
import { uploadDeliveryPhotos } from '@/lib/upload';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollableTimePicker } from '../ui/scrollable-time-picker';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DeliveryOrder, DeliveryItem } from './DeliveryManagement';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

interface DeliveryWorkflowProps {
  delivery: DeliveryOrder | null;
  onSave: (delivery: DeliveryOrder) => Promise<void>;
  onBack: () => void;
}

export function DeliveryWorkflow({ delivery, onSave, onBack }: DeliveryWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<DeliveryOrder>>(delivery || {
    items: [],
    status: 'Pending',
    type: 'delivery',
    createdBy: 'Current User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [stockCheckNotes, setStockCheckNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState('09:00');
  const [packingPhotos, setPackingPhotos] = useState<string[]>([]);
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>([]);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'driver' | 'customer'>('customer');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // OTP states for customer acknowledgement
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isDOViewerOpen, setIsDOViewerOpen] = useState(false);
  
  // Saving state for API persistence
  const [isSaving, setIsSaving] = useState(false);
  
  // Customer selection states for OTP
  const [customers, setCustomers] = useState<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Validation error states for Step 3: Packing & Loading
  const [step3Errors, setStep3Errors] = useState<{
    scheduledDate?: string;
    timeSlot?: string;
    driverName?: string;
    vehicleNumber?: string;
    driverContact?: string;
  }>({});

  // Validation error states for Step 4: Customer Sign & OTP
  const [step4Errors, setStep4Errors] = useState<{
    customerId?: string;
    signature?: string;
    otp?: string;
  }>({});

  // Stock check validation state
  const [insufficientStockItems, setInsufficientStockItems] = useState<{
    name: string;
    required: number;
    available: number;
  }[]>([]);

  // Fetch customers for OTP selection
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/user-management');
        const data = await response.json();
        
        if (data.success && data.users) {
          // Filter to only customers (users with 'customer' role)
          const customerUsers = data.users.filter((user: { roles: string[] }) => 
            user.roles.includes('customer')
          );
          setCustomers(customerUsers);
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      }
    };
    
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (delivery) {
      setFormData(delivery);
      // Set current step based on status (using database values)
      const statusToStep: Record<string, number> = {
        'Pending': 1,
        'Packing List Issued': 2,
        'Stock Checked': 3,
        'Packing & Loading': 3, // Still in packing step
        'In Transit': 4,
        'Ready for Pickup': 4,
        'Completed': 5,
      };
      
      // Determine the correct step based on status AND completion indicators
      // This handles cases where status might not be updated but actions are complete
      let mappedStep = statusToStep[delivery.status] || 1;
      
      // If completed (has signature/OTP verified), go to step 5
      if (delivery.status === 'Completed' || delivery.verifiedOTP) {
        mappedStep = 5;
      }
      // If loading completed (dispatched/in transit), go to step 4
      else if (delivery.loadingCompletedAt || delivery.status === 'In Transit' || delivery.status === 'Ready for Pickup') {
        mappedStep = 4;
      }
      // If stock checked, go to step 3
      else if (delivery.stockCheckDate || delivery.status === 'Stock Checked' || delivery.status === 'Packing & Loading') {
        mappedStep = 3;
      }
      // If packing list generated, go to step 2
      else if (delivery.packingListNumber || delivery.status === 'Packing List Issued') {
        mappedStep = 2;
      }
      
      setCurrentStep(mappedStep);
      
      // Pre-fill scheduled date from delivery order (already confirmed from delivery request page)
      if (delivery.scheduledDate) {
        setScheduledDate(new Date(delivery.scheduledDate));
      }
      if (delivery.scheduledTimeSlot) {
        setScheduleTimeSlot(delivery.scheduledTimeSlot);
      }
    }
  }, [delivery]);

  // Steps depend on delivery type
  const getSteps = () => {
    const baseSteps = [
      { number: 1, title: 'Generate Packing List' },
      { number: 2, title: 'Check Stock' },
      { number: 3, title: 'Packing & Loading' },
    ];

    if (formData.type === 'delivery') {
      return [
        ...baseSteps,
        { number: 4, title: 'In Transit & Sign' },
        { number: 5, title: 'Complete' },
      ];
    } else {
      return [
        ...baseSteps,
        { number: 4, title: 'Ready & Sign' },
        { number: 5, title: 'Complete' },
      ];
    }
  };

  const steps = getSteps();

  // Helper function to save progress to database via API
  const saveProgressToApi = async (updatedData: Partial<DeliveryOrder>) => {
    if (!updatedData.id) return;
    
    setIsSaving(true);
    try {
      // Call onSave which will persist to the API
      await onSave(updatedData as DeliveryOrder);
    } catch (error) {
      console.error('Failed to save progress:', error);
      toast.error('Failed to save progress. Please try again.');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePackingList = async () => {
    if (!formData.items || formData.items.length === 0) {
      toast.error('No items to pack');
      return;
    }

    const plNumber = `PL-${Date.now().toString().slice(-8)}`;
    
    const updatedData = {
      ...formData,
      packingListNumber: plNumber,
      packingListDate: new Date().toISOString(),
      status: 'Packing List Issued' as DeliveryOrder['status'],
      updatedAt: new Date().toISOString(),
    };
    
    setFormData(updatedData);
    
    try {
      await saveProgressToApi(updatedData);
      toast.success(`Packing list ${plNumber} generated`);
      setCurrentStep(2);
    } catch {
      // Error already handled in saveProgressToApi
    }
  };

  const handleStockCheck = async () => {
    if (!formData.items || formData.items.length === 0) {
      toast.error('No items to check');
      return;
    }

    // Clear previous insufficient stock errors
    setInsufficientStockItems([]);

    // Pre-validate stock availability on frontend (for immediate feedback)
    const insufficientItems = formData.items.filter(item => item.availableStock < item.quantity);
    
    if (insufficientItems.length > 0) {
      const insufficientDetails = insufficientItems.map(item => ({
        name: item.scaffoldingItemName,
        required: item.quantity,
        available: item.availableStock,
      }));
      setInsufficientStockItems(insufficientDetails);
      toast.error('Cannot proceed: Some items have insufficient stock');
      return; // Block progression
    }
    
    const updatedData = {
      ...formData,
      stockCheckDate: new Date().toISOString(),
      stockCheckBy: 'Current User',
      stockCheckNotes,
      allItemsAvailable: true,
      status: 'Stock Checked' as DeliveryOrder['status'],
      updatedAt: new Date().toISOString(),
    };
    
    setFormData(updatedData);
    
    try {
      await saveProgressToApi(updatedData);
      toast.success('Stock check completed - inventory deducted successfully');
      setCurrentStep(3);
    } catch (error: unknown) {
      // Handle insufficient stock error from backend
      if (error && typeof error === 'object' && 'name' in error && error.name === 'InsufficientStockError') {
        const stockError = error as { insufficientItems: { name: string; required: number; available: number }[] };
        setInsufficientStockItems(stockError.insufficientItems);
        toast.error('Cannot proceed: Some items have insufficient stock');
      }
      // Revert formData on error
      setFormData(formData);
    }
  };

  // Validate Step 3: Packing & Loading
  const validateStep3 = (isStartPacking: boolean = false): boolean => {
    const errors: typeof step3Errors = {};
    let isValid = true;

    if (!scheduledDate) {
      errors.scheduledDate = 'Scheduled date is required';
      isValid = false;
    }

    if (!scheduleTimeSlot) {
      errors.timeSlot = 'Please select a delivery/pickup time';
      isValid = false;
    }

    // For complete loading (not just start packing), validate driver details for delivery type
    if (!isStartPacking && formData.type === 'delivery') {
      if (!formData.driverName?.trim()) {
        errors.driverName = 'Driver name is required';
        isValid = false;
      }

      if (!formData.vehicleNumber?.trim()) {
        errors.vehicleNumber = 'Vehicle number is required';
        isValid = false;
      }

      // Optional phone format validation for driver contact
      if (formData.driverContact?.trim()) {
        const phoneRegex = /^[\d\s+\-()]+$/;
        if (!phoneRegex.test(formData.driverContact)) {
          errors.driverContact = 'Invalid phone number format';
          isValid = false;
        }
      }
    }

    setStep3Errors(errors);
    return isValid;
  };

  // Clear Step 3 error for a specific field
  const clearStep3Error = (field: keyof typeof step3Errors) => {
    setStep3Errors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleStartPacking = async () => {
    if (!validateStep3(true)) {
      return;
    }

    const updatedData = {
      ...formData,
      scheduledDate: scheduledDate!.toISOString(),
      scheduledTimeSlot: scheduleTimeSlot,
      packingStartedAt: new Date().toISOString(),
      packingStartedBy: 'Current User',
      status: 'Packing & Loading' as DeliveryOrder['status'],
      updatedAt: new Date().toISOString(),
    };
    
    setFormData(updatedData);
    
    try {
      await saveProgressToApi(updatedData);
      toast.success('Packing started');
    } catch {
      // Error already handled in saveProgressToApi
    }
  };

  const handleCompleteLoading = async () => {
    if (!validateStep3(false)) {
      return;
    }

    const newStatus = formData.type === 'delivery' ? 'In Transit' : 'Ready for Pickup';

    const updatedData = {
      ...formData,
      // Ensure schedule data is included
      scheduledDate: scheduledDate?.toISOString(),
      scheduledTimeSlot: scheduleTimeSlot,
      loadingCompletedAt: new Date().toISOString(),
      loadingCompletedBy: 'Current User',
      packingPhotos,
      status: newStatus as DeliveryOrder['status'],
      dispatchedAt: formData.type === 'delivery' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    
    setFormData(updatedData);
    
    try {
      await saveProgressToApi(updatedData);
      
      if (formData.type === 'delivery') {
        toast.success('Items loaded and dispatched for delivery');
      } else {
        toast.success('Items packed and ready for customer pickup');
      }
      setStep3Errors({});
      setCurrentStep(4);
    } catch {
      // Error already handled in saveProgressToApi
    }
  };

  // Validate Step 4: Customer Sign & OTP
  const validateStep4SendOTP = (): boolean => {
    const errors: typeof step4Errors = {};
    let isValid = true;

    if (!selectedCustomerId) {
      errors.customerId = 'Please select a customer';
      isValid = false;
    }

    setStep4Errors(errors);
    return isValid;
  };

  const validateStep4Verify = (): boolean => {
    const errors: typeof step4Errors = {};
    let isValid = true;

    if (!selectedCustomerId) {
      errors.customerId = 'Please select a customer';
      isValid = false;
    }

    if (!formData.customerSignature) {
      errors.signature = 'Customer signature is required';
      isValid = false;
    }

    if (!otpInput) {
      errors.otp = 'Please enter the OTP';
      isValid = false;
    } else if (otpInput.length !== 6) {
      errors.otp = 'OTP must be 6 digits';
      isValid = false;
    } else if (otpInput !== generatedOtp) {
      errors.otp = 'Invalid OTP. Please try again';
      isValid = false;
    }

    setStep4Errors(errors);
    return isValid;
  };

  // Clear Step 4 error for a specific field
  const clearStep4Error = (field: keyof typeof step4Errors) => {
    setStep4Errors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleSendOTP = async () => {
    if (!validateStep4SendOTP()) {
      return;
    }

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    if (!selectedCustomer) {
      setStep4Errors({ customerId: 'Selected customer not found' });
      return;
    }

    setIsSendingOtp(true);
    
    try {
      const response = await fetch('/api/delivery/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedCustomer.email,
          customerName: customerName,
          doNumber: formData.doNumber,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedOtp(data.otp);
        setOtpSent(true);
        toast.success(`OTP sent to ${selectedCustomer.email}`);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateStep4Verify()) {
      return;
    }

    const updatedData = {
      ...formData,
      deliveredAt: new Date().toISOString(),
      customerAcknowledgedAt: new Date().toISOString(),
      customerSignature: formData.customerSignature,
      customerSignedBy: customerName,
      customerOTP: generatedOtp,
      verifiedOTP: true,
      deliveryPhotos,
      status: 'Completed' as DeliveryOrder['status'],
      inventoryUpdatedAt: new Date().toISOString(),
      inventoryStatus: 'Rental' as const,
      updatedAt: new Date().toISOString(),
    };
    
    setFormData(updatedData);
    
    try {
      await saveProgressToApi(updatedData);
      toast.success('OTP verified and delivery completed!');
      setStep4Errors({});
      setCurrentStep(5);
    } catch {
      // Error already handled in saveProgressToApi
    }
  };

  const handleComplete = async () => {
    try {
      setIsSaving(true);
      await onSave(formData as DeliveryOrder);
      toast.success('Delivery process completed successfully');
      // Navigate back to list after completion
      onBack();
    } catch (error) {
      console.error('Failed to complete delivery:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const openSignatureDialog = (type: 'driver' | 'customer') => {
    setSignatureType(type);
    setIsSignatureDialogOpen(true);
    // Initialize canvas when dialog opens
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#231F20';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, 100);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    } else {
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    } else {
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    }
    
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = !imageData.data.some(channel => channel !== 0);
    
    if (isEmpty) {
      toast.error('Please draw your signature before saving');
      return;
    }
    
    const signatureData = canvas.toDataURL();
    if (signatureType === 'customer') {
      setFormData({ ...formData, customerSignature: signatureData });
      clearStep4Error('signature');
      toast.success('Customer signature saved');
    } else if (signatureType === 'driver') {
      setFormData({ ...formData, driverSignature: signatureData });
      toast.success('Driver signature saved');
    }
    setIsSignatureDialogOpen(false);
    clearSignature();
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
    const photoType: 'packing' | 'delivery' = currentStep === 3 ? 'packing' : 'delivery';

    setIsUploading(true);
    try {
      // Upload files to server
      const results = await uploadDeliveryPhotos(validFiles, photoType);
      
      const successfulUploads = results.filter(r => r.success && r.url);
      const failedCount = results.filter(r => !r.success).length;
      
      if (failedCount > 0) {
        toast.error(`${failedCount} file(s) failed to upload`);
      }
      
      if (successfulUploads.length > 0) {
        const newPhotoUrls = successfulUploads.map(r => r.url!);
        
        if (photoType === 'packing') {
          setPackingPhotos([...packingPhotos, ...newPhotoUrls]);
        } else {
          setDeliveryPhotos([...deliveryPhotos, ...newPhotoUrls]);
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

  const removePhoto = (index: number, type: 'packing' | 'delivery') => {
    if (type === 'packing') {
      setPackingPhotos(packingPhotos.filter((_, i) => i !== index));
    } else {
      setDeliveryPhotos(deliveryPhotos.filter((_, i) => i !== index));
    }
    toast.success('Photo removed');
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
            {delivery ? `Process ${formData.type === 'delivery' ? 'Delivery' : 'Pickup'} - ${delivery.doNumber}` : `New ${formData.type === 'delivery' ? 'Delivery' : 'Pickup'} Order`}
          </h1>
          <p className="text-gray-600">Follow the workflow to complete the {formData.type}</p>
        </div>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-[#F15929]" />
              Step 1: Generate Packing List
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Generate a packing list for the items to be {formData.type === 'delivery' ? 'delivered' : 'picked up'}.
            </p>

            {formData.items && formData.items.length > 0 ? (
              <div className="space-y-3">
                {formData.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-[#231F20]">{item.scaffoldingItemName}</p>
                      <p className="text-sm text-gray-500">
                        Quantity: {item.quantity} {item.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="size-12 text-gray-400 mx-auto mb-4" />
                <p>No items found. Please add items first.</p>
              </div>
            )}

            <Button
              onClick={handleGeneratePackingList}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={!formData.items || formData.items.length === 0 || isSaving}
            >
              {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileText className="size-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Generate Packing List'}
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-5 text-[#F15929]" />
              Step 2: Check Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Verify that all items are available in stock.
            </p>

            <div className="space-y-3">
              {formData.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-[#231F20]">{item.scaffoldingItemName}</p>
                    <p className="text-sm text-gray-500">
                      Required: {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#231F20]">Available: {item.availableStock} {item.unit}</p>
                    {item.availableStock >= item.quantity ? (
                      <Badge className="bg-green-100 text-green-800 mt-1">
                        <Check className="size-3 mr-1" />
                        In Stock
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 mt-1">
                        <AlertCircle className="size-3 mr-1" />
                        Insufficient
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Insufficient Stock Warning */}
            {insufficientStockItems.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="size-5 text-red-600" />
                  <p className="font-semibold text-red-800">Insufficient Stock - Cannot Proceed</p>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  The following items do not have enough stock to fulfill this delivery:
                </p>
                <div className="space-y-2">
                  {insufficientStockItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm bg-white p-2 rounded border border-red-100">
                      <span className="text-red-800">{item.name}</span>
                      <span className="text-red-600">
                        Required: <strong>{item.required}</strong> | Available: <strong>{item.available}</strong> | Short: <strong>{item.required - item.available}</strong>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-red-600 mt-3">
                  Please replenish stock or adjust the delivery order before proceeding.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Stock Check Notes</Label>
              <Textarea
                value={stockCheckNotes}
                onChange={(e) => setStockCheckNotes(e.target.value)}
                placeholder="Enter any notes about stock availability..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleStockCheck}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={isSaving || formData.items?.some(item => item.availableStock < item.quantity)}
            >
              {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Complete Stock Check & Deduct Inventory'}
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-5 text-[#F15929]" />
              Step 3: Packing & Loading to Lorry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Pack items and load them {formData.type === 'delivery' ? 'onto the delivery vehicle' : 'for customer pickup'}.
            </p>

            {/* Schedule Date - Auto-filled from DO */}
            <div className={`p-4 rounded-lg ${step3Errors.scheduledDate ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm mb-3 ${step3Errors.scheduledDate ? 'text-red-800' : 'text-amber-800'}`}>
                <CalendarIcon className="size-4 inline mr-1" />
                Scheduled {formData.type === 'delivery' ? 'Delivery' : 'Pickup'} Date (Auto-filled)
              </p>
              <div className="space-y-1">
                <span className="text-xs text-gray-600">Date:</span>
                <p className="text-[#231F20] font-medium">{scheduledDate ? format(scheduledDate, 'PPP') : 'Not set'}</p>
              </div>
              {step3Errors.scheduledDate && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step3Errors.scheduledDate}
                </p>
              )}
            </div>

            {/* Time Selection - Driver fills this */}
            <div className="space-y-1">
              <ScrollableTimePicker
                value={scheduleTimeSlot}
                onChange={(value) => {
                  setScheduleTimeSlot(value);
                  clearStep3Error('timeSlot');
                }}
                label={`${formData.type === 'delivery' ? 'Delivery' : 'Pickup'} Time (Select by Driver) *`}
              />
              {step3Errors.timeSlot && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step3Errors.timeSlot}
                </p>
              )}
            </div>

            {formData.type === 'delivery' && (
              <>
                <div className="space-y-2">
                  <Label className={step3Errors.driverName ? 'text-red-600' : ''}>Driver Name *</Label>
                  <Input
                    value={formData.driverName || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, driverName: e.target.value });
                      if (e.target.value.trim()) clearStep3Error('driverName');
                    }}
                    placeholder="Enter driver name"
                    className={step3Errors.driverName ? 'border-red-500 bg-red-50' : ''}
                  />
                  {step3Errors.driverName && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertCircle className="size-3 mr-1" />
                      {step3Errors.driverName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={step3Errors.driverContact ? 'text-red-600' : ''}>Driver Contact</Label>
                    <Input
                      value={formData.driverContact || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, driverContact: e.target.value });
                        clearStep3Error('driverContact');
                      }}
                      placeholder="+60 12-345-6789"
                      className={step3Errors.driverContact ? 'border-red-500 bg-red-50' : ''}
                    />
                    {step3Errors.driverContact && (
                      <p className="text-xs text-red-600 flex items-center">
                        <AlertCircle className="size-3 mr-1" />
                        {step3Errors.driverContact}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={step3Errors.vehicleNumber ? 'text-red-600' : ''}>Vehicle Number *</Label>
                    <Input
                      value={formData.vehicleNumber || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, vehicleNumber: e.target.value });
                        if (e.target.value.trim()) clearStep3Error('vehicleNumber');
                      }}
                      placeholder="ABC 1234"
                      className={step3Errors.vehicleNumber ? 'border-red-500 bg-red-50' : ''}
                    />
                    {step3Errors.vehicleNumber && (
                      <p className="text-xs text-red-600 flex items-center">
                        <AlertCircle className="size-3 mr-1" />
                        {step3Errors.vehicleNumber}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Packing Photos (Optional)</Label>
              <Button variant="outline" onClick={handlePhotoUpload} className="w-full" disabled={isUploading}>
                {isUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
              {packingPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {packingPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img src={photo} alt={`Packing ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 size-6 p-0"
                        onClick={() => removePhoto(index, 'packing')}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {formData.status !== 'Packing & Loading' && (
                <Button
                  onClick={handleStartPacking}
                  variant="outline"
                  className="flex-1"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                  {isSaving ? 'Saving...' : 'Start Packing'}
                </Button>
              )}
              <Button
                onClick={handleCompleteLoading}
                className="bg-[#F15929] hover:bg-[#d94d1f] flex-1"
                disabled={!scheduledDate || !scheduleTimeSlot || (formData.type === 'delivery' && (!formData.driverName || !formData.vehicleNumber)) || isSaving}
              >
                {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
                {isSaving ? 'Saving...' : 'Complete Loading'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-[#F15929]" />
              Step 4: {formData.type === 'delivery' ? 'In Transit - Customer Sign & OTP' : 'Ready for Pickup - Customer Sign & OTP'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {formData.type === 'delivery' 
                ? 'Items are on the way. Customer needs to sign and verify OTP upon receiving goods.' 
                : 'Items are ready for pickup. Customer needs to sign and verify OTP when collecting goods.'}
            </p>

            {formData.type === 'delivery' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="size-5 text-blue-600" />
                  <span className="text-blue-900">In Transit</span>
                </div>
                <div className="text-sm text-blue-700">
                  <p>Driver: {formData.driverName}</p>
                  <p>Vehicle: {formData.vehicleNumber}</p>
                  <p>Contact: {formData.driverContact}</p>
                </div>
              </div>
            )}

            {formData.type === 'pickup' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <PackageCheck className="size-5 text-green-600" />
                  <span className="text-green-900">Ready for Pickup</span>
                </div>
                <div className="text-sm text-green-700">
                  <p>Items are packed and ready at warehouse</p>
                  <p>Pickup Time: {scheduledDate && format(new Date(scheduledDate), 'PPP')} {scheduleTimeSlot}</p>
                </div>
              </div>
            )}

            {/* View DO for Customer */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#231F20] mb-1">Delivery Order Document</p>
                  <p className="text-sm text-gray-600">Share DO with customer for verification</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    toast.info('Generating DO preview...');
                    // In a real app, this would open a PDF viewer or download the DO
                    setTimeout(() => {
                      toast.success('DO preview generated. Share this with customer.');
                      setIsDOViewerOpen(true);
                    }, 1000);
                  }}
                >
                  <FileText className="size-4 mr-2" />
                  View DO
                </Button>
              </div>
            </div>

            {/* Delivery Photos */}
            <div className="space-y-2">
              <Label>{formData.type === 'delivery' ? 'Delivery Photos (Optional)' : 'Pickup Photos (Optional)'}</Label>
              <Button variant="outline" onClick={handlePhotoUpload} className="w-full" disabled={isUploading}>
                {isUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
              {deliveryPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {deliveryPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img src={photo} alt={`Delivery ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 size-6 p-0"
                        onClick={() => removePhoto(index, 'delivery')}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label className={step4Errors.customerId ? 'text-red-600' : ''}>Select Customer *</Label>
              <Select 
                value={selectedCustomerId} 
                onValueChange={(value) => {
                  setSelectedCustomerId(value);
                  clearStep4Error('customerId');
                  const customer = customers.find(c => c.id === value);
                  if (customer) {
                    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
                    setCustomerName(fullName);
                  }
                }}
              >
                <SelectTrigger className={step4Errors.customerId ? 'border-red-500 bg-red-50' : ''}>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                  ) : (
                    customers.map((customer) => {
                      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
                      return (
                        <SelectItem key={customer.id} value={customer.id}>
                          {fullName || 'No Name'} - {customer.email}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {step4Errors.customerId && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step4Errors.customerId}
                </p>
              )}
              {selectedCustomerId && !step4Errors.customerId && (
                <p className="text-sm text-gray-500">
                  OTP will be sent to: {customers.find(c => c.id === selectedCustomerId)?.email}
                </p>
              )}
            </div>

            {/* Customer Signature */}
            <div className="space-y-2">
              <Label className={step4Errors.signature ? 'text-red-600' : ''}>Customer Signature *</Label>
              {formData.customerSignature ? (
                <div className={`border rounded-lg p-4 ${step4Errors.signature ? 'border-red-500 bg-red-50' : ''}`}>
                  <img src={formData.customerSignature} alt="Signature" className="max-h-32" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      openSignatureDialog('customer');
                      clearStep4Error('signature');
                    }}
                    className="mt-2"
                  >
                    Change Signature
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    openSignatureDialog('customer');
                    clearStep4Error('signature');
                  }} 
                  className={`w-full ${step4Errors.signature ? 'border-red-500 bg-red-50 text-red-700' : ''}`}
                >
                  <FileSignature className="size-4 mr-2" />
                  Capture Customer Signature
                </Button>
              )}
              {step4Errors.signature && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="size-3 mr-1" />
                  {step4Errors.signature}
                </p>
              )}
            </div>

            {/* OTP Section */}
            <div className="space-y-2">
              <Label className={step4Errors.otp ? 'text-red-600' : ''}>OTP Verification *</Label>
              {!otpSent ? (
                <Button
                  variant="outline"
                  onClick={handleSendOTP}
                  className="w-full"
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Phone className="size-4 mr-2" />
                      Send OTP to Customer Email
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      <CheckCircle2 className="size-4 inline mr-1" />
                      OTP sent to: <strong>{customers.find(c => c.id === selectedCustomerId)?.email}</strong>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Ask customer to check their email for the verification code
                    </p>
                  </div>
                  <Input
                    value={otpInput}
                    onChange={(e) => {
                      setOtpInput(e.target.value);
                      if (e.target.value.length === 6) {
                        clearStep4Error('otp');
                      }
                    }}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className={step4Errors.otp ? 'border-red-500 bg-red-50' : ''}
                  />
                  {step4Errors.otp && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertCircle className="size-3 mr-1" />
                      {step4Errors.otp}
                    </p>
                  )}
                  <Button
                    onClick={handleVerifyOTP}
                    className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
                    {isSaving ? 'Saving...' : 'Verify OTP & Complete'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" />
              {formData.type === 'delivery' ? 'Delivery' : 'Pickup'} Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
              <h3 className="text-[#231F20] mb-2">Successfully Completed!</h3>
              <p className="text-gray-600 mb-6">
                Customer has signed and OTP verified. Inventory has been updated.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg text-left space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">DO Number:</span>
                  <span className="text-[#231F20]">{formData.doNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="text-[#231F20]">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed At:</span>
                  <span className="text-[#231F20]">
                    {formData.customerAcknowledgedAt && format(new Date(formData.customerAcknowledgedAt), 'PPp')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">OTP Verified:</span>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="size-3 mr-1" />
                    Yes
                  </Badge>
                </div>
              </div>

              <Button
                onClick={handleComplete}
                className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                {isSaving ? 'Saving...' : 'Save & Return to List'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature Dialog */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{signatureType === 'driver' ? 'Driver' : 'Customer'} Signature</DialogTitle>
            <DialogDescription>
              Please have the {signatureType} sign below using mouse or touch
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-gray-300 rounded-lg">
              <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearSignature} className="flex-1">
                <X className="size-4 mr-2" />
                Clear
              </Button>
              <Button onClick={saveSignature} className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]">
                <Check className="size-4 mr-2" />
                Save Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DO Viewer Dialog */}
      <Dialog open={isDOViewerOpen} onOpenChange={setIsDOViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Order - {formData.doNumber}</DialogTitle>
            <DialogDescription>
              Delivery Order document for customer verification
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 p-6 bg-white border rounded-lg">
            {/* Company Header */}
            <div className="text-center border-b-2 border-[#F15929] pb-4">
              <h2 className="text-[#231F20] mb-1">Power Metal & Steel</h2>
              <p className="text-sm text-gray-600">Scaffolding Rental & Sales</p>
              <p className="text-sm text-gray-600">Tel: +60 3-1234 5678 | Email: info@powermetalsteel.com</p>
            </div>

            {/* DO Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-[#F15929] mb-2">DELIVERY ORDER</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>DO Number:</strong> {formData.doNumber}</p>
                  <p><strong>Date:</strong> {formData.packingListDate && format(new Date(formData.packingListDate), 'PP')}</p>
                  <p><strong>Order ID:</strong> {formData.orderId}</p>
                  <p><strong>Agreement ID:</strong> {formData.agreementId}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={formData.type === 'delivery' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                  {formData.type === 'delivery' ? 'DELIVERY' : 'PICKUP'}
                </Badge>
              </div>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="text-[#231F20] mb-2">Customer Details</h4>
                <p className="text-sm"><strong>Name:</strong> {formData.customerName}</p>
                <p className="text-sm"><strong>Contact:</strong> {formData.customerContact}</p>
                <p className="text-sm"><strong>Address:</strong> {formData.customerAddress}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-[#231F20] mb-2">{formData.type === 'delivery' ? 'Delivery' : 'Pickup'} Location</h4>
                <p className="text-sm">{formData.siteAddress}</p>
                {scheduledDate && (
                  <>
                    <p className="text-sm"><strong>Date:</strong> {format(scheduledDate, 'PPP')}</p>
                    <p className="text-sm"><strong>Time:</strong> {scheduleTimeSlot}</p>
                  </>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-[#231F20] mb-2">Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 border-b">#</th>
                      <th className="text-left p-3 border-b">Description</th>
                      <th className="text-right p-3 border-b">Quantity</th>
                      <th className="text-right p-3 border-b">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items?.map((item, index) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">{item.scaffoldingItemName}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery/Pickup Information */}
            {formData.type === 'delivery' && formData.driverName && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-[#231F20] mb-2">Driver Information</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Driver Name</p>
                    <p className="text-[#231F20]">{formData.driverName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Contact</p>
                    <p className="text-[#231F20]">{formData.driverContact}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Vehicle</p>
                    <p className="text-[#231F20]">{formData.vehicleNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="text-xs text-gray-600 space-y-1 border-t pt-4">
              <p className="text-[#231F20] mb-2"><strong>Terms and Conditions:</strong></p>
              <p>1. Please inspect all items upon {formData.type === 'delivery' ? 'delivery' : 'pickup'} and report any discrepancies immediately.</p>
              <p>2. Customer signature and OTP verification required to complete this order.</p>
              <p>3. All rental items must be returned in good condition as per the rental agreement.</p>
              <p>4. Late returns may be subject to additional charges as per agreement terms.</p>
            </div>

            {/* Footer */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t">
              <div>
                <p className="text-sm text-gray-600 mb-2">Prepared By</p>
                <div className="border-t border-gray-300 pt-2 mt-8">
                  <p className="text-sm text-[#231F20]">{formData.createdBy}</p>
                  <p className="text-xs text-gray-500">Power Metal & Steel</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Received By (Customer)</p>
                <div className="border-t border-gray-300 pt-2 mt-8">
                  <p className="text-sm text-[#231F20]">_______________________</p>
                  <p className="text-xs text-gray-500">Name & Signature</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.print();
                  toast.success('Print dialog opened');
                }}
              >
                <Download className="size-4 mr-2" />
                Print DO
              </Button>
              <Button
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]"
                onClick={() => setIsDOViewerOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
}