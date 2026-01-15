import { useState, useEffect } from 'react';
import { ClipboardCheck, Wrench, FileText, Plus, Filter, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ConditionReportList } from './ConditionReportList';
import { ConditionReportForm } from './ConditionReportForm';
import { RepairSlipList } from './RepairSlipList';
import { RepairSlipDetails } from './RepairSlipDetails';
import { RepairSlipForm } from './RepairSlipForm';
import { RepairSlipPrint } from './RepairSlipPrint';
import { DamageInvoiceList } from './DamageInvoiceList';
import { InventoryAdjustmentLog } from './InventoryAdjustmentLog';
import { MaintenanceDashboard } from './MaintenanceDashboard';
import { ConditionReport, OpenRepairSlip, DamageInvoice, InventoryAdjustment } from '../../types/inspection';
import { toast } from 'sonner@2.0.3';

type ViewMode = 'list' | 'create-report' | 'view-repair' | 'create-repair' | 'print-repair' | 'maintenance';

export function InspectionMaintenanceModule() {
  const [activeTab, setActiveTab] = useState('reports');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ConditionReport | null>(null);
  const [selectedRepairSlip, setSelectedRepairSlip] = useState<OpenRepairSlip | null>(null);

  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [repairSlips, setRepairSlips] = useState<OpenRepairSlip[]>([]);
  const [damageInvoices, setDamageInvoices] = useState<DamageInvoice[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);

  // Load data from localStorage
  useEffect(() => {
    const savedReports = localStorage.getItem('conditionReports');
    const savedSlips = localStorage.getItem('repairSlips');
    const savedInvoices = localStorage.getItem('damageInvoices');
    const savedAdjustments = localStorage.getItem('inventoryAdjustments');

    if (savedReports) setConditionReports(JSON.parse(savedReports));
    if (savedSlips) setRepairSlips(JSON.parse(savedSlips));
    if (savedInvoices) setDamageInvoices(JSON.parse(savedInvoices));
    if (savedAdjustments) setAdjustments(JSON.parse(savedAdjustments));
  }, []);

  const handleCreateReport = () => {
    setSelectedReport(null);
    setViewMode('create-report');
  };

  const handleSaveReport = (report: ConditionReport) => {
    let updatedReports: ConditionReport[];
    
    if (selectedReport) {
      updatedReports = conditionReports.map(r => r.id === report.id ? report : r);
    } else {
      updatedReports = [...conditionReports, report];
    }
    
    setConditionReports(updatedReports);
    localStorage.setItem('conditionReports', JSON.stringify(updatedReports));
    
    // Create inventory adjustments for damaged items
    const newAdjustments: InventoryAdjustment[] = report.items
      .filter(item => item.repairRequired)
      .map(item => ({
        id: `adj-${Date.now()}-${Math.random()}`,
        adjustmentType: 'damage-detected' as const,
        scaffoldingItemId: item.scaffoldingItemId,
        scaffoldingItemName: item.scaffoldingItemName,
        quantity: item.quantityRepair, // Only show repair quantity, not total
        fromStatus: 'available',
        toStatus: 'under-repair',
        referenceId: report.rcfNumber,
        referenceType: 'condition-report' as const,
        adjustedBy: report.inspectedBy,
        adjustedAt: new Date().toISOString(),
        notes: item.damageDescription
      }));
    
    if (newAdjustments.length > 0) {
      const updatedAdjustments = [...adjustments, ...newAdjustments];
      setAdjustments(updatedAdjustments);
      localStorage.setItem('inventoryAdjustments', JSON.stringify(updatedAdjustments));
    }
    
    setViewMode('list');
  };

  const handleCancelReport = () => {
    setViewMode('list');
    setSelectedReport(null);
  };

  const handleViewRepairSlip = (slip: OpenRepairSlip) => {
    setSelectedRepairSlip(slip);
    setViewMode('view-repair');
  };

  const handleCreateRepairSlip = (reportId?: string) => {
    if (reportId) {
      const report = conditionReports.find(r => r.id === reportId);
      setSelectedReport(report || null);
    }
    setViewMode('create-repair');
  };

  const handleSaveRepairSlip = (slip: OpenRepairSlip) => {
    let updatedSlips: OpenRepairSlip[];
    const isNewSlip = !selectedRepairSlip;
    
    if (selectedRepairSlip) {
      updatedSlips = repairSlips.map(s => s.id === slip.id ? slip : s);
    } else {
      updatedSlips = [...repairSlips, slip];
    }
    
    setRepairSlips(updatedSlips);
    localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));
    
    // If it's a new slip, navigate to view it
    if (isNewSlip) {
      setSelectedRepairSlip(slip);
      setActiveTab('repairs');
      setViewMode('view-repair');
    } else {
      setViewMode('list');
    }
  };

  const handleUpdateRepairStatus = (slipId: string, status: OpenRepairSlip['status']) => {
    const updatedSlips = repairSlips.map(slip => {
      if (slip.id === slipId) {
        const updated = { ...slip, status, updatedAt: new Date().toISOString() };
        if (status === 'completed') {
          updated.completionDate = new Date().toISOString();
          
          // Create inventory adjustments for completed repairs
          const newAdjustments: InventoryAdjustment[] = slip.items
            .filter(item => item.repairStatus === 'completed')
            .map(item => ({
              id: `adj-${Date.now()}-${Math.random()}`,
              adjustmentType: 'repair-completed' as const,
              scaffoldingItemId: item.scaffoldingItemId,
              scaffoldingItemName: item.scaffoldingItemName,
              quantity: item.quantity,
              fromStatus: 'under-repair',
              toStatus: 'available',
              referenceId: slip.orpNumber,
              referenceType: 'repair-slip' as const,
              adjustedBy: 'System',
              adjustedAt: new Date().toISOString(),
              notes: 'Repair completed and items returned to inventory'
            }));
          
          if (newAdjustments.length > 0) {
            const updatedAdjustments = [...adjustments, ...newAdjustments];
            setAdjustments(updatedAdjustments);
            localStorage.setItem('inventoryAdjustments', JSON.stringify(updatedAdjustments));
          }
        }
        return updated;
      }
      return slip;
    });
    
    setRepairSlips(updatedSlips);
    localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));
  };

  const handleUpdateRepairSlip = (updatedSlip: OpenRepairSlip) => {
    const updatedSlips = repairSlips.map(s => s.id === updatedSlip.id ? updatedSlip : s);
    setRepairSlips(updatedSlips);
    localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));
  };

  const handleCreateInventoryLog = (log: InventoryAdjustment) => {
    const updatedAdjustments = [...adjustments, log];
    setAdjustments(updatedAdjustments);
    localStorage.setItem('inventoryAdjustments', JSON.stringify(updatedAdjustments));
  };

  const handleViewReference = (referenceId: string, referenceType: string) => {
    if (referenceType === 'condition-report') {
      const report = conditionReports.find(r => r.rcfNumber === referenceId);
      if (report) {
        setSelectedReport(report);
        setViewMode('create-report');
        setActiveTab('reports');
      }
    } else if (referenceType === 'repair-slip') {
      const slip = repairSlips.find(s => s.orpNumber === referenceId);
      if (slip) {
        setSelectedRepairSlip(slip);
        setViewMode('view-repair');
        setActiveTab('repairs');
      }
    }
  };

  const handleGenerateDamageInvoice = (repairSlipId: string) => {
    const slip = repairSlips.find(s => s.id === repairSlipId);
    if (!slip) {
      toast.error('Repair slip not found');
      return;
    }

    // Generate invoice from repair slip (not condition report)
    const invoiceItems = slip.items
      .filter(item => item.totalCost > 0)
      .map(item => ({
        id: `inv-item-${Date.now()}-${Math.random()}`,
        description: `${item.scaffoldingItemName} - ${item.damageDescription || 'Damage repair'}`,
        quantity: item.quantity,
        unitPrice: item.quantity > 0 ? item.totalCost / item.quantity : item.totalCost,
        total: item.totalCost
      }));

    // Check if there are items with cost
    if (invoiceItems.length === 0) {
      toast.error('No items with repair costs found in this repair slip. Please ensure items have cost values.');
      return;
    }

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0.06; // 6% SST
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const newInvoice: DamageInvoice = {
      id: `damage-inv-${Date.now()}`,
      invoiceNumber: `DI-${Date.now()}`,
      orpNumber: slip.orpNumber,
      repairSlipId: slip.id,
      invoiceDate: new Date().toISOString(),
      vendor: '', // Will be filled from customer info
      items: invoiceItems,
      subtotal: subtotal,
      tax: tax,
      total: total,
      paymentStatus: 'pending',
      notes: `Damage charges for items in repair slip: ${slip.orpNumber}. Based on completed repairs.`,
      createdAt: new Date().toISOString(),
      createdFrom: 'repair-slip'
    };

    // Update repair slip with invoice link
    const updatedSlips = repairSlips.map(s =>
      s.id === repairSlipId ? { ...s, damageInvoiceId: newInvoice.id } : s
    );
    setRepairSlips(updatedSlips);
    localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));

    const updatedInvoices = [...damageInvoices, newInvoice];
    setDamageInvoices(updatedInvoices);
    localStorage.setItem('damageInvoices', JSON.stringify(updatedInvoices));
    
    toast.success(`Damage invoice ${newInvoice.invoiceNumber} generated successfully with RM ${total.toFixed(2)} total`);
    
    // Switch to invoices tab to show the generated invoice
    setActiveTab('invoices');
  };

  // Calculate statistics
  const stats = {
    totalReports: conditionReports.length,
    pendingReports: conditionReports.filter(r => r.status === 'pending').length,
    openRepairs: repairSlips.filter(s => s.status === 'open' || s.status === 'in-repair').length,
    completedRepairs: repairSlips.filter(s => s.status === 'completed').length,
    totalRepairCost: repairSlips.reduce((sum, s) => sum + s.actualCost, 0),
    itemsUnderRepair: adjustments.reduce((net, a) => {
      // Add items going TO under-repair status
      if (a.toStatus === 'under-repair') {
        return net + a.quantity;
      }
      // Subtract items coming FROM under-repair status (completed repairs)
      if (a.fromStatus === 'under-repair') {
        return net - a.quantity;
      }
      return net;
    }, 0)
  };

  if (viewMode === 'create-report') {
    return (
      <ConditionReportForm
        report={selectedReport}
        onSave={handleSaveReport}
        onCancel={handleCancelReport}
      />
    );
  }

  if (viewMode === 'view-repair' && selectedRepairSlip) {
    return (
      <RepairSlipDetails
        repairSlip={selectedRepairSlip}
        onBack={() => setViewMode('list')}
        onUpdateStatus={handleUpdateRepairStatus}
        onPrint={(slip) => {
          setSelectedRepairSlip(slip);
          setViewMode('print-repair');
        }}
      />
    );
  }

  if (viewMode === 'create-repair') {
    return (
      <RepairSlipForm
        repairSlip={selectedRepairSlip}
        onSave={handleSaveRepairSlip}
        onCancel={() => setViewMode('list')}
        conditionReport={selectedReport}
      />
    );
  }

  if (viewMode === 'print-repair' && selectedRepairSlip) {
    return (
      <RepairSlipPrint
        repairSlip={selectedRepairSlip}
        onClose={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'maintenance') {
    return (
      <div className="p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[#231F20]">Maintenance Dashboard</h1>
            <p className="text-gray-600">Update repair progress and upload completion photos</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setViewMode('list')}
            className="border-[#F15929] text-[#F15929] hover:bg-[#F15929] hover:text-white"
          >
            Back to Inspection
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[#231F20]">{stats.totalReports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Pending Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-amber-600">{stats.pendingReports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Open Repairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-blue-600">{stats.openRepairs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-green-600">{stats.completedRepairs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Items in Repair</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[#231F20]">{stats.itemsUnderRepair}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Repair Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[#231F20]">RM {stats.totalRepairCost.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <MaintenanceDashboard
          repairSlips={repairSlips}
          onUpdateRepairSlip={handleUpdateRepairSlip}
          onCreateInventoryLog={handleCreateInventoryLog}
          onBackToInspection={() => setViewMode('list')}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[#231F20]">Inspection & Maintenance</h1>
          <p className="text-gray-600">Manage condition reports, repairs, and inventory adjustments</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setViewMode('maintenance')}
            className="border-[#F15929] text-[#F15929] hover:bg-[#F15929] hover:text-white"
          >
            <Wrench className="size-4 mr-2" />
            Maintenance Dashboard
          </Button>
          <Button onClick={handleCreateReport} className="bg-[#F15929] hover:bg-[#d94d1f]">
            <Plus className="size-4 mr-2" />
            New Condition Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.totalReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Pending Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-amber-600">{stats.pendingReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Open Repairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">{stats.openRepairs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">{stats.completedRepairs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Items in Repair</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.itemsUnderRepair}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by RCF number, DO number, or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reports">
            <ClipboardCheck className="size-4 mr-2" />
            Condition Reports
          </TabsTrigger>
          <TabsTrigger value="repairs">
            <Wrench className="size-4 mr-2" />
            Open Repair Slip
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="size-4 mr-2" />
            Damage Invoices
          </TabsTrigger>
          <TabsTrigger value="adjustments">
            <FileText className="size-4 mr-2" />
            Inventory Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          <ConditionReportList
            reports={conditionReports}
            searchQuery={searchQuery}
            onEdit={(report) => {
              setSelectedReport(report);
              setViewMode('create-report');
            }}
            onCreateRepairSlip={handleCreateRepairSlip}
            existingRepairSlips={repairSlips}
          />
        </TabsContent>

        <TabsContent value="repairs" className="mt-6">
          <RepairSlipList
            repairSlips={repairSlips}
            searchQuery={searchQuery}
            onView={handleViewRepairSlip}
            onUpdateStatus={handleUpdateRepairStatus}
            onGenerateDamageInvoice={handleGenerateDamageInvoice}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <DamageInvoiceList
            invoices={damageInvoices}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="adjustments" className="mt-6">
          <InventoryAdjustmentLog
            adjustments={adjustments}
            searchQuery={searchQuery}
            onViewReference={handleViewReference}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}