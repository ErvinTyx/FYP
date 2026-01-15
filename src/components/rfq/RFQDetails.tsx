import { ArrowLeft, Edit, FileText, User, Calendar, MapPin, Phone, Mail, Download, CheckCircle, XCircle, FileCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RFQ } from '../../types/rfq';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';

interface RFQDetailsProps {
  rfq: RFQ;
  onEdit: () => void;
  onBack: () => void;
  onStatusChange?: (newStatus: RFQ['status']) => void;
}

export function RFQDetails({ rfq, onEdit, onBack, onStatusChange }: RFQDetailsProps) {
  const getStatusColor = (status: RFQ['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      quoted: 'bg-purple-100 text-purple-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800'
    };
    return colors[status];
  };

  const handleDownloadRFQ = () => {
    // Same HTML generation logic as in RFQManagement
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

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rfq.rfqNumber}_${rfq.customerName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('RFQ document downloaded successfully');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[#231F20]">{rfq.rfqNumber}</h1>
              <Badge className={getStatusColor(rfq.status)}>
                {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-600">{rfq.projectName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleDownloadRFQ}
            className="text-[#F15929] hover:text-[#d94d1f] hover:bg-[#FFF5F2]"
          >
            <Download className="size-4 mr-2" />
            Download
          </Button>
          {onStatusChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {rfq.status !== 'quoted' && (
                  <DropdownMenuItem onClick={() => onStatusChange('quoted')}>
                    <FileCheck className="size-4 mr-2 text-purple-600" />
                    Mark as Quoted
                  </DropdownMenuItem>
                )}
                {rfq.status !== 'approved' && (
                  <DropdownMenuItem onClick={() => onStatusChange('approved')}>
                    <CheckCircle className="size-4 mr-2 text-green-600" />
                    Mark as Approved
                  </DropdownMenuItem>
                )}
                {rfq.status !== 'rejected' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onStatusChange('rejected')}
                      className="text-red-600 focus:text-red-600"
                    >
                      <XCircle className="size-4 mr-2" />
                      Reject RFQ
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={onEdit} className="bg-[#F15929] hover:bg-[#d94d1f]">
            <Edit className="size-4 mr-2" />
            Edit RFQ
          </Button>
        </div>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <User className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Customer Name</p>
                <p className="text-[#231F20]">{rfq.customerName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-[#231F20]">{rfq.customerEmail}</p>
              </div>
            </div>
            {rfq.customerPhone && (
              <div className="flex items-start gap-3">
                <Phone className="size-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-[#231F20]">{rfq.customerPhone}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <FileText className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Project Name</p>
                <p className="text-[#231F20]">{rfq.projectName}</p>
              </div>
            </div>
            {rfq.projectLocation && (
              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-[#231F20]">{rfq.projectLocation}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Requested Date</p>
                <p className="text-[#231F20]">
                  {new Date(rfq.requestedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="size-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Required Date</p>
                <p className="text-[#231F20]">
                  {new Date(rfq.requiredDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          {rfq.notes && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 mb-2">Notes</p>
              <p className="text-[#231F20]">{rfq.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Scaffolding Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Unit Price (RM)</TableHead>
                  <TableHead className="text-right">Total Price (RM)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[#231F20]">{item.scaffoldingItemName}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unit}</TableCell>
                    <TableCell className="text-right">
                      {item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalPrice.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="text-right">
                    <span className="text-[#231F20]">Total Amount:</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[#231F20]">
                      RM {rfq.totalAmount.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Created By</p>
              <p className="text-[#231F20]">{rfq.createdBy}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="text-[#231F20]">
                {new Date(rfq.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-[#231F20]">
                {new Date(rfq.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
