import { X, Download } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { DepositDocument } from "../../types/deposit";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DepositDocument;
  title: string;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document: doc,
  title,
}: DocumentPreviewModalProps) {
  const isImage = doc.fileType.startsWith('image/');
  const isPDF = doc.fileType === 'application/pdf';

  const handleDownload = () => {
    // In a real app, this would trigger actual download
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-9 px-4 rounded-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {isImage && (
            <div className="bg-[#F9FAFB] rounded-lg p-4 flex items-center justify-center min-h-[400px]">
              <img
                src={doc.fileUrl}
                alt={doc.fileName}
                className="max-w-full max-h-[600px] object-contain"
              />
            </div>
          )}

          {isPDF && (
            <div className="bg-[#F9FAFB] rounded-lg p-4">
              <iframe
                src={doc.fileUrl}
                className="w-full h-[600px] border-0 rounded"
                title={doc.fileName}
              />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-[14px] text-[#6B7280]">
            <span>{doc.fileName}</span>
            <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
