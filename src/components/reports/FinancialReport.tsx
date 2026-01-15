import { useState } from 'react';
import {
  Download, Calendar as CalendarIcon, Search, DollarSign,
  TrendingUp, AlertCircle, CheckCircle2, Clock, Users, FileSpreadsheet
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
}

interface FinancialData {
  period: string;
  month: string;
  totalSales: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  numberOfInvoices: number;
  numberOfCustomers: number;
  paymentRate: number;
  status: 'Excellent' | 'Good' | 'Warning' | 'Critical';
}

interface CustomerPaymentData {
  customerId: string;
  customerName: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdueDays: number;
  lastPaymentDate: string;
  status: 'Current' | 'Overdue' | 'Critical';
  numberOfInvoices: number;
}

const mockMonthlyData: FinancialData[] = [
  {
    period: '2024-11',
    month: 'November 2024',
    totalSales: 285420,
    paidAmount: 242900,
    outstandingAmount: 42520,
    overdueAmount: 8500,
    numberOfInvoices: 45,
    numberOfCustomers: 18,
    paymentRate: 85,
    status: 'Good'
  },
  {
    period: '2024-10',
    month: 'October 2024',
    totalSales: 312850,
    paidAmount: 295100,
    outstandingAmount: 17750,
    overdueAmount: 3200,
    numberOfInvoices: 52,
    numberOfCustomers: 21,
    paymentRate: 94,
    status: 'Excellent'
  },
  {
    period: '2024-09',
    month: 'September 2024',
    totalSales: 268900,
    paidAmount: 223400,
    outstandingAmount: 45500,
    overdueAmount: 15800,
    numberOfInvoices: 38,
    numberOfCustomers: 16,
    paymentRate: 83,
    status: 'Warning'
  },
  {
    period: '2024-08',
    month: 'August 2024',
    totalSales: 295200,
    paidAmount: 280100,
    outstandingAmount: 15100,
    overdueAmount: 2400,
    numberOfInvoices: 48,
    numberOfCustomers: 19,
    paymentRate: 95,
    status: 'Excellent'
  },
  {
    period: '2024-07',
    month: 'July 2024',
    totalSales: 258750,
    paidAmount: 235200,
    outstandingAmount: 23550,
    overdueAmount: 6800,
    numberOfInvoices: 42,
    numberOfCustomers: 17,
    paymentRate: 91,
    status: 'Good'
  },
  {
    period: '2024-06',
    month: 'June 2024',
    totalSales: 189500,
    paidAmount: 145800,
    outstandingAmount: 43700,
    overdueAmount: 22100,
    numberOfInvoices: 35,
    numberOfCustomers: 14,
    paymentRate: 77,
    status: 'Critical'
  },
];

const mockCustomerPayments: CustomerPaymentData[] = [
  {
    customerId: 'CUST-001',
    customerName: 'Acme Construction Sdn Bhd',
    totalInvoiced: 185600,
    totalPaid: 165200,
    outstanding: 20400,
    overdueDays: 5,
    lastPaymentDate: '2024-11-20',
    status: 'Current',
    numberOfInvoices: 12
  },
  {
    customerId: 'CUST-002',
    customerName: 'BuildRight Inc.',
    totalInvoiced: 142800,
    totalPaid: 115600,
    outstanding: 27200,
    overdueDays: 18,
    lastPaymentDate: '2024-11-05',
    status: 'Overdue',
    numberOfInvoices: 9
  },
  {
    customerId: 'CUST-003',
    customerName: 'Skyline Developers',
    totalInvoiced: 225900,
    totalPaid: 225900,
    outstanding: 0,
    overdueDays: 0,
    lastPaymentDate: '2024-11-22',
    status: 'Current',
    numberOfInvoices: 15
  },
  {
    customerId: 'CUST-004',
    customerName: 'Metro Builders',
    totalInvoiced: 98700,
    totalPaid: 54200,
    outstanding: 44500,
    overdueDays: 42,
    lastPaymentDate: '2024-10-10',
    status: 'Critical',
    numberOfInvoices: 7
  },
  {
    customerId: 'CUST-005',
    customerName: 'Global Builders',
    totalInvoiced: 167200,
    totalPaid: 158400,
    outstanding: 8800,
    overdueDays: 0,
    lastPaymentDate: '2024-11-25',
    status: 'Current',
    numberOfInvoices: 11
  },
  {
    customerId: 'CUST-006',
    customerName: 'Premium Projects',
    totalInvoiced: 124500,
    totalPaid: 110200,
    outstanding: 14300,
    overdueDays: 12,
    lastPaymentDate: '2024-11-12',
    status: 'Overdue',
    numberOfInvoices: 8
  },
];

