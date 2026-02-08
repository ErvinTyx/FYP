import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
} from "lucide-react";
import { formatRfqDate } from "../../lib/rfqDate";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { AdditionalChargeStatusBadge } from "./AdditionalChargeStatusBadge";
import { UploadPopModal } from "./UploadPopModal";
import { ApproveModal } from "./ApproveModal";
import { RejectModal } from "./RejectModal";
import { AdditionalCharge } from "../../types/additionalCharge";
import { useCreditNotesForSource } from "../../hooks/useCreditNotesForSource";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const API_STATUS_TO_DISPLAY: Record<string, AdditionalCharge["status"]> = {
  pending_payment: "Pending Payment",
  pending_approval: "Pending Approval",
  paid: "Paid",
  rejected: "Rejected",
};

function mapApiChargeToDisplay(api: {
  id: string;
  invoiceNo: string;
  doId: string;
  customerName: string;
  returnedDate?: string | null;
  dueDate: string;
  status: string;
  totalCharges: number;
  proofOfPaymentUrl?: string | null;
  referenceId?: string | null;
  rejectionReason?: string | null;
  approvalDate?: string | null;
  rejectionDate?: string | null;
  items: Array<{ id: string; itemName: string; itemType: string; repairDescription?: string | null; quantity: number; unitPrice: number; amount: number }>;
}): AdditionalCharge {
  return {
    id: api.id,
    invoiceNo: api.invoiceNo,
    doId: api.doId,
    customerName: api.customerName,
    returnedDate: api.returnedDate ?? undefined,
    totalCharges: api.totalCharges,
    status: API_STATUS_TO_DISPLAY[api.status] ?? ("Pending Payment" as AdditionalCharge["status"]),
    dueDate: api.dueDate,
    lastUpdated: api.approvalDate ?? api.rejectionDate ?? api.dueDate,
    items: api.items.map((i) => ({
      id: i.id,
      itemName: i.itemName,
      itemType: i.itemType,
      repairDescription: i.repairDescription ?? undefined,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.amount,
    })),
    proofOfPayment: api.proofOfPaymentUrl ?? undefined,
    proofOfPaymentUrl: api.proofOfPaymentUrl ?? undefined,
    referenceId: api.referenceId ?? undefined,
    rejectionReason: api.rejectionReason ?? undefined,
    approvalDate: api.approvalDate ?? undefined,
    rejectionDate: api.rejectionDate ?? undefined,
  };
}

interface AdditionalChargesDetailProps {
  charge: AdditionalCharge;
  onBack: () => void;
  onUpdate: (updatedCharge: AdditionalCharge) => void;
}

