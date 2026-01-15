import { useState } from "react";
import { FileText, Download, Calendar as CalendarIcon, Filter, TrendingUp, Package, DollarSign, BarChart3, FileSpreadsheet, Users, Wrench, AlertTriangle, CreditCard, Clock, PieChart, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Label } from "./ui/label";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns";

type ReportType = 'rental-performance' | 'inventory-utilization' | 'financial' | 'customer-analysis' | 'maintenance' | 'damage-loss' | 'payment-collection' | 'duration-analysis' | '';
type ExportFormat = 'PDF' | 'Excel';

interface ReportTemplate {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  icon: React.ReactNode;
  metrics: string[];
}

// Sample data for reports
const rentalPerformanceData = [
  { item: 'Standard Tube (6m)', rentals: 145, revenue: 21750, avgDuration: 28, utilization: '85%' },
  { item: 'Coupler - Standard', rentals: 290, revenue: 8700, avgDuration: 28, utilization: '92%' },
  { item: 'Base Jack', rentals: 75, revenue: 15000, avgDuration: 32, utilization: '78%' },
  { item: 'Platform Board (2.4m)', rentals: 120, revenue: 18000, avgDuration: 25, utilization: '88%' },
  { item: 'Ladder Beam', rentals: 45, revenue: 13500, avgDuration: 30, utilization: '65%' },
];

const inventoryUtilizationData = [
  { item: 'Standard Tube (6m)', total: 500, inUse: 425, idle: 75, utilizationRate: '85%', idleDays: 15 },
  { item: 'Coupler - Standard', total: 800, inUse: 736, idle: 64, utilizationRate: '92%', idleDays: 8 },
  { item: 'Base Jack', total: 250, inUse: 195, idle: 55, utilizationRate: '78%', idleDays: 22 },
  { item: 'Platform Board (2.4m)', total: 400, inUse: 352, idle: 48, utilizationRate: '88%', idleDays: 12 },
  { item: 'Ladder Beam', total: 180, inUse: 117, idle: 63, utilizationRate: '65%', idleDays: 28 },
];

const financialData = [
  { month: 'Jan 2024', sales: 85420, outstanding: 12500, paid: 72920, status: 'Good' },
  { month: 'Feb 2024', sales: 92350, outstanding: 15800, paid: 76550, status: 'Review' },
  { month: 'Mar 2024', sales: 78900, outstanding: 8900, paid: 70000, status: 'Good' },
  { month: 'Apr 2024', sales: 95200, outstanding: 18200, paid: 77000, status: 'Review' },
  { month: 'May 2024', sales: 88750, outstanding: 11250, paid: 77500, status: 'Good' },
];

const customerAnalysisData = [
  { customer: 'Acme Construction', totalOrders: 24, totalRevenue: 156800, avgOrderValue: 6533, lastOrder: '2024-11-20', status: 'Active' },
  { customer: 'BuildRight Inc.', totalOrders: 18, totalRevenue: 89400, avgOrderValue: 4967, lastOrder: '2024-11-18', status: 'Active' },
  { customer: 'Skyline Developers', totalOrders: 15, totalRevenue: 125600, avgOrderValue: 8373, lastOrder: '2024-11-15', status: 'Active' },
  { customer: 'Metro Builders', totalOrders: 12, totalRevenue: 67200, avgOrderValue: 5600, lastOrder: '2024-10-28', status: 'Inactive' },
  { customer: 'Global Builders', totalOrders: 21, totalRevenue: 142500, avgOrderValue: 6786, lastOrder: '2024-11-22', status: 'Active' },
];

