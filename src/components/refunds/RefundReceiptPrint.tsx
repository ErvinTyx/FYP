import { useRef } from "react";
import { X, Printer, CheckCircle, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRfqDate } from "../../lib/rfqDate";
import { getCustomerDisplayName } from "../../lib/customerName";
import type { Refund } from "../../types/refund";
import type { RelatedCreditNote } from "../../types/refund";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface RefundReceiptPrintProps {
  refund: Refund & { relatedCreditNotes?: RelatedCreditNote[] };
  onBack: () => void;
}

function getInvoiceTypeLabel(invoiceType: string): string {
  switch (invoiceType) {
    case "deposit":
      return "Deposit";
    case "monthlyRental":
      return "Monthly Rental";
    case "additionalCharge":
      return "Additional Charge";
    default:
      return invoiceType;
  }
}

export function RefundReceiptPrint({ refund, onBack }: RefundReceiptPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const relatedCreditNotes = refund.relatedCreditNotes ?? [];

  const handlePrint = () => {
    window.print();
  };

  const isApproved = refund.status === "Approved";
  const isRejected = refund.status === "Rejected";

  return (
    <div className="p-6">
      {/* Action Buttons - Hidden on Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-[#231F20]">Refund Receipt - Print Preview</h1>
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
                <h2 className="text-[#231F20] mb-4 text-xl font-semibold">REFUND RECEIPT</h2>
                <div className="text-sm space-y-1">
                  <p><strong>Refund No:</strong> {refund.refundNumber}</p>
                  <p><strong>Receipt Date:</strong> {refund.approvedAt ? formatRfqDate(refund.approvedAt) : formatRfqDate(refund.createdAt)}</p>
                  <p><strong>Original Invoice:</strong> {refund.originalInvoice}</p>
                  <p><strong>Invoice Type:</strong> {getInvoiceTypeLabel(refund.invoiceType)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6 flex items-center gap-3">
            {isApproved && (
              <>
                <CheckCircle className="size-6 text-green-600" />
                <Badge className="bg-green-100 text-green-800 px-4 py-2 text-base">
                  APPROVED
                </Badge>
              </>
            )}
            {isRejected && (
              <>
                <XCircle className="size-6 text-red-600" />
                <Badge className="bg-red-100 text-red-800 px-4 py-2 text-base">
                  REJECTED
                </Badge>
              </>
            )}
            {!isApproved && !isRejected && (
              <Badge className="bg-gray-100 text-gray-800 px-4 py-2 text-base">
                {refund.status}
              </Badge>
            )}
          </div>

          {/* Customer Information */}
          <div className="mb-8">
            <h3 className="text-sm text-gray-600 mb-2">CUSTOMER DETAILS:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-[#231F20]"><strong>Name:</strong> {getCustomerDisplayName(refund.customer)}</p>
              {refund.customer?.email && (
                <p className="text-sm text-gray-600 mt-1"><strong>Email:</strong> {refund.customer.email}</p>
              )}
            </div>
          </div>

          {/* Related Credit Notes Table */}
          {relatedCreditNotes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm text-gray-600 mb-3">RELATED CREDIT NOTES:</h3>
              <div className="rounded-md border border-[#E5E7EB]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F9FAFB]">
                      <TableHead className="text-[#231F20]">Credit Note</TableHead>
                      <TableHead className="text-right text-[#231F20]">Amount (RM)</TableHead>
                      <TableHead className="text-[#231F20]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatedCreditNotes.map((cn) => (
                      <TableRow key={cn.id}>
                        <TableCell>{cn.creditNoteNumber}</TableCell>
                        <TableCell className="text-right">
                          {cn.amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{cn.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Refund Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-3">
              <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                <span className="text-[#231F20]">Refund Amount:</span>
                <span className="text-[#F15929] font-semibold">
                  RM {refund.amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {refund.refundMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Refund Method:</span>
                  <span className="text-[#231F20]">{refund.refundMethod}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reason for Refund */}
          {(refund.reason || refund.reasonDescription) && (
            <div className="mb-8">
              <h3 className="text-sm text-gray-600 mb-2">REASON FOR REFUND:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-[#231F20]">{refund.reason || "—"}</p>
                {refund.reasonDescription && (
                  <p className="text-sm text-gray-600 mt-1">{refund.reasonDescription}</p>
                )}
              </div>
            </div>
          )}

          {/* Approval Information */}
          {isApproved && (refund.approvedBy || refund.approvedAt) && (
            <div className="mb-8 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="grid grid-cols-2 gap-4">
                {refund.approvedBy && (
                  <div>
                    <p className="text-sm text-gray-600">Approved By:</p>
                    <p className="text-sm text-[#231F20] mt-1">{refund.approvedBy}</p>
                  </div>
                )}
                {refund.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Approved On:</p>
                    <p className="text-sm text-[#231F20] mt-1">{formatRfqDate(refund.approvedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Information */}
          {isRejected && (refund.rejectionReason || refund.rejectedBy) && (
            <div className="mb-8 p-4 bg-red-50 rounded-lg border-2 border-red-200">
              {refund.rejectionReason && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Rejection Reason:</p>
                  <p className="text-sm text-[#991B1B] mt-1">{refund.rejectionReason}</p>
                </div>
              )}
              {refund.rejectedBy && (
                <p className="text-sm text-[#991B1B]">
                  Rejected by {refund.rejectedBy}
                  {refund.rejectedAt ? ` on ${formatRfqDate(refund.rejectedAt)}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Official Note */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Official Note:</strong> This receipt is generated upon confirmation of refund approval.
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
