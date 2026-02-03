/**
 * GET /api/uploads/[...path] - Serve uploaded files from public/uploads/
 * Used so document links (e.g. refund/credit-note attachments) open reliably
 * with correct Content-Type and without same-origin issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOADS_DIR = 'uploads';
const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

interface RouteParams { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments?.length) {
      return NextResponse.json({ message: 'Path required' }, { status: 400 });
    }
    // Block path traversal
    if (pathSegments.some((s) => s.includes('..'))) {
      return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
    }
    const relativePath = path.join(UPLOADS_DIR, ...pathSegments);
    const absolutePath = path.join(process.cwd(), 'public', relativePath);
    // Ensure we stay under public/uploads
    const uploadsRoot = path.join(process.cwd(), 'public', UPLOADS_DIR);
    const resolved = path.resolve(absolutePath);
    if (!resolved.startsWith(uploadsRoot)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    if (!existsSync(resolved)) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const buffer = await readFile(resolved);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(resolved)}"`,
      },
    });
  } catch (err) {
    console.error('[uploads] serve error:', err);
    return NextResponse.json({ message: 'Failed to serve file' }, { status: 500 });
  }
}
