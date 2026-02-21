import { useState } from 'react';
import { Download, Calendar as CalendarIcon, DollarSign, FileSpreadsheet, Loader2, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
import { format, endOfDay } from 'date-fns';
import type { ProjectFinancialReportResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateFinancialProfitabilityExcel, downloadExcel } from '@/lib/report-excel-generator';

interface ReportFilter {
  reportType: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery: string;
}

export function FinancialProfitabilityReport({ filters }: { filters: ReportFilter }) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [data, setData] = useState<ProjectFinancialReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const validateFilters = () => {
    if (!dateFrom) { toast.error('Please select a From Date'); return false; }
    if (!dateTo) { toast.error('Please select a To Date'); return false; }
    if (dateFrom > dateTo) { toast.error('From Date cannot be after To Date'); return false; }
    const today = endOfDay(new Date());
    if (dateFrom > today || dateTo > today) { toast.error('Dates cannot be after today'); return false; }
    return true;
  };

  const generateReport = async () => {
    if (!validateFilters()) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom.toISOString());
      if (dateTo) params.set('dateTo', dateTo.toISOString());
      const response = await fetch(`/api/reports/financial-profitability?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load financial profitability data');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data) return;
    const blob = generateFinancialProfitabilityExcel(data.data, {
      title: 'Financial & Profitability Report',
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
    });
    downloadExcel(blob, `Financial_Profitability_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    const generator = new ReportPDFGenerator();
    const blob = generator.generateFinancialProfitabilityReport(data.data, {
      title: 'Financial & Profitability Report',
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
    });
    downloadPDF(blob, `Financial_Profitability_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  const summary = data?.summary;
  const rows = data?.data ?? [];

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-[#231F20]">Financial & Profitability Report</h2>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={generateReport} variant="outline">Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[#231F20]">Financial & Profitability Report</h2>
          <p className="text-gray-600">Project revenue, costs & profit margin</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" disabled={!data}>
            <FileSpreadsheet className="size-4 mr-2" /> Export to Excel
          </Button>
          <Button onClick={exportToPDF} className="bg-[#F15929] hover:bg-[#d94d1f]" disabled={!data}>
            <Download className="size-4 mr-2" /> Export to PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} disabled={{ after: endOfDay(new Date()) }} />
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
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={{ after: endOfDay(new Date()) }} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 flex items-end">
              <Button onClick={generateReport} className="bg-[#F15929] hover:bg-[#d94d1f] w-full" disabled={loading}>
                {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Generating...</> : <><Play className="size-4 mr-2" /> Generate Report</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasGenerated ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <DollarSign className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Select date range and click Generate Report</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalProfit.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Avg Profit Margin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.avgMargin}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Project Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Repair</TableHead>
                    <TableHead className="text-right">Damage</TableHead>
                    <TableHead className="text-right">Transport</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-8">No data available</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.project_id}>
                        <TableCell className="font-mono text-sm">{r.project_id.slice(0, 8)}</TableCell>
                        <TableCell>{r.customer_id}</TableCell>
                        <TableCell>{r.project_start_date}</TableCell>
                        <TableCell>{r.project_end_date}</TableCell>
                        <TableCell className="text-right">RM {r.total_rental_revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">RM {r.total_repair_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">RM {r.total_damage_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">RM {r.transportation_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">RM {r.net_profit.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{r.profit_margin}%</TableCell>
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
