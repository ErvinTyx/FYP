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

  const handlePopUploaded = (file: File) => {
    const updatedCharge = {
      ...charge,
      proofOfPayment: file.name,
      status: "Pending Approval" as const,
      lastUpdated: new Date().toLocaleString(),
    };
    setCharge(updatedCharge);
    onUpdate(updatedCharge);
    toast.success("Proof of payment uploaded successfully");
  };

  const handleApproveConfirmed = (referenceId: string) => {
    const updatedCharge = {
      ...charge,
      status: "Approved" as const,
      referenceId,
      approvalDate: new Date().toISOString().split("T")[0],
      lastUpdated: new Date().toLocaleString(),
    };
    setCharge(updatedCharge);
    onUpdate(updatedCharge);
    toast.success("Payment approved successfully");
  };

  const handleRejectConfirmed = (reason: string) => {
    const updatedCharge = {
      ...charge,
      status: "Rejected" as const,
      rejectionReason: reason,
      rejectionDate: new Date().toISOString().split("T")[0],
      lastUpdated: new Date().toLocaleString(),
    };
    setCharge(updatedCharge);
    onUpdate(updatedCharge);
    toast.error("Payment rejected");
  };

  const canResubmit = (): boolean => {
    if (charge.status !== "Rejected") return false;
    const dueDate = new Date(charge.dueDate);
    const today = new Date();
    return today <= dueDate;
  };

  const isDueDatePassed = (): boolean => {
    const dueDate = new Date(charge.dueDate);
    const today = new Date();
    return today > dueDate;
  };

  const getItemTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Missing":
        return "bg-[#FEE2E2] text-[#991B1B]";
      case "Damaged":
        return "bg-[#FED7AA] text-[#9A3412]";
      case "Repair":
        return "bg-[#DBEAFE] text-[#1E40AF]";
      case "Cleaning":
        return "bg-[#E0E7FF] text-[#3730A3]";
      default:
        return "bg-[#F3F4F6] text-[#374151]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <AdditionalChargeStatusBadge status={charge.status} />
      </div>

      {/* Summary Card */}
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
                {new Date(charge.returnedDate).toLocaleDateString()}
              </p>
            </div>
            {charge.inspectionReportId && (
              <div className="space-y-1">
                <p className="text-sm text-[#6B7280]">Inspection Report ID</p>
                <p className="text-[#231F20]">{charge.inspectionReportId}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Due Date</p>
              <p className={isDueDatePassed() ? "text-[#DC2626]" : "text-[#231F20]"}>
                {new Date(charge.dueDate).toLocaleDateString()}
                {isDueDatePassed() && " (Overdue)"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Last Updated</p>
              <p className="text-[#231F20]">{charge.lastUpdated}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#6B7280]">Total Additional Charges</p>
              <p className="text-[#F15929] text-lg">RM{charge.totalCharges.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejected Status Message */}
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
                    You can resubmit proof of payment until{" "}
                    {new Date(charge.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Status Info */}
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

      {/* Line Items */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Item Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#E5E7EB]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <TableHead className="text-[#374151]">Item Name</TableHead>
                  <TableHead className="text-[#374151]">Type</TableHead>
                  <TableHead className="text-[#374151]">Quantity</TableHead>
                  <TableHead className="text-[#374151]">Unit Price (RM)</TableHead>
                  <TableHead className="text-[#374151]">Amount (RM)</TableHead>
                  <TableHead className="text-[#374151]">Remark</TableHead>
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
                    <TableCell className="text-[#231F20]">{item.quantity}</TableCell>
                    <TableCell className="text-[#231F20]">{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-[#231F20]">{item.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-[#6B7280] text-sm">
                      {item.remark || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-[#FEF2F2] hover:bg-[#FEF2F2]">
                  <TableCell colSpan={4} className="text-right text-[#231F20]">
                    <strong>Total Additional Charges:</strong>
                  </TableCell>
                  <TableCell colSpan={2} className="text-[#F15929]">
                    <strong>RM{charge.totalCharges.toFixed(2)}</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Proof of Payment */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Proof of Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {charge.proofOfPayment ? (
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-[#F15929]" />
                <div>
                  <p className="text-sm text-[#231F20]">{charge.proofOfPayment}</p>
                  <p className="text-xs text-[#6B7280]">Uploaded proof of payment</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-lg"
                onClick={() => toast.info("Download functionality would be implemented here")}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-[#D1D5DB] rounded-lg bg-[#F9FAFB]">
              <Upload className="h-12 w-12 text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-sm text-[#6B7280]">No proof of payment uploaded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-[#E5E7EB]">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {charge.status === "Pending Payment" && (
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Proof of Payment
              </Button>
            )}

            {charge.status === "Pending Approval" && (
              <>
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
              </>
            )}

            {charge.status === "Rejected" && canResubmit() && (
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
              >
                <Upload className="h-4 w-4 mr-2" />
                Resubmit Proof of Payment
              </Button>
            )}

            {charge.status === "Rejected" && !canResubmit() && (
              <div className="w-full p-4 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg">
                <p className="text-sm text-[#92400E]">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  The due date has passed. Resubmission is no longer available.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
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
