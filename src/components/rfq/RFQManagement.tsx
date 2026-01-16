import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileText, Calendar, User, CheckCircle, XCircle, FileCheck, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RFQForm } from './RFQForm';
import { RFQDetails } from './RFQDetails';
import { RFQ } from '../../types/rfq';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function RFQManagement() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rfqToReject, setRfqToReject] = useState<string | null>(null);

  // Load RFQs from localStorage
  useEffect(() => {
    const savedRfqs = localStorage.getItem('rfqs');
    if (savedRfqs) {
      setRfqs(JSON.parse(savedRfqs));
    }
  }, []);

  // Save RFQs to localStorage
  const saveRfqs = (updatedRfqs: RFQ[]) => {
    setRfqs(updatedRfqs);
    localStorage.setItem('rfqs', JSON.stringify(updatedRfqs));
  };

  const handleCreateNew = () => {
    setSelectedRFQ(null);
    setViewMode('form');
  };

  const handleEdit = (rfq: RFQ) => {
    setSelectedRFQ(rfq);
    setViewMode('form');
  };

  const handleView = (rfq: RFQ) => {
    setSelectedRFQ(rfq);
    setViewMode('details');
  };

  const handleReject = (id: string) => {
    setRfqToReject(id);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (rfqToReject) {
      const updatedRfqs = rfqs.map(rfq => 
        rfq.id === rfqToReject ? { ...rfq, status: 'rejected' as const } : rfq
      );
      saveRfqs(updatedRfqs);
      setRejectDialogOpen(false);
      setRfqToReject(null);
      toast.success('RFQ has been rejected');
    }
  };

  const handleStatusChange = (id: string, newStatus: RFQ['status']) => {
    const updatedRfqs = rfqs.map(rfq => 
      rfq.id === id ? { ...rfq, status: newStatus, updatedAt: new Date().toISOString() } : rfq
    );
    saveRfqs(updatedRfqs);
    toast.success(`RFQ status updated to ${newStatus}`);
  };

  const handleDownloadRFQ = (rfq: RFQ) => {
    // Create a temporary container for the print content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to download RFQ');
      return;
    }

    // Generate HTML content for the RFQ
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RFQ ${rfq.rfqNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #231F20;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #F15929;
      padding-bottom: 20px;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #231F20;
      margin-bottom: 5px;
    }
    .doc-title {
      font-size: 20px;
      color: #F15929;
      margin: 10px 0;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #231F20;
      background-color: #F9FAFB;
      padding: 10px;
      border-left: 4px solid #F15929;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 10px;
    }
    .info-label {
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 14px;
      color: #231F20;
      font-weight: 500;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #F9FAFB;
      color: #231F20;
      font-weight: bold;
      padding: 12px;
      text-align: left;
      border: 1px solid #E5E7EB;
    }
    td {
      padding: 12px;
      border: 1px solid #E5E7EB;
    }
    .text-right {
      text-align: right;
    }
    .total-row {
      background-color: #F9FAFB;
      font-weight: bold;
    }
    .total-amount {
      color: #F15929;
      font-size: 18px;
    }
    .signature-section {
      margin-top: 60px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 40px;
    }
    .signature-box {
      border-top: 2px solid #231F20;
      padding-top: 10px;
      margin-top: 60px;
    }
    .signature-label {
      font-size: 12px;
      color: #6B7280;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
    }
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Power Metal & Steel</div>
    <div class="doc-title">REQUEST FOR QUOTATION</div>
    <div style="font-size: 16px; margin-top: 10px;">${rfq.rfqNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Customer Name</div>
        <div class="info-value">${rfq.customerName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${rfq.customerEmail}</div>
      </div>
      ${rfq.customerPhone ? `
      <div class="info-item">
        <div class="info-label">Phone</div>
        <div class="info-value">${rfq.customerPhone}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Project Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Project Name</div>
        <div class="info-value">${rfq.projectName}</div>
      </div>
      ${rfq.projectLocation ? `
      <div class="info-item">
        <div class="info-label">Location</div>
        <div class="info-value">${rfq.projectLocation}</div>
      </div>
      ` : ''}
      <div class="info-item">
        <div class="info-label">Requested Date</div>
        <div class="info-value">${new Date(rfq.requestedDate).toLocaleDateString()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Required Date</div>
        <div class="info-value">${new Date(rfq.requiredDate).toLocaleDateString()}</div>
      </div>
    </div>
    ${rfq.notes ? `
    <div class="info-item" style="margin-top: 10px;">
      <div class="info-label">Notes</div>
      <div class="info-value">${rfq.notes}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Scaffolding Items</div>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th>Item Description</th>
          <th class="text-right" style="width: 100px;">Quantity</th>
          <th class="text-right" style="width: 100px;">Unit</th>
          <th class="text-right" style="width: 120px;">Unit Price (RM)</th>
          <th class="text-right" style="width: 120px;">Total (RM)</th>
        </tr>
      </thead>
      <tbody>
        ${rfq.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.scaffoldingItemName}${item.notes ? `<br><span style="font-size: 12px; color: #6B7280;">${item.notes}</span>` : ''}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unit}</td>
          <td class="text-right">${item.unitPrice.toFixed(2)}</td>
          <td class="text-right">${item.totalPrice.toFixed(2)}</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="5" class="text-right">Total Amount:</td>
          <td class="text-right total-amount">RM ${rfq.totalAmount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="signature-section">
    <div>
      <div class="signature-label">Prepared By</div>
      <div class="signature-box">
        <div>${rfq.createdBy}</div>
        <div style="font-size: 11px; color: #6B7280; margin-top: 5px;">
          Date: ${new Date(rfq.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
    <div>
      <div class="signature-label">Customer Acceptance</div>
      <div class="signature-box">
        <div>Signature: ___________________</div>
        <div style="font-size: 11px; color: #6B7280; margin-top: 5px;">
          Date: ___________________
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer-generated document. No signature is required for validity.</p>
    <p>Power Metal & Steel | Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      printWindow.print();
    };
    
    toast.success('Print dialog opened - You can save as PDF from the print dialog');
  };

  const handleSave = (rfq: RFQ) => {
    if (selectedRFQ) {
      // Update existing
      const updatedRfqs = rfqs.map(r => r.id === rfq.id ? rfq : r);
      saveRfqs(updatedRfqs);
    } else {
      // Create new
      saveRfqs([...rfqs, rfq]);
    }
    setViewMode('list');
    setSelectedRFQ(null);
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedRFQ(null);
  };

  const filteredRfqs = rfqs.filter(rfq => {
    const matchesSearch = 
      rfq.rfqNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: RFQ['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      'quoted-for-item': 'bg-purple-100 text-purple-800',
      'quoted-for-delivery': 'bg-indigo-100 text-indigo-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: RFQ['status']) => {
    const labels = {
      draft: 'Draft',
      'quoted-for-item': 'Quoted for Item',
      'quoted-for-delivery': 'Quoted for Delivery',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
      expired: 'Expired'
    };
    return labels[status] || status;
  };

  const stats = {
    total: rfqs.length,
    draft: rfqs.filter(r => r.status === 'draft').length,
    'quoted-for-item': rfqs.filter(r => r.status === 'quoted-for-item').length,
    'quoted-for-delivery': rfqs.filter(r => r.status === 'quoted-for-delivery').length,
    submitted: rfqs.filter(r => r.status === 'submitted').length,
    approved: rfqs.filter(r => r.status === 'approved').length
  };

  if (viewMode === 'form') {
    return (
      <RFQForm
        rfq={selectedRFQ}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (viewMode === 'details' && selectedRFQ) {
    return (
      <RFQDetails
        rfq={selectedRFQ}
        onEdit={() => setViewMode('form')}
        onBack={handleCancel}
        onStatusChange={(newStatus) => {
          handleStatusChange(selectedRFQ.id, newStatus);
          setSelectedRFQ({ ...selectedRFQ, status: newStatus });
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[#231F20]">Request for Quotation (RFQ)</h1>
          <p className="text-gray-600">Manage scaffolding quotation requests</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-[#F15929] hover:bg-[#d94d1f]">
          <Plus className="size-4 mr-2" />
          New RFQ
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total RFQs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Quoted for Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats['quoted-for-item']}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Quoted for Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats['quoted-for-delivery']}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[#231F20]">{stats.approved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search by RFQ number, customer, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="quoted-for-item">Quoted for Item</SelectItem>
                <SelectItem value="quoted-for-delivery">Quoted for Delivery</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RFQ List */}
      <div className="space-y-4">
        {filteredRfqs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No RFQs found</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Create your first RFQ to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRfqs.map(rfq => (
            <Card key={rfq.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-[#231F20]">{rfq.rfqNumber}</h3>
                          <Badge className={getStatusColor(rfq.status)}>
                            {getStatusLabel(rfq.status)}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mt-1">{rfq.projectName}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-gray-400" />
                        <div>
                          <p className="text-gray-500">Customer</p>
                          <p className="text-[#231F20]">{rfq.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-gray-400" />
                        <div>
                          <p className="text-gray-500">Required Date</p>
                          <p className="text-[#231F20]">{new Date(rfq.requiredDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-gray-400" />
                        <div>
                          <p className="text-gray-500">Items</p>
                          <p className="text-[#231F20]">{rfq.items.length} items</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex lg:flex-col items-center lg:items-end gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-[#231F20]">RM {rfq.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(rfq)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rfq)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadRFQ(rfq)}
                        className="text-[#F15929] hover:text-[#d94d1f] hover:bg-[#FFF5F2]"
                      >
                        <Download className="size-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rfq.status !== 'quoted-for-item' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(rfq.id, 'quoted-for-item')}>
                              <FileCheck className="size-4 mr-2 text-purple-600" />
                              Mark as Quoted for Item
                            </DropdownMenuItem>
                          )}
                          {rfq.status !== 'quoted-for-delivery' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(rfq.id, 'quoted-for-delivery')}>
                              <FileCheck className="size-4 mr-2 text-indigo-600" />
                              Mark as Quoted for Delivery
                            </DropdownMenuItem>
                          )}
                          {rfq.status !== 'approved' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(rfq.id, 'approved')}>
                              <CheckCircle className="size-4 mr-2 text-green-600" />
                              Mark as Approved
                            </DropdownMenuItem>
                          )}
                          {rfq.status !== 'rejected' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleReject(rfq.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <XCircle className="size-4 mr-2" />
                                Reject RFQ
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject RFQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this RFQ? The status will be changed to "Rejected" and can be reviewed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject RFQ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}