/**
 * PUT /api/refunds/[id]/reject
 * Body: { reason: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const APPROVAL_ROLES = ['super_user', 'admin', 'finance'];

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const canReject = session.user.roles?.some((r: string) => APPROVAL_ROLES.includes(r));
    if (!canReject) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to reject refunds' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Refund ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json(
        { success: false, message: 'reason is required and must be non-empty' },
        { status: 400 }
      );
    }

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: { attachments: true },
    });
    if (!refund) {
      return NextResponse.json({ success: false, message: 'Refund not found' }, { status: 404 });
    }
    if (refund.status !== 'Pending Approval') {
      return NextResponse.json(
        { success: false, message: 'Only refunds with status Pending Approval can be rejected' },
        { status: 400 }
      );
    }

    const rejectedBy = session.user.email || session.user.name || 'Unknown';
    const updated = await prisma.refund.update({
      where: { id },
      data: { status: 'Rejected', rejectedBy, rejectedAt: new Date(), rejectionReason: reason },
      include: { attachments: true },
    });

    const toNum = (v: unknown) =>
      typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0);
    const data = {
      ...updated,
      amount: toNum(updated.amount),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      rejectedAt: updated.rejectedAt?.toISOString() ?? null,
      attachments: updated.attachments.map((a) => ({
        ...a,
        uploadedAt: a.uploadedAt.toISOString(),
      })),
    };
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Refunds] reject error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reject refund' },
      { status: 500 }
    );
  }
}
