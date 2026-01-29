import { Printer, X, FileText, AlertCircle, CheckCircle2, PackageX, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export type ItemConditionStatus = 'Good' | 'Damaged' | 'Replace';

export interface StatusBreakdown {
  Good: number;
  Damaged: number;
  Replace: number;
}

export interface ReturnItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  quantityReturned: number;
  status: ItemConditionStatus;
  statusBreakdown?: StatusBreakdown;
  notes?: string;
}

interface ReturnPhoto {
  url: string;
  uploadedAt: string;
  description: string;
  uploadedBy?: string;
}

interface RCFViewerProps {
  rcfNumber: string;
  grnNumber?: string;
  returnData: {
    orderId: string;
    customer: string;
    items: ReturnItem[];
    productionNotes?: string;
    hasExternalGoods?: boolean;
    externalGoodsNotes?: string;
    damagePhotos?: ReturnPhoto[];
  };
  onClose: () => void;
}

const statusConfig: Record<ReturnItem['status'], { color: string; bgColor: string; printColor: string; icon: React.ElementType }> = {
  'Good': { color: 'text-green-800', bgColor: 'bg-green-100', printColor: '#166534', icon: CheckCircle2 },
  'Damaged': { color: 'text-red-800', bgColor: 'bg-red-100', printColor: '#991b1b', icon: AlertCircle },
  'Replace': { color: 'text-amber-800', bgColor: 'bg-amber-100', printColor: '#92400e', icon: PackageX },
};

