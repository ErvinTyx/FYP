import { useState } from "react";
import { X, Upload, File } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner@2.0.3";

interface UploadPopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  chargeId: string;
}

export function UploadPopModal({ isOpen, onClose, onUpload, chargeId }: UploadPopModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast.error("Please upload an image or PDF file");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast.error("Please upload an image or PDF file");
      }
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    onUpload(selectedFile);
    setSelectedFile(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
          <h2 className="text-[18px] text-[#231F20]">Upload Proof of Payment</h2>
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
            Upload proof of payment for Additional Charge {chargeId}
          </p>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-[#F15929] bg-[#FEF2F2]"
                : "border-[#D1D5DB] bg-[#F9FAFB]"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <File className="h-8 w-8 text-[#F15929]" />
                <div className="text-left">
                  <p className="text-sm text-[#231F20]">{selectedFile.name}</p>
                  <p className="text-xs text-[#6B7280]">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-[#9CA3AF] mx-auto mb-4" />
                <p className="text-sm text-[#231F20] mb-2">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-[#6B7280]">
                  Supported formats: JPG, PNG, PDF (Max 5MB)
                </p>
              </>
            )}
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="mt-4 inline-block cursor-pointer text-sm text-[#F15929] hover:text-[#D14620]"
            >
              Browse Files
            </label>
          </div>

          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-lg p-3">
            <p className="text-xs text-[#92400E]">
              <strong>Note:</strong> POP is required before submitting for approval. Ensure the
              payment reference is clearly visible.
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
            onClick={handleSubmit}
            disabled={!selectedFile}
            className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
          >
            Submit Proof of Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
