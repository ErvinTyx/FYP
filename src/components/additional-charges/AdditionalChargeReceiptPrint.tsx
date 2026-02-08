import { useRef } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { AdditionalCharge } from '../../types/additionalCharge';
import { Badge } from '../ui/badge';
import { formatRfqDate } from '../../lib/rfqDate';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface AdditionalChargeReceiptPrintProps {
  charge: AdditionalCharge;
  onBack: () => void;
}

export function AdditionalChargeReceiptPrint({ charge, onBack }: AdditionalChargeReceiptPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6">
      {/* Action Buttons - Hidden on Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-[#231F20]">Additional Charge Receipt - Print Preview</h1>
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
      <Card id="print-area" className="max-w-4xl mx-auto print:border-0 print:shadow-none">
        <CardContent className="p-12 print:p-8" ref={printRef}>
          {/* Header */}
          <div className="border-b-4 border-[#F15929] pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-[#231F20] mb-2 text-2xl font-bold">POWER METAL & STEEL</h1>
                <p className="text-sm text-gray-600">Scaffolding Equipment Supplier</p>
                <p className="text-sm text-gray-600 mt-2">
                  123 Industrial Park, Johor Bahru<br />
                  Johor, Malaysia 81200<br />
                  Tel: +60 12-345 6789<br />
                  Email: info@powermetalsteel.com
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-[#231F20] mb-4 text-xl font-semibold">ADDITIONAL CHARGE RECEIPT</h2>
                <div className="text-sm space-y-1">
                  <p><strong>Invoice No:</strong> {charge.invoiceNo}</p>
                  <p><strong>Receipt Date:</strong> {charge.approvalDate ? formatRfqDate(charge.approvalDate) : formatRfqDate(new Date())}</p>
                  <p><strong>DO ID:</strong> {charge.doId}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-[#059669]" />
            <Badge className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 text-base">
              PAID
            </Badge>
          </div>

          {/* Customer Information */}
          <div className="mb-8">
            <h3 className="text-sm text-gray-600 mb-2">CUSTOMER DETAILS:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-[#231F20]"><strong>Name:</strong> {charge.customerName}</p>
              {charge.returnedDate && (
                <p className="text-sm text-gray-600 mt-1"><strong>Returned Date:</strong> {formatRfqDate(charge.returnedDate)}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          {charge.items && charge.items.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm text-gray-600 mb-3">CHARGE ITEM DETAILS:</h3>
              <div className="rounded-md border border-[#E5E7EB]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F9FAFB]">
                      <TableHead className="text-[#231F20]">Item Name</TableHead>
                      <TableHead className="text-[#231F20]">Type</TableHead>
                      <TableHead className="text-right text-[#231F20]">Quantity</TableHead>
                      <TableHead className="text-right text-[#231F20]">Unit Price (RM)</TableHead>
                      <TableHead className="text-right text-[#231F20]">Amount (RM)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charge.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.itemType}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{Number(item.unitPrice).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{Number(item.amount).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Charge Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-3">
              <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                <span className="text-[#231F20] font-semibold">Total Additional Charges:</span>
                <span className="text-[#F15929] font-bold text-lg">RM {charge.totalCharges.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-8 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Payment Status:</p>
                <p className="text-[#059669] mt-1 font-semibold">PAID</p>
              </div>
              {charge.approvalDate && (
                <div>
                  <p className="text-sm text-gray-600">Approved On:</p>
                  <p className="text-sm text-[#231F20] mt-1">
                    {formatRfqDate(charge.approvalDate)}
                  </p>
                </div>
              )}
              {charge.referenceId && (
                <div>
                  <p className="text-sm text-gray-600">Bank Reference Number:</p>
                  <p className="text-sm text-[#231F20] mt-1 font-mono">{charge.referenceId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Official Notes */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Official Note:</strong> This receipt is generated upon confirmation of additional charge payment.
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
