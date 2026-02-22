import { useState, useEffect } from 'react';
import { Download, Wrench, FileSpreadsheet } from 'lucide-react';
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
import type { MaintenanceRecordResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateMaintenanceRepairExcel, downloadExcel } from '@/lib/report-excel-generator';
import type { ReportFilters } from './ReportGenerationEnhanced';
import { ReportTablePagination } from './ReportTablePagination';

export interface MaintenanceRepairReportProps {
  filters: ReportFilters;
  requestGeneration?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function MaintenanceRepairReport({ filters, requestGeneration = 0, onRowsPerPageChange, onLoadingChange }: MaintenanceRepairReportProps) {
  const [data, setData] = useState<MaintenanceRecordResponse | null>(null);
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
      const response = await fetch(`/api/reports/maintenance-repair?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load maintenance repair data');
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
    const blob = generateMaintenanceRepairExcel(data.data, { title: 'Maintenance & Repair Report' });
    downloadExcel(blob, `Maintenance_Repair_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    const generator = new ReportPDFGenerator();
    const blob = generator.generateMaintenanceRepairReport(data.data, { title: 'Maintenance & Repair Report' });
    downloadPDF(blob, `Maintenance_Repair_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  const summary = data?.summary;
  const rows = data?.data ?? [];
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-[#231F20]">Maintenance & Repair Report</h2>
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
          <h2 className="text-[#231F20]">Maintenance & Repair Report</h2>
          <p className="text-gray-600">Repair records, costs & downtime</p>
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
              <Wrench className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Click Generate Report to view maintenance & repair data</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Repairs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.totalRepairs}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">RM {summary.totalCost.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Records</CardTitle>
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
                    <TableHead>Repair ID</TableHead>
                    <TableHead>Item ID</TableHead>
                    <TableHead>Damage Type</TableHead>
                    <TableHead>Repair Date</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Downtime Days</TableHead>
                    <TableHead>Technician</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">No data available</TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((r) => (
                      <TableRow key={`${r.repair_id}-${r.item_id}`}>
                        <TableCell className="font-mono text-sm">{r.repair_id}</TableCell>
                        <TableCell className="font-mono text-sm">{r.item_id.slice(0, 8)}</TableCell>
                        <TableCell>{r.damage_type}</TableCell>
                        <TableCell>{r.repair_date}</TableCell>
                        <TableCell className="text-right">RM {r.repair_cost.toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{r.repair_status}</Badge></TableCell>
                        <TableCell className="text-right">{r.downtime_days}</TableCell>
                        <TableCell>{r.technician ?? '-'}</TableCell>
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
