import { useState } from "react";
import { XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  depositId: string;
}

export function RejectionModal({
  isOpen,
  onClose,
  onReject,
  depositId,
}: RejectionModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleReject = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Rejection reason must be at least 10 characters");
      return;
    }

    onReject(reason);
    setReason("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-[#DC2626]" />
            Reject Payment
          </DialogTitle>
          <DialogDescription>
            You are about to reject the payment for deposit {depositId}. Please provide a detailed reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">
              Rejection Reason <span className="text-[#DC2626]">*</span>
            </label>
            <Textarea
              placeholder="Enter detailed reason for rejection (e.g., unclear payment proof, incorrect amount, expired document)..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              className="min-h-[150px] border-[#D1D5DB] rounded-md"
            />
            {error && (
              <p className="text-[12px] text-[#DC2626]">{error}</p>
            )}
          </div>

          <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4">
            <p className="text-[14px] text-[#991B1B]">
              <strong>Important:</strong> The customer will be notified of this rejection and can re-upload payment proof. Make sure to provide clear instructions on what needs to be corrected.
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
            onClick={handleReject}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white h-10 px-6 rounded-lg"
          >
            Confirm Rejection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
