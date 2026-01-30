import { useState } from "react";
import { ArrowLeft, Download, FileText, Upload, CheckCircle, XCircle, AlertCircle, Calendar, FileSignature, CalendarClock, Ban } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { DepositStatusBadge } from "./DepositStatusBadge";
import { PaymentProofUpload } from "./PaymentProofUpload";
import { ApprovalModal } from "./ApprovalModal";
import { RejectionModal } from "./RejectionModal";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { Deposit, DepositDocument } from "../../types/deposit";
import { toast } from "sonner";

interface DepositDetailsProps {
  deposit: Deposit;
  onBack: () => void;
  onSubmitPayment: (depositId: string, file: File) => void;
  onApprove: (depositId: string, referenceId: string) => void;
  onReject: (depositId: string, reason: string) => void;
  onGenerateNewInvoice: (depositId: string) => void;
  onPrintReceipt?: (depositId: string) => void;
  onResetDueDate?: (depositId: string, newDueDate: string) => void;
  onMarkExpired?: (depositId: string) => void;
  userRole: "super_user" | "Admin" | "Finance" | "Staff" | "Customer";
  isProcessing?: boolean;
}

export function DepositDetails({
  deposit,
  onBack,
  onSubmitPayment,
  onApprove,
  onReject,
  onGenerateNewInvoice,
  onPrintReceipt,
  onResetDueDate,
  onMarkExpired,
  userRole,
  isProcessing,
}: DepositDetailsProps) {
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{doc: DepositDocument, title: string} | null>(null);
  const [resetDueDateModalOpen, setResetDueDateModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [confirmExpireModalOpen, setConfirmExpireModalOpen] = useState(false);

  // DEBUG: Log userRole and deposit status to help troubleshoot
  console.log("DEBUG DepositDetails:", { userRole, depositStatus: deposit.status, depositId: deposit.id });
  
  const canUploadPayment = userRole === "Customer" && (deposit.status === "Pending Payment" || (deposit.status === "Rejected" && !deposit.isOverdue));
  const canAdminUploadPayment = (userRole === "super_user" || userRole === "Admin" || userRole === "Finance" || userRole === "Staff") && (deposit.status === "Pending Payment" || deposit.status === "Rejected" || deposit.status === "Overdue") && !deposit.paymentProof;
  const canApprove = (userRole === "super_user" || userRole === "Admin" || userRole === "Finance") && deposit.status === "Pending Approval";
  
  // DEBUG: Log canApprove result
  console.log("DEBUG canApprove:", { canApprove, userRole, status: deposit.status });
  const isCustomerView = userRole === "Customer";
  const isAdminView = userRole === "super_user" || userRole === "Admin" || userRole === "Finance";
  const isOverdue = deposit.status === "Overdue";
  const isExpired = deposit.status === "Expired";
  const isRejected = deposit.status === "Rejected";
  const isBeforeDueDate = new Date() < new Date(deposit.dueDate);
  const canReupload = isRejected && isBeforeDueDate;
  
  // Get display values from new structure or fallback to legacy
  const displayDepositId = deposit.depositNumber || deposit.depositId || deposit.id;
  const displayCustomerName = deposit.customerName || deposit.agreement?.hirer || 'Unknown';
  const displayInvoiceNo = deposit.invoiceNo || deposit.agreement?.agreementNumber || '-';
  const displayCustomerId = deposit.customerId || deposit.agreement?.id || '-';
  const displayLastUpdated = deposit.lastUpdated || deposit.updatedAt || deposit.createdAt;

  const handleSubmitPayment = () => {
    if (!paymentFile) {
      toast.error("Please upload payment proof");
      return;
    }
    onSubmitPayment(deposit.id, paymentFile);
    setPaymentFile(null);
  };

  const handleApprove = (referenceId: string) => {
    onApprove(deposit.id, referenceId);
  };

  const handleReject = (reason: string) => {
    onReject(deposit.id, reason);
  };

  const handlePreviewDocument = (doc: DepositDocument, title: string) => {
    setPreviewDocument({ doc, title });
  };
  
  const handleResetDueDate = () => {
    if (onResetDueDate && newDueDate) {
      onResetDueDate(deposit.id, newDueDate);
      setResetDueDateModalOpen(false);
      setNewDueDate("");
    }
  };
  
  const handleMarkExpired = () => {
    if (onMarkExpired) {
      onMarkExpired(deposit.id);
      setConfirmExpireModalOpen(false);
    }
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
              <h1>{displayDepositId}</h1>
              <DepositStatusBadge status={deposit.status} />
            </div>
            <p className="text-[#374151]">
              Last updated: {new Date(displayLastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Expired Status Info */}
      {isExpired && (
        <Card className="border-[#6B7280] bg-[#F9FAFB]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Ban className="h-6 w-6 text-[#6B7280] mt-0.5" />
              <div className="flex-1">
                <p className="text-[#374151] font-semibold">
                  Deposit Expired
                </p>
                <p className="text-[14px] text-[#6B7280] mt-2">
                  This deposit has been marked as expired and is no longer active. 
                  No further actions can be taken on this deposit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Warning - Customer View */}
      {isOverdue && isCustomerView && (
        <Card className="border-[#EA580C] bg-[#FFF7ED]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-[#EA580C] mt-0.5" />
              <div className="flex-1">
                <p className="text-[#EA580C]">
                  ⚠ Payment Overdue
                </p>
                <p className="text-[14px] text-[#9A3412] mt-2">
                  The payment period has expired. You can no longer upload payment proof for this deposit.
                </p>
                <p className="text-[14px] text-[#6B7280] mt-2">
                  Please wait for the admin or finance team to issue a new invoice for this deposit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Warning - Admin View */}
      {isOverdue && isAdminView && (
        <Card className="border-[#EA580C] bg-[#FFF7ED]">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-[#EA580C] mt-0.5" />
                <div>
                  <p className="text-[#EA580C] font-semibold">
                    Payment Overdue
                  </p>
                  <p className="text-[14px] text-[#9A3412] mt-1">
                    Payment period has expired. You can extend the due date, mark as expired, or generate a new invoice.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 justify-end w-[100px]">
                {onResetDueDate && (
                  <Button
                    onClick={() => {
                      const defaultDate = new Date();
                      defaultDate.setDate(defaultDate.getDate() + 14);
                      setNewDueDate(defaultDate.toISOString().split('T')[0]);
                      setResetDueDateModalOpen(true);
                    }}
                    variant="outline"
                    className="h-10 px-4 rounded-lg border-[#F59E0B] text-[#F59E0B] hover:bg-[#FFFBEB]"
                    disabled={isProcessing}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Reset Due Date
                  </Button>
                )}
                {onMarkExpired && (
                  <Button
                    onClick={() => setConfirmExpireModalOpen(true)}
                    variant="outline"
                    className="h-10 px-4 rounded-lg border-[#6B7280] text-[#6B7280] hover:bg-[#F9FAFB]"
                    disabled={isProcessing}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Mark as Expired
                  </Button>
                )}
                <Button
                  onClick={() => onGenerateNewInvoice(deposit.id)}
                  className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
                  disabled={isProcessing}
                >
                  <FileSignature className="mr-2 h-4 w-4" />
                  Generate New Invoice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Approval Actions */}
      {canApprove && (
        <Card className="border-[#F15929] bg-[#FFF7F5]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#231F20]">
                  Payment Review Required
                </p>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  Customer has submitted payment proof. Please review and approve or reject.
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
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="bg-[#059669] hover:bg-[#047857] text-white h-10 px-6 rounded-lg"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Info */}
      {deposit.status === "Rejected" && deposit.rejectionReason && (
        <Card className="border-[#DC2626] bg-[#FEF2F2]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-[#DC2626] mt-0.5" />
              <div className="flex-1">
                <p className="text-[#991B1B]">
                  Payment Rejected
                </p>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  Rejected by {deposit.rejectedBy || "Admin"} on {new Date(deposit.rejectedAt || "").toLocaleDateString()}
                </p>
                <div className="mt-3 p-3 bg-white rounded-lg border border-[#FEE2E2]">
                  <p className="text-[14px] text-[#111827]">
                    <span className="text-[#991B1B]">Reason:</span> {deposit.rejectionReason}
                  </p>
                </div>
                {isCustomerView && (
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
      {deposit.status === "Paid" && (
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
                      Approved by {deposit.approvedBy || "Admin"} on {new Date(deposit.approvedAt || "").toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {onPrintReceipt && (
                  <Button
                    onClick={() => onPrintReceipt(deposit.id)}
                    className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Receipt
                  </Button>
                )}
              </div>
              {(deposit.referenceNumber || deposit.referenceId || deposit.transactionId) && (
                <div className="bg-white rounded-lg border border-[#BBF7D0] p-4">
                  <p className="text-[14px] text-[#6B7280]">Bank Reference Number</p>
                  <p className="text-[#111827] mt-1 font-mono">
                    {deposit.referenceNumber || deposit.referenceId || deposit.transactionId}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice & Agreement Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Deposit Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Deposit Number</p>
              <p className="text-[#111827]">{displayDepositId}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Agreement Number</p>
              <p className="text-[#111827]">{displayInvoiceNo}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Customer Name</p>
              <p className="text-[#111827]">{displayCustomerName}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Deposit Amount</p>
              <p className="text-[#111827] font-semibold">
                RM{deposit.depositAmount.toLocaleString()}
              </p>
            </div>
            {deposit.referenceNumber && (
              <div>
                <p className="text-[14px] text-[#6B7280]">Reference Number</p>
                <p className="text-[#111827]">{deposit.referenceNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Due Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#6B7280]" />
                <p className={isOverdue ? "text-[#DC2626]" : "text-[#111827]"}>
                  {new Date(deposit.dueDate).toLocaleDateString()}
                  {isOverdue && " (Overdue)"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Current Status</p>
              <div className="mt-2">
                <DepositStatusBadge status={deposit.status} />
              </div>
            </div>
            {deposit.paymentSubmittedAt && (
              <div>
                <p className="text-[14px] text-[#6B7280]">Payment Submitted</p>
                <p className="text-[#111827]">
                  {new Date(deposit.paymentSubmittedAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Proof Upload (Admin/Staff View - Pending Payment) */}
      {canAdminUploadPayment && (
        <Card className="border-[#E5E5E5] bg-white shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-[18px]">Upload Proof of Payment</CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              Upload payment proof such as receipt, bank slip, transfer confirmation, or any supporting evidence
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaymentProofUpload
              onFileSelect={setPaymentFile}
              existingFile={paymentFile}
            />
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3">
              <p className="text-[14px] text-[#92400E]">
                <strong>Note:</strong> Once uploaded, the status will change to "Pending Approval" for review.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSubmitPayment}
                disabled={!paymentFile}
                className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg disabled:opacity-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                Submit Proof of Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof Upload (Customer View) */}
      {canUploadPayment && !isOverdue && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Upload Payment Proof</CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              Upload your payment receipt or bank transfer proof to complete this deposit payment
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaymentProofUpload
              onFileSelect={setPaymentFile}
              existingFile={paymentFile}
            />
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSubmitPayment}
                disabled={!paymentFile}
                className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg disabled:opacity-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                Submit Payment Proof
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Re-upload for Rejected (Customer View) */}
      {isCustomerView && deposit.status === "Rejected" && !isOverdue && isBeforeDueDate && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Re-upload Payment Proof</CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              Please upload the correct payment proof based on the rejection reason above
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaymentProofUpload
              onFileSelect={setPaymentFile}
              existingFile={paymentFile}
            />
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSubmitPayment}
                disabled={!paymentFile}
                className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg disabled:opacity-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                Submit for Re-Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected After Due Date Warning (Customer View) */}
      {isCustomerView && deposit.status === "Rejected" && !isBeforeDueDate && (
        <Card className="border-[#DC2626] bg-[#FEF2F2]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-[#DC2626] mt-0.5" />
              <div className="flex-1">
                <p className="text-[#DC2626]">
                  Cannot Re-Upload After Due Date
                </p>
                <p className="text-[14px] text-[#991B1B] mt-2">
                  This deposit can no longer be re-submitted after the due date ({new Date(deposit.dueDate).toLocaleDateString()}).
                </p>
                <p className="text-[14px] text-[#6B7280] mt-2">
                  Please contact the admin or finance team for assistance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof (Submitted - View Only) */}
      {deposit.paymentProof && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Payment Proof</CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              Submitted on {new Date(deposit.paymentSubmittedAt || "").toLocaleString()}
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
                        {deposit.paymentProof.fileName}
                      </p>
                      <p className="text-[12px] text-[#6B7280]">
                        {(deposit.paymentProof.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewDocument(deposit.paymentProof!, "Payment Proof")}
                      className="h-9 px-4 rounded-lg"
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 rounded-lg"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Linked Invoice Info (for Overdue deposits) */}
      {deposit.linkedToNewInvoice && (
        <Card className="border-[#E5E7EB] bg-[#F0FDF4]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-[#059669]" />
              <div>
                <p className="text-[#047857]">
                  New Invoice Generated
                </p>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  This overdue deposit has been linked to new invoice: <span className="text-[#111827]">{deposit.linkedToNewInvoice}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onApprove={handleApprove}
        depositId={displayDepositId}
        customerName={displayCustomerName}
        amount={deposit.depositAmount}
      />

      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onReject={handleReject}
        depositId={displayDepositId}
      />

      {previewDocument && (
        <DocumentPreviewModal
          isOpen={true}
          onClose={() => setPreviewDocument(null)}
          document={previewDocument.doc}
          title={previewDocument.title}
        />
      )}
      
      {/* Reset Due Date Modal */}
      <Dialog open={resetDueDateModalOpen} onOpenChange={setResetDueDateModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Due Date</DialogTitle>
            <DialogDescription>
              Set a new due date for this overdue deposit. The deposit will return to "Pending Payment" status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-due-date-detail">
                New Due Date
              </Label>
              <Input
                id="new-due-date-detail"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="max-w-[200px]"
              />
            </div>
            <div className="text-sm text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg">
              <p><strong>Deposit:</strong> {displayDepositId}</p>
              <p><strong>Customer:</strong> {displayCustomerName}</p>
              <p><strong>Amount:</strong> RM{deposit.depositAmount.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setResetDueDateModalOpen(false);
                setNewDueDate("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetDueDate}
              disabled={!newDueDate || isProcessing}
              className="bg-[#F15929] hover:bg-[#D14620] text-white"
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Reset Due Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Mark as Expired Modal */}
      <Dialog open={confirmExpireModalOpen} onOpenChange={setConfirmExpireModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Mark as Expired</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this deposit as expired? This action indicates the deposit is no longer active and cannot be reversed easily.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 text-sm">
            <p><strong>Deposit:</strong> {displayDepositId}</p>
            <p><strong>Customer:</strong> {displayCustomerName}</p>
            <p><strong>Amount:</strong> RM{deposit.depositAmount.toLocaleString()}</p>
            <p><strong>Original Due Date:</strong> {new Date(deposit.dueDate).toLocaleDateString()}</p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmExpireModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMarkExpired}
              disabled={isProcessing}
              variant="destructive"
            >
              <Ban className="mr-2 h-4 w-4" />
              Mark as Expired
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}