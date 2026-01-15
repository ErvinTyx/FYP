import { ArrowLeft, AlertCircle, Calendar, User, DollarSign, CheckCircle, Printer } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { OpenRepairSlip } from '../../types/inspection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface RepairSlipDetailsProps {
  repairSlip: OpenRepairSlip;
  onBack: () => void;
  onUpdateStatus: (slipId: string, status: OpenRepairSlip['status']) => void;
  onPrint?: (slip: OpenRepairSlip) => void;
}

export function RepairSlipDetails({ repairSlip, onBack, onUpdateStatus, onPrint }: RepairSlipDetailsProps) {
  const getStatusColor = (status: OpenRepairSlip['status']) => {
    const colors = {
      'open': 'bg-blue-100 text-blue-800',
      'in-repair': 'bg-amber-100 text-amber-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  const getPriorityColor = (priority: OpenRepairSlip['priority']) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-blue-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority];
  };

  const getRepairStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'scrapped': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
              <h1 className="text-[#231F20]">{repairSlip.orpNumber}</h1>
              <Badge className={getStatusColor(repairSlip.status)}>
                {repairSlip.status.toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(repairSlip.priority)}>
                {repairSlip.priority.toUpperCase()} PRIORITY
              </Badge>
            </div>
            <p className="text-gray-600">Open Repair Slip Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {repairSlip.status === 'in-repair' && (
            <Button
              onClick={() => onUpdateStatus(repairSlip.id, 'completed')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="size-4 mr-2" />
              Mark Complete
            </Button>
          )}
          <Button
            onClick={() => onPrint && onPrint(repairSlip)}
            className="bg-gray-600 hover:bg-gray-700"
          >
            <Printer className="size-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Information */}
      <Card>
        <CardHeader>
          <CardTitle>Repair Slip Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Related RCF</p>
                <p className="text-[#231F20]">{repairSlip.rcfNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Assigned To</p>
                <p className="text-[#231F20]">{repairSlip.assignedTo || 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Created Date</p>
                <p className="text-[#231F20]">
                  {new Date(repairSlip.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Estimated Cost</p>
                <p className="text-[#231F20]">RM {repairSlip.estimatedCost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {repairSlip.startDate && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <Calendar className="size-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-[#231F20]">
                      {new Date(repairSlip.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {repairSlip.completionDate && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="size-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Completion Date</p>
                      <p className="text-[#231F20]">
                        {new Date(repairSlip.completionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {repairSlip.actualCost > 0 && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="size-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Actual Cost</p>
                      <p className="text-[#231F20]">RM {repairSlip.actualCost.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {repairSlip.repairNotes && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 mb-2">Repair Notes</p>
              <p className="text-[#231F20]">{repairSlip.repairNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repair Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items Requiring Repair</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Damage Type</TableHead>
                  <TableHead>Repair Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost (RM)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairSlip.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[#231F20]">{item.scaffoldingItemName}</p>
                        {item.damageDescription && (
                          <p className="text-sm text-gray-500 mt-1">{item.damageDescription}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.damageType.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.repairActions.map((action, idx) => (
                          <div key={idx} className="text-sm text-gray-600">
                            • {action}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRepairStatusColor(item.repairStatus)}>
                        {item.repairStatus.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={6} className="text-right">
                    <span className="text-[#231F20]">Total Estimated Cost:</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[#231F20]">
                      RM {repairSlip.estimatedCost.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Created By</p>
              <p className="text-[#231F20]">{repairSlip.createdBy}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="text-[#231F20]">
                {new Date(repairSlip.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-[#231F20]">
                {new Date(repairSlip.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          {repairSlip.invoiceNumber && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500">Associated Invoice</p>
              <p className="text-[#231F20]">{repairSlip.invoiceNumber}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}