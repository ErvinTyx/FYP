/**
 * GET /api/refunds/[id] - Get one refund (optionally with related credit notes)
 * PUT /api/refunds/[id] - Update draft only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

function serializeRefund(r: {
  id: string;
  refundNumber: string;
  invoiceType: string;
  sourceId: string;
  originalInvoice: string;
  customerName: string;
  customerId: string;
  amount: { toNumber?: () => number } | number;
  refundMethod: string | null;
  reason: string | null;
  reasonDescription: string | null;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  attachments: Array<{ id: string; fileName: string; fileUrl: string; fileSize: number; uploadedAt: Date }>;
}) {
  const toNum = (v: { toNumber?: () => number } | number) =>
    typeof v === 'number' ? v : (v as { toNumber?: () => number }).toNumber?.() ?? 0;
  return {
    ...r,
    amount: toNum(r.amount),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    attachments: r.attachments.map((a) => ({
      ...a,
      uploadedAt: a.uploadedAt.toISOString(),
    })),
  };
}

async function getTotalCredited(sourceId: string): Promise<number> {
  const list = await prisma.creditNote.findMany({
    where: { sourceId, status: 'Approved' },
    select: { amount: true },
  });
  const toNum = (v: unknown) =>
    typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0);
  return list.reduce((sum, cn) => sum + toNum(cn.amount), 0);
}

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Refund ID is required' }, { status: 400 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: { attachments: true },
    });
    if (!refund) {
      return NextResponse.json({ success: false, message: 'Refund not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeCreditNotes = searchParams.get('includeCreditNotes') === 'true';
    let relatedCreditNotes: Array<{ id: string; creditNoteNumber: string; amount: number; date: string }> = [];
    if (includeCreditNotes) {
      const cns = await prisma.creditNote.findMany({
        where: { sourceId: refund.sourceId, status: 'Approved' },
        select: { id: true, creditNoteNumber: true, amount: true, date: true },
      });
      const toNum = (v: unknown) =>
        typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0);
      relatedCreditNotes = cns.map((cn) => ({
        id: cn.id,
        creditNoteNumber: cn.creditNoteNumber,
        amount: toNum(cn.amount),
        date: cn.date.toISOString().split('T')[0],
      }));
    }

    const data = serializeRefund(refund as Parameters<typeof serializeRefund>[0]);
    return NextResponse.json({
      success: true,
      data: includeCreditNotes ? { ...data, relatedCreditNotes } : data,
    });
  } catch (error) {
    console.error('[Refunds] GET [id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch refund' },
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
    const hasPermission = session.user.roles?.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Refund ID is required' }, { status: 400 });
    }

    const existing = await prisma.refund.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Refund not found' }, { status: 404 });
    }
    if (existing.status !== 'Draft') {
      return NextResponse.json(
        { success: false, message: 'Only draft refunds can be updated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, refundMethod, reason, reasonDescription, status, attachments } = body;

    const numAmount = amount != null ? Number(amount) : Number(existing.amount);
    if (numAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }
    const totalCredited = await getTotalCredited(existing.sourceId);
    if (numAmount > totalCredited) {
      return NextResponse.json(
        { success: false, message: `Refund amount cannot exceed total credited (RM${totalCredited.toFixed(2)})` },
        { status: 400 }
      );
    }

    const validStatus = status === 'Draft' || status === 'Pending Approval' ? status : existing.status;
    if (validStatus === 'Pending Approval' && (!reason || typeof reason !== 'string' || !reason.trim())) {
      return NextResponse.json(
        { success: false, message: 'Reason is required when submitting for approval' },
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

    await prisma.refundAttachment.deleteMany({ where: { refundId: id } });

    const updated = await prisma.refund.update({
      where: { id },
      data: {
        amount: numAmount,
        ...(refundMethod !== undefined && { refundMethod: refundMethod || null }),
        ...(reason !== undefined && { reason: reason?.trim() || null }),
        ...(reasonDescription !== undefined && { reasonDescription: reasonDescription?.trim() || null }),
        status: validStatus,
        ...(attachmentRows.length > 0 && { attachments: { create: attachmentRows } }),
      },
      include: { attachments: true },
    });

    const data = serializeRefund(updated as Parameters<typeof serializeRefund>[0]);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Refunds] PUT [id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update refund' },
      { status: 500 }
    );
  }
}