export function RCFViewer({ rcfNumber, grnNumber, returnData, onClose }: RCFViewerProps) {
  // Calculate summary statistics from statusBreakdown or fallback to status
  const statusCounts = returnData.items.reduce((acc, item) => {
    if (item.statusBreakdown) {
      // Use detailed breakdown
      Object.entries(item.statusBreakdown).forEach(([status, qty]) => {
        if (qty > 0) {
          acc[status] = (acc[status] || 0) + qty;
        }
      });
    } else {
      // Fallback to single status
      acc[item.status] = (acc[item.status] || 0) + item.quantityReturned;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalItems = returnData.items.reduce((sum, item) => sum + item.quantityReturned, 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const inspectionDate = new Date().toLocaleDateString('en-MY');

    const getStatusStyle = (status: ReturnItem['status']) => {
      const colors: Record<string, { bg: string; text: string }> = {
        'Good': { bg: '#dcfce7', text: '#166534' },
        'Damaged': { bg: '#fee2e2', text: '#991b1b' },
        'Replace': { bg: '#fef3c7', text: '#92400e' },
      };
      return colors[status] || { bg: '#f3f4f6', text: '#374151' };
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Return Condition Form - ${rcfNumber}</title>
        <style>
          @media print {
            @page { margin: 15mm; size: A4; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
            color: #231F20;
            font-size: 12px;
          }
          .header {
            border-bottom: 3px solid #F15929;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .company-name {
            font-size: 22px;
            font-weight: bold;
            color: #231F20;
            margin-bottom: 3px;
          }
          .company-subtitle {
            font-size: 11px;
            color: #666;
          }
          .doc-title {
            font-size: 24px;
            font-weight: bold;
            color: #F15929;
            text-align: right;
            margin-top: -35px;
          }
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-box {
            border: 1px solid #ddd;
            padding: 12px;
            border-radius: 5px;
          }
          .info-label {
            font-weight: bold;
            color: #231F20;
            font-size: 10px;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .info-value {
            color: #555;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin-bottom: 15px;
          }
          .summary-card {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
          }
          .summary-count {
            font-size: 20px;
            font-weight: bold;
          }
          .summary-label {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .section-title {
            font-size: 12px;
            font-weight: bold;
            color: #231F20;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 11px;
          }
          th {
            background-color: #231F20;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 10px;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          .notes-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 12px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .external-goods-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            padding: 12px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .signature-section {
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 50px;
            padding-top: 8px;
            font-size: 11px;
          }
          .signature-name {
            font-size: 9px;
            color: #666;
            margin-top: 3px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #F15929;
            text-align: center;
            color: #666;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Power Metal & Steel</div>
          <div class="company-subtitle">Scaffolding Rental Services</div>
          <div class="doc-title">RETURN CONDITION FORM</div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-label">RCF Number</div>
            <div class="info-value" style="font-size: 16px; font-weight: bold; color: #F15929;">${rcfNumber}</div>
            ${grnNumber ? `
              <div class="info-label">GRN Reference</div>
              <div class="info-value">${grnNumber}</div>
            ` : ''}
            <div class="info-label">Inspection Date</div>
            <div class="info-value">${inspectionDate}</div>
          </div>

          <div class="info-box">
            <div class="info-label">Customer Name</div>
            <div class="info-value">${returnData.customer}</div>
            <div class="info-label">Order/Request ID</div>
            <div class="info-value">${returnData.orderId}</div>
            <div class="info-label">Total Items Inspected</div>
            <div class="info-value" style="font-weight: bold;">${totalItems}</div>
          </div>
        </div>

        <div class="section-title">Condition Summary</div>
        <div class="summary-grid">
          <div class="summary-card" style="border-color: #22c55e;">
            <div class="summary-count" style="color: #166534;">${statusCounts['Good'] || 0}</div>
            <div class="summary-label" style="color: #166534;">Good</div>
          </div>
          <div class="summary-card" style="border-color: #ef4444;">
            <div class="summary-count" style="color: #991b1b;">${statusCounts['Damaged'] || 0}</div>
            <div class="summary-label" style="color: #991b1b;">Damaged</div>
          </div>
          <div class="summary-card" style="border-color: #f59e0b;">
            <div class="summary-count" style="color: #92400e;">${statusCounts['Replace'] || 0}</div>
            <div class="summary-label" style="color: #92400e;">Replace</div>
          </div>
        </div>

        <div class="section-title">Item Condition Details</div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">No.</th>
              <th style="width: 25%;">Item Description</th>
              <th style="width: 8%;">Total</th>
              <th style="width: 37%;">Condition Breakdown</th>
              <th style="width: 25%;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${returnData.items.map((item, index) => {
              // Build breakdown display
              let breakdownHtml = '';
              if (item.statusBreakdown) {
                const entries = Object.entries(item.statusBreakdown).filter(([_, qty]) => qty > 0);
                breakdownHtml = entries.map(([status, qty]) => {
                  const style = getStatusStyle(status as ItemConditionStatus);
                  return `<span class="status-badge" style="background-color: ${style.bg}; color: ${style.text}; margin: 2px;">${qty} ${status}</span>`;
                }).join(' ');
              } else {
                const style = getStatusStyle(item.status);
                breakdownHtml = `<span class="status-badge" style="background-color: ${style.bg}; color: ${style.text};">${item.quantityReturned} ${item.status}</span>`;
              }
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td style="font-weight: 500;">${item.name}</td>
                  <td style="text-align: center; font-weight: bold;">${item.quantityReturned}</td>
                  <td>${breakdownHtml}</td>
                  <td style="font-size: 10px; color: #666;">${item.notes || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        ${returnData.productionNotes ? `
          <div class="notes-box">
            <div class="section-title" style="border: none; margin: 0 0 8px 0;">Inspection Notes</div>
            <p style="margin: 0; font-size: 12px;">${returnData.productionNotes}</p>
          </div>
        ` : ''}

        ${returnData.hasExternalGoods ? `
          <div class="external-goods-box">
            <div class="section-title" style="border: none; margin: 0 0 8px 0; color: #991b1b;">
              ⚠️ External Goods Detected
            </div>
            <p style="margin: 0; font-size: 12px; color: #991b1b;">
              ${returnData.externalGoodsNotes || 'External goods (not from our inventory) were found during inspection.'}
            </p>
          </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Inspected By</div>
            <div class="signature-name">Name: _________________</div>
            <div class="signature-name">Date: _________________</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Approved By</div>
            <div class="signature-name">Name: _________________</div>
            <div class="signature-name">Date: _________________</div>
          </div>
        </div>

        <div class="footer">
          This is a computer-generated document. Signatures required for approval.<br>
          Power Metal & Steel - Scaffolding Rental Services<br>
          Generated on ${new Date().toLocaleString('en-MY')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadge = (status: ReturnItem['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color}`}>
        <Icon className="size-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-[#231F20]">Return Condition Form</h2>
            <p className="text-[#F15929] font-medium">{rcfNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-[#F15929] hover:bg-[#d14a1f]">
              <Printer className="size-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Document Preview */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            {/* Header */}
            <div className="border-b-[3px] border-[#F15929] pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-[#231F20]">Power Metal & Steel</h1>
                  <p className="text-gray-600 text-sm">Scaffolding Rental Services</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-[#F15929]">RETURN CONDITION FORM</h2>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">RCF Number</span>
                  <p className="text-lg font-bold text-[#F15929]">{rcfNumber}</p>
                </div>
                {grnNumber && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">GRN Reference</span>
                    <p className="text-sm text-[#231F20]">{grnNumber}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Inspection Date</span>
                  <p className="text-sm text-[#231F20]">{new Date().toLocaleDateString('en-MY')}</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Customer Name</span>
                  <p className="text-sm font-medium text-[#231F20]">{returnData.customer}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Order/Request ID</span>
                  <p className="text-sm text-[#231F20]">{returnData.orderId}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total Items Inspected</span>
                  <p className="text-sm font-bold text-[#231F20]">{totalItems}</p>
                </div>
              </div>
            </div>

            {/* Condition Summary */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#231F20] mb-3">Condition Summary</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-green-300 rounded-lg p-3 text-center bg-green-50">
                  <div className="text-2xl font-bold text-green-700">{statusCounts['Good'] || 0}</div>
                  <div className="text-xs font-semibold text-green-600 uppercase">Good</div>
                </div>
                <div className="border border-red-300 rounded-lg p-3 text-center bg-red-50">
                  <div className="text-2xl font-bold text-red-700">{statusCounts['Damaged'] || 0}</div>
                  <div className="text-xs font-semibold text-red-600 uppercase">Damaged</div>
                </div>
                <div className="border border-amber-300 rounded-lg p-3 text-center bg-amber-50">
                  <div className="text-2xl font-bold text-amber-700">{statusCounts['Replace'] || 0}</div>
                  <div className="text-xs font-semibold text-amber-600 uppercase">Replace</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#231F20] mb-3 flex items-center gap-2">
                <FileText className="size-4" />
                Item Condition Details
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#231F20] text-white">
                    <th className="p-3 text-left text-xs font-semibold w-12">No.</th>
                    <th className="p-3 text-left text-xs font-semibold">Item Description</th>
                    <th className="p-3 text-center text-xs font-semibold w-16">Total</th>
                    <th className="p-3 text-left text-xs font-semibold">Condition Breakdown</th>
                    <th className="p-3 text-left text-xs font-semibold w-32">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {returnData.items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-3 border-b border-gray-200 text-sm">{index + 1}</td>
                      <td className="p-3 border-b border-gray-200 text-sm font-medium">{item.name}</td>
                      <td className="p-3 border-b border-gray-200 text-sm text-center font-bold">{item.quantityReturned}</td>
                      <td className="p-3 border-b border-gray-200">
                        <div className="flex flex-wrap gap-1">
                          {item.statusBreakdown ? (
                            Object.entries(item.statusBreakdown)
                              .filter(([_, qty]) => qty > 0)
                              .map(([status, qty]) => (
                                <Badge key={status} className={`${statusConfig[status as ItemConditionStatus]?.bgColor || 'bg-gray-100'} ${statusConfig[status as ItemConditionStatus]?.color || 'text-gray-800'} text-xs`}>
                                  {qty} {status}
                                </Badge>
                              ))
                          ) : (
                            getStatusBadge(item.status)
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-sm text-gray-600">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inspection Notes */}
            {returnData.productionNotes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-[#231F20] mb-2">Inspection Notes</h3>
                <p className="text-sm text-gray-700">{returnData.productionNotes}</p>
              </div>
            )}

            {/* External Goods Warning */}
            {returnData.hasExternalGoods && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  External Goods Detected
                </h3>
                <p className="text-sm text-red-700">
                  {returnData.externalGoodsNotes || 'External goods (not from our inventory) were found during inspection.'}
                </p>
              </div>
            )}

            {/* Signature Section */}
            <div className="grid grid-cols-2 gap-12 mt-10">
              <div className="text-center">
                <div className="h-14"></div>
                <div className="border-t border-gray-800 pt-2 text-sm font-medium">Inspected By</div>
                <div className="text-xs text-gray-500 mt-1">Name: _________________</div>
                <div className="text-xs text-gray-500 mt-1">Date: _________________</div>
              </div>
              <div className="text-center">
                <div className="h-14"></div>
                <div className="border-t border-gray-800 pt-2 text-sm font-medium">Approved By</div>
                <div className="text-xs text-gray-500 mt-1">Name: _________________</div>
                <div className="text-xs text-gray-500 mt-1">Date: _________________</div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t-2 border-[#F15929] text-center text-gray-500 text-xs">
              This is a computer-generated document. Signatures required for approval.<br />
              Power Metal & Steel - Scaffolding Rental Services
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
