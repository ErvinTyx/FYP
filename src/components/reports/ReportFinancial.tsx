import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, FileDown, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { ReportPreview } from './ReportPreview';
import { ReportPrintLayout } from './ReportPrintLayout';

type ReportType = 'all' | 'deposit' | 'monthly-billing' | 'credit-note';
type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'rejected' | 'pending-approval';

export function ReportFinancial() {
  const [reportType, setReportType] = useState<ReportType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [showPreview, setShowPreview] = useState(false);
  const [showPrintLayout, setShowPrintLayout] = useState(false);

  const handleGenerateReport = () => {
    setShowPreview(true);
    setShowPrintLayout(false);
  };

  const handlePrint = () => {
    setShowPrintLayout(true);
    setShowPreview(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    // Mock Excel export
    alert('Exporting to Excel... (This would trigger actual Excel export in production)');
  };

  if (showPrintLayout) {
    return (
      <ReportPrintLayout
        reportType={reportType}
        statusFilter={statusFilter}
        customerFilter={customerFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onClose={() => setShowPrintLayout(false)}
      />
    );
  }

  if (showPreview) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            ← Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
          </div>
        </div>
        <ReportPreview
          reportType={reportType}
          statusFilter={statusFilter}
          customerFilter={customerFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl" style={{ color: '#231F20' }}>Reports Center</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Financial Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <label className="font-medium">Select Report Type</label>
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports (Consolidated)</SelectItem>
                <SelectItem value="deposit">Deposit Report</SelectItem>
                <SelectItem value="monthly-billing">Monthly Billing Report</SelectItem>
                <SelectItem value="credit-note">Credit Note Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left',
                      !dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-medium">Customer / Project</label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="alpha-construction">Alpha Construction</SelectItem>
                  <SelectItem value="beta-builders">Beta Builders</SelectItem>
                  <SelectItem value="citra-engineering">Citra Engineering</SelectItem>
                  <SelectItem value="kl-tower">KL Tower Project</SelectItem>
                  <SelectItem value="pj-mall">PJ Mall</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="pending-approval">Pending Approval</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleGenerateReport}
              style={{ backgroundColor: '#F15929' }}
              className="hover:opacity-90"
            >
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