export function AdditionalChargesDetail({
  charge: initialCharge,
  onBack,
  onUpdate,
}: AdditionalChargesDetailProps) {
  const [charge, setCharge] = useState<AdditionalCharge>(initialCharge);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
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

  const {
    creditNotes: appliedCreditNotes,
    totalCredited,
    amountToReturn,
    loading: creditNotesLoading,
    error: creditNotesError,
    hasData: hasCreditNoteData,
  } = useCreditNotesForSource("additionalCharge", charge.id);

  const shouldShowPaymentBreakdown =
    ["Pending Payment", "Pending Approval", "Rejected", "Overdue"].includes(charge.status) &&
    (creditNotesLoading || hasCreditNoteData);
  const payableAmount = Math.max(0, charge.totalCharges - totalCredited);
  const showRefundSummary = charge.status === "Paid" && amountToReturn > 0;

  const handlePopUploaded = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/additional-charges/${charge.id}/upload-proof`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }
      const result = await res.json();
      if (result.success && result.data) {
        const updated = mapApiChargeToDisplay(result.data);
        setCharge(updated);
        onUpdate(updated);
        toast.success("Proof of payment uploaded successfully");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadModalOpen(false);
    }
  };

  const handleApproveConfirmed = async (referenceId: string) => {
    try {
      const res = await fetch(`/api/additional-charges/${charge.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ referenceId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Approve failed");
      }
      const result = await res.json();
      if (result.success && result.data) {
        const updated = mapApiChargeToDisplay(result.data);
        setCharge(updated);
        onUpdate(updated);
        toast.success("Payment marked as paid successfully");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproveModalOpen(false);
    }
  };

  const handleRejectConfirmed = async (reason: string) => {
    try {
      const res = await fetch(`/api/additional-charges/${charge.id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Reject failed");
      }
      const result = await res.json();
      if (result.success && result.data) {
        const updated = mapApiChargeToDisplay(result.data);
        setCharge(updated);
        onUpdate(updated);
        toast.error("Payment rejected");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setRejectModalOpen(false);
    }
  };

  const canResubmit = (): boolean => {
    if (charge.status !== "Rejected") return false;
    return true;
  };

  const isDueDatePassed = (): boolean => {
    return new Date(charge.dueDate) < new Date();
  };

  const isOverdue =
    isDueDatePassed() &&
    (charge.status === "Pending Payment" || charge.status === "Pending Approval");

  const getItemTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Missing":
        return "bg-[#FEE2E2] text-[#991B1B]";
      case "Damaged":
      case "Damage":
        return "bg-[#FED7AA] text-[#9A3412]";
      case "Repair":
        return "bg-[#DBEAFE] text-[#1E40AF]";
      case "Cleaning":
        return "bg-[#E0E7FF] text-[#3730A3]";
      default:
        return "bg-[#F3F4F6] text-[#374151]";
    }
  };

  const proofDisplay = charge.proofOfPaymentUrl ?? charge.proofOfPayment;

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
              <h1>{charge.invoiceNo}</h1>
              <AdditionalChargeStatusBadge status={charge.status} isOverdue={isOverdue} />
            </div>
            <p className="text-[#374151]">
              Last updated: {formatRfqDate(charge.lastUpdated)}
            </p>
          </div>
        </div>
      </div>

      


      {/* Rejection Info */}
      {charge.status === "Rejected" && charge.rejectionReason && (
        <Card className="border-[#DC2626] bg-[#FEF2F2]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-[#DC2626] mt-0.5" />
              <div className="flex-1">
                <p className="text-[#991B1B]">
                  Payment Rejected
                </p>
                {charge.rejectionDate && (
                  <p className="text-[14px] text-[#6B7280] mt-1">
                    Rejected on {formatRfqDate(charge.rejectionDate)}
                  </p>
                )}
                <div className="mt-3 p-3 bg-white rounded-lg border border-[#FEE2E2]">
                  <p className="text-[14px] text-[#111827]">
                    <span className="text-[#991B1B]">Reason:</span> {charge.rejectionReason}
                  </p>
                </div>
                {canResubmit() && (
                  <p className="text-[14px] text-[#6B7280] mt-3">
                    Please review the reason above and re-upload the correct payment proof below.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paid Status Info */}
      {charge.status === "Paid" && (
        <Card className="border-[#059669] bg-[#F0FDF4]">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-[#059669]" />
                  <div>
                    <p className="text-[#047857]">
                      Payment Approved
                    </p>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                      Approved by {charge.uploadedByEmail ? charge.uploadedByEmail.split('@')[0] : "Admin"} on {charge.approvalDate ? formatRfqDate(charge.approvalDate) : formatRfqDate(charge.lastUpdated || charge.dueDate)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => { setShowPrintModal(true); setAutoPrint(false); }}
                  className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Receipt
                </Button>
              </div>
              {charge.referenceId && (
                <div className="bg-white rounded-lg border border-[#BBF7D0] p-4">
                  <p className="text-[14px] text-[#6B7280]">Bank Reference Number</p>
                  <p className="text-[#111827] mt-1 font-mono">{charge.referenceId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charge Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Charge Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Invoice Number</p>
              <p className="text-[#111827]">{charge.invoiceNo}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Delivery Order (DO)</p>
              <p className="text-[#111827]">{charge.doId}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Customer Name</p>
              <p className="text-[#111827]">{charge.customerName}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Total Additional Charges</p>
              <p className="text-[#111827] font-semibold">
                RM{charge.totalCharges.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Returned Date</p>
              <p className="text-[#111827]">
                {charge.returnedDate
                  ? formatRfqDate(charge.returnedDate)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Due Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#6B7280]" />
                <p className={isDueDatePassed() ? "text-[#DC2626]" : "text-[#111827]"}>
                  {formatRfqDate(charge.dueDate)}
                  {isOverdue && " (Overdue)"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Current Status</p>
              <div className="mt-2">
                <AdditionalChargeStatusBadge status={charge.status} isOverdue={isOverdue} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {shouldShowPaymentBreakdown && (
        <Card className="border-[#BFDBFE] bg-[#EFF6FF]">
          <CardHeader>
            <CardTitle className="text-[18px]">Credit Note Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {creditNotesLoading ? (
              <p className="text-sm text-[#6B7280]">Loading credit note adjustments...</p>
            ) : creditNotesError ? (
              <p className="text-sm text-[#DC2626]">{creditNotesError}</p>
            ) : (
              <>
                {appliedCreditNotes.length > 0 && (
                  <div className="rounded-md border border-[#DBEAFE] bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#DBEAFE] hover:bg-[#DBEAFE]">
                          <TableHead className="text-[#1E3A8A]">Description</TableHead>
                          <TableHead className="text-[#1E3A8A] text-right">Amount (RM)</TableHead>
                          <TableHead className="text-[#1E3A8A]">Credit Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appliedCreditNotes.map((note) => (
                          <TableRow key={note.id} className="hover:bg-[#F8FAFC]">
                            <TableCell className="text-[#1F2937]">Reduction of additional charge</TableCell>
                            <TableCell className="text-[#DC2626] text-right">
                              -RM{note.amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-[#4B5563]">{note.creditNoteNumber}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Original amount</span>
                    <span className="text-[#111827]">
                      RM{charge.totalCharges.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Total credit notes applied</span>
                    <span className="text-[#DC2626]">
                      -RM{totalCredited.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#2563EB] bg-white px-4 py-3">
                  <p className="text-sm text-[#1F2937] font-medium">Amount to pay</p>
                  <p className="text-lg font-semibold text-[#1D4ED8]">
                    RM{payableAmount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <p className="text-xs text-[#1D4ED8]">
                  Collect the reduced amount above when processing this payment.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Item Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#E5E7EB]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <TableHead className="text-[#374151]">Name</TableHead>
                  <TableHead className="text-[#374151]">Type</TableHead>
                  <TableHead className="text-[#374151]">Repair description</TableHead>
                  <TableHead className="text-[#374151]">Price (RM)</TableHead>
                  <TableHead className="text-[#374151]">Qty</TableHead>
                  <TableHead className="text-[#374151]">Subtotal (RM)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charge.items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-[#F9FAFB]">
                    <TableCell className="text-[#231F20]">{item.itemName}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getItemTypeBadgeColor(
                          item.itemType
                        )}`}
                      >
                        {item.itemType}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#6B7280] text-sm">
                      {item.repairDescription ?? item.remark ?? "—"}
                    </TableCell>
                    <TableCell className="text-[#231F20]">{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-[#231F20]">{item.quantity}</TableCell>
                    <TableCell className="text-[#231F20]">{item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-[#FEF2F2] hover:bg-[#FEF2F2]">
                  <TableCell colSpan={5} className="text-right text-[#231F20]">
                    <strong>Total Additional Charges:</strong>
                  </TableCell>
                  <TableCell className="text-[#F15929]">
                    <strong>RM{charge.totalCharges.toFixed(2)}</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Proof of Payment Section */}
      {(charge.status === "Pending Payment" ||
        charge.status === "Rejected" ||
        isOverdue) &&
        !proofDisplay && (
        <Card className="border-[#E5E5E5] bg-white shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-[18px]">Upload Proof of Payment</CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              Upload payment proof such as receipt, bank slip, transfer confirmation, or any supporting evidence
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => setUploadModalOpen(true)}
              className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 text-center cursor-pointer hover:border-[#F15929] hover:bg-[#FFF7F5] transition-colors"
            >
              <Upload className="h-10 w-10 text-[#6B7280] mx-auto mb-3" />
              <p className="text-sm text-[#374151] font-medium">Click to upload payment proof</p>
              <p className="text-xs text-[#6B7280] mt-1">PDF, JPG, PNG up to 10MB</p>
            </div>
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3">
              <p className="text-[14px] text-[#92400E]">
                <strong>Note:</strong> Once uploaded, the status will change to "Pending Approval" for review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof (Submitted - View Only) */}
      {proofDisplay && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Payment Proof</CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              Submitted proof of payment for this additional charge
            </p>
          </CardHeader>
          <CardContent>
            <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-10 w-10 text-[#3B82F6]" />
                    <div>
                      <p className="text-[14px] text-[#111827]">
                        {typeof proofDisplay === "string" && proofDisplay.startsWith("/")
                          ? proofDisplay.split("/").pop()
                          : "Payment Proof Document"}
                      </p>
                      <p className="text-[12px] text-[#6B7280]">
                        Uploaded proof of payment
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        typeof proofDisplay === "string" &&
                        proofDisplay.startsWith("/") &&
                        window.open(proofDisplay, "_blank")
                      }
                      className="h-9 px-4 rounded-lg"
                    >
                      View
                    </Button>
                    {charge.status === "Paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 rounded-lg"
                        onClick={() => {
                          if (typeof proofDisplay === "string" && proofDisplay.startsWith("/")) {
                            const link = document.createElement('a');
                            link.href = proofDisplay;
                            link.download = proofDisplay.split("/").pop() || "payment-proof";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {(charge.status === "Pending Approval" && (
        <Card className="border-[#E5E7EB]">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setApproveModalOpen(true)}
                className="bg-[#10B981] hover:bg-[#059669] text-white h-10 px-6 rounded-lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Payment
              </Button>
              <Button
                onClick={() => setRejectModalOpen(true)}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white h-10 px-6 rounded-lg"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <UploadPopModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handlePopUploaded}
        invoiceNo={charge.invoiceNo}
      />
      <ApproveModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onApprove={handleApproveConfirmed}
        invoiceNo={charge.invoiceNo}
      />
      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onReject={handleRejectConfirmed}
        invoiceNo={charge.invoiceNo}
      />

      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none">
          <div className="flex justify-between items-center print:hidden mb-4">
            <DialogHeader>
              <DialogTitle>Additional Charge - Print Preview</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setShowPrintModal(false)}>Close</Button>
            </div>
          </div>
          <div ref={printRef} className="space-y-4 p-4 border rounded-lg">
            <div className="border-b-2 border-[#F15929] pb-4">
              <h2 className="text-xl font-semibold text-[#231F20]">Power Metal & Steel</h2>
              <p className="text-sm text-[#6B7280]">Additional Charge</p>
              <p className="text-lg font-medium mt-2">{charge.invoiceNo}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-[#6B7280]">Customer:</span> {charge.customerName}</p>
              <p><span className="text-[#6B7280]">DO ID:</span> {charge.doId}</p>
              <p><span className="text-[#6B7280]">Status:</span> {charge.status}</p>
              <p><span className="text-[#6B7280]">Total:</span> RM {charge.totalCharges.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
            </div>
            {charge.items && charge.items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charge.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.itemType}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">RM {Number(item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right">RM {Number(item.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
