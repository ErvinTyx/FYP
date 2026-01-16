import { useState } from 'react';
import {
  Download, Calendar as CalendarIcon, Filter, Search,
  TrendingUp, Package, DollarSign, Clock, BarChart3, FileSpreadsheet
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
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReportFilter {
  reportType: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery: string;
  category?: string;
}

interface RentalPerformanceData {
  itemId: string;
  itemName: string;
  category: string;
  totalRentals: number;
  totalRevenue: number;
  avgRentalDuration: number;
  utilizationRate: number;
  totalQuantity: number;
  quantityRented: number;
}

const mockData: RentalPerformanceData[] = [
  {
    itemId: 'SCAF-001',
    itemName: 'Steel Pipe Scaffolding - Standard (6m)',
    category: 'Pipes',
    totalRentals: 145,
    totalRevenue: 217500,
    avgRentalDuration: 28,
    utilizationRate: 85,
    totalQuantity: 500,
    quantityRented: 425
  },
  {
    itemId: 'SCAF-002',
    itemName: 'Scaffold Board - Wooden (3.9m)',
    category: 'Boards',
    totalRentals: 120,
    totalRevenue: 180000,
    avgRentalDuration: 25,
    utilizationRate: 88,
    totalQuantity: 400,
    quantityRented: 352
  },
  {
    itemId: 'SCAF-003',
    itemName: 'H-Frame Scaffolding (1.7m x 1.2m)',
    category: 'Frames',
    totalRentals: 98,
    totalRevenue: 196000,
    avgRentalDuration: 32,
    utilizationRate: 82,
    totalQuantity: 300,
    quantityRented: 246
  },
  {
    itemId: 'SCAF-004',
    itemName: 'Coupling - Fixed/Right Angle',
    category: 'Couplings',
    totalRentals: 290,
    totalRevenue: 87000,
    avgRentalDuration: 28,
    utilizationRate: 92,
    totalQuantity: 800,
    quantityRented: 736
  },
  {
    itemId: 'SCAF-005',
    itemName: 'Base Jack - Adjustable',
    category: 'Accessories',
    totalRentals: 75,
    totalRevenue: 150000,
    avgRentalDuration: 32,
    utilizationRate: 78,
    totalQuantity: 250,
    quantityRented: 195
  },
  {
    itemId: 'SCAF-006',
    itemName: 'Ladder Beam - 5m',
    category: 'Beams',
    totalRentals: 45,
    totalRevenue: 135000,
    avgRentalDuration: 30,
    utilizationRate: 65,
    totalQuantity: 180,
    quantityRented: 117
  },
  {
    itemId: 'SCAF-007',
    itemName: 'Ringlock System - Vertical (3m)',
    category: 'Systems',
    totalRentals: 88,
    totalRevenue: 264000,
    avgRentalDuration: 35,
    utilizationRate: 90,
    totalQuantity: 200,
    quantityRented: 180
  },
  {
    itemId: 'SCAF-008',
    itemName: 'Aluminum Mobile Tower',
    category: 'Towers',
    totalRentals: 32,
    totalRevenue: 192000,
    avgRentalDuration: 45,
    utilizationRate: 75,
    totalQuantity: 50,
    quantityRented: 38
  },
];

export function RentalPerformanceReport({ filters }: { filters: ReportFilter }) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rentals' | 'revenue' | 'duration' | 'utilization'>('revenue');

  // Filter and sort data
  const filteredData = mockData
    .filter(item => {
      if (searchQuery && !item.itemName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rentals':
          return b.totalRentals - a.totalRentals;
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'duration':
          return b.avgRentalDuration - a.avgRentalDuration;
        case 'utilization':
          return b.utilizationRate - a.utilizationRate;
        default:
          return 0;
      }
    });

  // Calculate totals
  const totals = {
    rentals: filteredData.reduce((sum, item) => sum + item.totalRentals, 0),
    revenue: filteredData.reduce((sum, item) => sum + item.totalRevenue, 0),
    avgDuration: Math.round(
      filteredData.reduce((sum, item) => sum + item.avgRentalDuration, 0) / filteredData.length
    ),
    avgUtilization: Math.round(
      filteredData.reduce((sum, item) => sum + item.utilizationRate, 0) / filteredData.length
    ),
  };

  const categories = Array.from(new Set(mockData.map(item => item.category)));

  const exportToExcel = () => {
    // Create CSV content
    let csvContent = 'Power Metal & Steel - Rental Performance Report\n';
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    if (dateFrom && dateTo) {
      csvContent += `Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}\n`;
    }
    csvContent += '\n';
    csvContent += 'SUMMARY\n';
    csvContent += `Total Rentals,${totals.rentals}\n`;
    csvContent += `Total Revenue (RM),${totals.revenue}\n`;
    csvContent += `Average Duration (days),${totals.avgDuration}\n`;
    csvContent += `Average Utilization (%),${totals.avgUtilization}\n`;
    csvContent += '\n';
    csvContent += 'DETAILED REPORT\n';
    csvContent += 'Item Code,Item Name,Category,Total Rentals,Revenue (RM),Avg Duration (days),Utilization (%),Qty Rented,Total Qty\n';
    
    filteredData.forEach(item => {
      csvContent += `${item.itemId},"${item.itemName}",${item.category},${item.totalRentals},${item.totalRevenue},${item.avgRentalDuration},${item.utilizationRate},${item.quantityRented},${item.totalQuantity}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rental_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`;
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
  <title>Rental Performance Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; color: #231F20; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #F15929; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #231F20; }
    .report-title { font-size: 22px; color: #F15929; margin: 10px 0; }
    .report-date { font-size: 14px; color: #6B7280; }
    .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
    .summary-card { background: #F9FAFB; border-left: 4px solid #F15929; padding: 20px; border-radius: 4px; }
    .card-label { font-size: 12px; color: #6B7280; margin-bottom: 5px; }
    .card-value { font-size: 24px; font-weight: bold; color: #231F20; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #F9FAFB; color: #231F20; font-weight: bold; padding: 12px; text-align: left; border: 1px solid #E5E7EB; font-size: 13px; }
    td { padding: 12px; border: 1px solid #E5E7EB; font-size: 13px; }
    tr:nth-child(even) { background-color: #F9FAFB; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 12px; color: #6B7280; }
    .utilization-high { background-color: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 4px; font-weight: 500; }
    .utilization-medium { background-color: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 4px; font-weight: 500; }
    .utilization-low { background-color: #FEE2E2; color: #991B1B; padding: 4px 8px; border-radius: 4px; font-weight: 500; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Power Metal & Steel</div>
    <div class="report-title">Rental Performance Report</div>
    <div class="report-date">
      Generated on ${new Date().toLocaleString()}
      ${dateFrom && dateTo ? `<br/>Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}` : ''}
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="card-label">Total Rentals</div>
      <div class="card-value">${totals.rentals.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Total Revenue</div>
      <div class="card-value">RM ${totals.revenue.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Avg Duration</div>
      <div class="card-value">${totals.avgDuration} days</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Avg Utilization</div>
      <div class="card-value">${totals.avgUtilization}%</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Code</th>
        <th>Item Name</th>
        <th>Category</th>
        <th style="text-align: right;">Rentals</th>
        <th style="text-align: right;">Revenue (RM)</th>
        <th style="text-align: right;">Avg Duration</th>
        <th style="text-align: right;">Utilization</th>
        <th style="text-align: right;">Qty Rented/Total</th>
      </tr>
    </thead>
    <tbody>
      ${filteredData.map(item => `
      <tr>
        <td>${item.itemId}</td>
        <td>${item.itemName}</td>
        <td>${item.category}</td>
        <td style="text-align: right;">${item.totalRentals}</td>
        <td style="text-align: right;">${item.totalRevenue.toLocaleString()}</td>
        <td style="text-align: right;">${item.avgRentalDuration} days</td>
        <td style="text-align: right;">
          <span class="${item.utilizationRate >= 85 ? 'utilization-high' : item.utilizationRate >= 70 ? 'utilization-medium' : 'utilization-low'}">
            ${item.utilizationRate}%
          </span>
        </td>
        <td style="text-align: right;">${item.quantityRented}/${item.totalQuantity}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Power Metal & Steel - Rental Performance Report</p>
    <p>This report is computer-generated and shows rental statistics including number of rentals, revenue, and utilization rates.</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rental_Performance_Report_${new Date().toISOString().split('T')[0]}.html`;
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
          <h2 className="text-[#231F20]">Rental Performance Report</h2>
          <p className="text-gray-600">Track rental statistics, revenue, and average rental durations</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Package className="size-4" />
              Total Rentals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.rentals.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across all items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <DollarSign className="size-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">RM {totals.revenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Revenue generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="size-4" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.avgDuration} days</div>
            <p className="text-xs text-gray-500 mt-1">Average rental period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <TrendingUp className="size-4" />
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{totals.avgUtilization}%</div>
            <p className="text-xs text-gray-500 mt-1">Overall utilization rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue (High to Low)</SelectItem>
                  <SelectItem value="rentals">Rentals (High to Low)</SelectItem>
                  <SelectItem value="duration">Duration (High to Low)</SelectItem>
                  <SelectItem value="utilization">Utilization (High to Low)</SelectItem>
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
          <CardTitle>Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Rentals</TableHead>
                <TableHead className="text-right">Revenue (RM)</TableHead>
                <TableHead className="text-right">Avg Duration</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Qty Rented/Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell className="text-[#231F20]">{item.itemId}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-[#231F20]">{item.itemName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-[#231F20]">
                    {item.totalRentals}
                  </TableCell>
                  <TableCell className="text-right text-[#231F20]">
                    {item.totalRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#231F20]">
                    {item.avgRentalDuration} days
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        item.utilizationRate >= 85
                          ? 'bg-green-100 text-green-800'
                          : item.utilizationRate >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {item.utilizationRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-[#231F20]">
                    {item.quantityRented}/{item.totalQuantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
