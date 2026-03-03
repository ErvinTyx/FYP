import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf'
];

const FOLDER = 'identity-documents';

// Simple in-memory rate limiter: IP -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateResult = checkRateLimit(ip);

    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many upload attempts. Please try again later.',
          retryAfter: rateResult.retryAfter
        },
        {
          status: 429,
          headers: rateResult.retryAfter
            ? { 'Retry-After': String(rateResult.retryAfter) }
            : {}
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only JPG, PNG, and PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const sanitizedOriginalName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars
      .substring(0, 50); // Limit length
    const filename = `${timestamp}-${randomString}-${sanitizedOriginalName}.${extension}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', FOLDER);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/uploads/${FOLDER}/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      url: fileUrl,
      filename: filename,
      originalName: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Registration upload error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while uploading the file' },
      { status: 500 }
    );
  }
}
