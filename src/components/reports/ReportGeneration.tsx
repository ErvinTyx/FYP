import { useState } from 'react';
import {
  FileText, TrendingUp, Package, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { RentalPerformanceReport } from './RentalPerformanceReport';
import { InventoryUtilizationReport } from './InventoryUtilizationReport';
import { FinancialReport } from './FinancialReport';

type ReportType = 'rental-performance' | 'inventory-utilization' | 'financial';

interface ReportFilters {
  reportType: string;
  searchQuery: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
}

export function ReportGeneration() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('rental-performance');
  const [filters] = useState<ReportFilters>({
    reportType: 'rental-performance',
    searchQuery: '',
    category: 'all',
    status: 'all'
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#231F20]">Report Generation & Analytics</h1>
        <p className="text-gray-600">Generate comprehensive reports with real-time data from the database</p>
      </div>

      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-[#F15929]" />
            Select Report Type
          </CardTitle>
          <CardDescription>Choose the type of report you want to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select
                value={selectedReport}
                onValueChange={(value) => setSelectedReport(value as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental-performance">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4" />
                      <div>
                        <div>Rental Performance Report</div>
                        <div className="text-xs text-gray-500">Track rentals, revenue & durations</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="inventory-utilization">
                    <div className="flex items-center gap-2">
                      <Package className="size-4" />
                      <div>
                        <div>Inventory Utilization Report</div>
                        <div className="text-xs text-gray-500">Analyze utilization rates & idle inventory</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="financial">
                    <div className="flex items-center gap-2">
                      <DollarSign className="size-4" />
                      <div>
                        <div>Financial Report</div>
                        <div className="text-xs text-gray-500">Review sales & outstanding payments</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Render the selected report component */}
      {selectedReport === 'rental-performance' && (
        <RentalPerformanceReport filters={filters} />
      )}
      
      {selectedReport === 'inventory-utilization' && (
        <InventoryUtilizationReport filters={filters} />
      )}
      
      {selectedReport === 'financial' && (
        <FinancialReport filters={filters} />
      )}
    </div>
  );
}
