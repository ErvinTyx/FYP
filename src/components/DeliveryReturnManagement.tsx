import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, Truck, Package, CheckCircle, Clock, XCircle, Phone, Mail, MapPin, Calendar, User, ArrowRight, Download, Upload, Check, X, Loader } from 'lucide-react';
import DeliveryOrderGeneration from './DeliveryOrderGeneration';

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
}

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

  // Data state - fetched from API
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create modal states
  const [showCreateDeliveryModal, setShowCreateDeliveryModal] = useState(false);
  const [showCreateReturnModal, setShowCreateReturnModal] = useState(false);
  const [rentalAgreements, setRentalAgreements] = useState<RentalAgreement[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Create Delivery Form states
  const [newDeliveryForm, setNewDeliveryForm] = useState({
    customerEmail: '',
    deliveryType: 'delivery' as DeliveryType,
  });
  const [deliverySets, setDeliverySets] = useState<{
    setName: string;
    scheduledPeriod: string;
    items: { name: string; quantity: number }[];
  }[]>([{ setName: 'Set A', scheduledPeriod: '', items: [{ name: '', quantity: 1 }] }]);

  // Create Return Form states
  const [newReturnForm, setNewReturnForm] = useState({
    setName: '',
    reason: '',
    customerEmail: '',
    returnType: 'full' as ReturnType,
    collectionMethod: 'transport' as CollectionMethod,
  });
  const [returnItems, setReturnItems] = useState<{ name: string; quantity: number }[]>([
    { name: '', quantity: 1 },
  ]);

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

  // Fetch rental agreements for dropdown
  const fetchRentalAgreements = useCallback(async () => {
    try {
      const response = await fetch('/api/rental-agreement');
      const data = await response.json();
      if (data.success) {
        setRentalAgreements(data.agreements);
      } else {
        console.error('Failed to fetch rental agreements:', data.message);
      }
    } catch (error) {
      console.error('Error fetching rental agreements:', error);
    }
  }, []);

  // Generate request ID based on agreement number
  const generateDeliveryRequestId = (agreementNo: string) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DEL-${agreementNo}-${date}`;
  };

  const generateReturnRequestId = (agreementNo: string) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `RET-${agreementNo}-${date}`;
  };

  // Create Delivery Request handler
  const handleCreateDeliveryRequest = async () => {
    const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
    if (!agreement) {
      alert('Please select a rental agreement');
      return;
    }

    // Validate sets
    const validSets = deliverySets.filter(set => 
      set.scheduledPeriod.trim() && 
      set.items.some(item => item.name.trim())
    );

    if (validSets.length === 0) {
      alert('Please add at least one set with items');
      return;
    }

    setIsCreating(true);
    try {
      const requestId = generateDeliveryRequestId(agreement.agreementNumber);
      
      const response = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          customerName: agreement.hirer,
          agreementNo: agreement.agreementNumber,
          customerPhone: agreement.hirerPhone || '',
          customerEmail: newDeliveryForm.customerEmail,
          deliveryAddress: agreement.location || '',
          deliveryType: newDeliveryForm.deliveryType,
          sets: validSets.map(set => ({
            setName: set.setName,
            scheduledPeriod: set.scheduledPeriod,
            items: set.items.filter(item => item.name.trim()).map(item => ({
              name: item.name,
              quantity: item.quantity,
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
        setDeliverySets([{ setName: 'Set A', scheduledPeriod: '', items: [{ name: '', quantity: 1 }] }]);
        alert('Delivery request created successfully!');
      } else {
        alert('Failed to create delivery request: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating delivery request:', error);
      alert('An error occurred while creating the delivery request');
    } finally {
      setIsCreating(false);
    }
  };

  // Create Return Request handler
  const handleCreateReturnRequest = async () => {
    const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
    if (!agreement) {
      alert('Please select a rental agreement');
      return;
    }

    // Validate items
    const validItems = returnItems.filter(item => item.name.trim());
    if (validItems.length === 0) {
      alert('Please add at least one item to return');
      return;
    }

    if (!newReturnForm.setName.trim()) {
      alert('Please enter a set name');
      return;
    }

    if (!newReturnForm.reason.trim()) {
      alert('Please enter a reason for return');
      return;
    }

    setIsCreating(true);
    try {
      const requestId = generateReturnRequestId(agreement.agreementNumber);
      
      const response = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          customerName: agreement.hirer,
          agreementNo: agreement.agreementNumber,
          setName: newReturnForm.setName,
          reason: newReturnForm.reason,
          pickupAddress: agreement.location || '',
          customerPhone: agreement.hirerPhone || '',
          customerEmail: newReturnForm.customerEmail,
          returnType: newReturnForm.returnType,
          collectionMethod: newReturnForm.collectionMethod,
          items: validItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchReturnRequests();
        setShowCreateReturnModal(false);
        setSelectedAgreementId('');
        setNewReturnForm({ setName: '', reason: '', customerEmail: '', returnType: 'full', collectionMethod: 'transport' });
        setReturnItems([{ name: '', quantity: 1 }]);
        alert('Return request created successfully!');
      } else {
        alert('Failed to create return request: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating return request:', error);
      alert('An error occurred while creating the return request');
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchDeliveryRequests(), fetchReturnRequests(), fetchRentalAgreements()]);
      setIsLoading(false);
    };
    fetchData();
  }, [fetchDeliveryRequests, fetchReturnRequests, fetchRentalAgreements]);

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

  const handleConfirmQuotation = async () => {
    if (selectedRequest && selectedSet && deliveryFee) {
      try {
        const response = await fetch('/api/delivery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setId: selectedSet.id,
            deliveryFee: parseFloat(deliveryFee),
            status: 'Quoted',
          }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchDeliveryRequests();
          setShowQuotationModal(false);
          setDeliveryFee('');
          alert('Quotation issued successfully!');
        } else {
          alert('Failed to issue quotation: ' + data.message);
        }
      } catch (error) {
        console.error('Error issuing quotation:', error);
        alert('An error occurred while issuing quotation');
      }
    }
  };

  const handleIssueReturnQuotation = (request: ReturnRequest) => {
    setSelectedReturnRequest(request);
    setShowReturnQuotationModal(true);
  };

  const handleConfirmReturnQuotation = async () => {
    if (selectedReturnRequest && pickupFee) {
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
          alert('Return pickup quotation issued successfully!');
        } else {
          alert('Failed to issue quotation: ' + data.message);
        }
      } catch (error) {
        console.error('Error issuing return quotation:', error);
        alert('An error occurred while issuing return quotation');
      }
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
        // Create entry in ReturnManagement localStorage
        const returnOrder = {
          id: request.id,
          customer: request.customerName,
          customerContact: request.customerPhone || '',
          orderId: request.requestId,
          returnType: request.returnType === 'full' ? 'Full' : 'Partial',
          transportationType: request.collectionMethod === 'transport' ? 'Transportation Needed' : 'Self Return',
          items: request.items.map((item, idx) => ({
            id: `return-item-${idx}`,
            name: item.name,
            category: 'Scaffolding',
            quantity: item.quantity,
            quantityReturned: 0,
            status: 'Good' as const,
          })),
          requestDate: request.requestDate,
          status: 'Approved' as const,
          pickupAddress: request.pickupAddress,
        };

        // Save to localStorage for ReturnManagement to pick up
        const existingReturns = JSON.parse(localStorage.getItem('returnOrders') || '[]');
        // Check if already exists (avoid duplicates)
        if (!existingReturns.find((r: { id: string }) => r.id === returnOrder.id)) {
          existingReturns.push(returnOrder);
          localStorage.setItem('returnOrders', JSON.stringify(existingReturns));
        }

        await fetchReturnRequests();
        alert('Customer agreed to return quotation. It is now available in Return Management.');
      } else {
        alert('Failed to update status: ' + data.message);
      }
    } catch (error) {
      console.error('Error agreeing to quotation:', error);
      alert('An error occurred while updating status');
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
          alert('Packing list issued successfully!');
        } else {
          alert('Failed to issue packing list: ' + data.message);
        }
      } catch (error) {
        console.error('Error issuing packing list:', error);
        alert('An error occurred while issuing packing list');
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
        alert('Status updated to Packing & Loading');
      } else {
        alert('Failed to update status: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('An error occurred while updating status');
    }
  };

  const handleDriverAcknowledge = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowDriverAckModal(true);
  };

  const handleConfirmDriverAck = async () => {
    if (selectedRequest && selectedSet && driverName && vehicleNumber) {
      try {
        const response = await fetch('/api/delivery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setId: selectedSet.id,
            driverAcknowledged: true,
            status: 'Driver Acknowledged',
          }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchDeliveryRequests();
          setShowDriverAckModal(false);
          setDriverName('');
          setVehicleNumber('');
          alert('Driver acknowledged successfully!');
        } else {
          alert('Failed to acknowledge: ' + data.message);
        }
      } catch (error) {
        console.error('Error acknowledging driver:', error);
        alert('An error occurred while acknowledging driver');
      }
    }
  };

  const handleCustomerAcknowledge = (request: DeliveryRequest, set: DeliverySet) => {
    setSelectedRequest(request);
    setSelectedSet(set);
    setShowCustomerAckModal(true);
  };

  const handleConfirmCustomerAck = async () => {
    if (selectedRequest && selectedSet && customerOTP) {
      try {
        const response = await fetch('/api/delivery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setId: selectedSet.id,
            customerAcknowledged: true,
            otp: customerOTP,
            status: 'Customer Confirmed',
          }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchDeliveryRequests();
          setShowCustomerAckModal(false);
          setCustomerOTP('');
          alert('Customer acknowledgement confirmed! Signed DO stored.');
        } else {
          alert('Failed to confirm: ' + data.message);
        }
      } catch (error) {
        console.error('Error confirming customer:', error);
        alert('An error occurred while confirming customer');
      }
    }
  };

  const handleConfirmPickupTime = (request: DeliveryRequest) => {
    setSelectedRequest(request);
    setShowPickupTimeModal(true);
  };

  const handleSavePickupTime = async () => {
    if (selectedRequest && pickupDate && pickupTime) {
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
          alert('Pickup time confirmed successfully!');
        } else {
          alert('Failed to save pickup time: ' + data.message);
        }
      } catch (error) {
        console.error('Error saving pickup time:', error);
        alert('An error occurred while saving pickup time');
      }
    }
  };

  const handleGenerateDO = (request: DeliveryRequest, set: DeliverySet) => {
    // Open DO Generation Modal/Component
    setSelectedDORequest(request);
    setSelectedSet(set);
    setShowDOModal(true);
  };

  const handleDOGenerated = async (request: DeliveryRequest, set: DeliverySet) => {
    try {
      const response = await fetch('/api/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: set.id,
          status: 'DO Generated',
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Create entry in DeliveryManagement localStorage
        const doNumber = `DO-${request.agreementNo}-${set.setName.replace('Set ', '')}`;
        const deliveryOrder = {
          id: `${request.id}-${set.id}`,
          doNumber,
          orderId: request.requestId,
          agreementId: request.agreementNo,
          customerName: request.customerName,
          customerContact: request.customerPhone || '',
          customerAddress: request.deliveryAddress,
          siteAddress: request.deliveryAddress,
          type: request.deliveryType,
          items: set.items.map((item, idx) => ({
            id: `item-${idx}`,
            scaffoldingItemId: `item-${idx}`,
            scaffoldingItemName: item.name,
            quantity: item.quantity,
            unit: 'pcs',
            availableStock: item.quantity,
          })),
          status: 'pending',
          scheduledDate: set.deliveryDate || undefined,
          createdBy: 'System',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save to localStorage for DeliveryManagement to pick up
        const existingOrders = JSON.parse(localStorage.getItem('deliveryOrders') || '[]');
        // Check if already exists (avoid duplicates)
        if (!existingOrders.find((o: { id: string }) => o.id === deliveryOrder.id)) {
          existingOrders.push(deliveryOrder);
          localStorage.setItem('deliveryOrders', JSON.stringify(existingOrders));
        }

        await fetchDeliveryRequests();
        setShowDOModal(false);
        alert('Delivery Order generated successfully! It is now available in Delivery Management.');
      } else {
        alert('Failed to generate DO: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating DO:', error);
      alert('An error occurred while generating DO');
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
        alert('Return DO generated successfully!');
      } else {
        alert('Failed to generate Return DO: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating Return DO:', error);
      alert('An error occurred while generating Return DO');
    }
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

      {/* Create Delivery Request Modal */}
      {showCreateDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8 mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-[#231F20]">Create Delivery Request</h3>
            
            <div className="space-y-4">
              {/* Agreement Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Rental Agreement *</label>
                <select
                  value={selectedAgreementId}
                  onChange={(e) => setSelectedAgreementId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                >
                  <option value="">-- Select Agreement --</option>
                  {rentalAgreements.map((agreement) => (
                    <option key={agreement.id} value={agreement.id}>
                      {agreement.agreementNumber} - {agreement.hirer} ({agreement.projectName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated fields (read-only display) */}
              {selectedAgreementId && (() => {
                const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
                if (!agreement) return null;
                return (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-500 font-medium">Auto-populated from Agreement:</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Customer Name:</span>
                        <span className="ml-2 text-gray-900">{agreement.hirer}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 text-gray-900">{agreement.hirerPhone || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Delivery Address:</span>
                        <span className="ml-2 text-gray-900">{agreement.location || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Request ID:</span>
                        <span className="ml-2 text-gray-900 font-mono">
                          DEL-{agreement.agreementNumber}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Customer Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email</label>
                <input
                  type="email"
                  value={newDeliveryForm.customerEmail}
                  onChange={(e) => setNewDeliveryForm({ ...newDeliveryForm, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="customer@email.com"
                />
              </div>

              {/* Delivery Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Type *</label>
                <select
                  value={newDeliveryForm.deliveryType}
                  onChange={(e) => setNewDeliveryForm({ ...newDeliveryForm, deliveryType: e.target.value as DeliveryType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                >
                  <option value="delivery">Delivery (Company delivers to customer)</option>
                  <option value="pickup">Pickup (Customer picks up from company)</option>
                </select>
              </div>

              {/* Sets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Delivery Sets *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSetLetter = String.fromCharCode(65 + deliverySets.length);
                      setDeliverySets([
                        ...deliverySets,
                        { setName: `Set ${nextSetLetter}`, scheduledPeriod: '', items: [{ name: '', quantity: 1 }] },
                      ]);
                    }}
                    className="text-sm text-[#F15929] hover:text-[#d94d1f] flex items-center space-x-1"
                  >
                    <Plus className="size-4" />
                    <span>Add Set</span>
                  </button>
                </div>

                {deliverySets.map((set, setIndex) => (
                  <div key={setIndex} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-700">{set.setName}</h5>
                      {deliverySets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDeliverySets(deliverySets.filter((_, i) => i !== setIndex))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Scheduled Period *</label>
                      <input
                        type="text"
                        value={set.scheduledPeriod}
                        onChange={(e) => {
                          const updated = [...deliverySets];
                          updated[setIndex].scheduledPeriod = e.target.value;
                          setDeliverySets(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] text-sm"
                        placeholder="e.g., 1 Jan 2026 - 31 Mar 2026"
                      />
                    </div>

                    {/* Items in Set */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs text-gray-500">Items *</label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...deliverySets];
                            updated[setIndex].items.push({ name: '', quantity: 1 });
                            setDeliverySets(updated);
                          }}
                          className="text-xs text-[#F15929] hover:text-[#d94d1f]"
                        >
                          + Add Item
                        </button>
                      </div>
                      {set.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...deliverySets];
                              updated[setIndex].items[itemIndex].name = e.target.value;
                              setDeliverySets(updated);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] text-sm"
                            placeholder="Item name"
                          />
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...deliverySets];
                              updated[setIndex].items[itemIndex].quantity = parseInt(e.target.value) || 1;
                              setDeliverySets(updated);
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] text-sm"
                            placeholder="Qty"
                          />
                          {set.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...deliverySets];
                                updated[setIndex].items = updated[setIndex].items.filter((_, i) => i !== itemIndex);
                                setDeliverySets(updated);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreateDeliveryModal(false);
                  setSelectedAgreementId('');
                  setNewDeliveryForm({ customerEmail: '', deliveryType: 'delivery' });
                  setDeliverySets([{ setName: 'Set A', scheduledPeriod: '', items: [{ name: '', quantity: 1 }] }]);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDeliveryRequest}
                disabled={isCreating || !selectedAgreementId}
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
            
            <div className="space-y-4">
              {/* Agreement Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Rental Agreement *</label>
                <select
                  value={selectedAgreementId}
                  onChange={(e) => setSelectedAgreementId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                >
                  <option value="">-- Select Agreement --</option>
                  {rentalAgreements.map((agreement) => (
                    <option key={agreement.id} value={agreement.id}>
                      {agreement.agreementNumber} - {agreement.hirer} ({agreement.projectName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated fields (read-only display) */}
              {selectedAgreementId && (() => {
                const agreement = rentalAgreements.find(a => a.id === selectedAgreementId);
                if (!agreement) return null;
                return (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-500 font-medium">Auto-populated from Agreement:</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Customer Name:</span>
                        <span className="ml-2 text-gray-900">{agreement.hirer}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 text-gray-900">{agreement.hirerPhone || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Pickup Address:</span>
                        <span className="ml-2 text-gray-900">{agreement.location || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Request ID:</span>
                        <span className="ml-2 text-gray-900 font-mono">
                          RET-{agreement.agreementNumber}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Set Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Set Name *</label>
                <input
                  type="text"
                  value={newReturnForm.setName}
                  onChange={(e) => setNewReturnForm({ ...newReturnForm, setName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="e.g., Set A"
                />
              </div>

              {/* Return Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Type *</label>
                <select
                  value={newReturnForm.returnType}
                  onChange={(e) => setNewReturnForm({ ...newReturnForm, returnType: e.target.value as ReturnType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                >
                  <option value="full">Full Return (All items in set)</option>
                  <option value="partial">Partial Return (Some items)</option>
                </select>
              </div>

              {/* Collection Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collection Method *</label>
                <select
                  value={newReturnForm.collectionMethod}
                  onChange={(e) => setNewReturnForm({ ...newReturnForm, collectionMethod: e.target.value as CollectionMethod })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                >
                  <option value="transport">Transport (Company picks up)</option>
                  <option value="self-return">Self Return (Customer delivers)</option>
                </select>
              </div>

              {/* Customer Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email</label>
                <input
                  type="email"
                  value={newReturnForm.customerEmail}
                  onChange={(e) => setNewReturnForm({ ...newReturnForm, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="customer@email.com"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Return *</label>
                <textarea
                  value={newReturnForm.reason}
                  onChange={(e) => setNewReturnForm({ ...newReturnForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  rows={3}
                  placeholder="Enter reason for return..."
                />
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Items to Return *</label>
                  <button
                    type="button"
                    onClick={() => setReturnItems([...returnItems, { name: '', quantity: 1 }])}
                    className="text-sm text-[#F15929] hover:text-[#d94d1f] flex items-center space-x-1"
                  >
                    <Plus className="size-4" />
                    <span>Add Item</span>
                  </button>
                </div>
                {returnItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[index].name = e.target.value;
                        setReturnItems(updated);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] text-sm"
                      placeholder="Item name"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[index].quantity = parseInt(e.target.value) || 1;
                        setReturnItems(updated);
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] text-sm"
                      placeholder="Qty"
                    />
                    {returnItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setReturnItems(returnItems.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreateReturnModal(false);
                  setSelectedAgreementId('');
                  setNewReturnForm({ setName: '', reason: '', customerEmail: '', returnType: 'full', collectionMethod: 'transport' });
                  setReturnItems([{ name: '', quantity: 1 }]);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReturnRequest}
                disabled={isCreating || !selectedAgreementId || !newReturnForm.setName || !newReturnForm.reason}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCreating && <Loader className="size-4 animate-spin" />}
                <span>Create Return Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}