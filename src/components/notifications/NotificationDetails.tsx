import { X, Plus, Minus, Edit, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { RFQNotification } from '../../types/rfq';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface NotificationDetailsProps {
  notification: RFQNotification;
  onClose: () => void;
}

export function NotificationDetails({ notification, onClose }: NotificationDetailsProps) {
  const getChangeIcon = (field: string) => {
    if (field === 'items' && notification.changes.find(c => c.oldValue === null)) {
      return <Plus className="size-4 text-green-600" />;
    }
    if (field === 'items' && notification.changes.find(c => c.newValue === null)) {
      return <Minus className="size-4 text-red-600" />;
    }
    if (field.startsWith('item_')) {
      return <Edit className="size-4 text-amber-600" />;
    }
    return <Info className="size-4 text-blue-600" />;
  };

  const renderChangeValue = (value: any, label: string) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">None</span>;
    }

    if (typeof value === 'object' && value.scaffoldingItemName) {
      // It's an RFQ item
      return (
        <div className="space-y-1">
          <p className="text-[#231F20]">{value.scaffoldingItemName}</p>
          <div className="text-sm text-gray-600">
            <p>Quantity: {value.quantity} {value.unit}</p>
            <p>Price: RM {value.unitPrice.toFixed(2)}</p>
            <p className="text-[#231F20]">Total: RM {value.totalPrice.toFixed(2)}</p>
          </div>
        </div>
      );
    }

    if (typeof value === 'number') {
      return <span className="text-[#231F20]">{value}</span>;
    }

    return <span className="text-[#231F20]">{String(value)}</span>;
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>RFQ Change Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notification Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[#231F20]">{notification.rfqNumber}</h3>
              <Badge className="bg-blue-100 text-blue-800">
                {notification.type.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-600">{notification.message}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Modified by {notification.createdBy}</span>
              <span>•</span>
              <span>{formatTimestamp(notification.createdAt)}</span>
            </div>
          </div>

          {/* Changes List */}
          <div>
            <h4 className="text-[#231F20] mb-3">
              Changes Made ({notification.changes.length})
            </h4>
            
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {notification.changes.map((change, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      {getChangeIcon(change.field)}
                      <div className="flex-1">
                        <p className="text-[#231F20]">{change.description}</p>
                      </div>
                    </div>

                    {/* Show old and new values if not an item addition/removal */}
                    {change.oldValue !== null && change.newValue !== null && (
                      <div className="grid grid-cols-2 gap-4 pl-7">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="size-4 text-red-600" />
                            <p className="text-sm text-gray-600">Previous Value</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded border border-red-200">
                            {renderChangeValue(change.oldValue, 'old')}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-green-600" />
                            <p className="text-sm text-gray-600">New Value</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded border border-green-200">
                            {renderChangeValue(change.newValue, 'new')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show only new value for additions */}
                    {change.oldValue === null && change.newValue !== null && (
                      <div className="pl-7">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Plus className="size-4 text-green-600" />
                            <p className="text-sm text-gray-600">Added Item</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded border border-green-200">
                            {renderChangeValue(change.newValue, 'new')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show only old value for removals */}
                    {change.oldValue !== null && change.newValue === null && (
                      <div className="pl-7">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Minus className="size-4 text-red-600" />
                            <p className="text-sm text-gray-600">Removed Item</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded border border-red-200">
                            {renderChangeValue(change.oldValue, 'old')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
