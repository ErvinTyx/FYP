import React, { useState } from 'react';
import { Printer, Download, FileText, Calendar, Truck, MapPin, Phone, Mail, Package, CheckCircle } from 'lucide-react';

interface DeliveryOrderProps {
  requestId: string;
  customerName: string;
  agreementNo: string;
  setDetails: {
    setName: string;
    items: { name: string; quantity: number; unit: string }[];
  };
  deliveryAddress: string;
  deliveryDate: string;
  customerPhone: string;
  customerEmail: string;
  onClose: () => void;
}

export default function DeliveryOrderGeneration({
  requestId,
  customerName,
  agreementNo,
  setDetails,
  deliveryAddress,
  deliveryDate,
  customerPhone,
  customerEmail,
  onClose
}: DeliveryOrderProps) {
  const [doNumber, setDoNumber] = useState(`DO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateDO = () => {
    setShowPreview(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Order - ${doNumber}</title>
        <style>
          @media print {
            @page { margin: 20mm; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
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
          .do-title {
            font-size: 28px;
            font-weight: bold;
            color: #F15929;
            text-align: right;
            margin-top: -30px;
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
            margin-bottom: 5px;
          }
          .info-value {
            color: #555;
            margin-bottom: 10px;
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
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 40px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 60px;
            padding-top: 10px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #F15929;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .instructions {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 10px;
            margin: 20px 0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Power Metal & Steel</div>
          <div class="do-title">DELIVERY ORDER</div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-label">DO Number:</div>
            <div class="info-value">${doNumber}</div>
            <div class="info-label">Date:</div>
            <div class="info-value">${new Date().toLocaleDateString('en-MY')}</div>
            <div class="info-label">Request ID:</div>
            <div class="info-value">${requestId}</div>
            <div class="info-label">Agreement No:</div>
            <div class="info-value">${agreementNo}</div>
          </div>

          <div class="info-box">
            <div class="info-label">Customer:</div>
            <div class="info-value">${customerName}</div>
            <div class="info-label">Phone:</div>
            <div class="info-value">${customerPhone}</div>
            <div class="info-label">Email:</div>
            <div class="info-value">${customerEmail}</div>
          </div>
        </div>

        <div class="info-box">
          <div class="info-label">Delivery Address:</div>
          <div class="info-value">${deliveryAddress}</div>
          <div class="info-label">Scheduled Delivery Date:</div>
          <div class="info-value">${new Date(deliveryDate).toLocaleDateString('en-MY')}</div>
        </div>

        <div class="info-section" style="margin-top: 20px;">
          <div class="info-box">
            <div class="info-label">Driver Name:</div>
            <div class="info-value">${driverName || 'N/A'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Vehicle Number:</div>
            <div class="info-value">${vehicleNumber || 'N/A'}</div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <div class="info-label">Set: ${setDetails.setName}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%;">No.</th>
              <th style="width: 55%;">Item Description</th>
              <th style="width: 20%;">Quantity</th>
              <th style="width: 20%;">Unit</th>
            </tr>
          </thead>
          <tbody>
            ${setDetails.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${specialInstructions ? `
          <div class="instructions">
            <div class="info-label">Special Instructions:</div>
            <div>${specialInstructions}</div>
          </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Prepared By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Delivered By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Received By</div>
          </div>
        </div>

        <div class="footer">
          This is a computer-generated document. No signature is required.<br>
          Power Metal & Steel - Scaffolding Rental Services
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-[#231F20]">Delivery Order Preview</h2>
              <p className="text-gray-600">{doNumber}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[#F15929] text-white rounded hover:bg-[#d14a1f] flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Preview content */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="border-b-2 border-[#F15929] pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-2xl text-[#231F20] mb-1">Power Metal & Steel</div>
                    <p className="text-gray-600">Scaffolding Rental Services</p>
                  </div>
                  <div className="text-3xl text-[#F15929]">DELIVERY ORDER</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="border border-gray-200 rounded p-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600">DO Number:</span>
                      <span className="ml-2 text-[#231F20]">{doNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <span className="ml-2 text-[#231F20]">{new Date().toLocaleDateString('en-MY')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Request ID:</span>
                      <span className="ml-2 text-[#231F20]">{requestId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Agreement No:</span>
                      <span className="ml-2 text-[#231F20]">{agreementNo}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded p-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <span className="ml-2 text-[#231F20]">{customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2 text-[#231F20]">{customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 text-[#231F20]">{customerEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded p-4 mb-6">
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-600">Delivery Address:</span>
                    <span className="ml-2 text-[#231F20]">{deliveryAddress}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Scheduled Date:</span>
                    <span className="ml-2 text-[#231F20]">{new Date(deliveryDate).toLocaleDateString('en-MY')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="border border-gray-200 rounded p-4">
                  <span className="text-gray-600">Driver:</span>
                  <span className="ml-2 text-[#231F20]">{driverName || 'N/A'}</span>
                </div>
                <div className="border border-gray-200 rounded p-4">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="ml-2 text-[#231F20]">{vehicleNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-gray-700">Set: {setDetails.setName}</span>
              </div>

              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-[#F15929] text-white">
                    <th className="p-3 text-left">No.</th>
                    <th className="p-3 text-left">Item Description</th>
                    <th className="p-3 text-left">Quantity</th>
                    <th className="p-3 text-left">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {setDetails.items.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="p-3 border-b border-gray-200">{index + 1}</td>
                      <td className="p-3 border-b border-gray-200">{item.name}</td>
                      <td className="p-3 border-b border-gray-200">{item.quantity}</td>
                      <td className="p-3 border-b border-gray-200">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {specialInstructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                  <div className="text-gray-700 mb-1">Special Instructions:</div>
                  <div className="text-gray-800">{specialInstructions}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-8 mt-12">
                <div className="text-center">
                  <div className="h-16"></div>
                  <div className="border-t border-gray-800 pt-2">Prepared By</div>
                </div>
                <div className="text-center">
                  <div className="h-16"></div>
                  <div className="border-t border-gray-800 pt-2">Delivered By</div>
                </div>
                <div className="text-center">
                  <div className="h-16"></div>
                  <div className="border-t border-gray-800 pt-2">Received By</div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t-2 border-[#F15929] text-center text-gray-600 text-sm">
                This is a computer-generated document. No signature is required.<br />
                Power Metal & Steel - Scaffolding Rental Services
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[#231F20]">Generate Delivery Order</h2>
          <p className="text-gray-600">Create a delivery order for {setDetails.setName}</p>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* DO Number */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">DO Number *</label>
              <input
                type="text"
                value={doNumber}
                onChange={(e) => setDoNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15929] focus:border-transparent"
              />
            </div>

            {/* Customer Info - Read Only */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Agreement No</label>
                <input
                  type="text"
                  value={agreementNo}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>

            {/* Delivery Details */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">Delivery Address</label>
              <textarea
                value={deliveryAddress}
                disabled
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Scheduled Delivery Date</label>
              <input
                type="text"
                value={new Date(deliveryDate).toLocaleDateString('en-MY')}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            {/* Driver & Vehicle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Driver Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter driver name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15929] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g., ABC1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15929] focus:border-transparent"
                />
              </div>
            </div>

            {/* Items Summary */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-[#231F20] mb-3">{setDetails.setName}</h3>
              <div className="space-y-2">
                {setDetails.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="text-gray-600">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">Special Instructions</label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                placeholder="Enter any special delivery instructions..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F15929] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateDO}
            className="px-4 py-2 bg-[#F15929] text-white rounded hover:bg-[#d14a1f] flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate DO
          </button>
        </div>
      </div>
    </div>
  );
}
