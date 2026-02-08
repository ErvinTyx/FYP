/**
 * GET /api/credit-notes/[id] - Get one credit note
 * PUT /api/credit-notes/[id] - Update (draft only)
 * DELETE /api/credit-notes/[id] - Delete (draft only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

function serializeCreditNote(cn: {
  id: string;
  creditNoteNumber: string;
  customerName: string;
  customerId: string;
  invoiceType: string;
  sourceId: string | null;
  originalInvoice: string;
  deliveryOrderId: string | null;
  amount: { toNumber?: () => number } | number;
  reason: string;
  reasonDescription: string | null;
  date: Date;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    previousPrice: { toNumber?: () => number } | number;
    currentPrice: { toNumber?: () => number } | number;
    unitPrice: { toNumber?: () => number } | number;
    amount: { toNumber?: () => number } | number;
    daysCharged: number | null;
  }>;
  attachments: Array<{ id: string; fileName: string; fileUrl: string; fileSize: number; uploadedAt: Date }>;
}) {
  const toNum = (v: { toNumber?: () => number } | number) =>
    typeof v === 'number' ? v : (v as { toNumber?: () => number }).toNumber?.() ?? 0;
  return {
    ...cn,
    amount: toNum(cn.amount),
    date: cn.date.toISOString().split('T')[0],
    createdAt: cn.createdAt.toISOString(),
    updatedAt: cn.updatedAt.toISOString(),
    approvedAt: cn.approvedAt?.toISOString() ?? null,
    rejectedAt: cn.rejectedAt?.toISOString() ?? null,
    items: cn.items.map((i) => ({
      ...i,
      previousPrice: toNum(i.previousPrice),
      currentPrice: toNum(i.currentPrice),
      unitPrice: toNum(i.unitPrice),
      amount: toNum(i.amount),
      daysCharged: i.daysCharged ?? undefined,
    })),
    attachments: cn.attachments.map((a) => ({
      ...a,
      uploadedAt: a.uploadedAt.toISOString(),
    })),
  };
}

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to view credit notes' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Credit note ID is required' }, { status: 400 });
    }

    const cn = await prisma.creditNote.findUnique({
      where: { id },
      include: { items: true, attachments: true },
    });
    if (!cn) {
      return NextResponse.json({ success: false, message: 'Credit note not found' }, { status: 404 });
    }

    const serialized = serializeCreditNote(cn as Parameters<typeof serializeCreditNote>[0]);
    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Credit notes] GET [id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch credit note' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to update credit notes' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Credit note ID is required' }, { status: 400 });
    }

    const existing = await prisma.creditNote.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Credit note not found' }, { status: 404 });
    }
    if (existing.status !== 'Draft') {
      return NextResponse.json(
        { success: false, message: 'Only draft credit notes can be updated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customerName,
      customerId,
      invoiceType,
      sourceId,
      originalInvoice,
      deliveryOrderId,
      reason,
      reasonDescription,
      date,
      status,
      items,
      attachments,
    } = body;

    const validInvoiceType =
      invoiceType && ['deposit', 'monthlyRental', 'additionalCharge'].includes(invoiceType)
        ? invoiceType
        : existing.invoiceType;
    const validStatus = status === 'Draft' || status === 'Pending Approval' ? status : existing.status;

    const itemsArray = Array.isArray(items) ? items : [];
    if (validStatus === 'Pending Approval' && itemsArray.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one line item is required when submitting for approval' },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    const itemRows = itemsArray.map((item: { description?: string; quantity?: number; previousPrice?: number; currentPrice?: number; amount?: number; daysCharged?: number }) => {
      const qty = Number(item.quantity) || 0;
      const prev = Number(item.previousPrice) || 0;
      const curr = Number(item.currentPrice) ?? Number(item.amount) / (qty || 1);
      const amt = Number(item.amount) ?? qty * curr;
      totalAmount += amt;
      return {
        description: String(item.description || ''),
        quantity: qty,
        previousPrice: prev,
        currentPrice: curr,
        unitPrice: curr,
        amount: amt,
        daysCharged: item.daysCharged != null ? Number(item.daysCharged) : null,
      };
    });

    if (validStatus === 'Pending Approval' && totalAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Total amount must be greater than zero when submitting for approval' },
        { status: 400 }
      );
    }

    const attachmentRows = Array.isArray(attachments)
      ? attachments.map((a: { fileName?: string; fileUrl?: string; fileSize?: number }) => ({
          fileName: String(a.fileName || ''),
          fileUrl: String(a.fileUrl || ''),
          fileSize: Number(a.fileSize) || 0,
        }))
      : [];

    // Delete existing items before updating
    await prisma.creditNoteItem.deleteMany({ where: { creditNoteId: id } });
    
    // Only delete and recreate attachments if new ones are provided
    // This preserves existing attachments when saving draft without uploading new files
    if (attachmentRows.length > 0) {
      await prisma.creditNoteAttachment.deleteMany({ where: { creditNoteId: id } });
    }

    const updated = await prisma.creditNote.update({
      where: { id },
      data: {
        ...(customerName != null && { customerName }),
        ...(customerId != null && { customerId }),
        invoiceType: validInvoiceType,
        ...(sourceId !== undefined && { sourceId: sourceId || null }),
        ...(originalInvoice != null && { originalInvoice }),
        ...(deliveryOrderId !== undefined && { deliveryOrderId: deliveryOrderId || null }),
        amount: totalAmount,
        ...(reason != null && { reason }),
        ...(reasonDescription !== undefined && { reasonDescription: reasonDescription || null }),
        ...(date != null && { date: new Date(date) }),
        status: validStatus,
        items: { create: itemRows },
        ...(attachmentRows.length > 0 && {
          attachments: { create: attachmentRows },
        }),
      },
      include: { items: true, attachments: true },
    });

    const serialized = serializeCreditNote(updated as Parameters<typeof serializeCreditNote>[0]);
    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Credit notes] PUT [id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update credit note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to delete credit notes' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Credit note ID is required' }, { status: 400 });
    }

    const existing = await prisma.creditNote.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Credit note not found' }, { status: 404 });
    }
    if (existing.status !== 'Draft') {
      return NextResponse.json(
        { success: false, message: 'Only draft credit notes can be deleted' },
        { status: 400 }
      );
    }

    // Delete related items and attachments first (cascade should handle this, but being explicit)
    await prisma.creditNoteItem.deleteMany({ where: { creditNoteId: id } });
    await prisma.creditNoteAttachment.deleteMany({ where: { creditNoteId: id } });
    
    // Delete the credit note
    await prisma.creditNote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Credit note deleted successfully' });
  } catch (error) {
    console.error('[Credit notes] DELETE [id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete credit note' },
      { status: 500 }
    );
  }
}
