import { useState } from 'react';
import {
  Download, Calendar as CalendarIcon, Search, Package,
  TrendingUp, AlertCircle, Clock, BarChart3, FileSpreadsheet
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Label } from '../ui/label';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { toast } from 'sonner@2.0.3';
import { format } from 'date-fns';

interface ReportFilter {
  reportType: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery: string;
  category?: string;
}

interface InventoryUtilizationData {
  itemId: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  inUse: number;
  idle: number;
  utilizationRate: number;
  avgIdleDays: number;
  location: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Maintenance';
}

const mockData: InventoryUtilizationData[] = [
  {
    itemId: 'SCAF-001',
    itemName: 'Steel Pipe Scaffolding - Standard (6m)',
    category: 'Pipes',
    totalQuantity: 500,
    inUse: 425,
    idle: 75,
    utilizationRate: 85,
    avgIdleDays: 15,
    location: 'Warehouse A',
    condition: 'Good'
  },
  {
    itemId: 'SCAF-002',
    itemName: 'Scaffold Board - Wooden (3.9m)',
    category: 'Boards',
    totalQuantity: 400,
    inUse: 352,
    idle: 48,
    utilizationRate: 88,
    avgIdleDays: 12,
    location: 'Warehouse A',
    condition: 'Good'
  },
  {
    itemId: 'SCAF-003',
    itemName: 'H-Frame Scaffolding (1.7m x 1.2m)',
    category: 'Frames',
    totalQuantity: 300,
    inUse: 246,
    idle: 54,
    utilizationRate: 82,
    avgIdleDays: 18,
    location: 'Warehouse B',
    condition: 'Excellent'
  },
  {
    itemId: 'SCAF-004',
    itemName: 'Coupling - Fixed/Right Angle',
    category: 'Couplings',
    totalQuantity: 800,
    inUse: 736,
    idle: 64,
    utilizationRate: 92,
    avgIdleDays: 8,
    location: 'Warehouse A',
    condition: 'Good'
  },
  {
    itemId: 'SCAF-005',
    itemName: 'Base Jack - Adjustable',
    category: 'Accessories',
    totalQuantity: 250,
    inUse: 195,
    idle: 55,
    utilizationRate: 78,
    avgIdleDays: 22,
    location: 'Warehouse B',
    condition: 'Good'
  },
  {
    itemId: 'SCAF-006',
    itemName: 'Ladder Beam - 5m',
    category: 'Beams',
    totalQuantity: 180,
    inUse: 117,
    idle: 63,
    utilizationRate: 65,
    avgIdleDays: 28,
    location: 'Warehouse C',
    condition: 'Fair'
  },
  {
    itemId: 'SCAF-007',
    itemName: 'Ringlock System - Vertical (3m)',
    category: 'Systems',
    totalQuantity: 200,
    inUse: 180,
    idle: 20,
    utilizationRate: 90,
    avgIdleDays: 10,
    location: 'Warehouse A',
    condition: 'Excellent'
  },
  {
    itemId: 'SCAF-008',
    itemName: 'Aluminum Mobile Tower',
    category: 'Towers',
    totalQuantity: 50,
    inUse: 38,
    idle: 12,
    utilizationRate: 76,
    avgIdleDays: 20,
    location: 'Warehouse B',
    condition: 'Good'
  },
  {
    itemId: 'SCAF-009',
    itemName: 'Toe Board - Metal (2.5m)',
    category: 'Safety',
    totalQuantity: 600,
    inUse: 390,
    idle: 210,
    utilizationRate: 65,
    avgIdleDays: 35,
    location: 'Warehouse C',
    condition: 'Fair'
  },
  {
    itemId: 'SCAF-010',
    itemName: 'Safety Harness - Full Body',
    category: 'Safety',
    totalQuantity: 150,
    inUse: 82,
    idle: 68,
    utilizationRate: 55,
    avgIdleDays: 42,
    location: 'Warehouse A',
    condition: 'Needs Maintenance'
  },
];

