/**
 * GET /api/refunds/[id] - Get one refund (optionally with related credit notes)
 * PUT /api/refunds/[id] - Update draft only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

const toNum = (v: unknown) =>
  typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeRefund(r: Record<string, any>) {
  return {
    ...r,
    amount: toNum(r.amount),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    approvedAt: r.approvedAt instanceof Date ? r.approvedAt.toISOString() : (r.approvedAt ?? null),
    rejectedAt: r.rejectedAt instanceof Date ? r.rejectedAt.toISOString() : (r.rejectedAt ?? null),
    creditNoteId: r.creditNoteId ?? null,
    creditNoteNumber: r.creditNoteNumber ?? null,
    attachments: (r.attachments || []).map((a: { uploadedAt: Date | string; [key: string]: unknown }) => ({
      ...a,
      uploadedAt: a.uploadedAt instanceof Date ? a.uploadedAt.toISOString() : a.uploadedAt,
    })),
  };
}

async function getCreditNoteRemainingBalance(creditNoteId: string): Promise<number> {
  const cn = await prisma.creditNote.findUnique({
    where: { id: creditNoteId },
    select: { amount: true },
  });
  if (!cn) return 0;
  const cnAmount = toNum(cn.amount);
  const apps = await prisma.creditNoteApplication.findMany({
    where: { creditNoteId },
    select: { amountApplied: true },
  });
  const totalApplied = apps.reduce((s, a) => s + toNum(a.amountApplied), 0);
  const refunds = await prisma.refund.findMany({
    where: { creditNoteId, status: 'Approved' },
    select: { amount: true },
  });
  const totalRefunded = refunds.reduce((s, r) => s + toNum(r.amount), 0);
  return Math.max(0, cnAmount - totalApplied - totalRefunded);
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
    let relatedCreditNotes: Array<{ id: string; creditNoteNumber: string; amount: number; remainingBalance: number; date: string }> = [];
    if (includeCreditNotes) {
      const cns = await prisma.creditNote.findMany({
        where: { sourceId: refund.sourceId, status: 'Approved' },
        select: { id: true, creditNoteNumber: true, amount: true, date: true },
      });
      const cnIds = cns.map((cn) => cn.id);
      const apps = cnIds.length > 0
        ? await prisma.creditNoteApplication.findMany({
            where: { creditNoteId: { in: cnIds } },
            select: { creditNoteId: true, amountApplied: true },
          })
        : [];
      const appliedMap = new Map<string, number>();
      for (const a of apps) {
        appliedMap.set(a.creditNoteId, (appliedMap.get(a.creditNoteId) || 0) + toNum(a.amountApplied));
      }
      const refs = cnIds.length > 0
        ? await prisma.refund.findMany({
            where: { creditNoteId: { in: cnIds }, status: 'Approved' },
            select: { creditNoteId: true, amount: true },
          })
        : [];
      const refundedMap = new Map<string, number>();
      for (const r of refs) {
        if (!r.creditNoteId) continue;
        refundedMap.set(r.creditNoteId, (refundedMap.get(r.creditNoteId) || 0) + toNum(r.amount));
      }
      relatedCreditNotes = cns.map((cn) => {
        const cnAmt = toNum(cn.amount);
        const remaining = Math.max(0, cnAmt - (appliedMap.get(cn.id) || 0) - (refundedMap.get(cn.id) || 0));
        return {
          id: cn.id,
          creditNoteNumber: cn.creditNoteNumber,
          amount: cnAmt,
          remainingBalance: remaining,
          date: cn.date.toISOString().split('T')[0],
        };
      });
    }

    const data = serializeRefund(refund);
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

    // Validate against linked credit note's remaining balance
    if (existing.creditNoteId) {
      const remaining = await getCreditNoteRemainingBalance(existing.creditNoteId);
      if (numAmount > remaining) {
        return NextResponse.json(
          { success: false, message: `Refund amount cannot exceed credit note remaining balance (RM${remaining.toFixed(2)})` },
          { status: 400 }
        );
      }
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

    const data = serializeRefund(updated);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Refunds] PUT [id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update refund' },
      { status: 500 }
    );
  }
}
