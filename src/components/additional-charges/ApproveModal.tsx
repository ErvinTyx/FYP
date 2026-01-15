import { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner@2.0.3";

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (referenceId: string) => void;
  chargeId: string;
}

export function ApproveModal({ isOpen, onClose, onApprove, chargeId }: ApproveModalProps) {
  const [referenceId, setReferenceId] = useState("");

  if (!isOpen) return null;

  const handleApprove = () => {
    if (!referenceId.trim()) {
      toast.error("Please enter a reference/transaction ID");
      return;
    }

    onApprove(referenceId);
    setReferenceId("");
    onClose();
  };

  const handleClose = () => {
    setReferenceId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#D1FAE5] flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-[#065F46]" />
            </div>
            <h2 className="text-[18px] text-[#231F20]">Approve Payment</h2>
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
            You are about to approve Additional Charge <strong>{chargeId}</strong>. Please enter
            the reference/transaction ID for record purposes.
          </p>

          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">
              Reference ID / Transaction ID <span className="text-[#DC2626]">*</span>
            </label>
            <Input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g., TXN-20241210-001"
              className="h-10 border-[#D1D5DB] rounded-md"
            />
          </div>

          <div className="bg-[#D1FAE5] border border-[#10B981] rounded-lg p-3">
            <p className="text-xs text-[#065F46]">
              <strong>Confirmation:</strong> Once approved, this action cannot be undone. The
              payment will be marked as completed.
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
            onClick={handleApprove}
            className="bg-[#10B981] hover:bg-[#059669] text-white h-10 px-6 rounded-lg"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
