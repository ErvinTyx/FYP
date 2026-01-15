import React, { useState } from 'react';
import { Search, Plus, FileText, Truck, Package, CheckCircle, Clock, XCircle, Phone, Mail, MapPin, Calendar, User, ArrowRight, Download, Upload, Check, X, Loader } from 'lucide-react';
import DeliveryOrderGeneration from './DeliveryOrderGeneration';

type DeliveryType = 'delivery' | 'pickup';
type DeliveryStatus = 'Pending' | 'Quoted' | 'DO Generated' | 'Confirmed' | 'Packing List Issued' | 'Packing & Loading' | 'Driver Acknowledged' | 'In Transit' | 'Delivered' | 'Customer Confirmed' | 'Cancelled';
type ReturnStatus = 'Requested' | 'Quoted' | 'Agreed' | 'Scheduled' | 'In Transit' | 'Received' | 'Customer Notified' | 'GRN Generated' | 'Cancelled';
type ReturnType = 'partial' | 'full';
type CollectionMethod = 'transport' | 'self-return';

interface DeliverySet {
  id: string;
  setName: string;
  items: { name: string; quantity: number }[];
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
}

interface ReturnRequest {
  id: string;
  requestId: string;
  customerName: string;
  agreementNo: string;
  setName: string;
  items: { name: string; quantity: number }[];
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

export default function DeliveryReturnManagement() {
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

  // Mock data
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([
    {
      id: 'DR001',
      requestId: 'DR-2026-001',
      customerName: 'ABC Construction Sdn Bhd',
      agreementNo: 'AGR-2026-001',
      customerPhone: '+60123456789',
      customerEmail: 'contact@abc.com',
      deliveryAddress: 'Jalan Raja Laut, 50350 Kuala Lumpur',
      deliveryType: 'delivery',
      requestDate: '2026-12-01',
      totalSets: 3,
      deliveredSets: 0,
      sets: [
        {
          id: 'SET-A',
          setName: 'Set A - Initial Phase',
          items: [
            { name: 'Scaffolding Pipe 6m', quantity: 100 },
            { name: 'Coupler Standard', quantity: 200 },
            { name: 'Base Plate', quantity: 50 }
          ],
          scheduledPeriod: 'Month 1-3',
          status: 'Pending'
        },
        {
          id: 'SET-B',
          setName: 'Set B - Extension Phase',
          items: [
            { name: 'Scaffolding Pipe 4m', quantity: 150 },
            { name: 'Coupler Swivel', quantity: 180 },
            { name: 'Ladder Beam', quantity: 30 }
          ],
          scheduledPeriod: 'Month 4-6',
          status: 'Pending'
        },
        {
          id: 'SET-C',
          setName: 'Set C - Final Phase',
          items: [
            { name: 'H-Frame Scaffolding', quantity: 80 },
            { name: 'Cross Brace', quantity: 120 },
            { name: 'Walk Board', quantity: 60 }
          ],
          scheduledPeriod: 'Month 7-9',
          status: 'Pending'
        }
      ]
    },
    {
      id: 'DR002',
      requestId: 'DR-2026-002',
      customerName: 'XYZ Development Sdn Bhd',
      agreementNo: 'AGR-2026-002',
      customerPhone: '+60129876543',
      customerEmail: 'info@xyz.com',
      deliveryAddress: 'Jalan Ampang, 50450 Kuala Lumpur',
      deliveryType: 'delivery',
      requestDate: '2026-12-03',
      totalSets: 1,
      deliveredSets: 0,
      sets: [
        {
          id: 'SET-D',
          setName: 'Set A - Main Structure',
          items: [
            { name: 'Steel Tube 4m', quantity: 200 },
            { name: 'Joint Pin', quantity: 150 },
            { name: 'Base Jack', quantity: 80 },
            { name: 'Safety Net', quantity: 40 }
          ],
          scheduledPeriod: 'Month 1-6',
          status: 'Pending'
        }
      ]
    }
  ]);

  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([
    {
      id: 'RR001',
      requestId: 'RR-2026-001',
      customerName: 'DEF Builders',
      agreementNo: 'AGR-2026-003',
      setName: 'Set A - Foundation Phase',
      items: [
        { name: 'Scaffolding Pipe 6m', quantity: 80 },
        { name: 'Coupler Standard', quantity: 160 },
        { name: 'Base Plate', quantity: 40 }
      ],
      requestDate: '2026-12-02',
      status: 'Requested',
      reason: 'Project completed',
      pickupAddress: 'Jalan Ipoh, 51200 Kuala Lumpur',
      customerPhone: '+60124445555',
      customerEmail: 'info@def.com',
      returnType: 'full',
      collectionMethod: 'transport'
    },
    {
      id: 'RR002',
      requestId: 'RR-2026-002',
      customerName: 'ABC Construction Sdn Bhd',
      agreementNo: 'AGR-2026-001',
      setName: 'Set A - Initial Phase',
      items: [
        { name: 'Scaffolding Pipe 6m', quantity: 50 },
        { name: 'Coupler Standard', quantity: 100 }
      ],
      requestDate: '2026-12-08',
      status: 'Requested',
      reason: 'Partial return - Phase 1 completed',
      pickupAddress: 'Jalan Raja Laut, 50350 Kuala Lumpur',
      customerPhone: '+60123456789',
      customerEmail: 'contact@abc.com',
      returnType: 'partial',
      collectionMethod: 'self-return'
    },
    {
      id: 'RR003',
      requestId: 'RR-2026-003',
      customerName: 'Megah Engineering Sdn Bhd',
      agreementNo: 'AGR-2026-004',
      setName: 'Set C - Rooftop',
      items: [
        { name: 'Aluminum Tube 4m', quantity: 100 },
        { name: 'Edge Protection', quantity: 60 },
        { name: 'Toe Board', quantity: 50 }
      ],
      requestDate: '2026-12-05',
      status: 'Requested',
      reason: 'Phase completed ahead of schedule',
      pickupAddress: 'Jalan Sultan Ismail, 50250 Kuala Lumpur',
      customerPhone: '+60167654321',
      customerEmail: 'projects@megah.com',
      returnType: 'full',
      collectionMethod: 'self-return'
    },
    {
      id: 'RR004',
      requestId: 'RR-2026-004',
      customerName: 'Sunrise Development Sdn Bhd',
      agreementNo: 'AGR-2026-007',
      setName: 'Set A - Bridge Construction',
      items: [
        { name: 'Heavy Duty Tube 6m', quantity: 120 },
        { name: 'Beam Clamp', quantity: 90 },
        { name: 'Support Frame', quantity: 45 }
      ],
      requestDate: '2026-12-07',
      status: 'Requested',
      reason: 'Partial return - Downsizing project scope',
      pickupAddress: 'Jalan Damansara, 60000 Kuala Lumpur',
      customerPhone: '+60172223333',
      customerEmail: 'ops@sunrise.com',
      returnType: 'partial',
      collectionMethod: 'transport'
    }
  ]);

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

  const handleIssueQuotation = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowQuotationModal(true);
  };

