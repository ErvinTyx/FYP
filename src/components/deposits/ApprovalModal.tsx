import { CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (referenceId: string) => void;
  depositId: string;
  customerName: string;
  amount: number;
}

export function ApprovalModal({
  isOpen,
  onClose,
  onApprove,
  depositId,
  customerName,
  amount,
}: ApprovalModalProps) {
  const [referenceId, setReferenceId] = useState("");
  const [error, setError] = useState("");

  const handleApprove = () => {
    if (!referenceId.trim()) {
      setError("Bank Reference Number is required");
      return;
    }
    onApprove(referenceId.trim());
    setReferenceId("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setReferenceId("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[#059669]" />
            Approve Payment
          </DialogTitle>
          <DialogDescription>
            Enter the bank reference number to approve this deposit payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-[14px] text-[#374151]">Deposit ID:</span>
              <span className="text-[#111827]">{depositId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-[#374151]">Customer:</span>
              <span className="text-[#111827]">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-[#374151]">Amount:</span>
              <span className="text-[#111827]">RM{amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceId">
              Bank Reference Number <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              id="referenceId"
              placeholder="Enter bank transfer reference number"
              value={referenceId}
              onChange={(e) => {
                setReferenceId(e.target.value);
                setError("");
              }}
              className={error ? "border-[#DC2626]" : ""}
            />
            <p className="text-[12px] text-[#6B7280]">
              Enter the reference number from the customer's bank transfer or payment receipt
            </p>
            {error && (
              <p className="text-[14px] text-[#DC2626]">{error}</p>
            )}
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4">
            <p className="text-[14px] text-[#92400E]">
              <strong>Note:</strong> Once approved, this deposit will be marked as PAID and the customer will be notified. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-10 px-6 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            className="bg-[#059669] hover:bg-[#047857] text-white h-10 px-6 rounded-lg"
          >
            Confirm Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}