export function InventoryUtilizationReport({ filters }: { filters: ReportFilter }) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [utilizationFilter, setUtilizationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'utilization' | 'idle' | 'idleDays'>('utilization');

  // Filter and sort data
  const filteredData = mockData
    .filter(item => {
      if (searchQuery && !item.itemName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (utilizationFilter !== 'all') {
        if (utilizationFilter === 'high' && item.utilizationRate < 80) return false;
        if (utilizationFilter === 'medium' && (item.utilizationRate < 60 || item.utilizationRate >= 80)) return false;
        if (utilizationFilter === 'low' && item.utilizationRate >= 60) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'utilization':
          return b.utilizationRate - a.utilizationRate;
        case 'idle':
          return b.idle - a.idle;
        case 'idleDays':
          return b.avgIdleDays - a.avgIdleDays;
        default:
          return 0;
      }
    });

  // Calculate totals
  const totals = {
    totalItems: filteredData.reduce((sum, item) => sum + item.totalQuantity, 0),
    totalInUse: filteredData.reduce((sum, item) => sum + item.inUse, 0),
    totalIdle: filteredData.reduce((sum, item) => sum + item.idle, 0),
    avgUtilization: Math.round(
      filteredData.reduce((sum, item) => sum + item.utilizationRate, 0) / filteredData.length
    ),
    avgIdleDays: Math.round(
      filteredData.reduce((sum, item) => sum + item.avgIdleDays, 0) / filteredData.length
    ),
  };

  const categories = Array.from(new Set(mockData.map(item => item.category)));

  const exportToExcel = () => {
    // Create CSV content
    let csvContent = 'Power Metal & Steel - Inventory Utilization Report\n';
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    if (dateFrom && dateTo) {
      csvContent += `Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}\n`;
    }
    csvContent += '\n';
    csvContent += 'SUMMARY\n';
    csvContent += `Total Items,${totals.totalItems}\n`;
    csvContent += `Items In Use,${totals.totalInUse}\n`;
    csvContent += `Idle Items,${totals.totalIdle}\n`;
    csvContent += `Average Utilization (%),${totals.avgUtilization}\n`;
    csvContent += `Average Idle Days,${totals.avgIdleDays}\n`;
    csvContent += '\n';
    csvContent += 'DETAILED REPORT\n';
    csvContent += 'Item Code,Item Name,Category,Total Qty,In Use,Idle,Utilization (%),Avg Idle Days,Location,Condition\n';
    
    filteredData.forEach(item => {
      csvContent += `${item.itemId},"${item.itemName}",${item.category},${item.totalQuantity},${item.inUse},${item.idle},${item.utilizationRate},${item.avgIdleDays},${item.location},${item.condition}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventory_Utilization_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Inventory Utilization Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; color: #231F20; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #F15929; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #231F20; }
    .report-title { font-size: 22px; color: #F15929; margin: 10px 0; }
    .report-date { font-size: 14px; color: #6B7280; }
    .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 30px 0; }
    .summary-card { background: #F9FAFB; border-left: 4px solid #F15929; padding: 15px; border-radius: 4px; }
    .card-label { font-size: 11px; color: #6B7280; margin-bottom: 5px; }
    .card-value { font-size: 20px; font-weight: bold; color: #231F20; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th { background-color: #F9FAFB; color: #231F20; font-weight: bold; padding: 10px; text-align: left; border: 1px solid #E5E7EB; }
    td { padding: 10px; border: 1px solid #E5E7EB; }
    tr:nth-child(even) { background-color: #F9FAFB; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 12px; color: #6B7280; }
    .utilization-high { background-color: #D1FAE5; color: #065F46; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .utilization-medium { background-color: #FEF3C7; color: #92400E; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .utilization-low { background-color: #FEE2E2; color: #991B1B; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .idle-high { background-color: #FEE2E2; color: #991B1B; }
    .idle-low { background-color: #D1FAE5; color: #065F46; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Power Metal & Steel</div>
    <div class="report-title">Inventory Utilization Report</div>
    <div class="report-date">
      Generated on ${new Date().toLocaleString()}
      ${dateFrom && dateTo ? `<br/>Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}` : ''}
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="card-label">Total Items</div>
      <div class="card-value">${totals.totalItems.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Items In Use</div>
      <div class="card-value">${totals.totalInUse.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Idle Items</div>
      <div class="card-value">${totals.totalIdle.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Avg Utilization</div>
      <div class="card-value">${totals.avgUtilization}%</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Avg Idle Days</div>
      <div class="card-value">${totals.avgIdleDays}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Code</th>
        <th>Item Name</th>
        <th>Category</th>
        <th style="text-align: right;">Total Qty</th>
        <th style="text-align: right;">In Use</th>
        <th style="text-align: right;">Idle</th>
        <th style="text-align: right;">Utilization</th>
        <th style="text-align: right;">Avg Idle Days</th>
        <th>Location</th>
        <th>Condition</th>
      </tr>
    </thead>
    <tbody>
      ${filteredData.map(item => `
      <tr>
        <td>${item.itemId}</td>
        <td>${item.itemName}</td>
        <td>${item.category}</td>
        <td style="text-align: right;">${item.totalQuantity}</td>
        <td style="text-align: right;">${item.inUse}</td>
        <td style="text-align: right;" class="${item.idle > item.totalQuantity * 0.3 ? 'idle-high' : 'idle-low'}">
          ${item.idle}
        </td>
        <td style="text-align: right;">
          <span class="${item.utilizationRate >= 80 ? 'utilization-high' : item.utilizationRate >= 60 ? 'utilization-medium' : 'utilization-low'}">
            ${item.utilizationRate}%
          </span>
        </td>
        <td style="text-align: right;">${item.avgIdleDays}</td>
        <td>${item.location}</td>
        <td>${item.condition}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Power Metal & Steel - Inventory Utilization Report</p>
    <p>This report shows inventory utilization rates, idle inventory analysis, and equipment condition status.</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventory_Utilization_Report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[#231F20]">Inventory Utilization Report</h2>
          <p className="text-gray-600">Analyze scaffolding utilization rates and identify idle inventory</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline">
            <FileSpreadsheet className="size-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={exportToPDF} className="bg-[#F15929] hover:bg-[#d94d1f]">
            <Download className="size-4 mr-2" />
            Export to PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Package className="size-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.totalItems.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">All inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <TrendingUp className="size-4" />
              In Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.totalInUse.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Currently rented</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <AlertCircle className="size-4" />
              Idle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.totalIdle.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Available at HQ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <BarChart3 className="size-4" />
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.avgUtilization}%</div>
            <p className="text-xs text-gray-500 mt-1">Overall rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="size-4" />
              Avg Idle Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.avgIdleDays}</div>
            <p className="text-xs text-gray-500 mt-1">Days not in use</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search Item</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search by item name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Utilization Level</Label>
              <Select value={utilizationFilter} onValueChange={setUtilizationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High ({'≥'} 80%)</SelectItem>
                  <SelectItem value="medium">Medium (60-79%)</SelectItem>
                  <SelectItem value="low">Low ({'<'} 60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilization">Utilization (High to Low)</SelectItem>
                  <SelectItem value="idle">Idle Items (High to Low)</SelectItem>
                  <SelectItem value="idleDays">Idle Days (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="size-4 mr-2" />
                    {dateFrom && dateTo
                      ? `${format(dateFrom, 'PP')} - ${format(dateTo, 'PP')}`
                      : 'Select period'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-2">
                    <div>
                      <Label className="text-xs">From</Label>
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Utilization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">In Use</TableHead>
                <TableHead className="text-right">Idle</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Avg Idle Days</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell className="text-[#231F20]">{item.itemId}</TableCell>
                  <TableCell>
                    <p className="text-[#231F20]">{item.itemName}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-[#231F20]">
                    {item.totalQuantity}
                  </TableCell>
                  <TableCell className="text-right text-[#231F20]">
                    {item.inUse}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        item.idle > item.totalQuantity * 0.3
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }
                    >
                      {item.idle}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        item.utilizationRate >= 80
                          ? 'bg-green-100 text-green-800'
                          : item.utilizationRate >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {item.utilizationRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-[#231F20]">
                    {item.avgIdleDays} days
                  </TableCell>
                  <TableCell className="text-gray-600">{item.location}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.condition === 'Excellent'
                          ? 'border-green-500 text-green-700'
                          : item.condition === 'Good'
                          ? 'border-blue-500 text-blue-700'
                          : item.condition === 'Fair'
                          ? 'border-yellow-500 text-yellow-700'
                          : 'border-red-500 text-red-700'
                      }
                    >
                      {item.condition}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Idle Inventory Alert */}
      {filteredData.filter(item => item.avgIdleDays > 30).length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="size-5" />
              Idle Inventory Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 mb-3">
              {filteredData.filter(item => item.avgIdleDays > 30).length} items have been idle for more than 30 days
            </p>
            <div className="space-y-2">
              {filteredData
                .filter(item => item.avgIdleDays > 30)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.itemId} className="flex items-center justify-between p-3 bg-white rounded border border-amber-200">
                    <div>
                      <p className="text-[#231F20]">{item.itemName}</p>
                      <p className="text-sm text-gray-600">
                        {item.idle} units idle • {item.avgIdleDays} days average
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">
                      {item.utilizationRate}% utilized
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
