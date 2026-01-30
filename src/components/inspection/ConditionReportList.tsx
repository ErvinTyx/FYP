import { Eye, Edit, Wrench, Calendar, User, Package, FileText, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ConditionReport } from '../../types/inspection';

interface ConditionReportListProps {
  reports: ConditionReport[];
  searchQuery: string;
  onEdit: (report: ConditionReport) => void;
  onDelete: (reportId: string) => void;
  onCreateRepairSlip: (reportId: string) => void;
  existingRepairSlips?: Array<{ conditionReportId: string }>; 
}

export function ConditionReportList({ reports, searchQuery, onEdit, onDelete, onCreateRepairSlip, existingRepairSlips = [] }: ConditionReportListProps) {
  const filteredReports = reports.filter(report =>
    report.rcfNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.deliveryOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: ConditionReport['status']) => {
    const colors = {
      'pending': 'bg-amber-100 text-amber-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colors[status];
  };

  if (filteredReports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="size-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No condition reports found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try adjusting your search' : 'Create your first condition report'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredReports.map(report => (
        <Card key={report.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-[#231F20]">{report.rcfNumber}</h3>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.toUpperCase()}
                      </Badge>
                      {report.totalRepair > 0 && (
                        <Badge className="bg-amber-100 text-amber-800">
                          {report.totalRepair} Need Repair
                        </Badge>
                      )}
                      {report.totalWriteOff > 0 && (
                        <Badge className="bg-red-100 text-red-800">
                          {report.totalWriteOff} Write-off
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">DO: {report.deliveryOrderNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Customer</p>
                      <p className="text-[#231F20]">{report.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Inspection Date</p>
                      <p className="text-[#231F20]">{new Date(report.inspectionDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Items Inspected</p>
                      <p className="text-[#231F20]">{report.totalItemsInspected} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Repair Cost</p>
                      <p className="text-[#231F20]">RM {Number(report.totalRepairCost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(report)}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(report.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {report.totalDamaged > 0 && !existingRepairSlips.some(slip => slip.conditionReportId === report.id) && (
                  <Button
                    size="sm"
                    onClick={() => onCreateRepairSlip(report.id)}
                    className="bg-[#F15929] hover:bg-[#d94d1f]"
                  >
                    <Wrench className="size-4 mr-2" />
                    Create Repair Slip
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}