const maintenanceData = [
  { item: 'Standard Tube (6m)', lastInspection: '2024-11-15', nextDue: '2025-02-15', repairs: 3, cost: 450, condition: 'Good' },
  { item: 'Coupler - Standard', lastInspection: '2024-11-10', nextDue: '2025-02-10', repairs: 1, cost: 120, condition: 'Good' },
  { item: 'Base Jack', lastInspection: '2024-11-18', nextDue: '2025-02-18', repairs: 5, cost: 980, condition: 'Fair' },
  { item: 'Platform Board (2.4m)', lastInspection: '2024-11-12', nextDue: '2025-02-12', repairs: 2, cost: 340, condition: 'Good' },
  { item: 'Ladder Beam', lastInspection: '2024-11-20', nextDue: '2025-02-20', repairs: 4, cost: 720, condition: 'Fair' },
];

const damageLossData = [
  { item: 'Standard Tube (6m)', damaged: 12, lost: 3, damageCost: 1800, lossCost: 1350, totalCost: 3150, incidents: 15 },
  { item: 'Coupler - Standard', damaged: 25, lost: 8, damageCost: 750, lossCost: 240, totalCost: 990, incidents: 33 },
  { item: 'Base Jack', damaged: 6, lost: 2, damageCost: 1200, lossCost: 400, totalCost: 1600, incidents: 8 },
  { item: 'Platform Board (2.4m)', damaged: 15, lost: 4, damageCost: 2250, lossCost: 600, totalCost: 2850, incidents: 19 },
  { item: 'Ladder Beam', damaged: 8, lost: 1, damageCost: 2400, lossCost: 300, totalCost: 2700, incidents: 9 },
];

const paymentCollectionData = [
  { customer: 'Acme Construction', invoiced: 45600, collected: 38900, outstanding: 6700, overdueBy: '0 days', status: 'Current' },
  { customer: 'BuildRight Inc.', invoiced: 32400, collected: 25200, outstanding: 7200, overdueBy: '12 days', status: 'Overdue' },
  { customer: 'Skyline Developers', invoiced: 58900, collected: 58900, outstanding: 0, overdueBy: '-', status: 'Paid' },
  { customer: 'Metro Builders', invoiced: 28700, collected: 16500, outstanding: 12200, overdueBy: '28 days', status: 'Critical' },
  { customer: 'Global Builders', invoiced: 51200, collected: 48000, outstanding: 3200, overdueBy: '5 days', status: 'Current' },
];

const durationAnalysisData = [
  { durationType: '1-7 days', rentals: 45, revenue: 12500, percentage: '18%', avgRevenue: 278 },
  { durationType: '8-14 days', rentals: 68, revenue: 28900, percentage: '27%', avgRevenue: 425 },
  { durationType: '15-30 days', rentals: 92, revenue: 52400, percentage: '37%', avgRevenue: 570 },
  { durationType: '31-60 days', rentals: 34, revenue: 38200, percentage: '14%', avgRevenue: 1124 },
  { durationType: '60+ days', rentals: 11, revenue: 25600, percentage: '4%', avgRevenue: 2327 },
];