export function FinancialReport({ filters }: { filters: ReportFilter }) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewType, setViewType] = useState<'monthly' | 'customer'>('monthly');

  // Filter customer data
  const filteredCustomers = mockCustomerPayments
    .filter(customer => {
      if (searchQuery && !customer.customerName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && customer.status.toLowerCase() !== statusFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.outstanding - a.outstanding);

  // Calculate totals
  const totals = {
    totalSales: mockMonthlyData.reduce((sum, item) => sum + item.totalSales, 0),
    totalPaid: mockMonthlyData.reduce((sum, item) => sum + item.paidAmount, 0),
    totalOutstanding: mockMonthlyData.reduce((sum, item) => sum + item.outstandingAmount, 0),
    totalOverdue: mockMonthlyData.reduce((sum, item) => sum + item.overdueAmount, 0),
    avgPaymentRate: Math.round(
      mockMonthlyData.reduce((sum, item) => sum + item.paymentRate, 0) / mockMonthlyData.length
    ),
  };

  const customerTotals = {
    totalInvoiced: mockCustomerPayments.reduce((sum, c) => sum + c.totalInvoiced, 0),
    totalPaid: mockCustomerPayments.reduce((sum, c) => sum + c.totalPaid, 0),
    totalOutstanding: mockCustomerPayments.reduce((sum, c) => sum + c.outstanding, 0),
    customersWithOverdue: mockCustomerPayments.filter(c => c.overdueDays > 0).length,
  };

  const exportToExcel = () => {
    // Create CSV content
    let csvContent = 'Power Metal & Steel - Financial Report\n';
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    if (dateFrom && dateTo) {
      csvContent += `Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}\n`;
    }
    csvContent += '\n';
    csvContent += 'SUMMARY\n';
    csvContent += `Total Sales (RM),${totals.totalSales}\n`;
    csvContent += `Total Paid (RM),${totals.totalPaid}\n`;
    csvContent += `Outstanding (RM),${totals.totalOutstanding}\n`;
    csvContent += `Overdue (RM),${totals.totalOverdue}\n`;
    csvContent += `Average Payment Rate (%),${totals.avgPaymentRate}\n`;
    csvContent += '\n';
    
    if (viewType === 'monthly') {
      csvContent += 'MONTHLY SALES SUMMARY\n';
      csvContent += 'Period,Total Sales (RM),Paid (RM),Outstanding (RM),Overdue (RM),Payment Rate (%),Invoices,Customers,Status\n';
      mockMonthlyData.forEach(item => {
        csvContent += `${item.month},${item.totalSales},${item.paidAmount},${item.outstandingAmount},${item.overdueAmount},${item.paymentRate},${item.numberOfInvoices},${item.numberOfCustomers},${item.status}\n`;
      });
    } else {
      csvContent += 'CUSTOMER PAYMENT STATUS\n';
      csvContent += 'Customer ID,Customer Name,Invoiced (RM),Paid (RM),Outstanding (RM),Overdue Days,Last Payment,Invoices,Status\n';
      filteredCustomers.forEach(customer => {
        csvContent += `${customer.customerId},"${customer.customerName}",${customer.totalInvoiced},${customer.totalPaid},${customer.outstanding},${customer.overdueDays},${customer.lastPaymentDate},${customer.numberOfInvoices},${customer.status}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial_Report_${new Date().toISOString().split('T')[0]}.csv`;
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
  <title>Financial Report</title>
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
    .section-title { font-size: 18px; color: #231F20; margin: 30px 0 15px 0; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th { background-color: #F9FAFB; color: #231F20; font-weight: bold; padding: 10px; text-align: left; border: 1px solid #E5E7EB; }
    td { padding: 10px; border: 1px solid #E5E7EB; }
    tr:nth-child(even) { background-color: #F9FAFB; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 12px; color: #6B7280; }
    .status-excellent { background-color: #D1FAE5; color: #065F46; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .status-good { background-color: #DBEAFE; color: #1E40AF; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .status-warning { background-color: #FEF3C7; color: #92400E; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .status-critical { background-color: #FEE2E2; color: #991B1B; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Power Metal & Steel</div>
    <div class="report-title">Financial Report</div>
    <div class="report-date">
      Generated on ${new Date().toLocaleString()}
      ${dateFrom && dateTo ? `<br/>Period: ${format(dateFrom, 'PPP')} - ${format(dateTo, 'PPP')}` : ''}
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="card-label">Total Sales</div>
      <div class="card-value">RM ${totals.totalSales.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Total Paid</div>
      <div class="card-value">RM ${totals.totalPaid.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Outstanding</div>
      <div class="card-value">RM ${totals.totalOutstanding.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Overdue</div>
      <div class="card-value">RM ${totals.totalOverdue.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">Avg Payment Rate</div>
      <div class="card-value">${totals.avgPaymentRate}%</div>
    </div>
  </div>

  <div class="section-title">Monthly Sales Summary</div>
  <table>
    <thead>
      <tr>
        <th>Period</th>
        <th style="text-align: right;">Total Sales (RM)</th>
        <th style="text-align: right;">Paid (RM)</th>
        <th style="text-align: right;">Outstanding (RM)</th>
        <th style="text-align: right;">Overdue (RM)</th>
        <th style="text-align: right;">Payment Rate</th>
        <th style="text-align: right;">Invoices</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${mockMonthlyData.map(item => `
      <tr>
        <td>${item.month}</td>
        <td style="text-align: right;">${item.totalSales.toLocaleString()}</td>
        <td style="text-align: right;">${item.paidAmount.toLocaleString()}</td>
        <td style="text-align: right;">${item.outstandingAmount.toLocaleString()}</td>
        <td style="text-align: right;">${item.overdueAmount.toLocaleString()}</td>
        <td style="text-align: right;">${item.paymentRate}%</td>
        <td style="text-align: right;">${item.numberOfInvoices}</td>
        <td>
          <span class="status-${item.status.toLowerCase()}">${item.status}</span>
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">Customer Payment Status</div>
  <table>
    <thead>
      <tr>
        <th>Customer</th>
        <th style="text-align: right;">Invoiced (RM)</th>
        <th style="text-align: right;">Paid (RM)</th>
        <th style="text-align: right;">Outstanding (RM)</th>
        <th style="text-align: right;">Overdue Days</th>
        <th>Last Payment</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${filteredCustomers.map(customer => `
      <tr>
        <td>${customer.customerName}</td>
        <td style="text-align: right;">${customer.totalInvoiced.toLocaleString()}</td>
        <td style="text-align: right;">${customer.totalPaid.toLocaleString()}</td>
        <td style="text-align: right;">${customer.outstanding.toLocaleString()}</td>
        <td style="text-align: right;">${customer.overdueDays || '-'}</td>
        <td>${new Date(customer.lastPaymentDate).toLocaleDateString()}</td>
        <td>
          <span class="status-${customer.status.toLowerCase()}">${customer.status}</span>
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Power Metal & Steel - Financial Report</p>
    <p>This report shows sales summaries, outstanding payments, and customer payment status.</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial_Report_${new Date().toISOString().split('T')[0]}.html`;
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
          <h2 className="text-[#231F20]">Financial Report</h2>
          <p className="text-gray-600">Review sales summaries and outstanding payment tracking</p>
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
              <DollarSign className="size-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">RM {totals.totalSales.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Last 6 months</p>
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
            <div className="text-[#231F20]">RM {totals.totalPaid.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">
              {Math.round((totals.totalPaid / totals.totalSales) * 100)}% collected
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
            <div className="text-[#231F20]">RM {totals.totalOutstanding.toLocaleString()}</div>
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
            <div className="text-[#231F20]">RM {totals.totalOverdue.toLocaleString()}</div>
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
            <div className="text-[#231F20]">{totals.avgPaymentRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Average rate</p>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead className="text-right">Total Sales (RM)</TableHead>
                  <TableHead className="text-right">Paid (RM)</TableHead>
                  <TableHead className="text-right">Outstanding (RM)</TableHead>
                  <TableHead className="text-right">Overdue (RM)</TableHead>
                  <TableHead className="text-right">Payment Rate</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMonthlyData.map((item) => (
                  <TableRow key={item.period}>
                    <TableCell className="text-[#231F20]">{item.month}</TableCell>
                    <TableCell className="text-right text-[#231F20]">
                      {item.totalSales.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-[#231F20]">
                      {item.paidAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-[#231F20]">
                      {item.outstandingAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={item.overdueAmount > 10000 ? 'text-red-600' : 'text-[#231F20]'}>
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
                    <TableCell>
                      <Badge
                        className={
                          item.status === 'Excellent'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'Good'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'Warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Customer Payment View */}
      {viewType === 'customer' && (
        <>
          {/* Filters for Customer View */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Search Customer</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      placeholder="Search by customer name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
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

          {/* Customer Totals */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20]">RM {customerTotals.totalInvoiced.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20]">RM {customerTotals.totalPaid.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20]">RM {customerTotals.totalOutstanding.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Customers with Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20]">{customerTotals.customersWithOverdue}</div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Payment Status</CardTitle>
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
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.customerId}>
                      <TableCell className="text-[#231F20]">{customer.customerId}</TableCell>
                      <TableCell className="text-[#231F20]">{customer.customerName}</TableCell>
                      <TableCell className="text-right text-[#231F20]">
                        {customer.totalInvoiced.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-[#231F20]">
                        {customer.totalPaid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={customer.outstanding > 20000 ? 'text-red-600' : 'text-[#231F20]'}>
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
                        {new Date(customer.lastPaymentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right text-[#231F20]">
                        {customer.numberOfInvoices}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            customer.status === 'Current'
                              ? 'bg-green-100 text-green-800'
                              : customer.status === 'Overdue'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {customer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
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
                          <p className="text-[#231F20]">{customer.customerName}</p>
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
    </div>
  );
}
