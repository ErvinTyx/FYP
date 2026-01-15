import { useState } from "react";
import { ArrowLeft, FileText, CheckCircle, XCircle, Edit, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { toast } from "sonner@2.0.3";
import { RefundRecord, RefundStatus } from "./RefundManagementMain";

interface RefundDetailsProps {
  refund: RefundRecord;
  userRole: "Admin" | "Finance" | "Staff" | "Customer";
  onBack: () => void;
  onApprove: (refundId: string) => void;
  onReject: (refundId: string, reason: string) => void;
  onUpdate: (refund: RefundRecord) => void;
}

export function RefundDetails({ 
  refund, 
  userRole, 
  onBack, 
  onApprove, 
  onReject,
  onUpdate 
}: RefundDetailsProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(refund.supportingDocs || []);

  const canApprove = (userRole === "Admin" || userRole === "Finance") && refund.status === "Pending Approval";
  const canReupload = refund.status === "Rejected";

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case "Draft":
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">Draft</Badge>;
      case "Pending Approval":
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Pending Approval</Badge>;
      case "Approved":
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Approved</Badge>;
      case "Rejected":
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Rejected</Badge>;
    }
  };

  const handleApprove = () => {
    onApprove(refund.id);
    setShowApproveDialog(false);
    toast.success("Refund approved successfully");
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    onReject(refund.id, rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason("");
    toast.success("Refund rejected");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => file.name);
      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);
      
      // Update refund with new files and change status back to Pending Approval
      const updatedRefund: RefundRecord = {
        ...refund,
        supportingDocs: updatedFiles,
        status: "Pending Approval",
        rejectionReason: undefined,
      };
      onUpdate(updatedRefund);
      toast.success("Documents uploaded. Status changed to Pending Approval.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hover:bg-[#F3F4F6]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1>{refund.refundId}</h1>
            <p className="text-[#374151]">Refund request details and approval workflow</p>
          </div>
        </div>
        {getStatusBadge(refund.status)}
      </div>

      {/* Refund Information */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Refund Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Refund ID</p>
              <p className="text-[#111827]">{refund.refundId}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Created Date</p>
              <p className="text-[#111827]">{refund.createdDate}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Invoice No</p>
              <p className="text-[#111827]">{refund.invoiceNo}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Invoice Type</p>
              <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                {refund.invoiceType}
              </Badge>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Customer</p>
              <p className="text-[#111827]">{refund.customer}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Refund Method</p>
              <p className="text-[#111827]">{refund.refundMethod || "Not specified"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Summary */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[14px] text-[#6B7280]">Invoice Items:</span>
            <span className="text-[14px] text-[#111827]">{refund.invoiceItems}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[14px] text-[#6B7280]">Paid Amount:</span>
            <span className="text-[14px] text-[#111827]">{refund.paidAmount}</span>
          </div>
          <div className="border-t border-[#E5E7EB] pt-3 flex justify-between">
            <span className="text-[#111827]">Refund Amount:</span>
            <span className="text-[#059669]">{refund.refundAmount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Refund Reason */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Reason for Refund</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#374151]">{refund.reason || "No reason provided"}</p>
        </CardContent>
      </Card>

      {/* Supporting Documents */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[18px]">Supporting Documents</CardTitle>
            {canReupload && (
              <div>
                <input
                  id="reupload-docs"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('reupload-docs')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Documents
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {uploadedFiles.length > 0 ? (
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-[#F9FAFB] rounded-lg">
                  <FileText className="h-4 w-4 text-[#6B7280]" />
                  <span className="text-[14px] text-[#374151]">{file}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#6B7280]">No documents uploaded</p>
          )}
        </CardContent>
      </Card>

      {/* Rejection Reason (if rejected) */}
      {refund.status === "Rejected" && refund.rejectionReason && (
        <Card className="border-[#DC2626] bg-[#FEE2E2]">
          <CardHeader>
            <CardTitle className="text-[18px] text-[#DC2626]">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#991B1B]">{refund.rejectionReason}</p>
            <p className="text-[12px] text-[#991B1B] mt-2">
              Please upload additional documents and the status will automatically change to Pending Approval.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approval Information (if approved) */}
      {refund.status === "Approved" && (
        <Card className="border-[#059669] bg-[#D1FAE5]">
          <CardHeader>
            <CardTitle className="text-[18px] text-[#059669]">Approval Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[14px] text-[#065F46]">Approved By:</span>
              <span className="text-[14px] text-[#065F46]">{refund.approvedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-[#065F46]">Approved Date:</span>
              <span className="text-[14px] text-[#065F46]">{refund.approvedDate}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Actions (for Finance/Admin only) */}
      {canApprove && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Approval Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-[#059669] hover:bg-[#047857] h-10"
                onClick={() => setShowApproveDialog(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Refund
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C]"
                onClick={() => setShowRejectDialog(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Refund
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this refund of {refund.refundAmount} for {refund.customer}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-[#059669] hover:bg-[#047857]"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this refund request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2 min-h-[100px]"
              placeholder="Explain why this refund is being rejected..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