interface GeneratedReport {
  id: string;
  name: string;
  type: ReportType;
  generatedAt: string;
  dateRange: string;
  format: string;
  status: 'Completed' | 'Processing' | 'Failed';
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'rental-01',
    type: 'rental-performance',
    name: 'Rental Performance Report',
    description: 'Number of rentals per item, revenue generated, and average rental durations',
    icon: <TrendingUp className="h-5 w-5 text-[#F15929]" />,
    metrics: ['Rental Count', 'Total Revenue', 'Average Duration', 'Utilization Rate']
  },
  {
    id: 'inventory-01',
    type: 'inventory-utilization',
    name: 'Inventory Utilization Report',
    description: 'Scaffolding utilization rates and idle inventory analysis',
    icon: <Package className="h-5 w-5 text-[#3B82F6]" />,
    metrics: ['Utilization Rate', 'Items In Use', 'Idle Inventory', 'Idle Days Analysis']
  },
  {
    id: 'financial-01',
    type: 'financial',
    name: 'Financial Performance Report',
    description: 'Sales summaries and outstanding payments tracking',
    icon: <DollarSign className="h-5 w-5 text-[#059669]" />,
    metrics: ['Total Sales', 'Payments Received', 'Outstanding Amount', 'Payment Status']
  },
  {
    id: 'customer-01',
    type: 'customer-analysis',
    name: 'Customer Analysis Report',
    description: 'Customer order history and revenue analysis',
    icon: <Users className="h-5 w-5 text-[#6B7280]" />,
    metrics: ['Total Orders', 'Total Revenue', 'Average Order Value', 'Last Order Date', 'Status']
  },
  {
    id: 'maintenance-01',
    type: 'maintenance',
    name: 'Maintenance Report',
    description: 'Inspection and repair history of scaffolding items',
    icon: <Wrench className="h-5 w-5 text-[#F59E0B]" />,
    metrics: ['Last Inspection', 'Next Due', 'Repairs', 'Cost', 'Condition']
  },
  {
    id: 'damage-01',
    type: 'damage-loss',
    name: 'Damage and Loss Report',
    description: 'Damage and loss incidents and costs',
    icon: <AlertTriangle className="h-5 w-5 text-[#DC2626]" />,
    metrics: ['Damaged', 'Lost', 'Damage Cost', 'Loss Cost', 'Total Cost', 'Incidents']
  },
  {
    id: 'payment-01',
    type: 'payment-collection',
    name: 'Payment Collection Report',
    description: 'Invoiced, collected, and outstanding payments',
    icon: <CreditCard className="h-5 w-5 text-[#059669]" />,
    metrics: ['Invoiced', 'Collected', 'Outstanding', 'Overdue By', 'Status']
  },
  {
    id: 'duration-01',
    type: 'duration-analysis',
    name: 'Duration Analysis Report',
    description: 'Rental duration analysis and revenue',
    icon: <Clock className="h-5 w-5 text-[#F59E0B]" />,
    metrics: ['Duration Type', 'Rentals', 'Revenue', 'Percentage', 'Average Revenue']
  }
];

const recentReports: GeneratedReport[] = [
  {
    id: 'RPT-2024-001',
    name: 'Rental Performance Report',
    type: 'rental-performance',
    generatedAt: '2024-11-20 14:30',
    dateRange: 'Oct 1 - Oct 31, 2024',
    format: 'PDF',
    status: 'Completed'
  },
  {
    id: 'RPT-2024-002',
    name: 'Inventory Utilization Report',
    type: 'inventory-utilization',
    generatedAt: '2024-11-18 09:15',
    dateRange: 'Oct 2024',
    format: 'Excel',
    status: 'Completed'
  },
  {
    id: 'RPT-2024-003',
    name: 'Financial Performance Report',
    type: 'financial',
    generatedAt: '2024-11-15 16:45',
    dateRange: 'Q3 2024',
    format: 'PDF',
    status: 'Completed'
  }
];

