import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Check, PackageCheck, Calendar as CalendarIcon,
  ClipboardCheck, Truck, FileSignature, Upload, X, Image as ImageIcon,
  ArrowRight, User, Phone, MapPin, AlertCircle, Download, FileText, CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
  onSave: (delivery: DeliveryOrder) => void;
  onBack: () => void;
}

const TIME_SLOTS = [
  '09:00 - 12:00',
  '12:00 - 15:00',
  '15:00 - 18:00',
];

export function DeliveryWorkflow({ delivery, onSave, onBack }: DeliveryWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<DeliveryOrder>>(delivery || {
    items: [],
    status: 'pending',
    type: 'delivery',
    createdBy: 'Current User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [stockCheckNotes, setStockCheckNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState('');
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

  useEffect(() => {
    if (delivery) {
      setFormData(delivery);
      // Set current step based on status
      const statusToStep: Record<DeliveryOrder['status'], number> = {
        pending: 1,
        packing_list_issued: 2,
        stock_checked: 3,
        packing_loading: 4,
        in_transit: 4,
        ready_for_pickup: 4,
        completed: 5,
      };
      setCurrentStep(statusToStep[delivery.status] || 1);
      
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

  const handleGeneratePackingList = () => {
    if (!formData.items || formData.items.length === 0) {
      toast.error('No items to pack');
      return;
    }

    const plNumber = `PL-${Date.now().toString().slice(-8)}`;
    
    setFormData({
      ...formData,
      packingListNumber: plNumber,
      packingListDate: new Date().toISOString(),
      status: 'packing_list_issued',
      updatedAt: new Date().toISOString(),
    });

    toast.success(`Packing list ${plNumber} generated`);
    setCurrentStep(2);
  };

  const handleStockCheck = () => {
    if (!formData.items || formData.items.length === 0) {
      toast.error('No items to check');
      return;
    }

    const allAvailable = formData.items?.every(item => item.availableStock >= item.quantity);
    
    setFormData({
      ...formData,
      stockCheckDate: new Date().toISOString(),
      stockCheckBy: 'Current User',
      stockCheckNotes,
      allItemsAvailable: allAvailable,
      status: 'stock_checked',
      updatedAt: new Date().toISOString(),
    });

    if (!allAvailable) {
      toast.warning('Some items have insufficient stock. Please proceed with caution.');
    }
    
    toast.success('Stock check completed successfully');
    setCurrentStep(3);
  };

  const handleStartPacking = () => {
    if (!scheduledDate || !scheduleTimeSlot) {
      toast.error('Please select delivery/pickup date and time slot');
      return;
    }

    setFormData({
      ...formData,
      scheduledDate: scheduledDate.toISOString(),
      scheduledTimeSlot: scheduleTimeSlot,
      packingStartedAt: new Date().toISOString(),
      packingStartedBy: 'Current User',
      status: 'packing_loading',
      updatedAt: new Date().toISOString(),
    });
    toast.success('Packing started');
  };

  const handleCompleteLoading = () => {
    if (formData.type === 'delivery') {
      // For delivery, need driver details
      if (!formData.driverName || !formData.vehicleNumber) {
        toast.error('Please enter driver and vehicle details');
        return;
      }
    }

    const newStatus = formData.type === 'delivery' ? 'in_transit' : 'ready_for_pickup';

    setFormData({
      ...formData,
      loadingCompletedAt: new Date().toISOString(),
      loadingCompletedBy: 'Current User',
      packingPhotos,
      status: newStatus,
      dispatchedAt: formData.type === 'delivery' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });

    if (formData.type === 'delivery') {
      toast.success('Items loaded and dispatched for delivery');
    } else {
      toast.success('Items packed and ready for customer pickup');
    }
    setCurrentStep(4);
  };

  const handleSendOTP = () => {
    if (!customerName) {
      toast.error('Please enter customer name');
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setOtpSent(true);
    toast.success(`OTP sent to customer: ${otp}`);
  };

  const handleVerifyOTP = () => {
    if (otpInput !== generatedOtp) {
      toast.error('Invalid OTP. Please try again.');
      return;
    }

    if (!formData.customerSignature) {
      toast.error('Customer signature required');
      return;
    }

    setFormData({
      ...formData,
      deliveredAt: new Date().toISOString(),
      customerAcknowledgedAt: new Date().toISOString(),
      customerSignature: formData.customerSignature,
      customerSignedBy: customerName,
      customerOTP: generatedOtp,
      verifiedOTP: true,
      deliveryPhotos,
      status: 'completed',
      inventoryUpdatedAt: new Date().toISOString(),
      inventoryStatus: 'Rental',
      updatedAt: new Date().toISOString(),
    });

    toast.success('OTP verified and delivery completed!');
    setCurrentStep(5);
  };

  const handleComplete = () => {
    toast.success('Delivery process completed successfully');
    
    // Save and go back
    setTimeout(() => {
      onSave(formData as DeliveryOrder);
    }, 500);
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
      toast.success('Customer signature saved');
    } else if (signatureType === 'driver') {
      setFormData({ ...formData, driverSignature: signatureData });
      toast.success('Driver signature saved');
    }
    setIsSignatureDialogOpen(false);
    clearSignature();
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    let loadedCount = 0;
    const newPhotos: string[] = [];

    fileArray.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        newPhotos.push(url);
        loadedCount++;

        if (loadedCount === fileArray.length) {
          if (currentStep === 3) {
            setPackingPhotos([...packingPhotos, ...newPhotos]);
            toast.success(`${newPhotos.length} photo(s) uploaded`);
          } else if (currentStep === 4) {
            setDeliveryPhotos([...deliveryPhotos, ...newPhotos]);
            toast.success(`${newPhotos.length} photo(s) uploaded`);
          }
        }
      };
      reader.onerror = () => {
        toast.error(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
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
              disabled={!formData.items || formData.items.length === 0}
            >
              <FileText className="size-4 mr-2" />
              Generate Packing List
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
            >
              <Check className="size-4 mr-2" />
              Complete Stock Check
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

            {/* Schedule Date & Time - Auto-filled from Delivery Request */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 mb-2">
                <CalendarIcon className="size-4 inline mr-1" />
                Scheduled {formData.type === 'delivery' ? 'Delivery' : 'Pickup'} Date & Time (Auto-filled from request)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-gray-600">Date:</span>
                  <p className="text-[#231F20]">{scheduledDate ? format(scheduledDate, 'PPP') : 'Not set'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-600">Time Slot:</span>
                  <p className="text-[#231F20]">{scheduleTimeSlot || 'Not set'}</p>
                </div>
              </div>
            </div>

            {formData.type === 'delivery' && (
              <>
                <div className="space-y-2">
                  <Label>Driver Name</Label>
                  <Input
                    value={formData.driverName || ''}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="Enter driver name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Driver Contact</Label>
                    <Input
                      value={formData.driverContact || ''}
                      onChange={(e) => setFormData({ ...formData, driverContact: e.target.value })}
                      placeholder="+60 12-345-6789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Vehicle Number</Label>
                    <Input
                      value={formData.vehicleNumber || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      placeholder="ABC 1234"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Packing Photos (Optional)</Label>
              <Button variant="outline" onClick={handlePhotoUpload} className="w-full">
                <Upload className="size-4 mr-2" />
                Upload Photos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onFileSelect}
                className="hidden"
              />
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
              {formData.status !== 'packing_loading' && (
                <Button
                  onClick={handleStartPacking}
                  variant="outline"
                  className="flex-1"
                >
                  Start Packing
                </Button>
              )}
              <Button
                onClick={handleCompleteLoading}
                className="bg-[#F15929] hover:bg-[#d94d1f] flex-1"
                disabled={!scheduledDate || !scheduleTimeSlot || (formData.type === 'delivery' && (!formData.driverName || !formData.vehicleNumber))}
              >
                <Check className="size-4 mr-2" />
                Complete Loading
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
              <Button variant="outline" onClick={handlePhotoUpload} className="w-full">
                <Upload className="size-4 mr-2" />
                Upload Photos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onFileSelect}
                className="hidden"
              />
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

            {/* Customer Name */}
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>

            {/* Customer Signature */}
            <div className="space-y-2">
              <Label>Customer Signature</Label>
              {formData.customerSignature ? (
                <div className="border rounded-lg p-4">
                  <img src={formData.customerSignature} alt="Signature" className="max-h-32" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSignatureDialog('customer')}
                    className="mt-2"
                  >
                    Change Signature
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => openSignatureDialog('customer')} className="w-full">
                  <FileSignature className="size-4 mr-2" />
                  Capture Customer Signature
                </Button>
              )}
            </div>

            {/* OTP Section */}
            <div className="space-y-2">
              <Label>OTP Verification</Label>
              {!otpSent ? (
                <Button
                  variant="outline"
                  onClick={handleSendOTP}
                  className="w-full"
                  disabled={!customerName}
                >
                  <Phone className="size-4 mr-2" />
                  Send OTP to Customer
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      <CheckCircle2 className="size-4 inline mr-1" />
                      OTP sent: <strong>{generatedOtp}</strong>
                    </p>
                  </div>
                  <Input
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleVerifyOTP}
                    className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
                    disabled={otpInput.length !== 6 || !formData.customerSignature}
                  >
                    <Check className="size-4 mr-2" />
                    Verify OTP & Complete
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
              >
                <Save className="size-4 mr-2" />
                Save & Return to List
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