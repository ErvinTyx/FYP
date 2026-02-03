/**
 * PUT /api/refunds/[id]/approve
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
    const canApprove = session.user.roles?.some((r: string) => APPROVAL_ROLES.includes(r));
    if (!canApprove) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to approve refunds' },
        { status: 403 }
      );
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
    if (refund.status !== 'Pending Approval') {
      return NextResponse.json(
        { success: false, message: 'Only refunds with status Pending Approval can be approved' },
        { status: 400 }
      );
    }

    const approvedBy = session.user.email || session.user.name || 'Unknown';
    const updated = await prisma.refund.update({
      where: { id },
      data: { status: 'Approved', approvedBy, approvedAt: new Date() },
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
    console.error('[Refunds] approve error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to approve refund' },
      { status: 500 }
    );
  }
}
