import { useState } from 'react';
import {
  Download, Calendar as CalendarIcon, Search, Package,
  TrendingUp, AlertCircle, Clock, BarChart3, FileSpreadsheet, Loader2, Play
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
import type { InventoryUtilizationResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateInventoryUtilizationExcel, downloadExcel } from '@/lib/report-excel-generator';

interface ReportFilter {
  reportType: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery: string;
  category?: string;
}

const COLORS = ['#F15929', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function InventoryUtilizationReport({ filters }: { filters: ReportFilter }) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [utilizationFilter, setUtilizationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'utilization' | 'idle' | 'idleDays'>('utilization');

  const [data, setData] = useState<InventoryUtilizationResponse | null>(null);
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
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const response = await fetch(`/api/reports/inventory-utilization?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result: InventoryUtilizationResponse = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load inventory utilization data');
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
    }) || [];

  const summary = data?.summary || {
    totalItems: 0,
    totalInUse: 0,
    totalIdle: 0,
    avgUtilization: 0,
    avgIdleDays: 0,
    totalValue: 0,
    idleValue: 0,
  };
  const categories = data?.categories || [];
  const byCategory = data?.byCategory || [];
  const byLocation = data?.byLocation || [];

  // Prepare donut chart data for In Use vs Idle
  const usageDistribution = [
    { name: 'In Use', value: summary.totalInUse, color: '#10B981' },
    { name: 'Idle', value: summary.totalIdle, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const exportToExcel = () => {
    if (!data) return;

    const blob = generateInventoryUtilizationExcel(
      filteredData,
      summary,
      byCategory,
      {
        title: 'Inventory Utilization Report',
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      }
    );

    downloadExcel(blob, `Inventory_Utilization_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;

    const generator = new ReportPDFGenerator();
    const blob = generator.generateInventoryUtilizationReport(
      filteredData,
      summary,
      {
        title: 'Inventory Utilization Report',
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      }
    );

    downloadPDF(blob, `Inventory_Utilization_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
            Select your filters above and click "Generate Report" to view inventory utilization data.
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
            <h2 className="text-[#231F20]">Inventory Utilization Report</h2>
            <p className="text-gray-600">Analyze scaffolding utilization rates and identify idle inventory</p>
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
          <h2 className="text-[#231F20]">Inventory Utilization Report</h2>
          <p className="text-gray-600">Analyze scaffolding utilization rates and identify idle inventory</p>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Package className="size-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20] text-2xl font-bold">{summary.totalItems.toLocaleString()}</div>
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
            <div className="text-[#231F20] text-2xl font-bold">{summary.totalInUse.toLocaleString()}</div>
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
            <div className="text-[#231F20] text-2xl font-bold">{summary.totalIdle.toLocaleString()}</div>
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
            <div className="text-[#231F20] text-2xl font-bold">{summary.avgUtilization}%</div>
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
            <div className="text-[#231F20] text-2xl font-bold">{summary.avgIdleDays}</div>
            <p className="text-xs text-gray-500 mt-1">Days not in use</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* In Use vs Idle - Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">In Use vs Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={usageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {usageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Items']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Utilization by Category - Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Utilization by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Utilization']} />
                <Bar dataKey="utilizationRate" fill="#F15929" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quantity by Location - Grouped Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quantity by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byLocation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inUse" fill="#10B981" name="In Use" />
                <Bar dataKey="idle" fill="#EF4444" name="Idle" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Utilization Details</CardTitle>
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
              <Select value={utilizationFilter} onValueChange={setUtilizationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High ({'≥'} 80%)</SelectItem>
                  <SelectItem value="medium">Medium (60-79%)</SelectItem>
                  <SelectItem value="low">Low ({'<'} 60%)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: 'utilization' | 'idle' | 'idleDays') => setSortBy(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilization">Utilization (High to Low)</SelectItem>
                  <SelectItem value="idle">Idle Items (High to Low)</SelectItem>
                  <SelectItem value="idleDays">Idle Days (High to Low)</SelectItem>
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
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">In Use</TableHead>
                <TableHead className="text-right">Idle</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Avg Idle Days</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No inventory utilization data available
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
                  </TableRow>
                ))
              )}
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
                      <p className="text-[#231F20] font-medium">{item.itemName}</p>
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
        </>
      )}
    </div>
  );
}
