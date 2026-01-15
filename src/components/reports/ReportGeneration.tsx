import { useState, useEffect } from 'react';
import {
  FileText, Download, Calendar as CalendarIcon,
  TrendingUp, Package, DollarSign, Search,
  FileSpreadsheet, Filter, ChevronDown, BarChart3,
  Clock, Users, AlertCircle, CheckCircle2, PieChart, LineChart
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { toast } from 'sonner@2.0.3';
import { format } from 'date-fns';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

type ReportType = 'rental-performance' | 'inventory-utilization' | 'financial';

interface ReportFilters {
  searchQuery: string;
  category: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
}

// Mock data for Rental Performance Report
const mockRentalData = [
  {
    itemId: 'PIPE-001',
    itemName: 'Standard Scaffolding Pipe 6ft',
    category: 'Pipes',
    totalRentals: 145,
    totalRevenue: 72500,
    avgRentalDuration: 28,
    quantityRented: 450,
    totalQuantity: 500,
    utilizationRate: 90
  },
  {
    itemId: 'BOARD-003',
    itemName: 'Metal Deck Board 7ft',
    category: 'Boards',
    totalRentals: 98,
    totalRevenue: 58800,
    avgRentalDuration: 35,
    quantityRented: 280,
    totalQuantity: 350,
    utilizationRate: 80
  },
  {
    itemId: 'FRAME-005',
    itemName: 'Walk-Through Frame 6x4',
    category: 'Frames',
    totalRentals: 76,
    totalRevenue: 45600,
    avgRentalDuration: 42,
    quantityRented: 150,
    totalQuantity: 200,
    utilizationRate: 75
  },
  {
    itemId: 'COUP-002',
    itemName: 'Swivel Coupler Heavy Duty',
    category: 'Couplings',
    totalRentals: 203,
    totalRevenue: 40600,
    avgRentalDuration: 21,
    quantityRented: 800,
    totalQuantity: 1000,
    utilizationRate: 80
  },
  {
    itemId: 'SAFE-001',
    itemName: 'Safety Harness Full Body',
    category: 'Safety',
    totalRentals: 54,
    totalRevenue: 27000,
    avgRentalDuration: 14,
    quantityRented: 90,
    totalQuantity: 120,
    utilizationRate: 75
  }
];

// Mock data for Inventory Utilization Report
const mockInventoryData = [
  {
    itemId: 'PIPE-001',
    itemName: 'Standard Scaffolding Pipe 6ft',
    category: 'Pipes',
    totalQuantity: 500,
    inUse: 450,
    idle: 50,
    utilizationRate: 90,
    avgIdleDays: 12,
    location: 'Warehouse A',
    condition: 'Good'
  },
  {
    itemId: 'BOARD-003',
    itemName: 'Metal Deck Board 7ft',
    category: 'Boards',
    totalQuantity: 350,
    inUse: 280,
    idle: 70,
    utilizationRate: 80,
    avgIdleDays: 18,
    location: 'Warehouse A',
    condition: 'Good'
  },
  {
    itemId: 'FRAME-005',
    itemName: 'Walk-Through Frame 6x4',
    category: 'Frames',
    totalQuantity: 200,
    inUse: 150,
    idle: 50,
    utilizationRate: 75,
    avgIdleDays: 25,
    location: 'Warehouse B',
    condition: 'Fair'
  },
  {
    itemId: 'COUP-002',
    itemName: 'Swivel Coupler Heavy Duty',
    category: 'Couplings',
    totalQuantity: 1000,
    inUse: 800,
    idle: 200,
    utilizationRate: 80,
    avgIdleDays: 8,
    location: 'Warehouse A',
    condition: 'Good'
  },
  {
    itemId: 'ACC-008',
    itemName: 'Base Plate Adjustable',
    category: 'Accessories',
    totalQuantity: 300,
    inUse: 120,
    idle: 180,
    utilizationRate: 40,
    avgIdleDays: 45,
    location: 'Warehouse C',
    condition: 'Good'
  }
];

// Mock data for Financial Report
const mockFinancialData = [
  {
    customerId: 'CUST-001',
    customerName: 'Stellar Construction Sdn Bhd',
    totalInvoiced: 125000,
    totalPaid: 95000,
    outstanding: 30000,
    overdueDays: 0,
    lastPaymentDate: '2024-11-25',
    numberOfInvoices: 8,
    status: 'Current'
  },
  {
    customerId: 'CUST-002',
    customerName: 'Metro Builders',
    totalInvoiced: 98500,
    totalPaid: 98500,
    outstanding: 0,
    overdueDays: 0,
    lastPaymentDate: '2024-11-20',
    numberOfInvoices: 6,
    status: 'Paid'
  },
  {
    customerId: 'CUST-003',
    customerName: 'Pacific Development Corp',
    totalInvoiced: 156000,
    totalPaid: 110000,
    outstanding: 46000,
    overdueDays: 15,
    lastPaymentDate: '2024-11-10',
    numberOfInvoices: 10,
    status: 'Overdue'
  },
  {
    customerId: 'CUST-004',
    customerName: 'Horizon Projects Ltd',
    totalInvoiced: 87500,
    totalPaid: 75000,
    outstanding: 12500,
    overdueDays: 0,
    lastPaymentDate: '2024-11-22',
    numberOfInvoices: 5,
    status: 'Current'
  },
  {
    customerId: 'CUST-005',
    customerName: 'Summit Engineering',
    totalInvoiced: 203000,
    totalPaid: 150000,
    outstanding: 53000,
    overdueDays: 32,
    lastPaymentDate: '2024-10-28',
    numberOfInvoices: 12,
    status: 'Overdue'
  }
];

export function ReportGeneration() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('rental-performance');
  const [filters, setFilters] = useState<ReportFilters>({
    searchQuery: '',
    category: 'all',
    status: 'all'
  });
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  // Filter data based on search and filters
  const getFilteredRentalData = () => {
    return mockRentalData.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           item.itemId.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesCategory = filters.category === 'all' || item.category === filters.category;
      return matchesSearch && matchesCategory;
    });
  };

  const getFilteredInventoryData = () => {
    return mockInventoryData.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           item.itemId.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesCategory = filters.category === 'all' || item.category === filters.category;
      return matchesSearch && matchesCategory;
    });
  };

  const getFilteredFinancialData = () => {
    return mockFinancialData.filter(item => {
      const matchesSearch = item.customerName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           item.customerId.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesStatus = filters.status === 'all' || item.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  };

  const exportToExcel = () => {
    let csvContent = 'Power Metal & Steel - Report\n';
    csvContent += `Report Type: ${getReportTitle()}\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    if (dateFrom && dateTo) {
      csvContent += `Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}\n`;
    }
    csvContent += '\n';

    if (selectedReport === 'rental-performance') {
      const data = getFilteredRentalData();
      csvContent += 'Item Code,Item Name,Category,Total Rentals,Revenue (RM),Avg Duration (days),Utilization (%)\n';
      data.forEach(item => {
        csvContent += `${item.itemId},"${item.itemName}",${item.category},${item.totalRentals},${item.totalRevenue},${item.avgRentalDuration},${item.utilizationRate}\n`;
      });
    } else if (selectedReport === 'inventory-utilization') {
      const data = getFilteredInventoryData();
      csvContent += 'Item Code,Item Name,Category,Total Qty,In Use,Idle,Utilization (%),Avg Idle Days,Location,Condition\n';
      data.forEach(item => {
        csvContent += `${item.itemId},"${item.itemName}",${item.category},${item.totalQuantity},${item.inUse},${item.idle},${item.utilizationRate},${item.avgIdleDays},${item.location},${item.condition}\n`;
      });
    } else if (selectedReport === 'financial') {
      const data = getFilteredFinancialData();
      csvContent += 'Customer ID,Customer Name,Invoiced (RM),Paid (RM),Outstanding (RM),Overdue Days,Last Payment,Invoices,Status\n';
      data.forEach(item => {
        csvContent += `${item.customerId},"${item.customerName}",${item.totalInvoiced},${item.totalPaid},${item.outstanding},${item.overdueDays},${item.lastPaymentDate},${item.numberOfInvoices},${item.status}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getReportTitle()}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${getReportTitle()}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; color: #231F20; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #F15929; padding-bottom: 20px; }
          .company-name { font-size: 28px; font-weight: bold; color: #231F20; }
          .report-title { font-size: 22px; color: #F15929; margin: 10px 0; }
          .report-date { font-size: 14px; color: #6B7280; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #F9FAFB; color: #231F20; font-weight: bold; padding: 12px; text-align: left; border: 1px solid #E5E7EB; font-size: 13px; }
          td { padding: 12px; border: 1px solid #E5E7EB; font-size: 13px; }
          tr:nth-child(even) { background-color: #F9FAFB; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 12px; color: #6B7280; }
          @media print { body { margin: 0; padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Power Metal & Steel</div>
          <div class="report-title">${getReportTitle()}</div>
          <div class="report-date">Generated on ${new Date().toLocaleString()}</div>
          ${dateFrom && dateTo ? `<div class="report-date">Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}</div>` : ''}
        </div>
        ${generateTableHTML()}
        <div class="footer">
          <p>This is a computer-generated report from Power Metal & Steel ERP System</p>
          <p>For inquiries, please contact our office</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      toast.success('Report exported to PDF successfully');
    }, 250);
  };

  const generateTableHTML = () => {
    if (selectedReport === 'rental-performance') {
      const data = getFilteredRentalData();
      return `
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Total Rentals</th>
              <th>Revenue (RM)</th>
              <th>Avg Duration (days)</th>
              <th>Utilization (%)</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                <td>${item.itemId}</td>
                <td>${item.itemName}</td>
                <td>${item.category}</td>
                <td>${item.totalRentals}</td>
                <td>${item.totalRevenue.toLocaleString()}</td>
                <td>${item.avgRentalDuration}</td>
                <td>${item.utilizationRate}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (selectedReport === 'inventory-utilization') {
      const data = getFilteredInventoryData();
      return `
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Total Qty</th>
              <th>In Use</th>
              <th>Idle</th>
              <th>Utilization (%)</th>
              <th>Avg Idle Days</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                <td>${item.itemId}</td>
                <td>${item.itemName}</td>
                <td>${item.category}</td>
                <td>${item.totalQuantity}</td>
                <td>${item.inUse}</td>
                <td>${item.idle}</td>
                <td>${item.utilizationRate}%</td>
                <td>${item.avgIdleDays}</td>
                <td>${item.location}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      const data = getFilteredFinancialData();
      return `
        <table>
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>Invoiced (RM)</th>
              <th>Paid (RM)</th>
              <th>Outstanding (RM)</th>
              <th>Overdue Days</th>
              <th>Last Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                <td>${item.customerId}</td>
                <td>${item.customerName}</td>
                <td>${item.totalInvoiced.toLocaleString()}</td>
                <td>${item.totalPaid.toLocaleString()}</td>
                <td>${item.outstanding.toLocaleString()}</td>
                <td>${item.overdueDays}</td>
                <td>${item.lastPaymentDate}</td>
                <td>${item.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  };

  const getReportTitle = () => {
    switch (selectedReport) {
      case 'rental-performance':
        return 'Rental Performance Report';
      case 'inventory-utilization':
        return 'Inventory Utilization Report';
      case 'financial':
        return 'Financial Report';
      default:
        return 'Report';
    }
  };

  const getReportDescription = () => {
    switch (selectedReport) {
      case 'rental-performance':
        return 'Track rental statistics, revenue generated, and average rental durations';
      case 'inventory-utilization':
        return 'Analyze scaffolding utilization rates and identify idle inventory';
      case 'financial':
        return 'Review sales summaries and outstanding payment tracking';
      default:
        return '';
    }
  };

  const calculateSummary = () => {
    if (selectedReport === 'rental-performance') {
      const data = getFilteredRentalData();
      return {
        totalRentals: data.reduce((sum, item) => sum + item.totalRentals, 0),
        totalRevenue: data.reduce((sum, item) => sum + item.totalRevenue, 0),
        avgDuration: Math.round(data.reduce((sum, item) => sum + item.avgRentalDuration, 0) / data.length),
        avgUtilization: Math.round(data.reduce((sum, item) => sum + item.utilizationRate, 0) / data.length)
      };
    } else if (selectedReport === 'inventory-utilization') {
      const data = getFilteredInventoryData();
      return {
        totalItems: data.reduce((sum, item) => sum + item.totalQuantity, 0),
        inUse: data.reduce((sum, item) => sum + item.inUse, 0),
        idle: data.reduce((sum, item) => sum + item.idle, 0),
        avgUtilization: Math.round(data.reduce((sum, item) => sum + item.utilizationRate, 0) / data.length),
        avgIdleDays: Math.round(data.reduce((sum, item) => sum + item.avgIdleDays, 0) / data.length)
      };
    } else {
      const data = getFilteredFinancialData();
      return {
        totalInvoiced: data.reduce((sum, item) => sum + item.totalInvoiced, 0),
        totalPaid: data.reduce((sum, item) => sum + item.totalPaid, 0),
        totalOutstanding: data.reduce((sum, item) => sum + item.outstanding, 0),
        overdueCount: data.filter(item => item.status === 'Overdue').length
      };
    }
  };

  const summary = calculateSummary();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#231F20]">Report Generation</h1>
        <p className="text-gray-600">Generate and export comprehensive business reports</p>
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
                onValueChange={(value) => {
                  setSelectedReport(value as ReportType);
                  setIsReportGenerated(false);
                }}
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

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {getReportTitle()}
              </p>
              <p className="text-xs text-blue-600 mt-1">{getReportDescription()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-5 text-[#F15929]" />
            Report Filters
          </CardTitle>
          <CardDescription>Configure report parameters and filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category or Status Filter */}
            {selectedReport !== 'financial' ? (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Pipes">Pipes</SelectItem>
                    <SelectItem value="Boards">Boards</SelectItem>
                    <SelectItem value="Frames">Frames</SelectItem>
                    <SelectItem value="Couplings">Couplings</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* From Date */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="size-4 mr-2" />
                    {dateFrom ? format(dateFrom, 'PP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="size-4 mr-2" />
                    {dateTo ? format(dateTo, 'PP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-600">
              Configure filters above and generate the report to view results
            </p>
            <div className="flex gap-2">
              {isReportGenerated && (
                <>
                  <Button onClick={exportToExcel} variant="outline">
                    <FileSpreadsheet className="size-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button onClick={exportToPDF} variant="outline">
                    <Download className="size-4 mr-2" />
                    Export PDF
                  </Button>
                </>
              )}
              <Button 
                onClick={() => {
                  setIsReportGenerated(true);
                  toast.success('Report generated successfully!');
                }}
                className="bg-[#F15929] hover:bg-[#d94d1f]"
              >
                <BarChart3 className="size-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview - Only show after generation */}
      {isReportGenerated && (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {selectedReport === 'rental-performance' && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Rentals</CardDescription>
                <CardTitle className="text-2xl text-[#231F20]">{summary.totalRentals}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-2xl text-[#F15929]">RM {summary.totalRevenue.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Duration</CardDescription>
                <CardTitle className="text-2xl text-[#231F20]">{summary.avgDuration} days</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Utilization</CardDescription>
                <CardTitle className="text-2xl text-green-600">{summary.avgUtilization}%</CardTitle>
              </CardHeader>
            </Card>
          </>
        )}

        {selectedReport === 'inventory-utilization' && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Items</CardDescription>
                <CardTitle className="text-2xl text-[#231F20]">{summary.totalItems}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>In Use</CardDescription>
                <CardTitle className="text-2xl text-green-600">{summary.inUse}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Idle Items</CardDescription>
                <CardTitle className="text-2xl text-orange-600">{summary.idle}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Utilization</CardDescription>
                <CardTitle className="text-2xl text-[#F15929]">{summary.avgUtilization}%</CardTitle>
              </CardHeader>
            </Card>
          </>
        )}

        {selectedReport === 'financial' && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Invoiced</CardDescription>
                <CardTitle className="text-2xl text-[#231F20]">RM {summary.totalInvoiced.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Paid</CardDescription>
                <CardTitle className="text-2xl text-green-600">RM {summary.totalPaid.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Outstanding</CardDescription>
                <CardTitle className="text-2xl text-[#F15929]">RM {summary.totalOutstanding.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Overdue Count</CardDescription>
                <CardTitle className="text-2xl text-red-600">{summary.overdueCount}</CardTitle>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {/* Report Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-[#F15929]" />
            {getReportTitle()}
          </CardTitle>
          <CardDescription>{getReportDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {selectedReport === 'rental-performance' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm text-gray-600">Item Code</th>
                    <th className="text-left p-3 text-sm text-gray-600">Item Name</th>
                    <th className="text-left p-3 text-sm text-gray-600">Category</th>
                    <th className="text-right p-3 text-sm text-gray-600">Total Rentals</th>
                    <th className="text-right p-3 text-sm text-gray-600">Revenue (RM)</th>
                    <th className="text-right p-3 text-sm text-gray-600">Avg Duration (days)</th>
                    <th className="text-right p-3 text-sm text-gray-600">Utilization (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredRentalData().map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">{item.itemId}</td>
                      <td className="p-3 text-sm">{item.itemName}</td>
                      <td className="p-3 text-sm">
                        <Badge variant="outline">{item.category}</Badge>
                      </td>
                      <td className="p-3 text-sm text-right">{item.totalRentals}</td>
                      <td className="p-3 text-sm text-right text-[#F15929]">{item.totalRevenue.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right">{item.avgRentalDuration}</td>
                      <td className="p-3 text-sm text-right">
                        <Badge className={
                          item.utilizationRate >= 80 ? 'bg-green-100 text-green-800' :
                          item.utilizationRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {item.utilizationRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'inventory-utilization' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm text-gray-600">Item Code</th>
                    <th className="text-left p-3 text-sm text-gray-600">Item Name</th>
                    <th className="text-left p-3 text-sm text-gray-600">Category</th>
                    <th className="text-right p-3 text-sm text-gray-600">Total Qty</th>
                    <th className="text-right p-3 text-sm text-gray-600">In Use</th>
                    <th className="text-right p-3 text-sm text-gray-600">Idle</th>
                    <th className="text-right p-3 text-sm text-gray-600">Utilization (%)</th>
                    <th className="text-right p-3 text-sm text-gray-600">Avg Idle Days</th>
                    <th className="text-left p-3 text-sm text-gray-600">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredInventoryData().map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">{item.itemId}</td>
                      <td className="p-3 text-sm">{item.itemName}</td>
                      <td className="p-3 text-sm">
                        <Badge variant="outline">{item.category}</Badge>
                      </td>
                      <td className="p-3 text-sm text-right">{item.totalQuantity}</td>
                      <td className="p-3 text-sm text-right text-green-600">{item.inUse}</td>
                      <td className="p-3 text-sm text-right text-orange-600">{item.idle}</td>
                      <td className="p-3 text-sm text-right">
                        <Badge className={
                          item.utilizationRate >= 80 ? 'bg-green-100 text-green-800' :
                          item.utilizationRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {item.utilizationRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-right">{item.avgIdleDays}</td>
                      <td className="p-3 text-sm">{item.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'financial' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm text-gray-600">Customer ID</th>
                    <th className="text-left p-3 text-sm text-gray-600">Customer Name</th>
                    <th className="text-right p-3 text-sm text-gray-600">Invoiced (RM)</th>
                    <th className="text-right p-3 text-sm text-gray-600">Paid (RM)</th>
                    <th className="text-right p-3 text-sm text-gray-600">Outstanding (RM)</th>
                    <th className="text-right p-3 text-sm text-gray-600">Overdue Days</th>
                    <th className="text-left p-3 text-sm text-gray-600">Last Payment</th>
                    <th className="text-center p-3 text-sm text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredFinancialData().map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">{item.customerId}</td>
                      <td className="p-3 text-sm">{item.customerName}</td>
                      <td className="p-3 text-sm text-right">{item.totalInvoiced.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right text-green-600">{item.totalPaid.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right text-[#F15929]">{item.outstanding.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right">
                        {item.overdueDays > 0 ? (
                          <span className="text-red-600">{item.overdueDays}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">{item.lastPaymentDate}</td>
                      <td className="p-3 text-sm text-center">
                        <Badge className={
                          item.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          item.status === 'Current' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {item.status === 'Paid' && <CheckCircle2 className="size-3 mr-1" />}
                          {item.status === 'Overdue' && <AlertCircle className="size-3 mr-1" />}
                          {item.status === 'Current' && <Clock className="size-3 mr-1" />}
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}