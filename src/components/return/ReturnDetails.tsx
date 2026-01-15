import {
  ArrowLeft, FileText, Download, Eye, CheckCircle2, Package,
  Calendar, User, Phone, Truck, MapPin, AlertCircle, Settings,
  PackageX, Image as ImageIcon, ClipboardCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { format } from 'date-fns';
import { Return, ReturnItem } from './ReturnWorkflow';

interface ReturnDetailsProps {
  returnOrder: Return;
  onProcess: () => void;
  onBack: () => void;
}

export function ReturnDetails({ returnOrder, onProcess, onBack }: ReturnDetailsProps) {
  const getStatusBadge = (status: Return['status']) => {
    const config = {
      'Requested': { color: 'bg-blue-500 text-white', label: 'Requested' },
      'Approved': { color: 'bg-green-500 text-white', label: 'Approved' },
      'Pickup Scheduled': { color: 'bg-purple-500 text-white', label: 'Pickup Scheduled' },
      'Pickup Confirmed': { color: 'bg-purple-600 text-white', label: 'Pickup Confirmed' },
      'Driver Recording': { color: 'bg-amber-500 text-white', label: 'Driver Recording' },
      'In Transit': { color: 'bg-amber-600 text-white', label: 'In Transit' },
      'Received at Warehouse': { color: 'bg-cyan-500 text-white', label: 'Received at Warehouse' },
      'Under Inspection': { color: 'bg-amber-500 text-white', label: 'Under Inspection' },
      'Sorting Complete': { color: 'bg-green-500 text-white', label: 'Sorting Complete' },
      'Customer Notified': { color: 'bg-green-600 text-white', label: 'Customer Notified' },
      'Dispute Raised': { color: 'bg-red-500 text-white', label: 'Dispute Raised' },
      'Completed': { color: 'bg-emerald-600 text-white', label: 'Completed' },
    };
    const { color, label } = config[status];
    return <Badge className={color}>{label}</Badge>;
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

  const canProcess = returnOrder.status !== 'Completed';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-[#231F20]">Return Details - {returnOrder.id}</h1>
            <p className="text-gray-600">{returnOrder.customer}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(returnOrder.status)}
          {canProcess && (
            <Button 
              onClick={onProcess}
              className="bg-[#F15929] hover:bg-[#d94d1f]"
            >
              <ClipboardCheck className="size-4 mr-2" />
              Process Return
            </Button>
          )}
        </div>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Return Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Return ID</p>
                <p className="text-[#231F20]">{returnOrder.id}</p>
              </div>
              <div>
                <p className="text-gray-600">Order ID</p>
                <p className="text-[#231F20]">{returnOrder.orderId}</p>
              </div>
              <div>
                <p className="text-gray-600">Return Type</p>
                <p className="text-[#231F20]">{returnOrder.returnType}</p>
              </div>
              <div>
                <p className="text-gray-600">Transportation</p>
                <p className="text-[#231F20]">{returnOrder.transportationType}</p>
              </div>
              <div>
                <p className="text-gray-600">Request Date</p>
                <p className="text-[#231F20]">
                  {format(new Date(returnOrder.requestDate), 'PPP')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <div className="mt-1">{getStatusBadge(returnOrder.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-600">Customer Name</p>
                <p className="text-[#231F20]">{returnOrder.customer}</p>
              </div>
              {returnOrder.customerContact && (
                <div>
                  <p className="text-gray-600">Contact</p>
                  <p className="text-[#231F20]">{returnOrder.customerContact}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pickup/Delivery Information */}
      {returnOrder.transportationType === 'Transportation Needed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="size-4 text-[#F15929]" />
              Pickup & Transport Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {returnOrder.pickupDate && (
                <div>
                  <p className="text-gray-600">Pickup Date</p>
                  <p className="text-[#231F20]">
                    {format(new Date(returnOrder.pickupDate), 'PPP')}
                  </p>
                </div>
              )}
              {returnOrder.pickupDriver && (
                <div>
                  <p className="text-gray-600">Driver</p>
                  <p className="text-[#231F20]">{returnOrder.pickupDriver}</p>
                </div>
              )}
              {returnOrder.driverContact && (
                <div>
                  <p className="text-gray-600">Driver Contact</p>
                  <p className="text-[#231F20]">{returnOrder.driverContact}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {(returnOrder.grnNumber || returnOrder.rcfNumber) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4 text-[#F15929]" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {returnOrder.grnNumber && (
                <div className="p-3 border rounded-lg flex-1">
                  <p className="text-sm text-gray-600">GRN Number</p>
                  <p className="text-[#231F20]">{returnOrder.grnNumber}</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Eye className="size-3 mr-1" />
                    View GRN
                  </Button>
                </div>
              )}
              {returnOrder.rcfNumber && (
                <div className="p-3 border rounded-lg flex-1">
                  <p className="text-sm text-gray-600">RCF Number</p>
                  <p className="text-[#231F20]">{returnOrder.rcfNumber}</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Eye className="size-3 mr-1" />
                    View RCF
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="size-4 text-[#F15929]" />
            Returned Items ({returnOrder.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {returnOrder.items.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-[#231F20]">{item.name}</p>
                    <p className="text-sm text-gray-500">Category: {item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Qty: {item.quantityReturned}</p>
                    <div className="mt-1">{getItemStatusBadge(item.status)}</div>
                  </div>
                </div>
                {item.notes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <p className="text-gray-600">Notes:</p>
                    <p className="text-gray-800">{item.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Production Notes */}
      {returnOrder.productionNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspection Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{returnOrder.productionNotes}</p>
            {returnOrder.hasExternalGoods && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800">External Goods Detected</p>
                    {returnOrder.externalGoodsNotes && (
                      <p className="text-sm text-amber-700 mt-1">{returnOrder.externalGoodsNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {(returnOrder.driverRecordPhotos || returnOrder.warehousePhotos || returnOrder.damagePhotos) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="size-4 text-[#F15929]" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {returnOrder.driverRecordPhotos && returnOrder.driverRecordPhotos.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Driver Recording Photos</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {returnOrder.driverRecordPhotos.map((photo, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt={photo.description} 
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 bg-gray-50">
                        <p className="text-xs text-gray-600">{photo.description}</p>
                        {photo.uploadedBy && (
                          <p className="text-xs text-gray-500">By: {photo.uploadedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {returnOrder.warehousePhotos && returnOrder.warehousePhotos.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Warehouse Receipt Photos</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {returnOrder.warehousePhotos.map((photo, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt={photo.description} 
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 bg-gray-50">
                        <p className="text-xs text-gray-600">{photo.description}</p>
                        {photo.uploadedBy && (
                          <p className="text-xs text-gray-500">By: {photo.uploadedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {returnOrder.damagePhotos && returnOrder.damagePhotos.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Damage Photos</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {returnOrder.damagePhotos.map((photo, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt={photo.description} 
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 bg-gray-50">
                        <p className="text-xs text-gray-600">{photo.description}</p>
                        {photo.uploadedBy && (
                          <p className="text-xs text-gray-500">By: {photo.uploadedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Dispute */}
      {returnOrder.customerDispute?.raised && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertCircle className="size-4" />
              Customer Dispute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{returnOrder.customerDispute.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              Raised on: {format(new Date(returnOrder.customerDispute.raisedAt), 'PPP')}
            </p>
            {returnOrder.customerDispute.resolved && (
              <Badge className="bg-green-100 text-green-800 mt-2">Resolved</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Updates */}
      {returnOrder.status === 'Completed' && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-4" />
              System Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span>Inventory Updated</span>
                <Badge className="bg-green-100 text-green-800">
                  {returnOrder.inventoryUpdated ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span>SOA Updated</span>
                <Badge className="bg-green-100 text-green-800">
                  {returnOrder.soaUpdated ? 'Yes' : 'No'}
                </Badge>
              </div>
              {returnOrder.customerNotificationSent && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span>Customer Notification</span>
                  <Badge className="bg-green-100 text-green-800">Sent</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}