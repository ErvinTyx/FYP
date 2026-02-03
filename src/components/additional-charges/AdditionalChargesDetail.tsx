import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
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
import { toast } from "sonner";

const API_STATUS_TO_DISPLAY: Record<string, AdditionalCharge["status"]> = {
  pending_payment: "Pending Payment",
  pending_approval: "Pending Approval",
  approved: "Approved",
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
        toast.success("Payment approved successfully");
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="hover:bg-[#F3F4F6]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1>Additional Charge Details</h1>
            <p className="text-[#374151]">View and manage additional charge information</p>
          </div>
        </div>
        <AdditionalChargeStatusBadge status={charge.status} isOverdue={isOverdue} />
      </div>

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Charge Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Charge ID</p>
              <p className="text-[#231F20]">{charge.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Invoice No.</p>
              <p className="text-[#231F20]">{charge.invoiceNo}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Delivery Order (DO)</p>
              <p className="text-[#231F20]">{charge.doId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Customer Name</p>
              <p className="text-[#231F20]">{charge.customerName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Returned Date</p>
              <p className="text-[#231F20]">
                {charge.returnedDate
                  ? new Date(charge.returnedDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Due Date</p>
              <p className={isDueDatePassed() ? "text-[#DC2626]" : "text-[#231F20]"}>
                {new Date(charge.dueDate).toLocaleDateString()}
                {isOverdue && " (Overdue)"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Total Additional Charges</p>
              <p className="text-[#F15929] text-lg">RM{charge.totalCharges.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {charge.status === "Rejected" && charge.rejectionReason && (
        <Card className="border-[#DC2626] bg-[#FEF2F2]">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-[#991B1B]">
                  <strong>Rejected Reason:</strong>
                </p>
                <p className="text-sm text-[#DC2626] mt-1">{charge.rejectionReason}</p>
                {canResubmit() && (
                  <p className="text-xs text-[#991B1B] mt-2">
                    You can resubmit proof of payment until the charge is approved.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {charge.status === "Approved" && charge.referenceId && (
        <Card className="border-[#10B981] bg-[#ECFDF5]">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-[#10B981] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-[#065F46]">
                  <strong>Payment Approved</strong>
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-[#065F46]">
                    Reference ID: <strong>{charge.referenceId}</strong>
                  </p>
                  {charge.approvalDate && (
                    <p className="text-sm text-[#065F46]">
                      Approved on: {new Date(charge.approvalDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
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

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Proof of Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {proofDisplay ? (
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-[#F15929]" />
                <div>
                  <p className="text-sm text-[#231F20]">
                    {typeof proofDisplay === "string" && proofDisplay.startsWith("/")
                      ? proofDisplay.split("/").pop()
                      : proofDisplay}
                  </p>
                  <p className="text-xs text-[#6B7280]">Uploaded proof of payment</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-lg"
                onClick={() =>
                  typeof proofDisplay === "string" &&
                  proofDisplay.startsWith("/") &&
                  window.open(proofDisplay, "_blank")
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
              <p className="text-sm text-[#6B7280]">No proof of payment uploaded yet.</p>
              {(charge.status === "Pending Payment" ||
                charge.status === "Rejected" ||
                (charge.status === "Pending Approval" && isOverdue)) && (
                <Button
                  onClick={() => setUploadModalOpen(true)}
                  className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg shrink-0"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Proof of Payment
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
        chargeId={charge.id}
      />
      <ApproveModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onApprove={handleApproveConfirmed}
        chargeId={charge.id}
      />
      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onReject={handleRejectConfirmed}
        chargeId={charge.id}
      />
    </div>
  );
}
