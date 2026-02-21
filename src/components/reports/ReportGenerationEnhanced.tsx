import { useState } from 'react';
import {
  FileText, DollarSign, Users, Package, Wrench, Truck, Clock, Shield
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
import { FinancialProfitabilityReport } from './FinancialProfitabilityReport';
import { CustomerBehaviourReport } from './CustomerBehaviourReport';
import { InventoryUtilizationReport } from './InventoryUtilizationReport';
import { MaintenanceRepairReport } from './MaintenanceRepairReport';
import { DeliveryLogisticsReport } from './DeliveryLogisticsReport';
import { RentalDurationReport } from './RentalDurationReport';
import { CreditRiskReport } from './CreditRiskReport';

type ReportType = 'financial-profitability' | 'customer-behaviour' | 'inventory-utilization' | 'maintenance-repair' | 'delivery-logistics' | 'rental-duration' | 'credit-risk';

interface ReportFilters {
  reportType: string;
  searchQuery: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
}

export function ReportGenerationEnhanced() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('financial-profitability');
  const [filters] = useState<ReportFilters>({
    reportType: 'financial-profitability',
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
                  <SelectItem value="financial-profitability">
                    <div className="flex items-center gap-2">
                      <DollarSign className="size-4" />
                      <div>
                        <div>Financial & Profitability Report</div>
                        <div className="text-xs text-gray-500">Project revenue, costs & profit margin</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="customer-behaviour">
                    <div className="flex items-center gap-2">
                      <Users className="size-4" />
                      <div>
                        <div>Customer Behaviour Report</div>
                        <div className="text-xs text-gray-500">Rental patterns & spending by customer</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="inventory-utilization">
                    <div className="flex items-center gap-2">
                      <Package className="size-4" />
                      <div>
                        <div>Inventory Utilization & Demand Forecast</div>
                        <div className="text-xs text-gray-500">% usage, rented quantity & idle days</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance-repair">
                    <div className="flex items-center gap-2">
                      <Wrench className="size-4" />
                      <div>
                        <div>Maintenance & Repair Report</div>
                        <div className="text-xs text-gray-500">Repair records, costs & downtime</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="delivery-logistics">
                    <div className="flex items-center gap-2">
                      <Truck className="size-4" />
                      <div>
                        <div>Delivery & Logistics Performance</div>
                        <div className="text-xs text-gray-500">Delivery status, delays & transport cost</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="rental-duration">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4" />
                      <div>
                        <div>Rental Duration & Efficiency</div>
                        <div className="text-xs text-gray-500">Rental periods, extensions & early returns</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="credit-risk">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4" />
                      <div>
                        <div>Credit & Risk Report</div>
                        <div className="text-xs text-gray-500">Outstanding balance, overdue & risk level</div>
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
      {selectedReport === 'financial-profitability' && (
        <FinancialProfitabilityReport filters={filters} />
      )}
      {selectedReport === 'customer-behaviour' && (
        <CustomerBehaviourReport filters={filters} />
      )}
      {selectedReport === 'inventory-utilization' && (
        <InventoryUtilizationReport filters={filters} />
      )}
      {selectedReport === 'maintenance-repair' && (
        <MaintenanceRepairReport filters={filters} />
      )}
      {selectedReport === 'delivery-logistics' && (
        <DeliveryLogisticsReport filters={filters} />
      )}
      {selectedReport === 'rental-duration' && (
        <RentalDurationReport filters={filters} />
      )}
      {selectedReport === 'credit-risk' && (
        <CreditRiskReport filters={filters} />
      )}
    </div>
  );
}
