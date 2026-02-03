import { useState } from 'react';
import {
  Download, Calendar as CalendarIcon, Search, DollarSign,
  TrendingUp, AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Loader2, Play
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
  AreaChart,
  Area,
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
import type { FinancialResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateFinancialExcel, downloadExcel } from '@/lib/report-excel-generator';

interface ReportFilter {
  reportType: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery: string;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

export function FinancialReport({ filters }: { filters: ReportFilter }) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewType, setViewType] = useState<'monthly' | 'customer'>('monthly');

  const [data, setData] = useState<FinancialResponse | null>(null);
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

      const response = await fetch(`/api/reports/financial?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result: FinancialResponse = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  // Filter customer data
  const filteredCustomers = data?.customerData
    .filter(customer => {
      if (searchQuery && !customer.customerName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && customer.status.toLowerCase() !== statusFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.outstanding - a.outstanding) || [];

  const summary = data?.summary || {
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    totalDeposits: 0,
    totalCreditNotes: 0,
    avgPaymentRate: 0,
    totalCustomers: 0,
  };

  const monthlyData = data?.monthlyData || [];
  const invoiceStatusBreakdown = data?.invoiceStatusBreakdown || [];

  // Customer totals
  const customerTotals = {
    totalInvoiced: filteredCustomers.reduce((sum, c) => sum + c.totalInvoiced, 0),
    totalPaid: filteredCustomers.reduce((sum, c) => sum + c.totalPaid, 0),
    totalOutstanding: filteredCustomers.reduce((sum, c) => sum + c.outstanding, 0),
    customersWithOverdue: filteredCustomers.filter(c => c.overdueDays > 0).length,
  };

  // Prepare chart data for payment status breakdown
  const paymentStatusData = [
    { name: 'Paid', value: summary.totalPaid, color: '#10B981' },
    { name: 'Outstanding', value: summary.totalOutstanding - summary.totalOverdue, color: '#F59E0B' },
    { name: 'Overdue', value: summary.totalOverdue, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // Prepare stacked bar chart data for invoice status by month
  const monthlyChartData = [...monthlyData].reverse().map(m => ({
    month: m.month.split(' ')[0], // Just month name
    Paid: m.totalPaid,
    Outstanding: m.outstandingAmount,
    Overdue: m.overdueAmount,
  }));

  const exportToExcel = () => {
    if (!data) return;

    const blob = generateFinancialExcel(
      monthlyData,
      filteredCustomers,
      summary,
      {
        title: 'Financial Report',
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      }
    );

    downloadExcel(blob, `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;

    const generator = new ReportPDFGenerator();
    const blob = generator.generateFinancialReport(
      monthlyData,
      filteredCustomers,
      summary,
      {
        title: 'Financial Report',
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      }
    );

    downloadPDF(blob, `Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  // Show initial state before report is generated
  const renderInitialState = () => (
    <Card className="mt-6">
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <DollarSign className="size-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Select your date range above and click "Generate Report" to view financial data.
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
            <h2 className="text-[#231F20]">Financial Report</h2>
            <p className="text-gray-600">Review sales summaries and outstanding payment tracking</p>
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
          <h2 className="text-[#231F20]">Financial Report</h2>
          <p className="text-gray-600">Review sales summaries and outstanding payment tracking</p>
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
              <DollarSign className="size-4" />
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalInvoiced.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">All invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalPaid.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">
              {summary.totalInvoiced > 0 ? Math.round((summary.totalPaid / summary.totalInvoiced) * 100) : 0}% collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="size-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Pending payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <AlertCircle className="size-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalOverdue.toLocaleString()}</div>
            <p className="text-xs text-red-600 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <TrendingUp className="size-4" />
              Payment Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20] text-2xl font-bold">{summary.avgPaymentRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Average rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend - Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `RM ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [`RM ${value.toLocaleString()}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="Paid" stroke="#10B981" fillOpacity={1} fill="url(#colorPaid)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Breakdown - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`RM ${value.toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status by Month - Stacked Bar Chart */}
      {monthlyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invoice Status by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `RM ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [`RM ${value.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="Paid" stackId="a" fill="#10B981" />
                <Bar dataKey="Outstanding" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Overdue" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>View:</Label>
            <div className="flex gap-2">
              <Button
                variant={viewType === 'monthly' ? 'default' : 'outline'}
                onClick={() => setViewType('monthly')}
                className={viewType === 'monthly' ? 'bg-[#F15929] hover:bg-[#d94d1f]' : ''}
              >
                Monthly Summary
              </Button>
              <Button
                variant={viewType === 'customer' ? 'default' : 'outline'}
                onClick={() => setViewType('customer')}
                className={viewType === 'customer' ? 'bg-[#F15929] hover:bg-[#d94d1f]' : ''}
              >
                Customer Payments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary View */}
      {viewType === 'monthly' && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Invoiced (RM)</TableHead>
                  <TableHead className="text-right">Paid (RM)</TableHead>
                  <TableHead className="text-right">Outstanding (RM)</TableHead>
                  <TableHead className="text-right">Overdue (RM)</TableHead>
                  <TableHead className="text-right">Payment Rate</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No monthly financial data available
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyData.map((item) => (
                    <TableRow key={item.period}>
                      <TableCell className="text-[#231F20] font-medium">{item.month}</TableCell>
                      <TableCell className="text-right text-[#231F20]">
                        {item.totalInvoiced.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-[#231F20]">
                        {item.totalPaid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-[#231F20]">
                        {item.outstandingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.overdueAmount > 10000 ? 'text-red-600 font-medium' : 'text-[#231F20]'}>
                          {item.overdueAmount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={
                            item.paymentRate >= 90
                              ? 'bg-green-100 text-green-800'
                              : item.paymentRate >= 80
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {item.paymentRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[#231F20]">{item.numberOfInvoices}</TableCell>
                      <TableCell className="text-right text-[#231F20]">{item.numberOfCustomers}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Customer Payment View */}
      {viewType === 'customer' && (
        <>

          {/* Customer Totals */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20] text-xl font-bold">RM {customerTotals.totalInvoiced.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20] text-xl font-bold">RM {customerTotals.totalPaid.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20] text-xl font-bold">RM {customerTotals.totalOutstanding.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Customers with Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20] text-xl font-bold">{customerTotals.customersWithOverdue}</div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Customer Payment Status</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      placeholder="Search customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Invoiced (RM)</TableHead>
                    <TableHead className="text-right">Paid (RM)</TableHead>
                    <TableHead className="text-right">Outstanding (RM)</TableHead>
                    <TableHead className="text-right">Overdue Days</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No customer payment data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.customerId}>
                        <TableCell className="text-[#231F20] font-medium">{customer.customerId}</TableCell>
                        <TableCell className="text-[#231F20]">{customer.customerName}</TableCell>
                        <TableCell className="text-right text-[#231F20]">
                          {customer.totalInvoiced.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-[#231F20]">
                          {customer.totalPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={customer.outstanding > 20000 ? 'text-red-600 font-medium' : 'text-[#231F20]'}>
                            {customer.outstanding.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.overdueDays > 0 ? (
                            <Badge
                              className={
                                customer.overdueDays > 30
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {customer.overdueDays} days
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {customer.lastPaymentDate
                            ? new Date(customer.lastPaymentDate).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right text-[#231F20]">
                          {customer.numberOfInvoices}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Critical Customers Alert */}
          {filteredCustomers.filter(c => c.status === 'Critical').length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="size-5" />
                  Critical Payment Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-3">
                  {filteredCustomers.filter(c => c.status === 'Critical').length} customer(s) have critical overdue payments
                </p>
                <div className="space-y-2">
                  {filteredCustomers
                    .filter(c => c.status === 'Critical')
                    .map((customer) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                        <div>
                          <p className="text-[#231F20] font-medium">{customer.customerName}</p>
                          <p className="text-sm text-gray-600">
                            Outstanding: RM {customer.outstanding.toLocaleString()} • {customer.overdueDays} days overdue
                          </p>
                        </div>
                        <Badge className="bg-red-100 text-red-800">
                          Action Required
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
