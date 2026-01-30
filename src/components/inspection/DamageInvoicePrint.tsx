import { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DamageInvoice } from '../../types/inspection';
import { toast } from 'sonner';

interface DamageInvoicePrintProps {
  invoice: DamageInvoice;
  onClose: () => void;
}

export function DamageInvoicePrint({ invoice, onClose }: DamageInvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Note: Browser print dialog can save as PDF
    toast.info('Use the Print dialog and select "Save as PDF" to download');
    window.print();
  };

  return (
    <div className="p-6">
      {/* Action Buttons - Hidden on Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-[#231F20]">Damage Invoice - Print Preview</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="size-4 mr-2" />
            Close
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="size-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-[#F15929] hover:bg-[#d94d1f]">
            <Printer className="size-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable Invoice */}
      <div ref={printRef} id="print-content">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-12">
          {/* Header */}
          <div className="border-b-4 border-[#F15929] pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-[#231F20] mb-2">POWER METAL & STEEL</h1>
                <p className="text-sm text-gray-600">Scaffolding Equipment Supplier</p>
                <p className="text-sm text-gray-600 mt-2">
                  123 Industrial Park, Johor Bahru<br />
                  Johor, Malaysia 81200<br />
                  Tel: +60 12-345 6789<br />
                  Email: info@powermetalsteel.com
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-[#231F20] mb-4">DAMAGE INVOICE</h2>
                <div className="text-sm space-y-1">
                  <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
                  <p><strong>ORP No:</strong> {invoice.orpNumber}</p>
                  <p><strong>Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Information */}
          {invoice.vendor && (
            <div className="mb-8">
              <h3 className="text-sm text-gray-600 mb-2">BILLED TO:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-[#231F20]">{invoice.vendor}</p>
              </div>
            </div>
          )}

          {/* Invoice Items Table */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 text-sm text-[#231F20]">No.</th>
                  <th className="text-left py-3 px-2 text-sm text-[#231F20]">Description</th>
                  <th className="text-right py-3 px-2 text-sm text-[#231F20]">Qty</th>
                  <th className="text-right py-3 px-2 text-sm text-[#231F20]">Unit Price (RM)</th>
                  <th className="text-right py-3 px-2 text-sm text-[#231F20]">Total (RM)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3 px-2 text-sm">{index + 1}</td>
                    <td className="py-3 px-2 text-sm">{item.description}</td>
                    <td className="py-3 px-2 text-sm text-right">{item.quantity}</td>
                    <td className="py-3 px-2 text-sm text-right">{Number(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="py-3 px-2 text-sm text-right">{Number(item.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-3">
              <div className="flex justify-between pb-2">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm text-[#231F20]">RM {Number(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-sm text-gray-600">Tax (SST):</span>
                <span className="text-sm text-[#231F20]">RM {Number(invoice.tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                <span className="text-[#231F20]">Total Amount:</span>
                <span className="text-[#F15929]">RM {Number(invoice.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Payment Status:</p>
                <p className={`text-sm mt-1 ${
                  invoice.paymentStatus === 'paid' ? 'text-green-600' :
                  invoice.paymentStatus === 'overdue' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                  {invoice.paymentStatus.toUpperCase()}
                </p>
              </div>
              {invoice.paidDate && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Paid On:</p>
                  <p className="text-sm text-green-600 mt-1">
                    {new Date(invoice.paidDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8">
              <h3 className="text-sm text-gray-600 mb-2">NOTES:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-[#231F20]">{invoice.notes}</p>
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="mt-12 pt-8 border-t-2 border-gray-300">
            <div className="grid grid-cols-2 gap-12">
              <div>
                <h4 className="text-sm text-[#231F20] mb-8">COMPANY REPRESENTATIVE:</h4>
                <div className="space-y-4">
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500 mb-8">Signature</p>
                  </div>
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500">Name</p>
                  </div>
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500">Position</p>
                  </div>
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500">Date</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 italic">Company Stamp</p>
                    <div className="border-2 border-dashed border-gray-300 h-20 rounded mt-2"></div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm text-[#231F20] mb-8">AUTHORIZED BY (POWER METAL & STEEL):</h4>
                <div className="space-y-4">
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500 mb-8">Signature</p>
                  </div>
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500">Name</p>
                  </div>
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500">Position</p>
                  </div>
                  <div className="border-b border-gray-400 pb-2">
                    <p className="text-xs text-gray-500">Date</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-xs text-gray-600 mb-2">TERMS & CONDITIONS:</h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Payment is due within 30 days from the invoice date.</li>
              <li>• Late payments will incur a 2% monthly interest charge.</li>
              <li>• All damage charges are based on actual repair costs or replacement value.</li>
              <li>• Customer is responsible for damages beyond normal wear and tear.</li>
              <li>• Any disputes must be raised within 7 days of invoice date.</li>
              <li>• This invoice must be signed and returned within 14 days to acknowledge receipt.</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>This is an official document from Power Metal & Steel</p>
            <p className="mt-1">For inquiries, please contact: info@powermetalsteel.com | +60 12-345 6789</p>
          </div>
        </CardContent>
      </Card>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible !important;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          body, html {
            margin: 0;
            padding: 0;
          }
          .p-6 {
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
