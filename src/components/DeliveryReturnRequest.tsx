import React, { useState } from 'react';
import { Search, Plus, FileText, Truck, Package, CheckCircle, Clock, XCircle, Phone, Mail, MapPin, Calendar, User, DollarSign, Check, X } from 'lucide-react';

type RequestType = 'delivery' | 'pickup';
type RequestStatus = 'Pending Quote' | 'Quoted' | 'Customer Reviewing' | 'Accepted' | 'Rejected' | 'Sent to Delivery';

interface DeliverySet {
  id: string;
  setName: string;
  items: { name: string; quantity: number }[];
  scheduledPeriod: string;
  rentalAmount: number;
  status: RequestStatus;
  deliveryFee?: number;
  totalAmount?: number;
  quotedDate?: string;
  acceptedDate?: string;
  doNumber?: string;
}

interface DeliveryRequest {
  id: string;
  requestId: string;
  projectName: string;
  customerName: string;
  agreementNo: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  requestType: RequestType;
  sets: DeliverySet[];
  requestDate: string;
  scheduledDate?: string;
  pickupTime?: string;
}

interface ReturnRequest {
  id: string;
  requestId: string;
  projectName: string;
  customerName: string;
  agreementNo: string;
  setName: string;
  requestDate: string;
  scheduledDate?: string;
  status: 'Pending' | 'Scheduled' | 'Completed' | 'Cancelled';
  reason: string;
  customerPhone: string;
}

