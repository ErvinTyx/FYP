import { useState, useEffect } from 'react';
import { ClipboardCheck, Wrench, FileText, Plus, Filter, Search, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { toast } from 'sonner';

type ViewMode = 'list' | 'create-report' | 'view-repair' | 'create-repair' | 'print-repair' | 'maintenance';
type SourceFilter = 'all' | 'from-return' | 'manual';

// Interface for return request items
interface ReturnRequestItemData {
  id: string;
  name: string;
  scaffoldingItemId?: string;
  quantity: number;
  quantityReturned: number;
}

export function InspectionMaintenanceModule() {
  const [activeTab, setActiveTab] = useState('reports');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all'); // Added: Filter reports by source
  const [selectedReport, setSelectedReport] = useState<ConditionReport | null>(null);
  const [selectedRepairSlip, setSelectedRepairSlip] = useState<OpenRepairSlip | null>(null);
  
  // State for return request data when creating report from return
  const [selectedReturnRequestItems, setSelectedReturnRequestItems] = useState<ReturnRequestItemData[] | undefined>(undefined);
  const [selectedReturnRequestId, setSelectedReturnRequestId] = useState<string | undefined>(undefined);
  const [selectedReturnCustomerName, setSelectedReturnCustomerName] = useState<string | undefined>(undefined);
  const [selectedReturnAgreementNo, setSelectedReturnAgreementNo] = useState<string | undefined>(undefined);

  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [repairSlips, setRepairSlips] = useState<OpenRepairSlip[]>([]);
  const [damageInvoices, setDamageInvoices] = useState<DamageInvoice[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);

  // Load data from API and localStorage
  useEffect(() => {
    const fetchConditionReports = async () => {
      try {
        const response = await fetch('/api/inspection/condition-reports', {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setConditionReports(result.data);
            localStorage.setItem('conditionReports', JSON.stringify(result.data));
          }
        } else {
          // Fallback to localStorage if API fails
          const savedReports = localStorage.getItem('conditionReports');
          if (savedReports) setConditionReports(JSON.parse(savedReports));
        }
      } catch (error) {
        console.error('Error fetching condition reports:', error);
        // Fallback to localStorage
        const savedReports = localStorage.getItem('conditionReports');
        if (savedReports) setConditionReports(JSON.parse(savedReports));
      }
    };

    const fetchRepairSlips = async () => {
      try {
        const response = await fetch('/api/inspection/open-repair-slips', {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setRepairSlips(result.data);
            localStorage.setItem('repairSlips', JSON.stringify(result.data));
            return;
          }
        }

        const savedSlips = localStorage.getItem('repairSlips');
        if (savedSlips) setRepairSlips(JSON.parse(savedSlips));
      } catch (error) {
        console.error('Error fetching repair slips:', error);
        const savedSlips = localStorage.getItem('repairSlips');
        if (savedSlips) setRepairSlips(JSON.parse(savedSlips));
      }
    };

    fetchConditionReports();
    fetchRepairSlips();

    // Load damage invoices from API
    const fetchDamageInvoices = async () => {
      try {
        const response = await fetch('/api/inspection/damage-invoices', { credentials: 'include' });
        console.log('Damage invoices API response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Damage invoices API response:', result);
          
          if (result.success && result.data) {
            console.log('Setting damage invoices:', result.data);
            setDamageInvoices(result.data);
            localStorage.setItem('damageInvoices', JSON.stringify(result.data));
          } else {
            console.log('API response unsuccessful or no data:', result);
          }
        } else {
          console.log('API response not ok:', response.status);
        }
      } catch (error) {
        console.error('Error fetching damage invoices:', error);
        // Fallback to localStorage
        const savedInvoices = localStorage.getItem('damageInvoices');
        if (savedInvoices) {
          console.log('Using localStorage fallback:', JSON.parse(savedInvoices));
          setDamageInvoices(JSON.parse(savedInvoices));
        }
      }
    };

    // Load other data from localStorage
    const savedAdjustments = localStorage.getItem('inventoryAdjustments');
    if (savedAdjustments) setAdjustments(JSON.parse(savedAdjustments));

    // Fetch damage invoices
    fetchDamageInvoices();
  }, []);

  const handleCreateReport = () => {
    setSelectedReport(null);
    // Clear return request data for manual creation
    setSelectedReturnRequestItems(undefined);
    setSelectedReturnRequestId(undefined);
    setSelectedReturnCustomerName(undefined);
    setSelectedReturnAgreementNo(undefined);
    setViewMode('create-report');
  };

  // Create condition report from return request with auto-populated items
  const handleCreateReportFromReturn = (
    returnRequestId: string,
    customerName: string,
    agreementNo: string,
    items: ReturnRequestItemData[]
  ) => {
    setSelectedReport(null);
    setSelectedReturnRequestId(returnRequestId);
    setSelectedReturnCustomerName(customerName);
    setSelectedReturnAgreementNo(agreementNo);
    setSelectedReturnRequestItems(items);
    setViewMode('create-report');
  };

  const handleSaveReport = async (report: ConditionReport) => {
    try {
      // Prepare data for API
      const reportData = {
        deliveryOrderNumber: report.deliveryOrderNumber,
        customerName: report.customerName,
        returnedBy: report.returnedBy,
        returnDate: report.returnDate,
        inspectionDate: report.inspectionDate,
        inspectedBy: report.inspectedBy,
        status: report.status,
        items: report.items.map(item => ({
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantity,
          quantityGood: item.quantityGood,
          quantityRepair: item.quantityRepair,
          quantityWriteOff: item.quantityWriteOff,
          condition: item.condition,
          damageDescription: item.damageDescription,
          repairRequired: item.repairRequired,
          estimatedRepairCost: item.estimatedRepairCost,
          originalItemPrice: item.originalItemPrice,
          inspectionChecklist: item.inspectionChecklist,
          images: item.images
        })),
        notes: report.notes
      };

      console.log('Sending to API:', reportData);

      // Determine if this is an update or create
      const isUpdate = !!selectedReport;
      const url = isUpdate 
        ? `/api/inspection/condition-reports/${report.id}`
        : '/api/inspection/condition-reports';
      const method = isUpdate ? 'PUT' : 'POST';

      // Make API call
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save condition report');
      }

      // Update local state with the saved report
      let updatedReports: ConditionReport[];
      if (isUpdate) {
        // For updates, merge the response data with the report
        const updatedReport = { ...report, ...result.data };
        updatedReports = conditionReports.map(r => r.id === report.id ? updatedReport : r);
      } else {
        updatedReports = [...conditionReports, result.data];
      }
      
      setConditionReports(updatedReports);
      localStorage.setItem('conditionReports', JSON.stringify(updatedReports));
      
      // Create inventory adjustments for write-off items (log only, no inventory update)
      const writeOffItems = report.items.filter(item => item.quantityWriteOff > 0);
      if (writeOffItems.length > 0) {
        const newAdjustments: InventoryAdjustment[] = writeOffItems.map(item => ({
          id: `adj-writeoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          adjustmentType: 'scrapped' as const,
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantityWriteOff,
          fromStatus: 'returned',
          toStatus: 'written-off',
          referenceId: result.data.rcfNumber || report.rcfNumber,
          referenceType: 'condition-report' as const,
          adjustedBy: report.inspectedBy || 'System',
          adjustedAt: new Date().toISOString(),
          notes: `Write-off from inspection: ${item.damageDescription || 'Beyond repair - requires replacement'}`,
        }));

        // Add to local state
        const updatedAdjustments = [...adjustments, ...newAdjustments];
        setAdjustments(updatedAdjustments);
        localStorage.setItem('inventoryAdjustments', JSON.stringify(updatedAdjustments));
        
        // Show toast about write-off logging
        toast.info(`${writeOffItems.length} item(s) logged for write-off review`, {
          description: 'Check Inventory Log for details. Manual inventory update required.',
          duration: 5000,
        });
      }
      
      setViewMode('list');
      toast.success(isUpdate ? 'Condition report updated successfully' : 'Condition report created successfully');
    } catch (error) {
      console.error('Error saving condition report:', error);
      toast.error(`Failed to save condition report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelReport = () => {
    setViewMode('list');
    setSelectedReport(null);
    // Clear return request data
    setSelectedReturnRequestItems(undefined);
    setSelectedReturnRequestId(undefined);
    setSelectedReturnCustomerName(undefined);
    setSelectedReturnAgreementNo(undefined);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this condition report?')) {
      return;
    }

    try {
      // Try to delete from database first
      const response = await fetch(`/api/inspection/condition-reports/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        // If not found in database, it might only exist in localStorage - still allow deletion
        if (result.message !== 'Condition report not found') {
          throw new Error(result.message || 'Failed to delete condition report');
        }
      }

      // Remove from local state and localStorage regardless
      const updatedReports = conditionReports.filter(r => r.id !== reportId);
      setConditionReports(updatedReports);
      localStorage.setItem('conditionReports', JSON.stringify(updatedReports));
      toast.success('Condition report deleted successfully');
    } catch (error) {
      console.error('Error deleting condition report:', error);
      toast.error(`Failed to delete condition report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    setSelectedRepairSlip(null);
    setViewMode('create-repair');
  };

  const handleSaveRepairSlip = async (slip: OpenRepairSlip) => {
    try {
      const isUpdate = !!selectedRepairSlip;
      const url = isUpdate
        ? `/api/inspection/open-repair-slips/${slip.id}`
        : '/api/inspection/open-repair-slips';
      const method = isUpdate ? 'PUT' : 'POST';

      // Prepare API payload (let backend generate ORP number on create)
      const payload: any = {
        conditionReportId: slip.conditionReportId,
        rcfNumber: slip.rcfNumber,
        status: slip.status,
        priority: slip.priority,
        assignedTo: slip.assignedTo,
        startDate: slip.startDate,
        completionDate: slip.completionDate,
        estimatedCost: slip.estimatedCost,
        actualCost: slip.actualCost,
        repairNotes: slip.repairNotes,
        createdBy: slip.createdBy,
        invoiceNumber: slip.invoiceNumber,
        damageInvoiceId: slip.damageInvoiceId,
        inventoryLevel: slip.inventoryLevel,
        items: slip.items?.map((item: any) => ({
          inspectionItemId: item.inspectionItemId || null,
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantity,
          quantityRepair: item.quantityRepair || 0,
          quantityWriteOff: item.quantityWriteOff || 0,
          quantityRepaired: item.quantityRepaired,
          quantityRemaining: item.quantityRemaining,
          damageType: item.damageType,
          damageDescription: item.damageDescription,
          repairActions: item.repairActions,
          repairActionEntries: item.repairActionEntries || [],
          repairDescription: item.repairDescription,
          repairStatus: item.repairStatus,
          writeOffCostPerUnit: item.writeOffCostPerUnit || 0,
          writeOffTotalCost: item.writeOffTotalCost || 0,
          totalRepairCost: item.totalRepairCost || 0,
          costPerUnit: item.costPerUnit,
          totalCost: item.totalCost,
          estimatedCostFromRFQ: item.estimatedCostFromRFQ,
          finalCost: item.finalCost,
          beforeImages: item.beforeImages,
          afterImages: item.afterImages,
          completedDate: item.completedDate,
        })) || [],
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save repair slip');
      }

      const savedSlip: OpenRepairSlip = result.data;

      const updatedSlips = isUpdate
        ? repairSlips.map(s => s.id === savedSlip.id ? savedSlip : s)
        : [...repairSlips, savedSlip];

      setRepairSlips(updatedSlips);
      localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));

      setSelectedRepairSlip(savedSlip);
      setActiveTab('repairs');
      setViewMode('view-repair');
      toast.success(isUpdate ? 'Repair slip updated successfully' : 'Repair slip created successfully');
    } catch (error) {
      console.error('Error saving repair slip:', error);
      toast.error(`Failed to save repair slip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateRepairStatus = async (slipId: string, status: OpenRepairSlip['status']) => {
    try {
      const completionDate = status === 'completed' ? new Date().toISOString() : null;

      const response = await fetch(`/api/inspection/open-repair-slips/${slipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, completionDate }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update repair slip status');
      }

      const updatedSlip: OpenRepairSlip = result.data;
      const updatedSlips = repairSlips.map(slip => slip.id === slipId ? updatedSlip : slip);
      setRepairSlips(updatedSlips);
      localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));

      if (selectedRepairSlip?.id === slipId) {
        setSelectedRepairSlip(updatedSlip);
      }

      if (status === 'completed') {
        const newAdjustments: InventoryAdjustment[] = (updatedSlip.items || [])
          .filter(item => item.repairStatus === 'completed')
          .map(item => ({
            id: `adj-${Date.now()}-${Math.random()}`,
            adjustmentType: 'repair-completed' as const,
            scaffoldingItemId: item.scaffoldingItemId,
            scaffoldingItemName: item.scaffoldingItemName,
            quantity: item.quantity,
            fromStatus: 'under-repair',
            toStatus: 'available',
            referenceId: updatedSlip.orpNumber,
            referenceType: 'repair-slip' as const,
            adjustedBy: 'System',
            adjustedAt: new Date().toISOString(),
            notes: 'Repair completed and items returned to inventory',
          }));

        if (newAdjustments.length > 0) {
          const updatedAdjustments = [...adjustments, ...newAdjustments];
          setAdjustments(updatedAdjustments);
          localStorage.setItem('inventoryAdjustments', JSON.stringify(updatedAdjustments));
        }
      }
    } catch (error) {
      console.error('Error updating repair slip status:', error);
      toast.error(`Failed to update repair status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateRepairSlip = async (updatedSlip: OpenRepairSlip) => {
    try {
      const payload: any = {
        status: updatedSlip.status,
        priority: updatedSlip.priority,
        assignedTo: updatedSlip.assignedTo,
        startDate: updatedSlip.startDate,
        completionDate: updatedSlip.completionDate,
        estimatedCost: updatedSlip.estimatedCost,
        actualCost: updatedSlip.actualCost,
        repairNotes: updatedSlip.repairNotes,
        invoiceNumber: updatedSlip.invoiceNumber,
        damageInvoiceId: updatedSlip.damageInvoiceId,
        inventoryLevel: updatedSlip.inventoryLevel,
        items: (updatedSlip.items || []).map((item: any) => ({
          inspectionItemId: item.inspectionItemId || null,
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantity,
          quantityRepair: item.quantityRepair || 0,
          quantityWriteOff: item.quantityWriteOff || 0,
          quantityRepaired: item.quantityRepaired,
          quantityRemaining: item.quantityRemaining,
          damageType: item.damageType,
          damageDescription: item.damageDescription,
          repairActions: item.repairActions,
          repairActionEntries: item.repairActionEntries || [],
          repairDescription: item.repairDescription,
          repairStatus: item.repairStatus,
          writeOffCostPerUnit: item.writeOffCostPerUnit || 0,
          writeOffTotalCost: item.writeOffTotalCost || 0,
          totalRepairCost: item.totalRepairCost || 0,
          costPerUnit: item.costPerUnit,
          totalCost: item.totalCost,
          estimatedCostFromRFQ: item.estimatedCostFromRFQ,
          finalCost: item.finalCost,
          beforeImages: item.beforeImages,
          afterImages: item.afterImages,
          completedDate: item.completedDate,
        })),
      };

      const response = await fetch(`/api/inspection/open-repair-slips/${updatedSlip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update repair slip');
      }

      const savedSlip: OpenRepairSlip = result.data;
      const updatedSlips = repairSlips.map(s => s.id === savedSlip.id ? savedSlip : s);
      setRepairSlips(updatedSlips);
      localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));

      if (selectedRepairSlip?.id === savedSlip.id) {
        setSelectedRepairSlip(savedSlip);
      }
    } catch (error) {
      console.error('Error updating repair slip:', error);
      const updatedSlips = repairSlips.map(s => s.id === updatedSlip.id ? updatedSlip : s);
      setRepairSlips(updatedSlips);
      localStorage.setItem('repairSlips', JSON.stringify(updatedSlips));
      toast.error(`Failed to update repair slip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  const handleGenerateDamageInvoice = async (repairSlipId: string) => {
    const slip = repairSlips.find(s => s.id === repairSlipId);
    if (!slip) {
      toast.error('Repair slip not found');
      return;
    }

    // Generate invoice from repair slip with detailed breakdown
    const invoiceItems: { id: string; description: string; quantity: number; unitPrice: number; total: number }[] = [];
    
    slip.items.forEach(item => {
      // Add repair action entries with detailed breakdown
      if (item.repairActionEntries && item.repairActionEntries.length > 0) {
        item.repairActionEntries.forEach(entry => {
          if (entry.totalCost > 0) {
            invoiceItems.push({
              id: `inv-item-${Date.now()}-${Math.random()}`,
              description: `${item.scaffoldingItemName} - ${entry.action} (${entry.affectedItems} items × ${entry.issueQuantity} issues)`,
              quantity: entry.issueQuantity,
              unitPrice: entry.costPerUnit,
              total: entry.totalCost
            });
          }
        });
      }
      
      // Add write-off cost as separate line item
      if (item.writeOffTotalCost > 0 && item.quantityWriteOff > 0) {
        invoiceItems.push({
          id: `inv-item-${Date.now()}-${Math.random()}`,
          description: `${item.scaffoldingItemName} - Write-off (${item.quantityWriteOff} items @ RM ${Number(item.writeOffCostPerUnit || 0).toFixed(2)}/item)`,
          quantity: item.quantityWriteOff,
          unitPrice: item.writeOffCostPerUnit,
          total: item.writeOffTotalCost
        });
      }
      
      // Fallback for legacy items without detailed entries
      if ((!item.repairActionEntries || item.repairActionEntries.length === 0) && item.writeOffTotalCost <= 0 && item.totalCost > 0) {
        invoiceItems.push({
          id: `inv-item-${Date.now()}-${Math.random()}`,
          description: `${item.scaffoldingItemName} - ${item.damageDescription || 'Damage repair'}`,
          quantity: item.quantity,
          unitPrice: item.quantity > 0 ? item.totalCost / item.quantity : item.totalCost,
          total: item.totalCost
        });
      }
    });

    // Check if there are items with cost
    if (invoiceItems.length === 0) {
      toast.error('No items with repair costs found in this repair slip. Please ensure items have cost values.');
      return;
    }

    try {
      // First, create additional charge (original functionality)
      const chargeResponse = await fetch('/api/additional-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ openRepairSlipId: slip.id }),
      });

      if (!chargeResponse.ok) {
        const chargeResult = await chargeResponse.json().catch(() => ({}));
        throw new Error(chargeResult.message || 'Failed to create additional charge');
      }

      const chargeResult = await chargeResponse.json();
      const newCharge = chargeResult.data;

      // Refetch repair slips so additionalCharge is included and "Generate Invoice" is hidden
      const listRes = await fetch('/api/inspection/open-repair-slips', { credentials: 'include' });
      if (listRes.ok) {
        const listResult = await listRes.json();
        if (listResult.success && listResult.data) {
          setRepairSlips(listResult.data);
          localStorage.setItem('repairSlips', JSON.stringify(listResult.data));
          if (selectedRepairSlip?.id === repairSlipId) {
            const updated = listResult.data.find((s: OpenRepairSlip) => s.id === repairSlipId);
            if (updated) setSelectedRepairSlip(updated);
          }
        }
      }

      // Second, create damage invoice
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.06; // 6% tax
      const total = subtotal + tax;

      console.log('Creating damage invoice with data:', {
        orpNumber: slip.orpNumber,
        invoiceItems: invoiceItems,
        subtotal,
        tax,
        total
      });

      const invoiceResponse = await fetch('/api/inspection/damage-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orpNumber: slip.orpNumber,
          invoiceDate: new Date().toISOString().split('T')[0],
          vendor: 'Power Metal & Steel - Repair Services',
          items: invoiceItems,
          subtotal,
          tax,
          total,
          paymentStatus: 'pending',
          notes: `Generated from repair slip ${slip.orpNumber}`,
          createdFrom: 'repair-slip'
        }),
      });

      console.log('Damage invoice creation response status:', invoiceResponse.status);

      if (!invoiceResponse.ok) {
        const invoiceResult = await invoiceResponse.json().catch(() => ({}));
        console.error('Failed to create damage invoice:', invoiceResult);
        // Don't throw error - additional charge was still created
      } else {
        const invoiceResult = await invoiceResponse.json();
        console.log('Damage invoice creation response:', invoiceResult);
        const newInvoice = invoiceResult.data;

        // Add to local state
        setDamageInvoices(prev => {
          const updated = [newInvoice, ...prev];
          console.log('Updated damage invoices state:', updated);
          localStorage.setItem('damageInvoices', JSON.stringify(updated));
          return updated;
        });
      }

      toast.success(`Additional charge ${newCharge.invoiceNo} created. Due in 7 days. View in Additional Charges.`);
      setActiveTab('invoices');
    } catch (error) {
      console.error('Error creating documents:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create documents');
    }
  };

  // Calculate statistics
  const stats = {
    totalReports: conditionReports.length,
    pendingReports: conditionReports.filter(r => r.status === 'pending').length,
    fromReturns: conditionReports.filter(r => r.isFromReturn || r.returnRequestId).length, // Added: Count reports from returns
    openRepairs: repairSlips.filter(s => s.status === 'open' || s.status === 'in-repair').length,
    completedRepairs: repairSlips.filter(s => s.status === 'completed').length,
    totalRepairCost: repairSlips.reduce((sum, s) => sum + s.actualCost, 0),
    // Total remaining items to repair from all open/in-repair slips
    itemsUnderRepair: repairSlips
      .filter(s => s.status === 'open' || s.status === 'in-repair')
      .reduce((total, slip) => {
        return total + (slip.items || []).reduce((itemTotal, item) => {
          // Use quantityRemaining if available, otherwise use quantity
          const remaining = item.quantityRemaining !== undefined ? item.quantityRemaining : item.quantity;
          return itemTotal + remaining;
        }, 0);
      }, 0)
  };

  if (viewMode === 'create-report') {
    return (
      <ConditionReportForm
        report={selectedReport}
        onSave={handleSaveReport}
        onCancel={handleCancelReport}
        returnRequestItems={selectedReturnRequestItems}
        returnRequestId={selectedReturnRequestId}
        customerName={selectedReturnCustomerName}
        agreementNo={selectedReturnAgreementNo}
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
              <div className="text-[#231F20]">RM {Number(stats.totalRepairCost || 0).toFixed(2)}</div>
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search by RCF number, DO number, or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Source Filter - only show on Condition Reports tab */}
            {activeTab === 'reports' && (
              <div className="w-full md:w-48">
                <Select value={sourceFilter} onValueChange={(value: SourceFilter) => setSourceFilter(value)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="size-4 text-gray-400" />
                      <SelectValue placeholder="Filter by source" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="from-return">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="size-3" />
                        From Returns
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
            sourceFilter={sourceFilter}
            onEdit={(report) => {
              setSelectedReport(report);
              setViewMode('create-report');
            }}
            onDelete={handleDeleteReport}
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