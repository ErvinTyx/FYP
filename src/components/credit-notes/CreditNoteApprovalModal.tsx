import { CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

interface CreditNoteApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  creditNoteNumber: string;
  customer: string;
  amount: number;
}

export function CreditNoteApprovalModal({
  isOpen,
  onClose,
  onApprove,
  creditNoteNumber,
  customer,
  amount,
}: CreditNoteApprovalModalProps) {
  const handleApprove = () => {
    onApprove();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[#059669]" />
            Approve Credit Note
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to approve this credit note?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-[14px] text-[#374151]">Credit Note:</span>
              <span className="text-[#111827]">{creditNoteNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-[#374151]">Customer:</span>
              <span className="text-[#111827]">{customer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-[#374151]">Amount:</span>
              <span className="text-[#111827]">RM{amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4">
            <p className="text-[14px] text-[#92400E]">
              <strong>Note:</strong> Once approved, this credit note can be applied to invoices. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
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
