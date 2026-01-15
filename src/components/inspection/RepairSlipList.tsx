import { Eye, Calendar, User, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { OpenRepairSlip } from '../../types/inspection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface RepairSlipListProps {
  repairSlips: OpenRepairSlip[];
  searchQuery: string;
  onView: (slip: OpenRepairSlip) => void;
  onUpdateStatus: (slipId: string, status: OpenRepairSlip['status']) => void;
  onGenerateDamageInvoice: (slipId: string) => void;
}

export function RepairSlipList({ repairSlips, searchQuery, onView, onUpdateStatus, onGenerateDamageInvoice }: RepairSlipListProps) {
  const filteredSlips = repairSlips.filter(slip =>
    slip.orpNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    slip.rcfNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (filteredSlips.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="size-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No repair slips found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try adjusting your search' : 'Create repair slips from condition reports'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredSlips.map(slip => (
        <Card key={slip.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-[#231F20]">{slip.orpNumber}</h3>
                      <Badge className={getStatusColor(slip.status)}>
                        {slip.status.toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(slip.priority)}>
                        {slip.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mt-1">RCF: {slip.rcfNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Repair Items</p>
                      <p className="text-[#231F20]">{slip.items.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="text-[#231F20]">{new Date(slip.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Assigned To</p>
                      <p className="text-[#231F20]">{slip.assignedTo || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Est. Cost</p>
                      <p className="text-[#231F20]">RM {slip.estimatedCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {slip.completionDate && (
                  <div className="text-sm text-green-600">
                    Completed on {new Date(slip.completionDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="flex lg:flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(slip)}
                >
                  <Eye className="size-4 mr-2" />
                  View Details
                </Button>
                {!slip.damageInvoiceId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGenerateDamageInvoice(slip.id)}
                    className="bg-[#F15929] text-white hover:bg-[#d94d1f]"
                  >
                    <FileText className="size-4 mr-2" />
                    Generate Invoice
                  </Button>
                )}
                {slip.damageInvoiceId && (
                  <Badge className="bg-green-100 text-green-800">
                    Invoice Generated
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}