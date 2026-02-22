import { useState, useEffect } from 'react';
import {
  Download, Search, Package, TrendingUp, AlertCircle, BarChart3, FileSpreadsheet
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
import { toast } from 'sonner';
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
import type { InventoryUtilizationReportResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateInventoryUtilizationReportExcel, downloadExcel } from '@/lib/report-excel-generator';
import type { ReportFilters } from './ReportGenerationEnhanced';
import { ReportTablePagination } from './ReportTablePagination';

const COLORS = ['#F15929', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export interface InventoryUtilizationReportProps {
  filters: ReportFilters;
  requestGeneration?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function InventoryUtilizationReport({ filters, requestGeneration = 0, onRowsPerPageChange, onLoadingChange }: InventoryUtilizationReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [utilizationFilter, setUtilizationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'utilization' | 'idleDays' | 'rented'>('utilization');
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = filters.rowsPerPage ?? 25;

  const [data, setData] = useState<InventoryUtilizationReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

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
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const response = await fetch(`/api/reports/inventory-utilization?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load inventory utilization data');
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

  const filteredData = (data?.data ?? [])
    .filter(item => {
      if (searchQuery && !item.item_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (utilizationFilter !== 'all') {
        if (utilizationFilter === 'high' && item.utilization_rate < 80) return false;
        if (utilizationFilter === 'medium' && (item.utilization_rate < 60 || item.utilization_rate >= 80)) return false;
        if (utilizationFilter === 'low' && item.utilization_rate >= 60) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'utilization': return b.utilization_rate - a.utilization_rate;
        case 'idleDays': return b.idle_days - a.idle_days;
        case 'rented': return b.rented_quantity - a.rented_quantity;
        default: return 0;
      }
    });

  const summary = data?.summary ?? { totalItems: 0, avgUtilization: 0, totalIdleDays: 0 };
  const categories = Array.from(new Set((data?.data ?? []).map(i => i.category)));
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const byCategory = categories.map(cat => {
    const items = (data?.data ?? []).filter(i => i.category === cat);
    const total = items.reduce((s, i) => s + i.total_quantity, 0);
    const rented = items.reduce((s, i) => s + i.rented_quantity, 0);
    return { category: cat, total, rented, utilizationRate: total > 0 ? Math.round((rented / total) * 100) : 0 };
  });

  const usageDistribution = [
    { name: 'Rented', value: filteredData.reduce((s, i) => s + i.rented_quantity, 0), color: '#10B981' },
    { name: 'Available', value: filteredData.reduce((s, i) => s + (i.total_quantity - i.rented_quantity), 0), color: '#EF4444' },
  ].filter(d => d.value > 0);

  const exportToExcel = () => {
    if (!data) return;
    const blob = generateInventoryUtilizationReportExcel(data.data, {
      title: 'Inventory Utilization & Demand Forecast',
    });
    downloadExcel(blob, `Inventory_Utilization_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    const generator = new ReportPDFGenerator();
    const blob = generator.generateInventoryUtilizationReportNew(data.data, {
      title: 'Inventory Utilization & Demand Forecast',
    });
    downloadPDF(blob, `Inventory_Utilization_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-[#231F20]">Inventory Utilization & Demand Forecast</h2>
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
          <h2 className="text-[#231F20]">Inventory Utilization & Demand Forecast</h2>
          <p className="text-gray-600">% usage, rented quantity & idle days</p>
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
              <Package className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Select filters and click Generate Report</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20] text-2xl font-bold">{summary.totalItems.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Avg Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20] text-2xl font-bold">{summary.avgUtilization}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Total Idle Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[#231F20] text-2xl font-bold">{summary.totalIdleDays}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rented vs Available</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={usageDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {usageDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Utilization by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Utilization']} />
                    <Bar dataKey="utilizationRate" fill="#F15929" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Utilization Details</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-48" />
                  </div>
                  <Select value={utilizationFilter} onValueChange={setUtilizationFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High (≥80%)</SelectItem>
                      <SelectItem value="medium">Medium (60-79%)</SelectItem>
                      <SelectItem value="low">Low (&lt;60%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v: 'utilization' | 'idleDays' | 'rented') => setSortBy(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utilization">Utilization (High to Low)</SelectItem>
                      <SelectItem value="idleDays">Idle Days (High to Low)</SelectItem>
                      <SelectItem value="rented">Rented Qty (High to Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
                </CardHeader>
                <CardContent>
                  <ReportTablePagination
                    totalRows={filteredData.length}
                    rowsPerPage={rowsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={onRowsPerPageChange}
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Rented</TableHead>
                        <TableHead className="text-right">Utilization</TableHead>
                        <TableHead className="text-right">Idle Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">No data available</TableCell>
                        </TableRow>
                      ) : (
                        paginatedData.map(item => (
                      <TableRow key={item.item_id}>
                        <TableCell className="font-mono text-sm">{item.item_id.slice(0, 8)}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                        <TableCell className="text-right">{item.total_quantity}</TableCell>
                        <TableCell className="text-right">{item.rented_quantity}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={item.utilization_rate >= 80 ? 'bg-green-100 text-green-800' : item.utilization_rate >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                            {item.utilization_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.idle_days} days</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {filteredData.filter(i => i.idle_days > 30).length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="size-5" /> Idle Inventory Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-amber-700 mb-3">
                  {filteredData.filter(i => i.idle_days > 30).length} items with idle days &gt; 30
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
