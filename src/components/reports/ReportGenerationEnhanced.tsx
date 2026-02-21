import { useState, useMemo } from 'react';
import {
  FileText, DollarSign, Users, Package, Wrench, Truck, Clock, Shield, Calendar as CalendarIcon
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
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { FinancialProfitabilityReport } from './FinancialProfitabilityReport';
import { CustomerBehaviourReport } from './CustomerBehaviourReport';
import { InventoryUtilizationReport } from './InventoryUtilizationReport';
import { MaintenanceRepairReport } from './MaintenanceRepairReport';
import { DeliveryLogisticsReport } from './DeliveryLogisticsReport';
import { RentalDurationReport } from './RentalDurationReport';
import { CreditRiskReport } from './CreditRiskReport';

type ReportType = 'financial-profitability' | 'customer-behaviour' | 'inventory-utilization' | 'maintenance-repair' | 'delivery-logistics' | 'rental-duration' | 'credit-risk';

type DateMode = 'range' | 'month';

export interface ReportFilters {
  reportType: string;
  searchQuery: string;
  category?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dateMode: DateMode;
  selectedMonth?: { month: number; year: number };
  rowsPerPage: number;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getYears() {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => current - i);
}

export function ReportGenerationEnhanced() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('financial-profitability');
  const [dateMode, setDateMode] = useState<DateMode>('range');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | undefined>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const effectiveDateRange = useMemo(() => {
    if (dateMode === 'range' && dateFrom && dateTo) return { dateFrom, dateTo };
    if (dateMode === 'month' && selectedMonth) {
      const from = startOfMonth(new Date(selectedMonth.year, selectedMonth.month - 1));
      const to = endOfMonth(new Date(selectedMonth.year, selectedMonth.month - 1));
      return { dateFrom: from, dateTo: to };
    }
    return { dateFrom: undefined, dateTo: undefined };
  }, [dateMode, dateFrom, dateTo, selectedMonth]);

  const filters: ReportFilters = useMemo(() => ({
    reportType: selectedReport,
    searchQuery: '',
    category: 'all',
    status: 'all',
    dateFrom: effectiveDateRange.dateFrom,
    dateTo: effectiveDateRange.dateTo,
    dateMode,
    selectedMonth,
    rowsPerPage,
  }), [selectedReport, effectiveDateRange.dateFrom, effectiveDateRange.dateTo, dateMode, selectedMonth, rowsPerPage]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#231F20]">Report Generation & Analytics</h1>
        <p className="text-gray-600">Generate comprehensive reports with real-time data from the database</p>
      </div>

      {/* Report period & display options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="size-5 text-[#F15929]" />
            Report period & display
          </CardTitle>
          <CardDescription>Select date range or month and how many rows to show per page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <Label>Period type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={dateMode === 'range'}
                    onChange={() => setDateMode('range')}
                    className="rounded border-gray-300"
                  />
                  <span>Date range</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={dateMode === 'month'}
                    onChange={() => setDateMode('month')}
                    className="rounded border-gray-300"
                  />
                  <span>Single month</span>
                </label>
              </div>
            </div>

            {dateMode === 'range' ? (
              <>
                <div className="space-y-2">
                  <Label>From date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <CalendarIcon className="size-4 mr-2" />
                        {dateFrom ? format(dateFrom, 'PP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        disabled={{ after: endOfDay(new Date()) }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>To date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <CalendarIcon className="size-4 mr-2" />
                        {dateTo ? format(dateTo, 'PP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        disabled={{ after: endOfDay(new Date()) }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={selectedMonth ? String(selectedMonth.month) : ''}
                    onValueChange={(v) => setSelectedMonth((prev) => ({ ...prev!, month: Number(v) }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((name, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={selectedMonth ? String(selectedMonth.year) : ''}
                    onValueChange={(v) => setSelectedMonth((prev) => ({ ...prev!, year: Number(v) }))}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {getYears().map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Rows per page</Label>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => setRowsPerPage(Number(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
