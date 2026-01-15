import { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface PaymentProofUploadProps {
  onFileSelect: (file: File | null) => void;
  existingFile?: File | null;
}

export function PaymentProofUpload({ onFileSelect, existingFile }: PaymentProofUploadProps) {
  const [file, setFile] = useState<File | null>(existingFile || null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadTime, setUploadTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (selectedFile.size > maxSize) {
        alert("File size exceeds 10MB limit. Please choose a smaller file.");
        return;
      }

      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        alert("Invalid file type. Please upload PDF, JPG, or PNG only.");
        return;
      }

      setFile(selectedFile);
      onFileSelect(selectedFile);
      setUploadTime(new Date().toLocaleString());

      // Generate preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    handleFileSelect(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setUploadTime(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (file: File) => {
    return file.type.startsWith('image/');
  };

  if (file) {
    return (
      <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-[#059669]" />
            <p className="text-[#059669]">File uploaded successfully</p>
          </div>

          <div className="space-y-4">
            {preview && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-[#E5E7EB]">
                <img
                  src={preview}
                  alt="Payment proof preview"
                  className="w-full h-full object-contain bg-white"
                />
              </div>
            )}

            <Card className="p-4 border-[#E5E7EB] bg-white">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {isImage(file) ? (
                    <ImageIcon className="h-10 w-10 text-[#F15929]" />
                  ) : (
                    <FileText className="h-10 w-10 text-[#6B7280]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[#111827] truncate">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">
                    {formatFileSize(file.size)}
                  </p>
                  {uploadTime && (
                    <p className="text-[12px] text-[#6B7280] mt-1">
                      Uploaded: {uploadTime}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="flex-shrink-0 hover:bg-[#FEF2F2]"
                >
                  <X className="h-4 w-4 text-[#DC2626]" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer shadow-sm ${
        isDragging 
          ? 'border-[#F15929] bg-[#FFF7F5]' 
          : 'border-[#D1D5DB] bg-white hover:border-[#F15929] hover:bg-[#FAFAFA]'
      }`}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className={`h-16 w-16 mx-auto mb-4 ${isDragging ? 'text-[#F15929]' : 'text-[#6B7280]'}`} />
      <p className="text-[#111827] mb-2">
        {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
      </p>
      <p className="text-[14px] text-[#6B7280] mb-1">
        Upload the receipt, bank transfer slip, or payment confirmation
      </p>
      <p className="text-[14px] text-[#6B7280]">
        PNG, JPG, PDF up to 10MB
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}