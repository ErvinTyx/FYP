import { useState } from 'react';
import {
  Download, Calendar as CalendarIcon, Search,
  TrendingUp, Package, DollarSign, Clock, FileSpreadsheet, Loader2, Play
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
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type {
  RentalPerformanceData,
  RentalPerformanceResponse,
} from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateRentalPerformanceExcel, downloadExcel } from '@/lib/report-excel-generator';

interface ReportFilter {
  reportType: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery: string;
  category?: string;
}

const COLORS = ['#F15929', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function RentalPerformanceReport({ filters }: { filters: ReportFilter }) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rentals' | 'revenue' | 'duration' | 'utilization'>('revenue');
  
  const [data, setData] = useState<RentalPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Validation check
  const validateFilters = () => {
    if (!dateFrom) {
      toast.error('Please select a From Date');
      return false;
    }
    if (!dateTo) {
      toast.error('Please select a To Date');
      return false;
    }
    if (dateFrom > dateTo) {
      toast.error('From Date cannot be after To Date');
      return false;
    }
    return true;
  };

  // Fetch data from API - only called when Generate button is clicked
  const generateReport = async () => {
    if (!validateFilters()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom.toISOString());
      if (dateTo) params.set('dateTo', dateTo.toISOString());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const response = await fetch(`/api/reports/rental-performance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result: RentalPerformanceResponse = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load rental performance data');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort data
  const filteredData = data?.data
    .filter(item => {
      if (searchQuery && !item.itemName.toLowerCase().includes(searchQuery.toLowerCase())) {
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
    }) || [];

  const summary = data?.summary || { totalRentals: 0, totalRevenue: 0, avgDuration: 0, avgUtilization: 0 };
  const categories = data?.categories || [];
  const byCategory = data?.byCategory || [];
  const trends = data?.trends || [];

  // Prepare pie chart data for utilization distribution
  const utilizationDistribution = [
    { name: 'High (≥85%)', value: filteredData.filter(i => i.utilizationRate >= 85).length, color: '#10B981' },
    { name: 'Medium (70-84%)', value: filteredData.filter(i => i.utilizationRate >= 70 && i.utilizationRate < 85).length, color: '#F59E0B' },
    { name: 'Low (<70%)', value: filteredData.filter(i => i.utilizationRate < 70).length, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const exportToExcel = () => {
    if (!data) return;
    
    const blob = generateRentalPerformanceExcel(
      filteredData,
      summary,
      byCategory,
      {
        title: 'Rental Performance Report',
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      }
    );
    
    downloadExcel(blob, `Rental_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    
    const generator = new ReportPDFGenerator();
    const blob = generator.generateRentalPerformanceReport(
      filteredData,
      summary,
      {
        title: 'Rental Performance Report',
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      }
    );
    
    downloadPDF(blob, `Rental_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  // Show initial state before report is generated
  const renderInitialState = () => (
    <Card className="mt-6">
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <Package className="size-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Select your filters above and click "Generate Report" to view rental performance data.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-[#231F20]">Rental Performance Report</h2>
            <p className="text-gray-600">Track rental statistics, revenue, and average rental durations</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={generateReport} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[#231F20]">Rental Performance Report</h2>
          <p className="text-gray-600">Track rental statistics, revenue, and average rental durations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" disabled={!data}>
            <FileSpreadsheet className="size-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={exportToPDF} className="bg-[#F15929] hover:bg-[#d94d1f]" disabled={!data}>
            <Download className="size-4 mr-2" />
            Export to PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div className="space-y-2 flex items-end">
              <Button 
                onClick={generateReport} 
                className="bg-[#F15929] hover:bg-[#d94d1f] w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show initial state or report content */}
      {!hasGenerated ? (
        renderInitialState()
      ) : (
        <>
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
            <div className="text-[#231F20] text-2xl font-bold">{summary.totalRentals.toLocaleString()}</div>
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
            <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalRevenue.toLocaleString()}</div>
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
            <div className="text-[#231F20] text-2xl font-bold">{summary.avgDuration} days</div>
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
            <div className="text-[#231F20] text-2xl font-bold">{summary.avgUtilization}%</div>
            <p className="text-xs text-gray-500 mt-1">Overall utilization rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Category - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `RM ${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`RM ${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#F15929" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rental Trends - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rental Trends (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="rentals" stroke="#F15929" strokeWidth={2} dot={{ r: 4 }} name="Rentals" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Revenue (RM)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Utilization Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Utilization Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={utilizationDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {utilizationDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Performance Details</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <Select value={sortBy} onValueChange={(value: 'rentals' | 'revenue' | 'duration' | 'utilization') => setSortBy(value)}>
                <SelectTrigger className="w-48">
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
          </div>
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
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No rental performance data available
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell className="text-[#231F20] font-medium">{item.itemCode}</TableCell>
                    <TableCell>
                      <p className="text-[#231F20]">{item.itemName}</p>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