  const handleConfirmQuotation = () => {
    if (selectedRequest && selectedSet && deliveryFee) {
      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            sets: req.sets.map(s => {
              if (s.id === selectedSet.id) {
                return {
                  ...s,
                  deliveryFee: parseFloat(deliveryFee),
                  status: 'Quoted' as DeliveryStatus
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
      alert('Quotation issued successfully!');
    }
  };

  const handleIssueReturnQuotation = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowReturnQuotationModal(true);
  };

  const handleConfirmReturnQuotation = () => {
    if (selectedReturnRequest && pickupFee) {
      const updatedRequests = returnRequests.map(req => {
        if (req.id === selectedReturnRequest.id) {
          return {
            ...req,
            pickupFee: parseFloat(pickupFee),
            status: 'Quoted' as ReturnStatus
          };
        }
        return req;
      });
      setReturnRequests(updatedRequests);
      setShowReturnQuotationModal(false);
      setPickupFee('');
      alert('Return pickup quotation issued successfully!');
    }
  };

  const handleAgreeReturnQuotation = (request: ReturnRequest) => {
    const updatedRequests = returnRequests.map(req => {
      if (req.id === request.id) {
        return {
          ...req,
          status: 'Agreed' as ReturnStatus
        };
      }
      return req;
    });
    setReturnRequests(updatedRequests);
    alert('Customer agreed to return quotation. Status updated to Agreed.');
  };

  const handleIssuePackingList = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowPackingListModal(true);
  };

  const handleConfirmPackingList = () => {
    if (selectedRequest && selectedSet) {
      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            sets: req.sets.map(s => {
              if (s.id === selectedSet.id) {
                return {
                  ...s,
                  packingListIssued: true,
                  status: 'Packing List Issued' as DeliveryStatus
                };
              }
              return s;
            })
          };
        }
        return req;
      });
      setDeliveryRequests(updatedRequests);
      setShowPackingListModal(false);
      alert('Packing list issued successfully!');
    }
  };

  const handleUpdatePackingLoading = (request: DeliveryRequest, set: DeliverySet) => {
    const updatedRequests = deliveryRequests.map(req => {
      if (req.id === request.id) {
        return {
          ...req,
          sets: req.sets.map(s => {
            if (s.id === set.id) {
              return {
                ...s,
                status: 'Packing & Loading' as DeliveryStatus
              };
            }
            return s;
          })
        };
      }
      return req;
    });
    setDeliveryRequests(updatedRequests);
    alert('Status updated to Packing & Loading');
  };

  const handleDriverAcknowledge = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowDriverAckModal(true);
  };

  const handleConfirmDriverAck = () => {
    if (selectedRequest && selectedSet && driverName && vehicleNumber) {
      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            sets: req.sets.map(s => {
              if (s.id === selectedSet.id) {
                return {
                  ...s,
                  driverAcknowledged: true,
                  status: 'Driver Acknowledged' as DeliveryStatus
                };
              }
              return s;
            })
          };
        }
        return req;
      });
      setDeliveryRequests(updatedRequests);
      setShowDriverAckModal(false);
      setDriverName('');
      setVehicleNumber('');
      alert('Driver acknowledged successfully!');
    }
  };

  const handleCustomerAcknowledge = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowCustomerAckModal(true);
  };

  const handleConfirmCustomerAck = () => {
    if (selectedRequest && selectedSet && customerOTP) {
      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            sets: req.sets.map(s => {
              if (s.id === selectedSet.id) {
                return {
                  ...s,
                  customerAcknowledged: true,
                  otp: customerOTP,
                  status: 'Customer Confirmed' as DeliveryStatus
                };
              }
              return s;
            })
          };
        }
        return req;
      });
      setDeliveryRequests(updatedRequests);
      setShowCustomerAckModal(false);
      setCustomerOTP('');
      alert('Customer acknowledgement confirmed! Signed DO stored.');
    }
  };

  const handleConfirmPickupTime = (request: DeliveryRequest) => {
    setSelectedRequest(request);
    setShowPickupTimeModal(true);
  };

  const handleSavePickupTime = () => {
    if (selectedRequest && pickupDate && pickupTime) {
      const updatedRequests = deliveryRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            pickupTime: `${pickupDate} ${pickupTime}`,
            sets: req.sets.map(s => ({ ...s, status: 'Confirmed' as DeliveryStatus }))
          };
        }
        return req;
      });
      setDeliveryRequests(updatedRequests);
      setShowPickupTimeModal(false);
      setPickupDate('');
      setPickupTime('');
      alert('Pickup time confirmed successfully!');
    }
  };

  const handleGenerateDO = (request: DeliveryRequest, set: DeliverySet) => {
    // Open DO Generation Modal/Component
    setSelectedDORequest(request);
    setSelectedSet(set);
    setShowDOModal(true);
  };

  const handleDOGenerated = (request: DeliveryRequest, set: DeliverySet) => {
    const updatedRequests = deliveryRequests.map(req => {
      if (req.id === request.id) {
        return {
          ...req,
          sets: req.sets.map(s => {
            if (s.id === set.id) {
              return {
                ...s,
                status: 'DO Generated' as DeliveryStatus
              };
            }
            return s;
          })
        };
      }
      return req;
    });
    setDeliveryRequests(updatedRequests);
    setShowDOModal(false);
    alert('Delivery Order generated successfully!');
  };

  const handleViewDO = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedViewDO({ request, set });
    setShowViewDOModal(true);
  };

  const handleGenerateReturnDO = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowReturnDOModal(true);
  };

  const handleReturnDOGenerated = (request: ReturnRequest) => {
    const updatedRequests = returnRequests.map(req => {
      if (req.id === request.id) {
        return {
          ...req,
          status: 'DO Generated' as ReturnStatus
        };
      }
      return req;
    });
    setReturnRequests(updatedRequests);
    setShowReturnDOModal(false);
    alert('Return DO generated successfully!');
  };

  const handleViewReturnDO = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowViewReturnDOModal(true);
  };

  const canQuoteSet = (request: DeliveryRequest, set: DeliverySet) => {
    const setIndex = request.sets.findIndex(s => s.id === set.id);
    if (setIndex === 0) return true;
    const previousSet = request.sets[setIndex - 1];
    return previousSet.status === 'DO Generated' || previousSet.status === 'Customer Confirmed' || previousSet.status === 'Delivered';
  };

  const getNextAction = (request: DeliveryRequest, set: DeliverySet) => {
    if (set.status === 'Cancelled') return null;
    
    // Check if can quote this set
    if (set.status === 'Pending' && !canQuoteSet(request, set)) {
      return { label: 'Waiting for previous set', disabled: true, color: 'gray' };
    }

    // Simplified workflow: Pending → Issue Quotation → Generate DO → DO Generated (View DO)
    if (request.deliveryType === 'delivery' || request.deliveryType === 'pickup') {
      switch (set.status) {
        case 'Pending':
          return { label: 'Issue Quotation', action: () => handleIssueQuotation(request, set), color: 'blue' };
        case 'Quoted':
          return { label: 'Generate DO', action: () => handleGenerateDO(request, set), color: 'green' };
        case 'DO Generated':
          return { label: 'View DO', action: () => handleViewDO(request, set), color: 'green', disabled: false };
        default:
          return null;
      }
    }
  };

  const getReturnNextAction = (request: ReturnRequest) => {
    switch (request.status) {
      case 'Requested':
        return { label: 'Issue Quotation', action: () => handleIssueReturnQuotation(request), color: 'blue' };
      case 'Quoted':
        return { label: 'Agree', action: () => handleAgreeReturnQuotation(request), color: 'green' };
      case 'Agreed':
        return { label: 'Agreed', disabled: true, color: 'gray' };
      case 'Cancelled':
        return { label: 'Cancelled', disabled: true, color: 'gray' };
      default:
        return null;
    }
  };

  const filteredDeliveryRequests = deliveryRequests.filter(req =>
    req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.agreementNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            placeholder="Search by customer, request ID, or agreement..."
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
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Delivery
                    </span>
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
              </div>

              {/* Sets */}
              <div className="space-y-4">
                <h4 className="text-sm text-gray-500">Sets ({request.deliveredSets}/{request.totalSets} delivered)</h4>
                {request.sets.map((set, index) => (
                  <div key={set.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3">
                          <h5 className="text-[#231F20]">{set.setName}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(set.status)}`}>
                            {set.status}
                          </span>
                          {index > 0 && set.status === 'Pending' && !canQuoteSet(request, set) && (
                            <span className="text-xs text-gray-500 italic">
                              (Will quote after Set {String.fromCharCode(65 + index - 1)} is completed)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Period: {set.scheduledPeriod}</p>
                        
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

                      {/* Action Button */}
                      <div>
                        {(() => {
                          const nextAction = getNextAction(request, set);
                          if (!nextAction) return null;
                          
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
                  {request.scheduledDate && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="size-4" />
                      <span>Scheduled: {request.scheduledDate}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex items-center space-x-2">
                  {(() => {
                    const nextAction = getReturnNextAction(request);
                    if (!nextAction) return null;
                    
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

          {filteredReturnRequests.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No return requests found</p>
            </div>
          )}
        </div>
      )}

      {/* Quotation Modal for Delivery */}
      {showQuotationModal && selectedRequest && selectedSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Issue Quotation & Delivery Fee</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Set: {selectedSet.setName}</p>
                <p className="text-sm text-gray-600">Rental Amount: RM {selectedSet.quotedAmount?.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Delivery Fee (RM)</label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Enter delivery fee"
                />
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
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Request ID: {selectedReturnRequest.requestId}</p>
                <p className="text-sm text-gray-600">Set: {selectedReturnRequest.setName}</p>
                <p className="text-sm text-gray-600">Pickup Address: {selectedReturnRequest.pickupAddress}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Pickup/Transportation Fee (RM)</label>
                <input
                  type="number"
                  value={pickupFee}
                  onChange={(e) => setPickupFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Enter pickup fee for vehicle"
                />
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
      {showDOModal && selectedDORequest && selectedSet && (
        <DeliveryOrderGeneration
          requestId={selectedDORequest.requestId}
          customerName={selectedDORequest.customerName}
          agreementNo={selectedDORequest.agreementNo}
          setDetails={{
            setName: selectedSet.setName,
            items: selectedSet.items.map(item => ({ ...item, unit: 'pcs' }))
          }}
          deliveryAddress={selectedDORequest.deliveryAddress}
          deliveryDate={new Date().toISOString().split('T')[0]}
          customerPhone={selectedDORequest.customerPhone}
          customerEmail={selectedDORequest.customerEmail}
          onClose={() => {
            handleDOGenerated(selectedDORequest, selectedSet);
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
    </div>
  );
}