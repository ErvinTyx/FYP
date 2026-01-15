import { useState } from "react";
import { X } from "lucide-react";
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
  creditNoteNumber: string;
}

export function RejectionModal({
  isOpen,
  onClose,
  onReject,
  creditNoteNumber,
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
          <DialogTitle>Reject Credit Note</DialogTitle>
          <DialogDescription>
            You are about to reject credit note {creditNoteNumber}. Please provide a reason for rejection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">
              Rejection Reason <span className="text-[#DC2626]">*</span>
            </label>
            <Textarea
              placeholder="Enter detailed reason for rejection..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              className="min-h-[120px] border-[#D1D5DB] rounded-md"
            />
            {error && (
              <p className="text-[12px] text-[#DC2626]">{error}</p>
            )}
          </div>

          <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4">
            <p className="text-[14px] text-[#991B1B]">
              This action will reject the credit note and notify the creator. The credit note can be revised and resubmitted.
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
            Reject Credit Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
