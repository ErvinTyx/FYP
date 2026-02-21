import { useState } from 'react';
import { Download, Clock, FileSpreadsheet, Loader2, Play } from 'lucide-react';
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
import type { RentalDurationResponse } from '@/types/report';
import { ReportPDFGenerator, downloadPDF } from '@/lib/report-pdf-generator';
import { generateRentalDurationExcel, downloadExcel } from '@/lib/report-excel-generator';

interface ReportFilter {
  reportType: string;
}

export function RentalDurationReport({ filters }: { filters: ReportFilter }) {
  const [data, setData] = useState<RentalDurationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/reports/rental-duration');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setHasGenerated(true);
      toast.success('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load rental duration data');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data) return;
    const blob = generateRentalDurationExcel(data.data, { title: 'Rental Duration & Efficiency Report' });
    downloadExcel(blob, `Rental_Duration_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported to Excel successfully');
  };

  const exportToPDF = () => {
    if (!data) return;
    const generator = new ReportPDFGenerator();
    const blob = generator.generateRentalDurationReport(data.data, { title: 'Rental Duration & Efficiency Report' });
    downloadPDF(blob, `Rental_Duration_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  const summary = data?.summary;
  const rows = data?.data ?? [];

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-[#231F20]">Rental Duration & Efficiency</h2>
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
          <h2 className="text-[#231F20]">Rental Duration & Efficiency</h2>
          <p className="text-gray-600">Rental periods, extensions & early returns</p>
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
          <Button onClick={generateReport} className="bg-[#F15929] hover:bg-[#d94d1f]" disabled={loading}>
            {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Generating...</> : <><Play className="size-4 mr-2" /> Generate Report</>}
          </Button>
        </CardContent>
      </Card>

      {!hasGenerated ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Clock className="size-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Click Generate Report to view rental duration data</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Total Rentals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.totalRentals}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Avg Duration (days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.avgDuration}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Extension Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-[#231F20] text-2xl font-bold">{summary.extensionRate}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Rental Duration Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rental ID</TableHead>
                    <TableHead>Item ID</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Extensions</TableHead>
                    <TableHead>Early Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">No data available</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.rental_id}>
                        <TableCell className="font-mono text-sm">{r.rental_id.slice(0, 12)}</TableCell>
                        <TableCell className="font-mono text-sm">{r.item_id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-sm">{r.project_id.slice(0, 8)}</TableCell>
                        <TableCell>{r.rental_start}</TableCell>
                        <TableCell>{r.rental_end}</TableCell>
                        <TableCell className="text-right">{r.rental_days}</TableCell>
                        <TableCell className="text-right">{r.extension_days}</TableCell>
                        <TableCell><Badge variant={r.early_return === 'Yes' ? 'secondary' : 'outline'}>{r.early_return}</Badge></TableCell>
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
