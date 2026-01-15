import { useState } from "react";
import { ArrowLeft, Download, CheckCircle, XCircle, FileText, Image as ImageIcon } from "lucide-react";
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
import { toast } from "sonner@2.0.3";

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

  const canApprove = (userRole === "Admin" || userRole === "Finance") && 
                     creditNote.status === "Pending Approval";

  const handleApprove = () => {
    onApprove(creditNote.id);
  };

  const handleReject = (reason: string) => {
    onReject(creditNote.id, reason);
  };

  const handleDownloadPDF = () => {
    toast.success("PDF download started");
    // In a real app, this would generate and download a PDF
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
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          className="h-10 px-6 rounded-lg"
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
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
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNote.items.map((item) => (
                <TableRow key={item.id} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.description}</TableCell>
                  <TableCell className="text-right text-[#374151]">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right text-[#374151]">
                    RM{item.unitPrice.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#111827]">
                    RM{item.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableCell colSpan={3} className="text-right">
                  Total
                </TableCell>
                <TableCell className="text-right text-[#111827]">
                  RM{creditNote.amount.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
