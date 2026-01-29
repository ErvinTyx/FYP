/**
 * File upload utility for storing files on the server
 * Files are saved to public/uploads/{folder}/ directory
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  originalName?: string;
  size?: number;
  type?: string;
  error?: string;
}

export interface UploadOptions {
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

const DEFAULT_OPTIONS: UploadOptions = {
  folder: 'general',
  maxSizeMB: 10,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
};

/**
 * Upload a single file to the server
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Validate file type
  if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type. Allowed types: ${opts.allowedTypes.join(', ')}`,
    };
  }

  // Validate file size
  const maxSizeBytes = (opts.maxSizeMB || 10) * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      success: false,
      error: `File size exceeds ${opts.maxSizeMB}MB limit.`,
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', opts.folder || 'general');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        url: data.url,
        filename: data.filename,
        originalName: data.originalName,
        size: data.size,
        type: data.type,
      };
    } else {
      return {
        success: false,
        error: data.message || 'Upload failed',
      };
    }
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: 'An error occurred while uploading the file',
    };
  }
}

/**
 * Upload multiple files to the server
 */
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map(file => uploadFile(file, options))
  );
  return results;
}

/**
 * Upload photos specifically for return workflows
 */
export async function uploadReturnPhotos(
  files: File[],
  type: 'driver' | 'warehouse' | 'damage'
): Promise<UploadResult[]> {
  return uploadFiles(files, {
    folder: `returns/${type}`,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  });
}

/**
 * Upload photos specifically for delivery workflows
 */
export async function uploadDeliveryPhotos(
  files: File[],
  type: 'packing' | 'delivery'
): Promise<UploadResult[]> {
  return uploadFiles(files, {
    folder: `deliveries/${type}`,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  });
}

/**
 * Upload payment proof documents
 */
export async function uploadPaymentProof(file: File): Promise<UploadResult> {
  return uploadFile(file, {
    folder: 'payment-proofs',
    maxSizeMB: 10,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
  });
}

/**
 * Upload inspection photos
 */
export async function uploadInspectionPhotos(
  files: File[],
  type: 'before' | 'after' | 'damage'
): Promise<UploadResult[]> {
  return uploadFiles(files, {
    folder: `inspections/${type}`,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  });
}
