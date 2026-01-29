import { useState } from 'react';
import {
  ArrowLeft, FileText, User, Calendar as CalendarIcon, MapPin,
  Phone, Package, Truck, CheckCircle2, Download, Clock,
  FileSignature, Image as ImageIcon, Printer
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { format } from 'date-fns';

interface DeliveryDetailsProps {
  delivery: DeliveryOrder;
  onProcess: () => void;
  onBack: () => void;
}

export function DeliveryDetails({ delivery, onProcess, onBack }: DeliveryDetailsProps) {
  const [isDOViewerOpen, setIsDOViewerOpen] = useState(false);

  const getStatusBadge = (status: DeliveryOrder['status']) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      'Pending': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      'Packing List Issued': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Packing List Issued' },
      'Stock Checked': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Stock Checked' },
      'Packing & Loading': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Packing & Loading' },
      'In Transit': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Transit' },
      'Ready for Pickup': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Ready for Pickup' },
      'Completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    };

    const statusConfig = config[status];
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDOViewerOpen(true)}>
            <FileText className="size-4 mr-2" />
            View DO
          </Button>
          {delivery.status !== 'Completed' && (
            <Button onClick={onProcess} className="bg-[#F15929] hover:bg-[#d94d1f]">
              Continue Processing
            </Button>
          )}
        </div>
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

      {/* DO Viewer Dialog */}
      <Dialog open={isDOViewerOpen} onOpenChange={setIsDOViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Order - {delivery.doNumber}</DialogTitle>
            <DialogDescription>
              Delivery Order document
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 p-4 bg-white border rounded-lg">
            {/* DO Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#231F20]">POWER METAL STEEL SDN BHD</h2>
                <p className="text-sm text-gray-600">Scaffolding Equipment Rental</p>
              </div>
              <div className="text-right">
                <h3 className="text-[#F15929] font-bold mb-2">DELIVERY ORDER</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>DO Number:</strong> {delivery.doNumber}</p>
                  <p><strong>Date:</strong> {delivery.packingListDate && format(new Date(delivery.packingListDate), 'PP')}</p>
                  <p><strong>Order ID:</strong> {delivery.orderId}</p>
                  <p><strong>Agreement ID:</strong> {delivery.agreementId}</p>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-6 border-b pb-4">
              <div>
                <h4 className="font-semibold text-[#231F20] mb-2">Deliver To:</h4>
                <p className="text-sm">{delivery.customerName}</p>
                <p className="text-sm text-gray-600">{delivery.siteAddress}</p>
                <p className="text-sm text-gray-600">{delivery.customerContact}</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#231F20] mb-2">Delivery Details:</h4>
                <p className="text-sm"><strong>Type:</strong> {delivery.type === 'delivery' ? 'Delivery' : 'Customer Pickup'}</p>
                {delivery.scheduledDate && (
                  <p className="text-sm"><strong>Scheduled Date:</strong> {format(new Date(delivery.scheduledDate), 'PP')}</p>
                )}
                {delivery.scheduledTimeSlot && (
                  <p className="text-sm"><strong>Time Slot:</strong> {delivery.scheduledTimeSlot}</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="font-semibold text-[#231F20] mb-2">Items:</h4>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">#</th>
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-right">Quantity</th>
                    <th className="border p-2 text-right">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border p-2">{index + 1}</td>
                      <td className="border p-2">{item.scaffoldingItemName}</td>
                      <td className="border p-2 text-right">{item.quantity}</td>
                      <td className="border p-2 text-right">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Driver Information */}
            {delivery.driverName && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-[#231F20] mb-2">Driver Information:</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <p><strong>Driver:</strong> {delivery.driverName}</p>
                  <p><strong>Contact:</strong> {delivery.driverContact}</p>
                  <p><strong>Vehicle:</strong> {delivery.vehicleNumber}</p>
                </div>
              </div>
            )}

            {/* Signatures Section */}
            {(delivery.driverSignature || delivery.customerSignature) && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-[#231F20] mb-4">Signatures:</h4>
                <div className="grid grid-cols-2 gap-6">
                  {delivery.driverSignature && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Driver Signature</p>
                      <img
                        src={delivery.driverSignature}
                        alt="Driver signature"
                        className="border rounded-lg p-2 bg-white mx-auto max-w-[200px]"
                      />
                      {delivery.driverAcknowledgedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(delivery.driverAcknowledgedAt), 'PPp')}
                        </p>
                      )}
                    </div>
                  )}
                  {delivery.customerSignature && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Customer Signature</p>
                      <img
                        src={delivery.customerSignature}
                        alt="Customer signature"
                        className="border rounded-lg p-2 bg-white mx-auto max-w-[200px]"
                      />
                      <p className="text-sm text-gray-600 mt-1">{delivery.customerSignedBy}</p>
                      {delivery.customerAcknowledgedAt && (
                        <p className="text-xs text-gray-500">
                          {format(new Date(delivery.customerAcknowledgedAt), 'PPp')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OTP Verification */}
            {delivery.verifiedOTP && (
              <div className="border-t pt-4 text-center">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="size-4 mr-1" />
                  OTP Verified - Delivery Confirmed
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="size-4 mr-2" />
              Print
            </Button>
            <Button
              className="bg-[#F15929] hover:bg-[#d94d1f]"
              onClick={() => setIsDOViewerOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}