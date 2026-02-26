import { useState, useEffect } from 'react';
import { Download, Search, Users, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
import type { CustomerRentalBehaviourResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateCustomerBehaviourExcel, downloadExcel } from '@/lib/report-excel-generator';
import type { ReportFilters } from './ReportGenerationEnhanced';
import { ReportTablePagination } from './ReportTablePagination';

export interface CustomerBehaviourReportProps {
  filters: ReportFilters;
  requestGeneration?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function CustomerBehaviourReport({ filters, requestGeneration = 0, onRowsPerPageChange, onLoadingChange }: CustomerBehaviourReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<CustomerRentalBehaviourResponse | null>(null);
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
      const response = await fetch(`/api/reports/customer-behaviour?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load customer behaviour data');
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
    const blob = generateCustomerBehaviourExcel(data.data, { title: 'Customer Behaviour Report' });
    downloadExcel(blob, `Customer_Behaviour_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    const generator = new ReportPDFGenerator();
    const blob = generator.generateCustomerBehaviourReport(data.data, { title: 'Customer Behaviour Report' });
    downloadPDF(blob, `Customer_Behaviour_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  const filteredRows = (data?.data ?? []).filter(
    (r) => !searchQuery || r.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-[#231F20]">Customer Behaviour Report</h2>
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
          <h2 className="text-[#231F20]">Customer Behaviour Report</h2>
          <p className="text-gray-600">Rental patterns & spending by customer</p>
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
              <Users className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Click Generate Report to view customer behaviour data</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {filteredRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Rental Value by Customer (Top 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={[...filteredRows]
                        .sort((a, b) => b.total_rental_value - a.total_rental_value)
                        .slice(0, 10)
                        .map((r) => ({ name: r.customer_name.slice(0, 12), value: r.total_rental_value }))}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `RM ${v}`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`RM ${v.toLocaleString()}`, 'Value']} />
                      <Bar dataKey="value" fill="#3B82F6" name="Rental Value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Rentals by Industry</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const byIndustry = filteredRows.reduce<Record<string, number>>((acc, r) => {
                            acc[r.industry_type] = (acc[r.industry_type] ?? 0) + 1;
                            return acc;
                          }, {});
                          const colors = ['#F15929', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
                          return Object.entries(byIndustry).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {(() => {
                          const byIndustry = filteredRows.reduce<Record<string, number>>((acc, r) => {
                            acc[r.industry_type] = (acc[r.industry_type] ?? 0) + 1;
                            return acc;
                          }, {});
                          const colors = ['#F15929', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
                          return Object.entries(byIndustry).map(([name], i) => (
                            <Cell key={name} fill={colors[i % colors.length]} />
                          ));
                        })()}
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
              <CardTitle>Customer Rental Behaviour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input placeholder="Search customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
            <ReportTablePagination
              totalRows={filteredRows.length}
              rowsPerPage={rowsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={onRowsPerPageChange}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Total Value (RM)</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Last Rental</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">No data available</TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((r) => (
                    <TableRow key={r.customer_id}>
                      <TableCell className="font-mono text-sm">{r.customer_id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{r.customer_name}</TableCell>
                      <TableCell><Badge variant="outline">{r.industry_type}</Badge></TableCell>
                      <TableCell className="text-right">{r.total_projects}</TableCell>
                      <TableCell className="text-right">RM {r.total_rental_value.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="secondary">{r.rental_frequency}</Badge></TableCell>
                      <TableCell>{r.last_rental_date ?? '-'}</TableCell>
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
