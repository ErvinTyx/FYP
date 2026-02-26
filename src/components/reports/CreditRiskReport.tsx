import { useState, useEffect } from 'react';
import { Download, Shield, FileSpreadsheet } from 'lucide-react';
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
import type { CustomerCreditRiskResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateCreditRiskExcel, downloadExcel } from '@/lib/report-excel-generator';
import type { ReportFilters } from './ReportGenerationEnhanced';
import { ReportTablePagination } from './ReportTablePagination';

export interface CreditRiskReportProps {
  filters: ReportFilters;
  requestGeneration?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function CreditRiskReport({ filters, requestGeneration = 0, onRowsPerPageChange, onLoadingChange }: CreditRiskReportProps) {
  const [data, setData] = useState<CustomerCreditRiskResponse | null>(null);
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
      const response = await fetch(`/api/reports/credit-risk?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load credit risk data');
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
    const blob = generateCreditRiskExcel(data.data, { title: 'Credit & Risk Report' });
    downloadExcel(blob, `Credit_Risk_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    const generator = new ReportPDFGenerator();
    const blob = generator.generateCreditRiskReport(data.data, { title: 'Credit & Risk Report' });
    downloadPDF(blob, `Credit_Risk_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  const riskBadge = (level: string) => {
    switch (level) {
      case 'High':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'Medium':
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
    }
  };

  const summary = data?.summary;
  const rows = data?.data ?? [];
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-[#231F20]">Credit & Risk Report</h2>
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
          <h2 className="text-[#231F20]">Credit & Risk Report</h2>
          <p className="text-gray-600">Outstanding balance, overdue & risk level</p>
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
              <Shield className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Click Generate Report to view credit & risk data</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">High Risk Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.highRiskCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalOutstanding.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Risk Level Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Low', value: rows.filter((r) => r.risk_level === 'Low').length, color: '#10B981' },
                          { name: 'Medium', value: rows.filter((r) => r.risk_level === 'Medium').length, color: '#F59E0B' },
                          { name: 'High', value: rows.filter((r) => r.risk_level === 'High').length, color: '#EF4444' },
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
                          { name: 'Low', value: rows.filter((r) => r.risk_level === 'Low').length, color: '#10B981' },
                          { name: 'Medium', value: rows.filter((r) => r.risk_level === 'Medium').length, color: '#F59E0B' },
                          { name: 'High', value: rows.filter((r) => r.risk_level === 'High').length, color: '#EF4444' },
                        ]
                          .filter((d) => d.value > 0)
                          .map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Outstanding Balance by Customer (Top 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={[...rows]
                        .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
                        .slice(0, 10)
                        .map((r) => ({ name: r.customer_id.slice(0, 10), value: r.outstanding_balance }))}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `RM ${v}`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`RM ${v.toLocaleString()}`, 'Outstanding']} />
                      <Bar dataKey="value" fill="#EF4444" name="Outstanding" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Customer Credit Risk</CardTitle>
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
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Aging Days</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">No data available</TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((r) => (
                      <TableRow key={r.customer_id}>
                        <TableCell className="font-medium">{r.customer_id}</TableCell>
                        <TableCell className="text-right">RM {r.credit_limit.toLocaleString()}</TableCell>
                        <TableCell className="text-right">RM {r.outstanding_balance.toLocaleString()}</TableCell>
                        <TableCell className="text-right">RM {r.overdue_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{r.aging_days}</TableCell>
                        <TableCell>{riskBadge(r.risk_level)}</TableCell>
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
