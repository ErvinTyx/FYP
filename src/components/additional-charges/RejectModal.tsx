import { useState } from "react";
import { X, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  invoiceNo: string;
}

export function RejectModal({ isOpen, onClose, onReject, invoiceNo }: RejectModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleReject = () => {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    onReject(reason);
    setReason("");
    onClose();
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
              <XCircle className="h-5 w-5 text-[#991B1B]" />
            </div>
            <h2 className="text-[18px] text-[#231F20]">Reject Payment</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-[#6B7280] hover:text-[#231F20] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#6B7280]">
            You are about to reject Additional Charge <strong>{invoiceNo}</strong>. Please provide
            a clear reason for rejection.
          </p>

          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">
              Rejection Reason <span className="text-[#DC2626]">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the payment proof is being rejected..."
              className="min-h-[120px] border-[#D1D5DB] rounded-md"
            />
          </div>

          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-lg p-3">
            <p className="text-xs text-[#92400E]">
              <strong>Note:</strong> The customer can resubmit a new proof of payment until the
              due date.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#E5E7EB]">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-10 px-6 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white h-10 px-6 rounded-lg"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
