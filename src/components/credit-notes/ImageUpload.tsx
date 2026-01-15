import { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface ImageUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  existingFiles?: File[];
}

export function ImageUpload({ onFilesChange, maxFiles = 5, existingFiles = [] }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>(existingFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (file: File) => {
    return file.type.startsWith('image/');
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center hover:border-[#F15929] transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 text-[#6B7280] mx-auto mb-4" />
        <p className="text-[#111827] mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-[14px] text-[#6B7280]">
          PNG, JPG, PDF up to 10MB (Max {maxFiles} files)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-[14px] text-[#374151]">
            Uploaded Files ({files.length}/{maxFiles})
          </p>
          <div className="grid grid-cols-1 gap-2">
            {files.map((file, index) => (
              <Card key={index} className="p-3 border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isImage(file) ? (
                      <ImageIcon className="h-8 w-8 text-[#F15929]" />
                    ) : (
                      <FileText className="h-8 w-8 text-[#6B7280]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#111827] truncate">
                      {file.name}
                    </p>
                    <p className="text-[12px] text-[#6B7280]">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-[#DC2626]" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
