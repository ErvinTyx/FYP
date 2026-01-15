import { useState } from "react";
import { X, Upload as UploadIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { PaymentProofUpload } from "./PaymentProofUpload";

interface UploadProofModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File) => void;
  depositInvoiceNo: string;
  isReupload?: boolean;
}

export function UploadProofModal({
  open,
  onClose,
  onSubmit,
  depositInvoiceNo,
  isReupload = false,
}: UploadProofModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = () => {
    if (selectedFile) {
      onSubmit(selectedFile);
      setSelectedFile(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[20px]">Upload Proof of Payment</DialogTitle>
          <p className="text-[14px] text-[#6B7280] mt-2">
            Invoice: <span className="text-[#111827]">{depositInvoiceNo}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-[14px] text-[#374151] mb-3 block">
              Upload Proof of Payment Document
            </label>
            <PaymentProofUpload
              onFileSelect={setSelectedFile}
              existingFile={selectedFile}
            />
          </div>

          <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg p-3">
            <p className="text-[14px] text-[#075985]">
              <strong>Note:</strong> Accepted file types are PDF, JPG, and PNG (max 10MB). 
              {isReupload 
                ? " This re-submission will move the deposit back to \"Pending Approval\" status for review."
                : " After submission, this deposit will move to \"Pending Approval\" status."}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile}
            className="bg-[#F15929] hover:bg-[#D14620] text-white disabled:opacity-50"
          >
            <UploadIcon className="mr-2 h-4 w-4" />
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}