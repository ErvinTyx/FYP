import { useRef } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Deposit } from '../../types/deposit';
import { Badge } from '../ui/badge';
import { formatRfqDate } from '../../lib/rfqDate';

interface DepositReceiptPrintProps {
  deposit: Deposit;
  onBack: () => void;
}

export function DepositReceiptPrint({ deposit, onBack }: DepositReceiptPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const subtotal = deposit.rentalItems?.reduce((sum, item) => sum + item.totalPrice, 0) || deposit.depositAmount;

  return (
    <div className="p-6">
      {/* Action Buttons - Hidden on Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-[#231F20]">Deposit Receipt - Print Preview</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <X className="size-4 mr-2" />
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-[#F15929] hover:bg-[#d94d1f]">
            <Printer className="size-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable Receipt */}
      <Card id="print-area" className="max-w-4xl mx-auto">
        <CardContent className="p-12" ref={printRef}>
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
                <h2 className="text-[#231F20] mb-4">DEPOSIT RECEIPT</h2>
                <div className="text-sm space-y-1">
                  <p><strong>Receipt No:</strong> {deposit.depositReceipt?.receiptNumber || 'RCP-' + deposit.depositId}</p>
                  <p><strong>Receipt Date:</strong> {deposit.depositReceipt?.receiptDate ? formatRfqDate(deposit.depositReceipt.receiptDate) : formatRfqDate(new Date())}</p>
                  <p><strong>Invoice No:</strong> {deposit.invoiceNo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6 flex items-center gap-3">
            <CheckCircle className="size-6 text-green-600" />
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-base">
              PAID
            </Badge>
          </div>

          {/* Customer Information */}
          <div className="mb-8">
            <h3 className="text-sm text-gray-600 mb-2">CUSTOMER DETAILS:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-[#231F20]"><strong>Name:</strong> {deposit.customerName}</p>
              <p className="text-sm text-gray-600 mt-1"><strong>Customer ID:</strong> {deposit.customerId}</p>
            </div>
          </div>

          {/* Rental Items Table */}
          {deposit.rentalItems && deposit.rentalItems.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm text-gray-600 mb-3">RENTAL ITEM DETAILS:</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 text-sm text-[#231F20]">Item Name</th>
                    <th className="text-right py-3 px-2 text-sm text-[#231F20]">Quantity</th>
                    <th className="text-right py-3 px-2 text-sm text-[#231F20]">Unit Price (RM)</th>
                    <th className="text-right py-3 px-2 text-sm text-[#231F20]">Total Price (RM)</th>
                  </tr>
                </thead>
                <tbody>
                  {deposit.rentalItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-3 px-2 text-sm">{item.itemName}</td>
                      <td className="py-3 px-2 text-sm text-right">{item.quantity}</td>
                      <td className="py-3 px-2 text-sm text-right">{item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-2 text-sm text-right">{item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Deposit Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-3">
              <div className="flex justify-between pb-2">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm text-[#231F20]">RM {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                <span className="text-[#231F20]">Deposit Amount Paid:</span>
                <span className="text-[#F15929]">RM {deposit.depositAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-8 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Payment Status:</p>
                <p className="text-green-600 mt-1">PAID</p>
              </div>
              {deposit.approvedBy && (
                <div>
                  <p className="text-sm text-gray-600">Approved By:</p>
                  <p className="text-sm text-[#231F20] mt-1">{deposit.approvedBy}</p>
                </div>
              )}
              {deposit.approvedAt && (
                <div>
                  <p className="text-sm text-gray-600">Approved On:</p>
                  <p className="text-sm text-[#231F20] mt-1">
                    {formatRfqDate(deposit.approvedAt)}
                  </p>
                </div>
              )}
              {deposit.paymentSubmittedAt && (
                <div>
                  <p className="text-sm text-gray-600">Payment Submitted:</p>
                  <p className="text-sm text-[#231F20] mt-1">
                    {formatRfqDate(deposit.paymentSubmittedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Official Notes */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Official Note:</strong> This receipt is generated upon confirmation of deposit payment.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-300">
            <div className="text-center text-sm text-gray-500">
              <p>Thank you for your business</p>
              <p className="mt-2">
                This is a computer-generated document. No signature is required.
              </p>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-xs text-gray-600 mb-2">TERMS & CONDITIONS:</h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• This deposit is refundable upon return of equipment in good condition.</li>
              <li>• Deposit will be forfeited if equipment is not returned within the agreed period.</li>
              <li>• Any damage to equipment will be deducted from the deposit amount.</li>
              <li>• Refund processing may take 7-14 business days after equipment inspection.</li>
            </ul>
          </div>

          {/* Company Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-500">
              Power Metal & Steel | www.powermetalsteel.com | Customer Service: +60 12-345 6789
            </p>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}