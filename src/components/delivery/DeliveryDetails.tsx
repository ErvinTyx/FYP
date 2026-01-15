import {
  ArrowLeft, FileText, User, Calendar as CalendarIcon, MapPin,
  Phone, Package, Truck, CheckCircle2, Download, Clock,
  FileSignature, Image as ImageIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DeliveryOrder } from './DeliveryManagement';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface DeliveryDetailsProps {
  delivery: DeliveryOrder;
  onProcess: () => void;
  onBack: () => void;
}

export function DeliveryDetails({ delivery, onProcess, onBack }: DeliveryDetailsProps) {
  const getStatusBadge = (status: DeliveryOrder['status']) => {
    const config = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      stock_checked: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Stock Checked' },
      packing_list_issued: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Packing List Issued' },
      schedule_confirmed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Scheduled' },
      packing: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Packing' },
      loaded: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Loaded' },
      do_issued: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'DO Issued' },
      driver_acknowledged: { bg: 'bg-violet-100', text: 'text-violet-800', label: 'Driver Acknowledged' },
      in_transit: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Transit' },
      delivered: { bg: 'bg-lime-100', text: 'text-lime-800', label: 'Delivered' },
      customer_acknowledged: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Customer Acknowledged' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    };

    const statusConfig = config[status as keyof typeof config];
    if (!statusConfig) {
      return <Badge className="bg-gray-100 text-gray-800">{status || 'Unknown'}</Badge>;
    }
    
    const { bg, text, label } = statusConfig;
    return <Badge className={`${bg} ${text}`}>{label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[#231F20]">{delivery.doNumber}</h1>
              {getStatusBadge(delivery.status)}
            </div>
            <p className="text-gray-600">Order ID: {delivery.orderId}</p>
          </div>
        </div>
        {delivery.status !== 'completed' && (
          <Button onClick={onProcess} className="bg-[#F15929] hover:bg-[#d94d1f]">
            Continue Processing
          </Button>
        )}
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <User className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Customer Name</p>
                <p className="text-[#231F20]">{delivery.customerName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="text-[#231F20]">{delivery.customerContact}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Customer Address</p>
                <p className="text-[#231F20]">{delivery.customerAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Delivery Site Address</p>
                <p className="text-[#231F20]">{delivery.siteAddress}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Information */}
      {delivery.scheduledDate && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <CalendarIcon className="size-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Scheduled Date</p>
                  <p className="text-[#231F20]">
                    {new Date(delivery.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="size-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Time Slot</p>
                  <p className="text-[#231F20]">{delivery.scheduledTimeSlot}</p>
                </div>
              </div>
              {delivery.scheduleConfirmedBy && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Confirmed By</p>
                    <p className="text-[#231F20]">{delivery.scheduleConfirmedBy}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver & Vehicle Information */}
      {delivery.driverName && (
        <Card>
          <CardHeader>
            <CardTitle>Driver & Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <User className="size-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Driver Name</p>
                  <p className="text-[#231F20]">{delivery.driverName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="size-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Driver Contact</p>
                  <p className="text-[#231F20]">{delivery.driverContact}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="size-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Vehicle Number</p>
                  <p className="text-[#231F20]">{delivery.vehicleNumber}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Available Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-[#231F20]">{item.scaffoldingItemName}</p>
                      {item.dimensions && (
                        <p className="text-sm text-gray-500">{item.dimensions}</p>
                      )}
                      {item.weight && (
                        <p className="text-sm text-gray-500">Weight: {item.weight}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.unit}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={item.availableStock >= item.quantity ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {item.availableStock}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Packing Photos */}
      {delivery.packingPhotos && delivery.packingPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              Packing Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {delivery.packingPhotos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Packing ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 text-white"
                      onClick={() => window.open(photo, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Photos */}
      {delivery.deliveryPhotos && delivery.deliveryPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              Delivery Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {delivery.deliveryPhotos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Delivery ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 text-white"
                      onClick={() => window.open(photo, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signatures */}
      {(delivery.driverSignature || delivery.customerSignature) && (
        <Card>
          <CardHeader>
            <CardTitle>Signatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {delivery.driverSignature && (
                <div>
                  <h4 className="text-sm text-gray-500 mb-2">Driver Signature</h4>
                  <img
                    src={delivery.driverSignature}
                    alt="Driver signature"
                    className="border rounded-lg p-4 bg-white w-full"
                  />
                  {delivery.driverAcknowledgedAt && (
                    <p className="text-sm text-gray-500 mt-2">
                      Signed: {new Date(delivery.driverAcknowledgedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {delivery.customerSignature && (
                <div>
                  <h4 className="text-sm text-gray-500 mb-2">Customer Signature</h4>
                  <img
                    src={delivery.customerSignature}
                    alt="Customer signature"
                    className="border rounded-lg p-4 bg-white w-full"
                  />
                  <p className="text-sm text-gray-600 mt-2">{delivery.customerSignedBy}</p>
                  {delivery.customerAcknowledgedAt && (
                    <p className="text-sm text-gray-500">
                      Signed: {new Date(delivery.customerAcknowledgedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {delivery.stockCheckDate && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Stock Checked</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.stockCheckDate).toLocaleString()} • {delivery.stockCheckBy}
                  </p>
                  {delivery.stockCheckNotes && (
                    <p className="text-sm text-gray-600 mt-1">{delivery.stockCheckNotes}</p>
                  )}
                </div>
              </div>
            )}
            
            {delivery.packingListDate && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Packing List Issued</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.packingListDate).toLocaleString()} • {delivery.packingListNumber}
                  </p>
                </div>
              </div>
            )}
            
            {delivery.scheduleConfirmedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Schedule Confirmed</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.scheduleConfirmedAt).toLocaleString()} • {delivery.scheduleConfirmedBy}
                  </p>
                </div>
              </div>
            )}
            
            {delivery.loadingCompletedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Loading Completed</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.loadingCompletedAt).toLocaleString()} • {delivery.loadingCompletedBy}
                  </p>
                </div>
              </div>
            )}
            
            {delivery.doIssuedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Delivery Order Issued</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.doIssuedAt).toLocaleString()} • {delivery.doIssuedBy}
                  </p>
                </div>
              </div>
            )}
            
            {delivery.dispatchedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Dispatched</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.dispatchedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {delivery.deliveredAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-lime-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Delivered</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.deliveredAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {delivery.customerAcknowledgedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Customer Acknowledged</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.customerAcknowledgedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {delivery.inventoryUpdatedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <p className="text-[#231F20]">Completed - Inventory Updated</p>
                  <p className="text-sm text-gray-500">
                    {new Date(delivery.inventoryUpdatedAt).toLocaleString()}
                  </p>
                  <Badge className="bg-green-100 text-green-800 mt-1">
                    Status: {delivery.inventoryStatus}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}