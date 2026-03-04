import { useState, useEffect, useCallback } from "react";
import { X, Printer } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { CreditNote, CreditNoteApplicationHistoryItem } from "../../types/creditNote";
import { formatRfqDate } from "../../lib/rfqDate";

interface CreditNoteDocumentPrintProps {
  creditNote: CreditNote;
  onBack: () => void;
}

export function CreditNoteDocumentPrint({ creditNote, onBack }: CreditNoteDocumentPrintProps) {
  const [applications, setApplications] = useState<CreditNoteApplicationHistoryItem[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (creditNote.status !== "Approved") return;
    setLoadingApplications(true);
    try {
      const res = await fetch(`/api/credit-notes/${creditNote.id}/applications`);
      const json = await res.json();
      if (json.success) {
        setApplications(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingApplications(false);
    }
  }, [creditNote.id, creditNote.status]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6">
      {/* Action Buttons - Hidden on Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-[#231F20]">Credit Note - Print Preview</h1>
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

      {/* Printable content */}
      <Card id="print-area" className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          {/* Header */}
          <div className="border-b-2 border-[#F15929] pb-4 mb-6">
            <h2 className="text-xl font-semibold text-[#231F20]">Power Metal & Steel</h2>
            <p className="text-sm text-[#6B7280]">Credit Note</p>
            <p className="text-lg font-medium mt-2 text-[#231F20]">{creditNote.creditNoteNumber}</p>
          </div>

          {/* Credit note summary */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <p><span className="text-[#6B7280]">Customer:</span> {creditNote.customerName ?? creditNote.customer}</p>
            <p><span className="text-[#6B7280]">Date:</span> {formatRfqDate(creditNote.date)}</p>
            <p><span className="text-[#6B7280]">Status:</span> {creditNote.status}</p>
            <p><span className="text-[#6B7280]">Total amount:</span> RM {creditNote.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
            <p className="col-span-2"><span className="text-[#6B7280]">Reason:</span> {creditNote.reason}</p>
            {creditNote.reasonDescription && (
              <p className="col-span-2 text-[#374151]">{creditNote.reasonDescription}</p>
            )}
          </div>

          {/* Line items (if any) */}
          {creditNote.items && creditNote.items.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[#6B7280] mb-2">Line items</h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount (RM)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNote.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{Number(item.amount ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <TableCell colSpan={2} className="text-right font-medium">Total</TableCell>
                    <TableCell className="text-right font-medium">
                      RM {creditNote.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {/* Application history */}
          <div>
            <h3 className="text-sm font-medium text-[#6B7280] mb-2">Application history</h3>
            {loadingApplications ? (
              <p className="text-sm text-[#6B7280]">Loading...</p>
            ) : applications.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No applications yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount Applied</TableHead>
                    <TableHead>Applied By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-[#F3F4F6]">
                      <TableCell className="font-medium">{app.targetInvoiceNumber}</TableCell>
                      <TableCell>
                        {"applicationType" in app && app.applicationType === "refund"
                          ? "Refund"
                          : app.targetInvoiceType === "deposit"
                            ? "Deposit"
                            : app.targetInvoiceType === "monthlyRental"
                              ? "Monthly Rental"
                              : "Additional Charge"}
                      </TableCell>
                      <TableCell className="text-right text-[#059669] font-medium">
                        RM {app.amountApplied.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{app.appliedBy}</TableCell>
                      <TableCell>{new Date(app.appliedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
