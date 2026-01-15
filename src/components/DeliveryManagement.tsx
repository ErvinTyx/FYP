import React, { useState } from 'react';
import { Search, FileText, Truck, Package, CheckCircle, Download, Upload, Eye, AlertCircle } from 'lucide-react';

type DeliveryType = 'delivery' | 'pickup';
type DeliveryStatus = 'Pending' | 'Packing List Issued' | 'Packing & Loading' | 'Driver Acknowledged' | 'In Transit' | 'Delivered' | 'Customer Confirmed' | 'Completed';

interface DeliveryItem {
  id: string;
  projectName: string;
  customerName: string;
  setName: string;
  agreementNo: string;
  scheduledDate: string;
  deliveryType: DeliveryType;
  status: DeliveryStatus;
  items: { name: string; quantity: number }[];
  deliveryAddress: string;
  customerPhone: string;
  pickupTime?: string;
  driverName?: string;
  vehicleNumber?: string;
  otp?: string;
  packingListIssued?: boolean;
}

export default function DeliveryManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedItem, setSelectedItem] = useState<DeliveryItem | null>(null);
  const [showPackingListModal, setShowPackingListModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form states
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [customerOTP, setCustomerOTP] = useState('');

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([
    {
      id: 'DM001',
      projectName: 'KL Tower Construction',
      customerName: 'ABC Construction Sdn Bhd',
      setName: 'Set A - Initial Phase',
      agreementNo: 'AGR-2025-001',
      scheduledDate: '2025-12-08',
      deliveryType: 'delivery',
      status: 'Pending',
      deliveryAddress: 'Jalan Raja Laut, 50350 Kuala Lumpur',
      customerPhone: '+60123456789',
      items: [
        { name: 'Scaffolding Pipe 6m', quantity: 100 },
        { name: 'Coupler Standard', quantity: 200 },
        { name: 'Base Plate', quantity: 50 }
      ]
    },
    {
      id: 'DM002',
      projectName: 'Ampang Mall Development',
      customerName: 'XYZ Development',
      setName: 'Set C - Main Structure',
      agreementNo: 'AGR-2025-002',
      scheduledDate: '2025-12-10',
      deliveryType: 'pickup',
      status: 'Packing List Issued',
      deliveryAddress: 'HQ Pickup',
      customerPhone: '+60129876543',
      pickupTime: '10:00 AM',
      packingListIssued: true,
      items: [
        { name: 'H-Frame Scaffolding', quantity: 80 },
        { name: 'Cross Brace', quantity: 120 },
        { name: 'Walk Board', quantity: 60 }
      ]
    },
    {
      id: 'DM003',
      projectName: 'Sentul Heights Project',
      customerName: 'GHI Builders',
      setName: 'Set B - Phase 2',
      agreementNo: 'AGR-2025-003',
      scheduledDate: '2025-12-09',
      deliveryType: 'delivery',
      status: 'Driver Acknowledged',
      deliveryAddress: 'Jalan Sentul, 51100 Kuala Lumpur',
      customerPhone: '+60121234567',
      packingListIssued: true,
      driverName: 'Ahmad bin Ali',
      vehicleNumber: 'WXY 1234',
      items: [
        { name: 'Scaffolding Pipe 4m', quantity: 150 },
        { name: 'Coupler Swivel', quantity: 180 }
      ]
    }
  ]);

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-800';
      case 'Packing List Issued': return 'bg-indigo-100 text-indigo-800';
      case 'Packing & Loading': return 'bg-yellow-100 text-yellow-800';
      case 'Driver Acknowledged': return 'bg-cyan-100 text-cyan-800';
      case 'In Transit': return 'bg-orange-100 text-orange-800';
      case 'Delivered': return 'bg-blue-100 text-blue-800';
      case 'Customer Confirmed': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleIssuePackingList = (item: DeliveryItem) => {
    setSelectedItem(item);
    setShowPackingListModal(true);
  };

  const handleConfirmPackingList = () => {
    if (selectedItem) {
      const updatedDeliveries = deliveries.map(d => {
        if (d.id === selectedItem.id) {
          return {
            ...d,
            packingListIssued: true,
            status: 'Packing List Issued' as DeliveryStatus
          };
        }
        return d;
      });
      setDeliveries(updatedDeliveries);
      setShowPackingListModal(false);
      alert('Packing list issued successfully!');
    }
  };

  const handleUpdatePackingLoading = (item: DeliveryItem) => {
    const updatedDeliveries = deliveries.map(d => {
      if (d.id === item.id) {
        return {
          ...d,
          status: 'Packing & Loading' as DeliveryStatus
        };
      }
      return d;
    });
    setDeliveries(updatedDeliveries);
    alert('Status updated to Packing & Loading. Inventory status: HQ → Rental');
  };

  const handleDriverAcknowledge = (item: DeliveryItem) => {
    setSelectedItem(item);
    setShowDriverModal(true);
  };

  const handleConfirmDriver = () => {
    if (selectedItem && driverName && vehicleNumber) {
      const updatedDeliveries = deliveries.map(d => {
        if (d.id === selectedItem.id) {
          return {
            ...d,
            driverName,
            vehicleNumber,
            status: 'Driver Acknowledged' as DeliveryStatus
          };
        }
        return d;
      });
      setDeliveries(updatedDeliveries);
      setShowDriverModal(false);
      setDriverName('');
      setVehicleNumber('');
      alert('Driver acknowledged successfully! Status: In Transit');
    }
  };

  const handleCustomerAcknowledge = (item: DeliveryItem) => {
    setSelectedItem(item);
    setShowOTPModal(true);
  };

  const handleConfirmOTP = () => {
    if (selectedItem && customerOTP) {
      const updatedDeliveries = deliveries.map(d => {
        if (d.id === selectedItem.id) {
          return {
            ...d,
            otp: customerOTP,
            status: 'Customer Confirmed' as DeliveryStatus
          };
        }
        return d;
      });
      setDeliveries(updatedDeliveries);
      setShowOTPModal(false);
      setCustomerOTP('');
      alert('Customer acknowledgement confirmed! Signed DO and OTP stored.');
    }
  };

  const handleViewDetails = (item: DeliveryItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const getNextAction = (item: DeliveryItem) => {
    switch (item.status) {
      case 'Pending':
        return { label: 'Issue Packing List', action: () => handleIssuePackingList(item), icon: FileText };
      case 'Packing List Issued':
        return { label: 'Start Packing & Loading', action: () => handleUpdatePackingLoading(item), icon: Package };
      case 'Packing & Loading':
        if (item.deliveryType === 'delivery') {
          return { label: 'Driver Acknowledge', action: () => handleDriverAcknowledge(item), icon: Truck };
        } else {
          return { label: 'Customer Acknowledge', action: () => handleCustomerAcknowledge(item), icon: CheckCircle };
        }
      case 'Driver Acknowledged':
        return { label: 'Customer Acknowledge', action: () => handleCustomerAcknowledge(item), icon: CheckCircle };
      case 'Customer Confirmed':
        return { label: 'Completed', action: null, icon: CheckCircle };
      default:
        return null;
    }
  };

  const filteredDeliveries = deliveries.filter(item => {
    const matchesSearch = 
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.agreementNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.setName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesType = filterType === 'all' || item.deliveryType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#231F20]">Delivery Management</h1>
        <p className="text-gray-600">Execute and track delivery fulfillment</p>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
          <input
            type="text"
            placeholder="Search by project, customer, agreement, or set..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
        >
          <option value="all">All Types</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
        >
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Packing List Issued">Packing List Issued</option>
          <option value="Packing & Loading">Packing & Loading</option>
          <option value="Driver Acknowledged">Driver Acknowledged</option>
          <option value="Customer Confirmed">Customer Confirmed</option>
        </select>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Project Name</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Customer Name</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Scheduled Date</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Type</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Status</th>
              <th className="text-center px-6 py-3 text-xs text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map((item) => {
              const nextAction = getNextAction(item);
              const ActionIcon = nextAction?.icon;
              
              return (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm text-[#231F20]">{item.projectName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{item.customerName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{item.scheduledDate}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.deliveryType === 'delivery' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="size-4" />
                      </button>
                      
                      {nextAction && nextAction.action && ActionIcon && (
                        <button
                          onClick={nextAction.action}
                          className="px-3 py-1.5 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg text-xs transition-colors"
                          title={nextAction.label}
                        >
                          {nextAction.label}
                        </button>
                      )}
                      
                      {item.status === 'Customer Confirmed' && (
                        <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs">
                          Completed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDeliveries.length === 0 && (
          <div className="text-center py-12">
            <Package className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No deliveries found</p>
          </div>
        )}
      </div>

      {/* Packing List Modal */}
      {showPackingListModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl space-y-4">
            <h3 className="text-xl text-[#231F20]">Issue Packing List</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500">Project</p>
                    <p className="text-gray-900">{selectedItem.projectName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="text-gray-900">{selectedItem.customerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Agreement</p>
                    <p className="text-gray-900">{selectedItem.agreementNo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Set</p>
                    <p className="text-gray-900">{selectedItem.setName}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h5 className="text-sm text-gray-700 mb-2">Items (Based on Agreement)</h5>
                  <div className="space-y-2">
                    {selectedItem.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="text-gray-900">Qty: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowPackingListModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPackingList}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg flex items-center space-x-2"
              >
                <Download className="size-4" />
                <span>Issue & Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Acknowledge Modal */}
      {showDriverModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Driver Acknowledgement</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Project: {selectedItem.projectName}</p>
                <p className="text-sm text-gray-600">Customer: {selectedItem.customerName}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Driver Name *</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Enter driver name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Vehicle Number *</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]"
                  placeholder="Enter vehicle number"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  Driver will acknowledge the DO before departure. Inventory status will be updated from "HQ" to "Rental".
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDriverModal(false);
                  setDriverName('');
                  setVehicleNumber('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDriver}
                disabled={!driverName || !vehicleNumber}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer OTP Modal */}
      {showOTPModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl text-[#231F20]">Customer Acknowledgement</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Project: {selectedItem.projectName}</p>
                <p className="text-sm text-gray-600">Customer: {selectedItem.customerName}</p>
                <p className="text-sm text-gray-600">Type: {selectedItem.deliveryType === 'delivery' ? 'Delivered to site' : 'Picked up from HQ'}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Customer OTP *</label>
                <input
                  type="text"
                  value={customerOTP}
                  onChange={(e) => setCustomerOTP(e.target.value)}
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F15929] text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  ✓ Customer provides OTP upon {selectedItem.deliveryType === 'delivery' ? 'delivery confirmation' : 'pickup completion'}<br/>
                  ✓ Signed DO will be stored for record<br/>
                  ✓ Inventory status: HQ → Rental
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setCustomerOTP('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOTP}
                disabled={!customerOTP || customerOTP.length !== 6}
                className="px-4 py-2 bg-[#F15929] hover:bg-[#d94d1f] text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl space-y-4">
            <h3 className="text-xl text-[#231F20]">Delivery Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Project Name</label>
                  <p className="text-sm text-gray-900">{selectedItem.projectName}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Customer Name</label>
                  <p className="text-sm text-gray-900">{selectedItem.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Set Name</label>
                  <p className="text-sm text-gray-900">{selectedItem.setName}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Agreement No</label>
                  <p className="text-sm text-gray-900">{selectedItem.agreementNo}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Scheduled Date</label>
                  <p className="text-sm text-gray-900">{selectedItem.scheduledDate}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Type</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    selectedItem.deliveryType === 'delivery' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {selectedItem.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Phone</label>
                  <p className="text-sm text-gray-900">{selectedItem.customerPhone}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Address</label>
                <p className="text-sm text-gray-900">{selectedItem.deliveryAddress}</p>
              </div>

              {selectedItem.pickupTime && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Pickup Time</label>
                  <p className="text-sm text-gray-900">{selectedItem.pickupTime}</p>
                </div>
              )}

              {selectedItem.driverName && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Driver Name</label>
                    <p className="text-sm text-gray-900">{selectedItem.driverName}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Vehicle Number</label>
                    <p className="text-sm text-gray-900">{selectedItem.vehicleNumber}</p>
                  </div>
                </div>
              )}

              {selectedItem.otp && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <label className="block text-sm text-green-700 mb-1">Customer OTP (Confirmed)</label>
                  <p className="text-lg text-green-900 tracking-widest">{selectedItem.otp}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-500 mb-2">Items</label>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {selectedItem.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="text-gray-900">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}