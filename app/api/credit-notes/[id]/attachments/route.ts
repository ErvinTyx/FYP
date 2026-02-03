/**
 * POST /api/credit-notes/[id]/attachments
 * Upload a supporting document for a credit note (draft or existing).
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const FOLDER = 'credit-notes';

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to upload credit note attachments' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Credit note ID is required' }, { status: 400 });
    }

    const cn = await prisma.creditNote.findUnique({ where: { id } });
    if (!cn) {
      return NextResponse.json({ success: false, message: 'Credit note not found' }, { status: 404 });
    }
    if (cn.status !== 'Draft' && cn.status !== 'Pending Approval') {
      return NextResponse.json(
        { success: false, message: 'Attachments can only be added to Draft or Pending Approval credit notes' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only JPG, PNG, and PDF are allowed.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const sanitized = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `${timestamp}-${randomString}-${sanitized}.${extension}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', FOLDER);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    const fileUrl = `/uploads/${FOLDER}/${filename}`;

    const attachment = await prisma.creditNoteAttachment.create({
      data: {
        creditNoteId: id,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...attachment,
        uploadedAt: attachment.uploadedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Credit notes] attachments POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}