export default function DeliveryReturnRequest() {
  const [activeTab, setActiveTab] = useState<'delivery' | 'return'>('delivery');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [selectedSet, setSelectedSet] = useState<DeliverySet | null>(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReturnScheduleModal, setShowReturnScheduleModal] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState<ReturnRequest | null>(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<string>('');
  const [showAddDeliveryModal, setShowAddDeliveryModal] = useState(false);
  const [showAddReturnModal, setShowAddReturnModal] = useState(false);

  // Form states
  const [deliveryFee, setDeliveryFee] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [notes, setNotes] = useState('');

  // Add Delivery Request Form States
  const [newDeliveryRequest, setNewDeliveryRequest] = useState({
    projectName: '',
    customerName: '',
    agreementNo: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    requestType: 'delivery' as RequestType,
    sets: [] as { setName: string; items: { name: string; quantity: number }[]; scheduledPeriod: string; rentalAmount: number }[]
  });

  // Add Return Request Form States
  const [newReturnRequest, setNewReturnRequest] = useState({
    projectName: '',
    customerName: '',
    agreementNo: '',
    setName: '',
    reason: '',
    customerPhone: ''
  });

  // Temporary state for adding items to a set
  const [currentSetName, setCurrentSetName] = useState('');
  const [currentScheduledPeriod, setCurrentScheduledPeriod] = useState('');
  const [currentRentalAmount, setCurrentRentalAmount] = useState('');
  const [currentItems, setCurrentItems] = useState<{ name: string; quantity: number }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');

  // Data state (empty by default)
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);

  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'Pending Quote': return 'bg-gray-100 text-gray-800';
      case 'Quoted': return 'bg-blue-100 text-blue-800';
      case 'Customer Reviewing': return 'bg-yellow-100 text-yellow-800';
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Sent to Delivery': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canQuoteSet = (request: DeliveryRequest, set: DeliverySet) => {
    const setIndex = request.sets.findIndex(s => s.id === set.id);
    if (setIndex === 0) return true;
    const previousSet = request.sets[setIndex - 1];
    return previousSet.status === 'Sent to Delivery' || previousSet.status === 'Accepted';
  };

  const handleIssueQuotation = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowQuotationModal(true);
  };

  const handleConfirmQuotation = () => {
    if (selectedRequest && selectedSet) {
      const fee = selectedRequest.requestType === 'delivery' ? parseFloat(deliveryFee) : 0;
      const total = selectedSet.rentalAmount + fee;

      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            sets: req.sets.map(s => {
              if (s.id === selectedSet.id) {
                return {
                  ...s,
                  deliveryFee: fee,
                  totalAmount: total,
                  status: 'Quoted' as RequestStatus,
                  quotedDate: new Date().toISOString().split('T')[0]
                };
              }
              return s;
            })
          };
        }
        return req;
      });
      setDeliveryRequests(updatedRequests);
      setShowQuotationModal(false);
      setDeliveryFee('');
      alert('Quotation sent to customer successfully!');
    }
  };

  const handleCustomerAccept = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowAcceptModal(true);
  };

  const handleConfirmAccept = () => {
    if (selectedRequest && selectedSet && scheduledDate) {
      // Generate DO and send directly to Delivery Management
      const doNumber = `DO-${Date.now().toString().slice(-8)}`;
      
      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            scheduledDate: scheduledDate,
            pickupTime: pickupTime || undefined,
            sets: req.sets.map(s => {
              if (s.id === selectedSet.id) {
                return {
                  ...s,
                  status: 'Sent to Delivery' as RequestStatus,
                  acceptedDate: new Date().toISOString().split('T')[0],
                  doNumber: doNumber
                };
              }
              return s;
            })
          };
        }
        return req;
      });
      setDeliveryRequests(updatedRequests);
      setShowAcceptModal(false);
      alert(`Customer acceptance confirmed! DO #${doNumber} generated and sent to Delivery Management. All packing, loading, and delivery steps will be handled there.`);
      setScheduledDate('');
      setPickupTime('');
      setNotes('');
    }
  };

  const handleScheduleDelivery = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowScheduleModal(true);
  };

  const handleConfirmSchedule = () => {
    if (selectedRequest && selectedSet && scheduledDate) {
      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            scheduledDate: scheduledDate,
            pickupTime: pickupTime || undefined,
            sets: req.sets.map(s => {
              if (s.id === selectedSet.id) {
                return {
                  ...s,
                  status: 'Sent to Delivery' as RequestStatus
                };
              }
              return s;
            })
          };
        }
        return req;
      });
      setDeliveryRequests(updatedRequests);
      setShowScheduleModal(false);
      setScheduledDate('');
      setPickupTime('');
      setNotes('');
      alert('Request sent to Delivery Management successfully!');
    }
  };

  const handleScheduleReturn = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowReturnScheduleModal(true);
  };

  const handleConfirmReturnSchedule = () => {
    if (selectedReturnRequest && scheduledDate) {
      const updatedRequests = returnRequests.map(req => {
        if (req.id === selectedReturnRequest.id) {
          return {
            ...req,
            scheduledDate: scheduledDate,
            status: 'Scheduled' as 'Scheduled'
          };
        }
        return req;
      });
      setReturnRequests(updatedRequests);
      setShowReturnScheduleModal(false);
      setScheduledDate('');
      alert('Return scheduled successfully!');
    }
  };

  // Add item to current set
  const handleAddItemToSet = () => {
    if (newItemName && newItemQuantity) {
      setCurrentItems([...currentItems, { name: newItemName, quantity: parseInt(newItemQuantity) }]);
      setNewItemName('');
      setNewItemQuantity('');
    }
  };

  // Remove item from current set
  const handleRemoveItemFromSet = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
  };

  // Add set to delivery request
  const handleAddSetToRequest = () => {
    if (currentSetName && currentScheduledPeriod && currentRentalAmount && currentItems.length > 0) {
      const newSet = {
        setName: currentSetName,
        items: [...currentItems],
        scheduledPeriod: currentScheduledPeriod,
        rentalAmount: parseFloat(currentRentalAmount)
      };
      setNewDeliveryRequest(prev => ({
        ...prev,
        sets: [...prev.sets, newSet]
      }));
      // Reset set form
      setCurrentSetName('');
      setCurrentScheduledPeriod('');
      setCurrentRentalAmount('');
      setCurrentItems([]);
    }
  };

  // Remove set from delivery request
  const handleRemoveSetFromRequest = (index: number) => {
    setNewDeliveryRequest(prev => ({
      ...prev,
      sets: prev.sets.filter((_, i) => i !== index)
    }));
  };

  // Submit new delivery request
  const handleSubmitDeliveryRequest = () => {
    if (newDeliveryRequest.projectName && newDeliveryRequest.customerName && 
        newDeliveryRequest.agreementNo && newDeliveryRequest.deliveryAddress && 
        newDeliveryRequest.sets.length > 0) {
      const newRequest: DeliveryRequest = {
        id: `DR${String(deliveryRequests.length + 1).padStart(3, '0')}`,
        requestId: `DR-${new Date().getFullYear()}-${String(deliveryRequests.length + 1).padStart(3, '0')}`,
        projectName: newDeliveryRequest.projectName,
        customerName: newDeliveryRequest.customerName,
        agreementNo: newDeliveryRequest.agreementNo,
        customerPhone: newDeliveryRequest.customerPhone,
        customerEmail: newDeliveryRequest.customerEmail,
        deliveryAddress: newDeliveryRequest.deliveryAddress,
        requestType: newDeliveryRequest.requestType,
        requestDate: new Date().toISOString().split('T')[0],
        sets: newDeliveryRequest.sets.map((set, index) => ({
          id: `SET-${String.fromCharCode(65 + index)}`,
          setName: set.setName,
          items: set.items,
          scheduledPeriod: set.scheduledPeriod,
          rentalAmount: set.rentalAmount,
          status: 'Pending Quote' as RequestStatus
        }))
      };
      setDeliveryRequests([...deliveryRequests, newRequest]);
      setShowAddDeliveryModal(false);
      resetDeliveryForm();
      alert('Delivery request added successfully!');
    } else {
      alert('Please fill in all required fields and add at least one set.');
    }
  };

  // Submit new return request
  const handleSubmitReturnRequest = () => {
    if (newReturnRequest.projectName && newReturnRequest.customerName && 
        newReturnRequest.agreementNo && newReturnRequest.setName && 
        newReturnRequest.reason) {
      const newRequest: ReturnRequest = {
        id: `RR${String(returnRequests.length + 1).padStart(3, '0')}`,
        requestId: `RR-${new Date().getFullYear()}-${String(returnRequests.length + 1).padStart(3, '0')}`,
        projectName: newReturnRequest.projectName,
        customerName: newReturnRequest.customerName,
        agreementNo: newReturnRequest.agreementNo,
        setName: newReturnRequest.setName,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'Pending',
        reason: newReturnRequest.reason,
        customerPhone: newReturnRequest.customerPhone
      };
      setReturnRequests([...returnRequests, newRequest]);
      setShowAddReturnModal(false);
      resetReturnForm();
      alert('Return request added successfully!');
    } else {
      alert('Please fill in all required fields.');
    }
  };

  // Reset delivery form
  const resetDeliveryForm = () => {
    setNewDeliveryRequest({
      projectName: '',
      customerName: '',
      agreementNo: '',
      customerPhone: '',
      customerEmail: '',
      deliveryAddress: '',
      requestType: 'delivery',
      sets: []
    });
    setCurrentSetName('');
    setCurrentScheduledPeriod('');
    setCurrentRentalAmount('');
    setCurrentItems([]);
    setNewItemName('');
    setNewItemQuantity('');
  };

  // Reset return form
  const resetReturnForm = () => {
    setNewReturnRequest({
      projectName: '',
      customerName: '',
      agreementNo: '',
      setName: '',
      reason: '',
      customerPhone: ''
    });
  };

  const filteredDeliveryRequests = deliveryRequests.filter(req =>
    req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.agreementNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReturnRequests = returnRequests.filter(req =>
    req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.agreementNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#231F20]">Delivery & Return Requests</h1>
          <p className="text-gray-600">Handle customer requests and issue quotations</p>
        </div>
        <button
          onClick={() => activeTab === 'delivery' ? setShowAddDeliveryModal(true) : setShowAddReturnModal(true)}
          className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="size-5" />
          Add {activeTab === 'delivery' ? 'Delivery' : 'Return'} Request
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

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
          <input
            type="text"
            placeholder="Search by project, customer, request ID, or agreement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
          />
        </div>
      </div>

      {/* Delivery Requests Tab */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {filteredDeliveryRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              {/* Request Header */}
              <div className="flex items-start justify-between pb-4 border-b">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg text-[#231F20]">{request.requestId}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      request.requestType === 'delivery' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {request.requestType === 'delivery' ? 'Delivery' : 'Customer Pickup'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <FileText className="size-4" />
                      <span>{request.projectName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="size-4" />
                      <span>{request.customerName}</span>
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
                  <p className="text-sm text-gray-600">Agreement: {request.agreementNo} | Requested: {request.requestDate}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedAgreement(request.agreementNo);
                    setShowAgreementModal(true);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap"
                >
                  <FileText className="size-4" />
                  View Agreement
                </button>
              </div>

              {/* Sets */}
              <div className="space-y-4">
                <h4 className="text-sm text-gray-700">Rental Sets</h4>
                {request.sets.map((set, index) => (
                  <div key={set.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3">
                          <h5 className="text-[#231F20]">{set.setName}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(set.status)}`}>
                            {set.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Period: {set.scheduledPeriod}</p>
                        
                        {/* Sequential Quote Warning */}
                        {index > 0 && set.status === 'Pending Quote' && !canQuoteSet(request, set) && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                            <p className="text-xs text-yellow-800">
                              ⚠️ This set will be quoted after Set {String.fromCharCode(65 + index - 1)} is accepted and sent to delivery
                            </p>
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
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Rental Amount:</span>
                            <span className="text-[#F15929]">RM {set.rentalAmount.toLocaleString()}</span>
                          </div>
                          {set.deliveryFee !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Delivery Fee:</span>
                              <span className="text-[#F15929]">RM {set.deliveryFee.toLocaleString()}</span>
                            </div>
                          )}
                          {set.totalAmount && (
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-gray-900">Total Amount:</span>
                              <span className="text-[#F15929]">RM {set.totalAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Dates */}
                        {set.quotedDate && (
                          <p className="text-xs text-gray-500">Quoted on: {set.quotedDate}</p>
                        )}
                        {set.acceptedDate && (
                          <p className="text-xs text-green-600">✓ Accepted on: {set.acceptedDate}</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2">
                        {set.status === 'Pending Quote' && canQuoteSet(request, set) && (
                          <button
                            onClick={() => handleIssueQuotation(request, set)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm whitespace-nowrap"
                          >
                            Issue Quotation
                          </button>
                        )}
                        
                        {set.status === 'Quoted' && (
                          <button
                            onClick={() => handleCustomerAccept(request, set)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm whitespace-nowrap"
                          >
                            Customer Accepted
                          </button>
                        )}
                        
                        {set.status === 'Accepted' && (
                          <button
                            onClick={() => handleScheduleDelivery(request, set)}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm whitespace-nowrap"
                          >
                            Send to Delivery
                          </button>
                        )}
                        
                        {set.status === 'Sent to Delivery' && (
                          <div className="flex items-center space-x-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded">
                            <CheckCircle className="size-4" />
                            <span>In Delivery Mgmt</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredDeliveryRequests.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Truck className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No delivery requests found</p>
            </div>
          )}
        </div>
      )}

      {/* Return Requests Tab */}
      {activeTab === 'return' && (
        <div className="space-y-4">
          {filteredReturnRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg text-[#231F20]">{request.requestId}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      request.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <FileText className="size-4" />
                      <span>{request.projectName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="size-4" />
                      <span>{request.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="size-4" />
                      <span>{request.setName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="size-4" />
                      <span>{request.customerPhone}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Agreement: {request.agreementNo} | {request.scheduledDate ? `Scheduled: ${request.scheduledDate}` : `Requested: ${request.requestDate}`}
                  </p>
                  <p className="text-sm text-gray-600">Reason: {request.reason}</p>
                </div>

                <div className="flex items-center space-x-2">
                  {request.status === 'Pending' && (
                    <button
                      onClick={() => handleScheduleReturn(request)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                    >
                      Schedule Return
                    </button>
                  )}
                  {request.status === 'Scheduled' && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                      <CheckCircle className="size-4" />
                      <span>Scheduled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredReturnRequests.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No return requests found</p>
            </div>
          )}
        </div>
      )}

      {/* Quotation Modal */}
      {showQuotationModal && selectedRequest && selectedSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Issue Quotation</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-600">Project: {selectedRequest.projectName}</p>
                <p className="text-sm text-gray-600">Set: {selectedSet.setName}</p>
                <p className="text-sm text-gray-600">Period: {selectedSet.scheduledPeriod}</p>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rental Amount:</span>
                    <span className="text-[#F15929]">RM {selectedSet.rentalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {selectedRequest.requestType === 'delivery' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Delivery Fee (RM) *</label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="Enter delivery fee"
                  />
                </div>
              )}

              {selectedRequest.requestType === 'pickup' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    No delivery fee for customer pickup. Only rental amount will be quoted.
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">Total Quotation:</span>
                  <span className="text-lg text-[#F15929]">
                    RM {(selectedSet.rentalAmount + (selectedRequest.requestType === 'delivery' ? parseFloat(deliveryFee || '0') : 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Note: Sets are quoted sequentially. Next set will only be quoted after this set is accepted and delivered.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowQuotationModal(false);
                  setDeliveryFee('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuotation}
                disabled={selectedRequest.requestType === 'delivery' && !deliveryFee}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Send Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Accept Modal */}
      {showAcceptModal && selectedRequest && selectedSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Customer Acceptance</h3>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-2">Confirm that customer has accepted this quotation:</p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700">Project: {selectedRequest.projectName}</p>
                  <p className="text-gray-700">Set: {selectedSet.setName}</p>
                  <p className="text-gray-700">Amount: RM {selectedSet.totalAmount?.toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Scheduled Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                />
              </div>

              {selectedRequest.requestType === 'pickup' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Pickup Time (Optional)</label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Add any special instructions..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAccept}
                disabled={!scheduledDate}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm Acceptance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Delivery Modal */}
      {showScheduleModal && selectedRequest && selectedSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Send to Delivery Management</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Project: {selectedRequest.projectName}</p>
                <p className="text-sm text-gray-600">Set: {selectedSet.setName}</p>
                <p className="text-sm text-gray-600">Type: {selectedRequest.requestType === 'delivery' ? 'Delivery' : 'Customer Pickup'}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Scheduled Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                />
              </div>

              {selectedRequest.requestType === 'pickup' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Pickup Time (Optional)</label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Add any special instructions..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduledDate('');
                  setPickupTime('');
                  setNotes('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSchedule}
                disabled={!scheduledDate}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Send to Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Schedule Modal */}
      {showReturnScheduleModal && selectedReturnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Schedule Return</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Project: {selectedReturnRequest.projectName}</p>
                <p className="text-sm text-gray-600">Customer: {selectedReturnRequest.customerName}</p>
                <p className="text-sm text-gray-600">Set: {selectedReturnRequest.setName}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Scheduled Return Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReturnScheduleModal(false);
                  setScheduledDate('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturnSchedule}
                disabled={!scheduledDate}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl space-y-4">
            <h3 className="text-xl text-[#231F20]">Agreement Details</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Agreement No: {selectedAgreement}</p>
              <p className="text-sm text-gray-600">Project: {deliveryRequests.find(req => req.agreementNo === selectedAgreement)?.projectName || 'N/A'}</p>
              <p className="text-sm text-gray-600">Customer: {deliveryRequests.find(req => req.agreementNo === selectedAgreement)?.customerName || 'N/A'}</p>
              <p className="text-sm text-gray-600">Request Date: {deliveryRequests.find(req => req.agreementNo === selectedAgreement)?.requestDate || 'N/A'}</p>
              <p className="text-sm text-gray-600">Delivery Address: {deliveryRequests.find(req => req.agreementNo === selectedAgreement)?.deliveryAddress || 'N/A'}</p>
              <p className="text-sm text-gray-600">Sets: {deliveryRequests.find(req => req.agreementNo === selectedAgreement)?.sets.map(set => set.setName).join(', ') || 'N/A'}</p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAgreementModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Delivery Request Modal */}
      {showAddDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl text-[#231F20]">Add Delivery Request</h3>
              <button
                onClick={() => {
                  setShowAddDeliveryModal(false);
                  resetDeliveryForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* Customer & Project Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Customer & Project Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newDeliveryRequest.projectName}
                    onChange={(e) => setNewDeliveryRequest(prev => ({ ...prev, projectName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={newDeliveryRequest.customerName}
                    onChange={(e) => setNewDeliveryRequest(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Agreement No *</label>
                  <input
                    type="text"
                    value={newDeliveryRequest.agreementNo}
                    onChange={(e) => setNewDeliveryRequest(prev => ({ ...prev, agreementNo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="e.g., AGR-2025-003"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Request Type *</label>
                  <select
                    value={newDeliveryRequest.requestType}
                    onChange={(e) => setNewDeliveryRequest(prev => ({ ...prev, requestType: e.target.value as RequestType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Customer Pickup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={newDeliveryRequest.customerPhone}
                    onChange={(e) => setNewDeliveryRequest(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="e.g., +60123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={newDeliveryRequest.customerEmail}
                    onChange={(e) => setNewDeliveryRequest(prev => ({ ...prev, customerEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="Enter customer email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Delivery Address *</label>
                <input
                  type="text"
                  value={newDeliveryRequest.deliveryAddress}
                  onChange={(e) => setNewDeliveryRequest(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Enter delivery address"
                />
              </div>
            </div>

            {/* Rental Sets Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Rental Sets *</h4>
              
              {/* Added Sets */}
              {newDeliveryRequest.sets.length > 0 && (
                <div className="space-y-2">
                  {newDeliveryRequest.sets.map((set, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#231F20]">{set.setName}</span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Added</span>
                        </div>
                        <p className="text-sm text-gray-600">Period: {set.scheduledPeriod} | Amount: RM {set.rentalAmount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Items: {set.items.map(i => `${i.name} (${i.quantity})`).join(', ')}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveSetFromRequest(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Set Form */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">Add New Set</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Set Name</label>
                    <input
                      type="text"
                      value={currentSetName}
                      onChange={(e) => setCurrentSetName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                      placeholder="e.g., Set A - Phase 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Scheduled Period</label>
                    <input
                      type="text"
                      value={currentScheduledPeriod}
                      onChange={(e) => setCurrentScheduledPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                      placeholder="e.g., Month 1-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Rental Amount (RM)</label>
                    <input
                      type="number"
                      value={currentRentalAmount}
                      onChange={(e) => setCurrentRentalAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                {/* Items in Set */}
                <div className="space-y-2">
                  <label className="block text-xs text-gray-700">Items in Set</label>
                  {currentItems.length > 0 && (
                    <div className="space-y-1">
                      {currentItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white px-3 py-1.5 rounded border text-sm">
                          <span>{item.name} - Qty: {item.quantity}</span>
                          <button
                            onClick={() => handleRemoveItemFromSet(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                      placeholder="Item name"
                    />
                    <input
                      type="number"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                      placeholder="Qty"
                    />
                    <button
                      onClick={handleAddItemToSet}
                      disabled={!newItemName || !newItemQuantity}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddSetToRequest}
                  disabled={!currentSetName || !currentScheduledPeriod || !currentRentalAmount || currentItems.length === 0}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" />
                  Add Set to Request
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowAddDeliveryModal(false);
                  resetDeliveryForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDeliveryRequest}
                disabled={!newDeliveryRequest.projectName || !newDeliveryRequest.customerName || 
                          !newDeliveryRequest.agreementNo || !newDeliveryRequest.deliveryAddress || 
                          newDeliveryRequest.sets.length === 0}
                className="px-6 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Return Request Modal */}
      {showAddReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl text-[#231F20]">Add Return Request</h3>
              <button
                onClick={() => {
                  setShowAddReturnModal(false);
                  resetReturnForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newReturnRequest.projectName}
                    onChange={(e) => setNewReturnRequest(prev => ({ ...prev, projectName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={newReturnRequest.customerName}
                    onChange={(e) => setNewReturnRequest(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="Enter customer name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Agreement No *</label>
                  <input
                    type="text"
                    value={newReturnRequest.agreementNo}
                    onChange={(e) => setNewReturnRequest(prev => ({ ...prev, agreementNo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="e.g., AGR-2025-003"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Set Name *</label>
                  <input
                    type="text"
                    value={newReturnRequest.setName}
                    onChange={(e) => setNewReturnRequest(prev => ({ ...prev, setName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                    placeholder="e.g., Set A"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={newReturnRequest.customerPhone}
                  onChange={(e) => setNewReturnRequest(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="e.g., +60123456789"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Reason for Return *</label>
                <textarea
                  value={newReturnRequest.reason}
                  onChange={(e) => setNewReturnRequest(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Enter reason for return..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowAddReturnModal(false);
                  resetReturnForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturnRequest}
                disabled={!newReturnRequest.projectName || !newReturnRequest.customerName || 
                          !newReturnRequest.agreementNo || !newReturnRequest.setName || 
                          !newReturnRequest.reason}
                className="px-6 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}