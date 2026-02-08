import { Printer, X, FileText, Truck, User, Phone, MapPin, Calendar, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export type ItemConditionStatus = 'Good' | 'Repair' | 'Replace';

export interface StatusBreakdown {
  Good: number;
  Repair: number;
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

interface GRNViewerProps {
  grnNumber: string;
  returnData: {
    orderId: string;
    customer: string;
    customerContact?: string;
    pickupAddress?: string;
    returnType: 'Partial' | 'Full';
    transportationType: 'Self Return' | 'Transportation Needed';
    items: ReturnItem[];
    requestDate: string;
    pickupDate?: string;
    pickupTimeSlot?: string;
    pickupDriver?: string;
    driverContact?: string;
    warehousePhotos?: ReturnPhoto[];
  };
  onClose: () => void;
}

export function GRNViewer({ grnNumber, returnData, onClose }: GRNViewerProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalItems = returnData.items.reduce((sum, item) => sum + item.quantityReturned, 0);
    const receiptDate = new Date().toLocaleDateString('en-MY');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Goods Received Note - ${grnNumber}</title>
        <style>
          @media print {
            @page { margin: 20mm; size: A4; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
            color: #231F20;
          }
          .header {
            border-bottom: 3px solid #F15929;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #231F20;
            margin-bottom: 5px;
          }
          .company-subtitle {
            font-size: 12px;
            color: #666;
          }
          .doc-title {
            font-size: 28px;
            font-weight: bold;
            color: #F15929;
            text-align: right;
            margin-top: -40px;
          }
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-box {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
          }
          .info-label {
            font-weight: bold;
            color: #231F20;
            font-size: 12px;
            margin-bottom: 3px;
          }
          .info-value {
            color: #555;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #231F20;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #F15929;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 12px;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
            font-size: 13px;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .summary-box {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .summary-title {
            font-weight: bold;
            color: #0369a1;
            margin-bottom: 10px;
          }
          .transport-box {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #F15929;
            text-align: center;
            color: #666;
            font-size: 11px;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
          }
          .badge-partial { background-color: #fef3c7; color: #92400e; }
          .badge-full { background-color: #dcfce7; color: #166534; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Power Metal & Steel</div>
          <div class="company-subtitle">Scaffolding Rental Services</div>
          <div class="doc-title">GOODS RECEIVED NOTE</div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-label">GRN Number:</div>
            <div class="info-value" style="font-size: 16px; font-weight: bold; color: #F15929;">${grnNumber}</div>
            <div class="info-label">Receipt Date:</div>
            <div class="info-value">${receiptDate}</div>
            <div class="info-label">Request ID:</div>
            <div class="info-value">${returnData.orderId}</div>
            <div class="info-label">Return Type:</div>
            <div class="info-value">
              <span class="badge ${returnData.returnType === 'Partial' ? 'badge-partial' : 'badge-full'}">
                ${returnData.returnType} Return
              </span>
            </div>
          </div>

          <div class="info-box">
            <div class="info-label">Customer Name:</div>
            <div class="info-value">${returnData.customer}</div>
            ${returnData.customerContact ? `
              <div class="info-label">Contact:</div>
              <div class="info-value">${returnData.customerContact}</div>
            ` : ''}
            ${returnData.pickupAddress ? `
              <div class="info-label">Pickup Address:</div>
              <div class="info-value">${returnData.pickupAddress}</div>
            ` : ''}
          </div>
        </div>

        ${returnData.transportationType === 'Transportation Needed' && returnData.pickupDriver ? `
          <div class="transport-box">
            <div class="section-title" style="border: none; margin: 0;">Transportation Details</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
              <div>
                <div class="info-label">Driver Name:</div>
                <div class="info-value">${returnData.pickupDriver}</div>
              </div>
              <div>
                <div class="info-label">Driver Contact:</div>
                <div class="info-value">${returnData.driverContact || '-'}</div>
              </div>
              ${returnData.pickupDate ? `
                <div>
                  <div class="info-label">Pickup Date:</div>
                  <div class="info-value">${new Date(returnData.pickupDate).toLocaleDateString('en-MY')}</div>
                </div>
              ` : ''}
              ${returnData.pickupTimeSlot ? `
                <div>
                  <div class="info-label">Time Slot:</div>
                  <div class="info-value">${returnData.pickupTimeSlot}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : `
          <div class="summary-box">
            <div class="summary-title">Self Return</div>
            <p style="margin: 0; font-size: 13px;">Customer self-delivered items to warehouse.</p>
          </div>
        `}

        <div class="section-title">Items Received</div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">No.</th>
              <th style="width: 45%;">Item Description</th>
              <th style="width: 25%;">Category</th>
              <th style="width: 15%;">Qty Returned</th>
              <th style="width: 10%;">Original Qty</th>
            </tr>
          </thead>
          <tbody>
            ${returnData.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td style="font-weight: bold;">${item.quantityReturned}</td>
                <td>${item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f3f4f6;">
              <td colspan="3" style="font-weight: bold; text-align: right;">Total Items Received:</td>
              <td colspan="2" style="font-weight: bold; font-size: 16px;">${totalItems}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          This is a computer-generated document.<br>
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

  const totalItems = returnData.items.reduce((sum, item) => sum + item.quantityReturned, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-[#231F20]">Goods Received Note</h2>
            <p className="text-[#F15929] font-medium">{grnNumber}</p>
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
                  <h2 className="text-2xl font-bold text-[#F15929]">GOODS RECEIVED NOTE</h2>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500">GRN Number</span>
                  <p className="text-lg font-bold text-[#F15929]">{grnNumber}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Receipt Date</span>
                  <p className="text-sm text-[#231F20]">{new Date().toLocaleDateString('en-MY')}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Request ID</span>
                  <p className="text-sm text-[#231F20]">{returnData.orderId}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Return Type</span>
                  <Badge className={returnData.returnType === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                    {returnData.returnType} Return
                  </Badge>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500">Customer Name</span>
                  <p className="text-sm font-medium text-[#231F20]">{returnData.customer}</p>
                </div>
                {returnData.customerContact && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500">Contact</span>
                    <p className="text-sm text-[#231F20] flex items-center gap-1">
                      <Phone className="size-3" />
                      {returnData.customerContact}
                    </p>
                  </div>
                )}
                {returnData.pickupAddress && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500">Pickup Address</span>
                    <p className="text-sm text-[#231F20] flex items-start gap-1">
                      <MapPin className="size-3 mt-0.5 shrink-0" />
                      {returnData.pickupAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Transportation Details */}
            {returnData.transportationType === 'Transportation Needed' && returnData.pickupDriver ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Truck className="size-4" />
                  Transportation Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-amber-700">Driver Name</span>
                    <p className="font-medium text-amber-900 flex items-center gap-1">
                      <User className="size-3" />
                      {returnData.pickupDriver}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-amber-700">Driver Contact</span>
                    <p className="font-medium text-amber-900">{returnData.driverContact || '-'}</p>
                  </div>
                  {returnData.pickupDate && (
                    <div>
                      <span className="text-xs text-amber-700">Pickup Date</span>
                      <p className="font-medium text-amber-900 flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(returnData.pickupDate).toLocaleDateString('en-MY')}
                      </p>
                    </div>
                  )}
                  {returnData.pickupTimeSlot && (
                    <div>
                      <span className="text-xs text-amber-700">Time Slot</span>
                      <p className="font-medium text-amber-900">{returnData.pickupTimeSlot}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Package className="size-4" />
                  Self Return
                </h3>
                <p className="text-sm text-blue-700 mt-1">Customer self-delivered items to warehouse.</p>
              </div>
            )}

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#231F20] mb-3 flex items-center gap-2">
                <FileText className="size-4" />
                Items Received
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F15929] text-white">
                    <th className="p-3 text-left text-xs font-semibold w-12">No.</th>
                    <th className="p-3 text-left text-xs font-semibold">Item Description</th>
                    <th className="p-3 text-left text-xs font-semibold">Category</th>
                    <th className="p-3 text-center text-xs font-semibold w-28">Qty Returned</th>
                    <th className="p-3 text-center text-xs font-semibold w-24">Original</th>
                  </tr>
                </thead>
                <tbody>
                  {returnData.items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-3 border-b border-gray-200 text-sm">{index + 1}</td>
                      <td className="p-3 border-b border-gray-200 text-sm font-medium">{item.name}</td>
                      <td className="p-3 border-b border-gray-200 text-sm text-gray-600">{item.category}</td>
                      <td className="p-3 border-b border-gray-200 text-sm text-center font-bold">{item.quantityReturned}</td>
                      <td className="p-3 border-b border-gray-200 text-sm text-center text-gray-500">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100">
                    <td colSpan={3} className="p-3 text-right font-semibold text-sm">Total Items Received:</td>
                    <td colSpan={2} className="p-3 text-center font-bold text-lg text-[#F15929]">{totalItems}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t-2 border-[#F15929] text-center text-gray-500 text-xs">
              This is a computer-generated document.<br />
              Power Metal & Steel - Scaffolding Rental Services
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
