import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Check, PackageCheck, Calendar as CalendarIcon,
  ClipboardCheck, Truck, FileSignature, Upload, X, Image as ImageIcon,
  ArrowRight, User, Phone, MapPin, AlertCircle, Download, FileText, CheckCircle2,
  Loader2, PackageX, Settings, Eye, AlertTriangle, Package
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

export interface ReturnItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  quantityReturned: number;
  status: 'Good' | 'Damaged' | 'Repairable' | 'To Retire' | 'Ready to Reuse';
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
  grnNumber?: string;
  rcfNumber?: string;
  customer: string;
  customerContact?: string;
  orderId: string;
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
  onSave: (returnOrder: Return) => void;
  onBack: () => void;
}

const TIME_SLOTS = [
  '09:00 - 12:00',
  '12:00 - 15:00',
  '15:00 - 18:00',
];

export function ReturnWorkflow({ returnOrder, onSave, onBack }: ReturnWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Return>>(returnOrder || {
    items: [],
    status: 'Requested',
    returnType: 'Full',
    transportationType: 'Self Return',
    requestDate: new Date().toISOString(),
  });

  // Pickup scheduling
  const [pickupDate, setPickupDate] = useState<Date>();
  const [pickupTimeSlot, setPickupTimeSlot] = useState('');
  
  // Photos
  const [driverPhotos, setDriverPhotos] = useState<string[]>([]);
  const [warehousePhotos, setWarehousePhotos] = useState<string[]>([]);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Inspection
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [hasExternalGoods, setHasExternalGoods] = useState(false);
  const [externalGoodsNotes, setExternalGoodsNotes] = useState('');
  
  // Item statuses for inspection
  const [itemStatuses, setItemStatuses] = useState<Record<string, ReturnItem['status']>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  
  // RCF Dialog
  const [isRCFDialogOpen, setIsRCFDialogOpen] = useState(false);

  useEffect(() => {
    if (returnOrder) {
      setFormData(returnOrder);
      // Set current step based on status
      const statusToStep: Record<Return['status'], number> = {
        'Requested': 1,
        'Approved': formData.transportationType === 'Transportation Needed' ? 2 : 4,
        'Pickup Scheduled': 2,
        'Pickup Confirmed': 3,
        'Driver Recording': 3,
        'In Transit': 3,
        'Received at Warehouse': 4,
        'Under Inspection': 5,
        'Sorting Complete': 6,
        'Customer Notified': 7,
        'Dispute Raised': 7,
        'Completed': formData.transportationType === 'Transportation Needed' ? 8 : 6,
      };
      setCurrentStep(statusToStep[returnOrder.status] || 1);
      
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
        // Auto-fill with default time slot (first slot) for new requests
        setPickupTimeSlot(TIME_SLOTS[0]);
      }
      
      // Pre-fill item statuses
      const statuses: Record<string, ReturnItem['status']> = {};
      const notes: Record<string, string> = {};
      returnOrder.items?.forEach(item => {
        statuses[item.id] = item.status;
        if (item.notes) notes[item.id] = item.notes;
      });
      setItemStatuses(statuses);
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
    }
  }, [returnOrder]);

  // Steps depend on transportation type
  const getSteps = () => {
    if (formData.transportationType === 'Transportation Needed') {
      return [
        { number: 1, title: 'Approve & Schedule' },
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

  const handleApproveAndSchedule = () => {
    if (formData.transportationType === 'Transportation Needed') {
      if (!pickupDate || !pickupTimeSlot) {
        toast.error('Please select pickup date and time slot');
        return;
      }
      
      setFormData({
        ...formData,
        status: 'Pickup Scheduled',
        pickupDate: pickupDate.toISOString(),
        pickupTimeSlot,
      });
      toast.success('Return approved and pickup scheduled');
      setCurrentStep(2);
    } else {
      setFormData({
        ...formData,
        status: 'Approved',
      });
      toast.success('Return approved - awaiting customer self-return');
      setCurrentStep(2);
    }
  };

  const handleConfirmPickup = () => {
    if (!formData.pickupDriver || !formData.driverContact) {
      toast.error('Please enter driver name and contact');
      return;
    }
    
    setFormData({
      ...formData,
      status: 'Pickup Confirmed',
    });
    toast.success('Pickup confirmed');
    setCurrentStep(3);
  };

  const handleDriverRecording = () => {
    if (driverPhotos.length === 0) {
      toast.error('Please upload at least one photo of the goods');
      return;
    }
    
    const photos: ReturnPhoto[] = driverPhotos.map((url, index) => ({
      url,
      uploadedAt: new Date().toISOString(),
      description: `Driver photo ${index + 1}`,
      uploadedBy: formData.pickupDriver || 'Driver',
    }));
    
    setFormData({
      ...formData,
      driverRecordPhotos: photos,
      status: 'In Transit',
    });
    toast.success('Driver recording saved - items in transit');
    setCurrentStep(4);
  };

  const handleReceiveAtWarehouse = () => {
    if (warehousePhotos.length === 0) {
      toast.error('Please upload at least one photo of received goods');
      return;
    }
    
    const photos: ReturnPhoto[] = warehousePhotos.map((url, index) => ({
      url,
      uploadedAt: new Date().toISOString(),
      description: `Warehouse photo ${index + 1}`,
      uploadedBy: 'Warehouse Staff',
    }));
    
    setFormData({
      ...formData,
      warehousePhotos: photos,
      status: 'Received at Warehouse',
    });
    
    toast.success('Goods received at warehouse');
    
    if (formData.transportationType === 'Transportation Needed') {
      setCurrentStep(5);
    } else {
      setCurrentStep(3);
    }
  };

  const handleCompleteInspection = () => {
    // Validate all items have status
    const allItemsHaveStatus = formData.items?.every(item => itemStatuses[item.id]);
    if (!allItemsHaveStatus) {
      toast.error('Please set status for all items');
      return;
    }
    
    // Update items with statuses and notes
    const updatedItems = formData.items?.map(item => ({
      ...item,
      status: itemStatuses[item.id],
      notes: itemNotes[item.id] || undefined,
    }));
    
    // Generate GRN
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    setFormData({
      ...formData,
      items: updatedItems,
      productionNotes: inspectionNotes,
      hasExternalGoods,
      externalGoodsNotes: hasExternalGoods ? externalGoodsNotes : undefined,
      grnNumber,
      status: 'Under Inspection',
    });
    
    toast.success(`GRN ${grnNumber} generated`);
    
    if (formData.transportationType === 'Transportation Needed') {
      setCurrentStep(6);
    } else {
      setCurrentStep(4);
    }
  };

  const handleGenerateRCF = () => {
    const rcfNumber = `RCF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    setFormData({
      ...formData,
      rcfNumber,
      status: 'Sorting Complete',
    });
    
    toast.success(`RCF ${rcfNumber} generated`);
    setIsRCFDialogOpen(false);
    
    if (formData.transportationType === 'Transportation Needed') {
      setCurrentStep(7);
    } else {
      setCurrentStep(5);
    }
  };

  const handleSkipRCF = () => {
    setFormData({
      ...formData,
      status: 'Sorting Complete',
    });
    
    toast.info('RCF skipped');
    setIsRCFDialogOpen(false);
    
    if (formData.transportationType === 'Transportation Needed') {
      setCurrentStep(7);
    } else {
      setCurrentStep(5);
    }
  };

  const handleNotifyCustomer = () => {
    setFormData({
      ...formData,
      customerNotificationSent: true,
      status: 'Customer Notified',
    });
    
    toast.success('Customer notification sent');
    
    if (formData.transportationType === 'Transportation Needed') {
      setCurrentStep(8);
    } else {
      setCurrentStep(6);
    }
  };

  const handleComplete = () => {
    setFormData({
      ...formData,
      inventoryUpdated: true,
      soaUpdated: true,
      status: 'Completed',
    });
    
    toast.success('Return process completed - inventory and SOA updated');
    
    // Save and go back
    setTimeout(() => {
      onSave(formData as Return);
    }, 500);
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
          // Determine which photos array to update based on current step
          const isTransportNeeded = formData.transportationType === 'Transportation Needed';
          
          if (isTransportNeeded) {
            if (currentStep === 3) {
              setDriverPhotos([...driverPhotos, ...newPhotos]);
            } else if (currentStep === 4) {
              setWarehousePhotos([...warehousePhotos, ...newPhotos]);
            } else if (currentStep === 5) {
              setDamagePhotos([...damagePhotos, ...newPhotos]);
            }
          } else {
            if (currentStep === 2) {
              setWarehousePhotos([...warehousePhotos, ...newPhotos]);
            } else if (currentStep === 3) {
              setDamagePhotos([...damagePhotos, ...newPhotos]);
            }
          }
          
          toast.success(`${newPhotos.length} photo(s) uploaded`);
        }
      };
      reader.onerror = () => {
        toast.error(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index: number, type: 'driver' | 'warehouse' | 'damage') => {
    if (type === 'driver') {
      setDriverPhotos(driverPhotos.filter((_, i) => i !== index));
    } else if (type === 'warehouse') {
      setWarehousePhotos(warehousePhotos.filter((_, i) => i !== index));
    } else {
      setDamagePhotos(damagePhotos.filter((_, i) => i !== index));
    }
    toast.success('Photo removed');
  };

  const getItemStatusBadge = (status: ReturnItem['status']) => {
    const config = {
      'Pending': { color: 'bg-gray-100 text-gray-800', icon: Package },
      'Good': { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      'Damaged': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      'Repairable': { color: 'bg-amber-100 text-amber-800', icon: Settings },
      'To Retire': { color: 'bg-gray-100 text-gray-800', icon: PackageX },
      'Ready to Reuse': { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
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
            {returnOrder ? `Process Return - ${returnOrder.id}` : 'New Return'}
          </h1>
          <p className="text-gray-600">
            {formData.customer} - {formData.orderId} ({formData.transportationType})
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
              Step 1: {formData.transportationType === 'Transportation Needed' ? 'Approve Return & Schedule Pickup' : 'Approve Return Request'}
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
                  <Label>Pickup Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 size-4" />
                        {pickupDate ? format(pickupDate, 'PPP') : 'Select pickup date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={setPickupDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Pickup Time Slot</Label>
                  <Select value={pickupTimeSlot} onValueChange={setPickupTimeSlot}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(slot => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              onClick={handleApproveAndSchedule}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
            >
              <Check className="size-4 mr-2" />
              {formData.transportationType === 'Transportation Needed' ? 'Approve & Schedule Pickup' : 'Approve Return'}
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
                Scheduled Pickup: {pickupDate && format(pickupDate, 'PPP')} {pickupTimeSlot}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                value={formData.pickupDriver || ''}
                onChange={(e) => setFormData({ ...formData, pickupDriver: e.target.value })}
                placeholder="Enter driver name"
              />
            </div>

            <div className="space-y-2">
              <Label>Driver Contact</Label>
              <Input
                value={formData.driverContact || ''}
                onChange={(e) => setFormData({ ...formData, driverContact: e.target.value })}
                placeholder="+60 12-345-6789"
              />
            </div>

            <Button
              onClick={handleConfirmPickup}
              className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
              disabled={!formData.pickupDriver || !formData.driverContact}
            >
              <Check className="size-4 mr-2" />
              Confirm Pickup
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
              <Label>Driver Photos (Required)</Label>
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
              disabled={driverPhotos.length === 0}
            >
              <Check className="size-4 mr-2" />
              Save Recording & Mark In Transit
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
              <Label>Warehouse Receipt Photos (Required)</Label>
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
              disabled={warehousePhotos.length === 0}
            >
              <Check className="size-4 mr-2" />
              Confirm Receipt at Warehouse
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
            <div className="space-y-3">
              <Label>Item Condition Assessment</Label>
              {formData.items?.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#231F20]">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantityReturned} | Category: {item.category}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Condition Status</Label>
                    <Select 
                      value={itemStatuses[item.id] || ''} 
                      onValueChange={(value) => setItemStatuses({ ...itemStatuses, [item.id]: value as ReturnItem['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                        <SelectItem value="Repairable">Repairable</SelectItem>
                        <SelectItem value="To Retire">To Retire</SelectItem>
                        <SelectItem value="Ready to Reuse">Ready to Reuse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={itemNotes[item.id] || ''}
                      onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                      placeholder="Any specific notes about this item..."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
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
              <div className="space-y-2">
                <Label>External Goods Notes</Label>
                <Textarea
                  value={externalGoodsNotes}
                  onChange={(e) => setExternalGoodsNotes(e.target.value)}
                  placeholder="Describe the external goods..."
                  rows={2}
                />
              </div>
            )}

            {/* Damage Photos (Optional) */}
            <div className="space-y-2">
              <Label>Damage Photos (Optional)</Label>
              <Button variant="outline" onClick={handlePhotoUpload} className="w-full">
                <Upload className="size-4 mr-2" />
                Upload Damage Photos
              </Button>
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
            >
              <FileText className="size-4 mr-2" />
              Complete Inspection & Generate GRN
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
              Review inspection results and generate RCF if needed for damaged/repairable items.
            </p>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <CheckCircle2 className="size-4 inline mr-1" />
                GRN Generated: {formData.grnNumber}
              </p>
            </div>

            {/* Summary of Items by Status */}
            <div className="space-y-2">
              <Label>Items Summary</Label>
              {formData.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-[#231F20]">{item.name}</p>
                  </div>
                  <div>
                    {getItemStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setIsRCFDialogOpen(true)}
                className="bg-[#F15929] hover:bg-[#d94d1f] flex-1"
              >
                <FileText className="size-4 mr-2" />
                Generate RCF
              </Button>
              <Button
                onClick={handleSkipRCF}
                variant="outline"
                className="flex-1"
              >
                Skip RCF
              </Button>
            </div>
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

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <p className="text-sm text-blue-800">
                <FileText className="size-4 inline mr-1" />
                GRN: {formData.grnNumber}
              </p>
              {formData.rcfNumber && (
                <p className="text-sm text-blue-800">
                  <FileText className="size-4 inline mr-1" />
                  RCF: {formData.rcfNumber}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notification Summary</Label>
              <div className="p-3 border rounded-lg space-y-2 text-sm">
                <p>Customer: {formData.customer}</p>
                <p>Order ID: {formData.orderId}</p>
                <p>Items Returned: {formData.items?.length} items</p>
                <p>
                  Good Items: {formData.items?.filter(i => i.status === 'Good' || i.status === 'Ready to Reuse').length}
                </p>
                <p>
                  Damaged/Repairable: {formData.items?.filter(i => i.status === 'Damaged' || i.status === 'Repairable').length}
                </p>
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

            <div className="p-4 border rounded-lg space-y-2">
              <Label className="text-[#231F20]">Final Actions</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Update Inventory</span>
                  <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Update Statement of Account</span>
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
              {formData.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-[#231F20]">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantityReturned}</p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">Note: {item.notes}</p>
                    )}
                  </div>
                  <div>
                    {getItemStatusBadge(item.status)}
                  </div>
                </div>
              ))}
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
    </div>
  );
}