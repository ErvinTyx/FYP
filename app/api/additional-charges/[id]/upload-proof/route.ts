/**
 * PUT /api/additional-charges/[id]/upload-proof
 * Multipart file upload; set proofOfPaymentUrl, status = pending_approval, uploadedByEmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const FOLDER = 'additional-charges';

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const uploadedByEmail = session?.user?.email ?? (request.headers.get('x-uploaded-by-email') || null);

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Charge ID is required' },
        { status: 400 }
      );
    }

    const charge = await prisma.additionalCharge.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!charge) {
      return NextResponse.json(
        { success: false, message: 'Additional charge not found' },
        { status: 404 }
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

    const updated = await prisma.additionalCharge.update({
      where: { id },
      data: {
        proofOfPaymentUrl: fileUrl,
        status: 'pending_approval',
        uploadedByEmail: uploadedByEmail || undefined,
      },
      include: { items: true },
    });

    // If this charge is linked to a delivery set, propagate the proof-of-payment
    // and pending_approval status to all additional charges for sets under the
    // same DeliveryRequest so the workflow treats the request as a single payment.
    if (updated.deliverySetId) {
      const deliverySet = await prisma.deliverySet.findUnique({
        where: { id: updated.deliverySetId },
        select: { deliveryRequestId: true },
      });

      if (deliverySet?.deliveryRequestId) {
        const siblingSets = await prisma.deliverySet.findMany({
          where: { deliveryRequestId: deliverySet.deliveryRequestId },
          select: { id: true },
        });
        const siblingSetIds = siblingSets.map((s) => s.id);

        if (siblingSetIds.length > 0) {
          await prisma.additionalCharge.updateMany({
            where: { deliverySetId: { in: siblingSetIds } },
            data: {
              proofOfPaymentUrl: fileUrl,
              status: 'pending_approval',
              uploadedByEmail: uploadedByEmail || undefined,
            },
          });
        }
      }
    }

    const serialized = {
      ...updated,
      totalCharges: Number(updated.totalCharges),
      dueDate: updated.dueDate.toISOString(),
      approvalDate: updated.approvalDate?.toISOString() ?? null,
      rejectionDate: updated.rejectionDate?.toISOString() ?? null,
      items: updated.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Additional Charges API] upload-proof error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload proof of payment' },
      { status: 500 }
    );
  }
}
