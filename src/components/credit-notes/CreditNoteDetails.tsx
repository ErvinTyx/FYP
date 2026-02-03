import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Download, CheckCircle, XCircle, FileText, Image as ImageIcon, Printer } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { StatusBadge } from "./StatusBadge";
import { RejectionModal } from "./RejectionModal";
import { CreditNote } from "../../types/creditNote";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface CreditNoteDetailsProps {
  creditNote: CreditNote;
  onBack: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  userRole: "Admin" | "Finance" | "Staff" | "Viewer";
}

export function CreditNoteDetails({
  creditNote,
  onBack,
  onApprove,
  onReject,
  userRole,
}: CreditNoteDetailsProps) {
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPrintModal && autoPrint) {
      const t = setTimeout(() => {
        window.print();
        setAutoPrint(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [showPrintModal, autoPrint]);

  const canApprove = (userRole === "Admin" || userRole === "Finance") && 
                     creditNote.status === "Pending Approval";

  const handleApprove = () => {
    onApprove(creditNote.id);
  };

  const handleReject = (reason: string) => {
    onReject(creditNote.id, reason);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="hover:bg-[#F3F4F6]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1>{creditNote.creditNoteNumber}</h1>
              <StatusBadge status={creditNote.status} />
            </div>
            <p className="text-[#374151]">
              Created on {new Date(creditNote.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setShowPrintModal(true); setAutoPrint(false); }}
            className="h-10 px-6 rounded-lg"
          >
            <FileText className="mr-2 h-4 w-4" />
            View Document
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowPrintModal(true); setAutoPrint(true); }}
            className="h-10 px-6 rounded-lg"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Receipt
          </Button>
        </div>
      </div>

      {/* Approval Actions */}
      {canApprove && (
        <Card className="border-[#F15929] bg-[#FFF7F5]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#231F20]">
                  Approval Required
                </p>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  This credit note requires your approval before processing
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsRejectionModalOpen(true)}
                  className="h-10 px-6 rounded-lg border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2]"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  className="bg-[#059669] hover:bg-[#047857] text-white h-10 px-6 rounded-lg"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Info */}
      {creditNote.status === "Rejected" && creditNote.rejectionReason && (
        <Card className="border-[#DC2626] bg-[#FEF2F2]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-[#DC2626] mt-0.5" />
              <div className="flex-1">
                <p className="text-[#991B1B]">
                  Rejected by {creditNote.rejectedBy || "Unknown"}
                </p>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  {new Date(creditNote.rejectedAt || "").toLocaleDateString()}
                </p>
                <div className="mt-3 p-3 bg-white rounded-lg border border-[#FEE2E2]">
                  <p className="text-[14px] text-[#374151]">
                    <span className="text-[#991B1B]">Reason:</span> {creditNote.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Note Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Customer Name</p>
              <p className="text-[#111827]">{creditNote.customer}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Customer ID</p>
              <p className="text-[#111827]">{creditNote.customerId}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Invoice type</p>
              <p className="text-[#111827]">
                {creditNote.invoiceType === "deposit"
                  ? "Deposit"
                  : creditNote.invoiceType === "monthlyRental"
                    ? "Monthly Rental"
                    : creditNote.invoiceType === "additionalCharge"
                      ? "Additional Charge"
                      : creditNote.invoiceType ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Original Invoice</p>
              <p className="text-[#111827]">{creditNote.originalInvoice}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Credit Note Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Reason</p>
              <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151] mt-1">
                {creditNote.reason}
              </Badge>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Date</p>
              <p className="text-[#111827]">
                {new Date(creditNote.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Total Amount</p>
              <p className="text-[#111827]">
                RM{creditNote.amount.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      {creditNote.reasonDescription && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Additional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#374151]">{creditNote.reasonDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const showDays = creditNote.items.some((i) => i.daysCharged != null && i.daysCharged > 0);
            return (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    {showDays && <TableHead className="text-right">Days</TableHead>}
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNote.items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-[#F3F4F6]">
                      <TableCell className="text-[#111827]">{item.description}</TableCell>
                      <TableCell className="text-right text-[#374151]">{item.quantity}</TableCell>
                      {showDays && (
                        <TableCell className="text-right text-[#374151]">
                          {item.daysCharged ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-[#374151]">
                        RM{(item.unitPrice ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-[#111827]">
                        RM{(item.amount ?? 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <TableCell colSpan={showDays ? 4 : 3} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right text-[#111827]">
                      RM{creditNote.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>

      {/* Attachments */}
      {creditNote.attachments && creditNote.attachments.length > 0 && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Supporting Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditNote.attachments.map((attachment) => (
                <Card key={attachment.id} className="border-[#E5E7EB]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {attachment.fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <ImageIcon className="h-8 w-8 text-[#F15929]" />
                        ) : (
                          <FileText className="h-8 w-8 text-[#6B7280]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[#111827] truncate">
                          {attachment.fileName}
                        </p>
                        <p className="text-[12px] text-[#6B7280]">
                          {(attachment.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-[#6B7280] mt-2"></div>
              <div>
                <p className="text-[#111827]">Created by {creditNote.createdBy}</p>
                <p className="text-[14px] text-[#6B7280]">
                  {new Date(creditNote.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {creditNote.status === "Approved" && creditNote.approvedBy && (
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-[#059669] mt-2"></div>
                <div>
                  <p className="text-[#111827]">Approved by {creditNote.approvedBy}</p>
                  <p className="text-[14px] text-[#6B7280]">
                    {new Date(creditNote.approvedAt || "").toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {creditNote.status === "Rejected" && creditNote.rejectedBy && (
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-[#DC2626] mt-2"></div>
                <div>
                  <p className="text-[#111827]">Rejected by {creditNote.rejectedBy}</p>
                  <p className="text-[14px] text-[#6B7280]">
                    {new Date(creditNote.rejectedAt || "").toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print / Document Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none">
          <div className="flex justify-between items-center print:hidden mb-4">
            <DialogHeader>
              <DialogTitle>Credit Note - Print Preview</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setShowPrintModal(false)}>Close</Button>
            </div>
          </div>
          <div ref={printRef} className="space-y-4 p-4 border rounded-lg">
            <div className="border-b-2 border-[#F15929] pb-4">
              <h2 className="text-xl font-semibold text-[#231F20]">Power Metal & Steel</h2>
              <p className="text-sm text-[#6B7280]">Credit Note</p>
              <p className="text-lg font-medium mt-2">{creditNote.creditNoteNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-[#6B7280]">Customer:</span> {creditNote.customerName}</p>
              <p><span className="text-[#6B7280]">Date:</span> {creditNote.date}</p>
              <p><span className="text-[#6B7280]">Status:</span> {creditNote.status}</p>
              <p><span className="text-[#6B7280]">Amount:</span> RM {creditNote.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
              <p className="col-span-2"><span className="text-[#6B7280]">Reason:</span> {creditNote.reason}</p>
            </div>
            {creditNote.items && creditNote.items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNote.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">RM {Number(item.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onReject={handleReject}
        creditNoteNumber={creditNote.creditNoteNumber}
      />
    </div>
  );
}
