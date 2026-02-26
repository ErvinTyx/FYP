import { useState, useEffect } from 'react';
import { Download, Truck, FileSpreadsheet } from 'lucide-react';
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
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { DeliveryPerformanceResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateDeliveryLogisticsExcel, downloadExcel } from '@/lib/report-excel-generator';
import type { ReportFilters } from './ReportGenerationEnhanced';
import { ReportTablePagination } from './ReportTablePagination';

export interface DeliveryLogisticsReportProps {
  filters: ReportFilters;
  requestGeneration?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function DeliveryLogisticsReport({ filters, requestGeneration = 0, onRowsPerPageChange, onLoadingChange }: DeliveryLogisticsReportProps) {
  const [data, setData] = useState<DeliveryPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = filters.rowsPerPage ?? 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [data, rowsPerPage]);

  const validateFilters = () => {
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error('Please select a date range or month above');
      return false;
    }
    return true;
  };

  const generateReport = async () => {
    if (!validateFilters()) return;
    try {
      setLoading(true);
      onLoadingChange?.(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params.set('dateTo', filters.dateTo.toISOString());
      const response = await fetch(`/api/reports/delivery-logistics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load delivery logistics data');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  useEffect(() => {
    if (requestGeneration > 0) {
      generateReport();
    }
  }, [requestGeneration]);

  const exportToExcel = () => {
    if (!data) return;
    const blob = generateDeliveryLogisticsExcel(data.data, { title: 'Delivery & Logistics Performance Report' });
    downloadExcel(blob, `Delivery_Logistics_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    const generator = new ReportPDFGenerator();
    const blob = generator.generateDeliveryLogisticsReport(data.data, { title: 'Delivery & Logistics Performance Report' });
    downloadPDF(blob, `Delivery_Logistics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  const summary = data?.summary;
  const rows = data?.data ?? [];
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-[#231F20]">Delivery & Logistics Performance</h2>
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
          <h2 className="text-[#231F20]">Delivery & Logistics Performance</h2>
          <p className="text-gray-600">Delivery status, delays & transport cost</p>
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

      {!hasGenerated ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Truck className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Click Generate Report to view delivery & logistics data</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.totalDeliveries}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Avg Delay Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.avgDelayDays}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Transport Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalCost.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Transport Cost by Driver</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={Object.entries(
                        rows.reduce<Record<string, number>>((acc, r) => {
                          acc[r.driver_id] = (acc[r.driver_id] ?? 0) + r.transportation_cost;
                          return acc;
                        }, {})
                      ).map(([driver, cost]) => ({ driver, cost }))}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="driver" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `RM ${v}`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`RM ${v.toLocaleString()}`, 'Cost']} />
                      <Bar dataKey="cost" fill="#F15929" name="Transport Cost" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Delay Days Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'On time (0 days)', value: rows.filter((r) => r.delay_days === 0).length, color: '#10B981' },
                          { name: '1–5 days late', value: rows.filter((r) => r.delay_days >= 1 && r.delay_days <= 5).length, color: '#F59E0B' },
                          { name: '6+ days late', value: rows.filter((r) => r.delay_days > 5).length, color: '#EF4444' },
                        ].filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {[
                          { name: 'On time (0 days)', value: rows.filter((r) => r.delay_days === 0).length, color: '#10B981' },
                          { name: '1–5 days late', value: rows.filter((r) => r.delay_days >= 1 && r.delay_days <= 5).length, color: '#F59E0B' },
                          { name: '6+ days late', value: rows.filter((r) => r.delay_days > 5).length, color: '#EF4444' },
                        ]
                          .filter((d) => d.value > 0)
                          .map((entry, i) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Delivery Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTablePagination
                totalRows={rows.length}
                rowsPerPage={rowsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={onRowsPerPageChange}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery ID</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead className="text-right">Delay Days</TableHead>
                    <TableHead className="text-right">Transport Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">No data available</TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((r) => (
                      <TableRow key={r.delivery_id}>
                        <TableCell className="font-mono text-sm">{r.delivery_id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-sm">{r.project_id.slice(0, 8)}</TableCell>
                        <TableCell>{r.driver_id}</TableCell>
                        <TableCell>{r.delivery_date}</TableCell>
                        <TableCell>{r.pickup_date}</TableCell>
                        <TableCell className="text-right">{r.delay_days}</TableCell>
                        <TableCell className="text-right">RM {r.transportation_cost.toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{r.delivery_status}</Badge></TableCell>
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