export function ReportGeneration() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reports] = useState<GeneratedReport[]>(recentReports);
  const [showPreview, setShowPreview] = useState(false);
  const [previewingReportId, setPreviewingReportId] = useState<string | null>(null);

  const getReportTypeBadge = (type: ReportType) => {
    switch (type) {
      case 'rental-performance':
        return <Badge className="bg-[#F15929] hover:bg-[#d94d1f]">Rental Performance</Badge>;
      case 'inventory-utilization':
        return <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]">Inventory</Badge>;
      case 'financial':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Financial</Badge>;
      case 'customer-analysis':
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">Customer Analysis</Badge>;
      case 'maintenance':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Maintenance</Badge>;
      case 'damage-loss':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Damage & Loss</Badge>;
      case 'payment-collection':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Payment Collection</Badge>;
      case 'duration-analysis':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Duration Analysis</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: GeneratedReport['status']) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Completed</Badge>;
      case 'Processing':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Processing</Badge>;
      case 'Failed':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Failed</Badge>;
    }
  };

  const handleGenerateReport = () => {
    if (!selectedTemplate) {
      toast.error("Please select a report template");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select date range");
      return;
    }

    setShowPreview(true);
    setPreviewingReportId(null);
    toast.success("Report generated successfully! Preview available.");
  };

  const handlePreviewReport = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    
    // Find the template based on report type
    const template = reportTemplates.find(t => t.type === report.type);
    if (template) {
      setSelectedTemplate(template.id);
      setShowPreview(true);
      setPreviewingReportId(reportId);
      toast.success(`Previewing ${report.name}`);
    }
  };

  const handleExportReport = (format: ExportFormat) => {
    toast.success(`Exporting report as ${format}...`);
    // In a real application, this would trigger the actual export
    setTimeout(() => {
      toast.success(`Report exported as ${format} successfully!`);
    }, 1500);
  };

  const getPreviewData = () => {
    const template = reportTemplates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    switch (template.type) {
      case 'rental-performance':
        return rentalPerformanceData;
      case 'inventory-utilization':
        return inventoryUtilizationData;
      case 'financial':
        return financialData;
      case 'customer-analysis':
        return customerAnalysisData;
      case 'maintenance':
        return maintenanceData;
      case 'damage-loss':
        return damageLossData;
      case 'payment-collection':
        return paymentCollectionData;
      case 'duration-analysis':
        return durationAnalysisData;
      default:
        return null;
    }
  };

  const renderPreviewTable = () => {
    const template = reportTemplates.find(t => t.id === selectedTemplate);
    const data = getPreviewData();
    
    if (!template || !data) return null;

    switch (template.type) {
      case 'rental-performance':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Item Name</TableHead>
                <TableHead>Number of Rentals</TableHead>
                <TableHead>Revenue Generated (RM)</TableHead>
                <TableHead>Avg Duration (days)</TableHead>
                <TableHead>Utilization Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof rentalPerformanceData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.item}</TableCell>
                  <TableCell className="text-[#374151]">{item.rentals}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">{item.avgDuration} days</TableCell>
                  <TableCell className="text-[#374151]">{item.utilization}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof rentalPerformanceData).reduce((sum, item) => sum + item.rentals, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof rentalPerformanceData).reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  {Math.round((data as typeof rentalPerformanceData).reduce((sum, item) => sum + item.avgDuration, 0) / data.length)} days
                </TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'inventory-utilization':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Item Name</TableHead>
                <TableHead>Total Stock</TableHead>
                <TableHead>In Use</TableHead>
                <TableHead>Idle Inventory</TableHead>
                <TableHead>Utilization Rate</TableHead>
                <TableHead>Avg Idle Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof inventoryUtilizationData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.item}</TableCell>
                  <TableCell className="text-[#374151]">{item.total}</TableCell>
                  <TableCell className="text-[#374151]">{item.inUse}</TableCell>
                  <TableCell className="text-[#DC2626]">{item.idle}</TableCell>
                  <TableCell className="text-[#374151]">{item.utilizationRate}</TableCell>
                  <TableCell className="text-[#F59E0B]">{item.idleDays} days</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof inventoryUtilizationData).reduce((sum, item) => sum + item.total, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof inventoryUtilizationData).reduce((sum, item) => sum + item.inUse, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof inventoryUtilizationData).reduce((sum, item) => sum + item.idle, 0)}
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'financial':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Period</TableHead>
                <TableHead>Total Sales (RM)</TableHead>
                <TableHead>Payments Received (RM)</TableHead>
                <TableHead>Outstanding (RM)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof financialData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.month}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.sales.toLocaleString()}</TableCell>
                  <TableCell className="text-[#059669]">RM {item.paid.toLocaleString()}</TableCell>
                  <TableCell className="text-[#DC2626]">RM {item.outstanding.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={item.status === 'Good' ? 'bg-[#059669]' : 'bg-[#F59E0B]'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof financialData).reduce((sum, item) => sum + item.sales, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof financialData).reduce((sum, item) => sum + item.paid, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof financialData).reduce((sum, item) => sum + item.outstanding, 0).toLocaleString()}
                </TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'customer-analysis':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Customer Name</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Revenue (RM)</TableHead>
                <TableHead>Avg Order Value (RM)</TableHead>
                <TableHead>Last Order Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof customerAnalysisData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.customer}</TableCell>
                  <TableCell className="text-[#374151]">{item.totalOrders}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.avgOrderValue.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">{format(new Date(item.lastOrder), "PPP")}</TableCell>
                  <TableCell>
                    <Badge className={item.status === 'Active' ? 'bg-[#059669]' : 'bg-[#DC2626]'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof customerAnalysisData).reduce((sum, item) => sum + item.totalOrders, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof customerAnalysisData).reduce((sum, item) => sum + item.totalRevenue, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {Math.round((data as typeof customerAnalysisData).reduce((sum, item) => sum + item.avgOrderValue, 0) / data.length).toLocaleString()}
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'maintenance':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Item Name</TableHead>
                <TableHead>Last Inspection Date</TableHead>
                <TableHead>Next Due Date</TableHead>
                <TableHead>Repairs</TableHead>
                <TableHead>Cost (RM)</TableHead>
                <TableHead>Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof maintenanceData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.item}</TableCell>
                  <TableCell className="text-[#374151]">{format(new Date(item.lastInspection), "PPP")}</TableCell>
                  <TableCell className="text-[#374151]">{format(new Date(item.nextDue), "PPP")}</TableCell>
                  <TableCell className="text-[#374151]">{item.repairs}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.cost.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={item.condition === 'Good' ? 'bg-[#059669]' : 'bg-[#F59E0B]'}>
                      {item.condition}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof maintenanceData).reduce((sum, item) => sum + item.repairs, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof maintenanceData).reduce((sum, item) => sum + item.cost, 0).toLocaleString()}
                </TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'damage-loss':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Item Name</TableHead>
                <TableHead>Damage Count</TableHead>
                <TableHead>Loss Count</TableHead>
                <TableHead>Damage Cost (RM)</TableHead>
                <TableHead>Loss Cost (RM)</TableHead>
                <TableHead>Total Cost (RM)</TableHead>
                <TableHead>Incidents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof damageLossData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.item}</TableCell>
                  <TableCell className="text-[#374151]">{item.damaged}</TableCell>
                  <TableCell className="text-[#374151]">{item.lost}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.damageCost.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.lossCost.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.totalCost.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">{item.incidents}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof damageLossData).reduce((sum, item) => sum + item.damaged, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof damageLossData).reduce((sum, item) => sum + item.lost, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof damageLossData).reduce((sum, item) => sum + item.damageCost, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof damageLossData).reduce((sum, item) => sum + item.lossCost, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof damageLossData).reduce((sum, item) => sum + item.totalCost, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof damageLossData).reduce((sum, item) => sum + item.incidents, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'payment-collection':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Customer Name</TableHead>
                <TableHead>Invoiced (RM)</TableHead>
                <TableHead>Collected (RM)</TableHead>
                <TableHead>Outstanding (RM)</TableHead>
                <TableHead>Overdue By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof paymentCollectionData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.customer}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.invoiced.toLocaleString()}</TableCell>
                  <TableCell className="text-[#059669]">RM {item.collected.toLocaleString()}</TableCell>
                  <TableCell className="text-[#DC2626]">RM {item.outstanding.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">{item.overdueBy}</TableCell>
                  <TableCell>
                    <Badge className={
                      item.status === 'Paid' ? 'bg-[#059669]' : 
                      item.status === 'Current' ? 'bg-[#3B82F6]' : 
                      item.status === 'Overdue' ? 'bg-[#F59E0B]' : 
                      'bg-[#DC2626]'
                    }>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof paymentCollectionData).reduce((sum, item) => sum + item.invoiced, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof paymentCollectionData).reduce((sum, item) => sum + item.collected, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof paymentCollectionData).reduce((sum, item) => sum + item.outstanding, 0).toLocaleString()}
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'duration-analysis':
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Duration Type</TableHead>
                <TableHead>Rentals</TableHead>
                <TableHead>Revenue (RM)</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Avg Revenue (RM)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as typeof durationAnalysisData).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.durationType}</TableCell>
                  <TableCell className="text-[#374151]">{item.rentals}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-[#374151]">{item.percentage}</TableCell>
                  <TableCell className="text-[#374151]">RM {item.avgRevenue.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB]">
                <TableCell className="text-[#111827]">Total</TableCell>
                <TableCell className="text-[#111827]">
                  {(data as typeof durationAnalysisData).reduce((sum, item) => sum + item.rentals, 0)}
                </TableCell>
                <TableCell className="text-[#111827]">
                  RM {(data as typeof durationAnalysisData).reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                </TableCell>
                <TableCell>100%</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  const currentTemplate = reportTemplates.find(t => t.id === selectedTemplate);
  const previewingReport = previewingReportId ? reports.find(r => r.id === previewingReportId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Report Generation</h1>
        <p className="text-[#374151]">Generate comprehensive reports for rental, inventory, and financial analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Reports Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#F15929]" />
              <p className="text-[#111827]">{reports.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">12 reports</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Available Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">{reportTemplates.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Generate New Report */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Generate New Report</CardTitle>
          <CardDescription>Select report template and date range to generate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Template Selection */}
          <div className="space-y-2">
            <Label>Report Template *</Label>
            <Select value={selectedTemplate} onValueChange={(value) => {
              setSelectedTemplate(value);
              setShowPreview(false);
              setPreviewingReportId(null);
            }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select report template" />
              </SelectTrigger>
              <SelectContent>
                {reportTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.icon}
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Details */}
          {selectedTemplate && (
            <Card className="bg-[#F9FAFB] border-[#E5E7EB]">
              <CardContent className="pt-4">
                {(() => {
                  const template = reportTemplates.find(t => t.id === selectedTemplate);
                  if (!template) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {template.icon}
                        <div className="flex-1">
                          <h4 className="text-[#111827]">{template.name}</h4>
                          <p className="text-[12px] text-[#6B7280] mt-1">{template.description}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#E5E7EB]">
                        <Label className="text-[#6B7280]">Key Metrics</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {template.metrics.map((metric, i) => (
                            <Badge key={i} variant="outline" className="text-[12px]">
                              {metric}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-10 justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-10 justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerateReport}
            className="w-full bg-[#F15929] hover:bg-[#d94d1f] h-11"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Generate Report Preview
          </Button>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {showPreview && selectedTemplate && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[18px]">
                  {previewingReport ? `Preview: ${previewingReport.name}` : 'Report Preview'}
                </CardTitle>
                <CardDescription>
                  {currentTemplate?.name}
                  {previewingReport ? (
                    <> - {previewingReport.dateRange}</>
                  ) : (
                    startDate && endDate && <> - {format(startDate, "PP")} to {format(endDate, "PP")}</>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport('PDF')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport('Excel')}
                  className="border-[#059669] text-[#059669] hover:bg-[#059669] hover:text-white"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderPreviewTable()}
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-5 w-5 text-[#6B7280] mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[#111827]">{report.name}</h4>
                      {getReportTypeBadge(report.type)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[12px] text-[#6B7280]">
                      <span>ID: {report.id}</span>
                      <span>•</span>
                      <span>{report.dateRange}</span>
                      <span>•</span>
                      <span>Generated: {report.generatedAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(report.status)}
                  {report.status === 'Completed' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreviewReport(report.id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport('PDF')}
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport('Excel')}
                        className="border-[#059669] text-[#059669] hover:bg-[#059669] hover:text-white"
                      >
                        <FileSpreadsheet className="mr-1 h-4 w-4" />
                        Excel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
