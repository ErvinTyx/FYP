/**
 * PUT /api/credit-notes/[id]/approve
 * Approve a credit note (status must be Pending Approval).
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
    const canApprove = session.user.roles?.some((role: string) => APPROVAL_ROLES.includes(role));
    if (!canApprove) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to approve credit notes' },
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
    if (cn.status !== 'Pending Approval') {
      return NextResponse.json(
        { success: false, message: 'Only credit notes with status Pending Approval can be approved' },
        { status: 400 }
      );
    }

    const approvedBy = session.user.email || session.user.name || 'Unknown';
    const updated = await prisma.creditNote.update({
      where: { id },
      data: {
        status: 'Approved',
        approvedBy,
        approvedAt: new Date(),
      },
      include: { items: true, attachments: true },
    });

    const toNum = (v: { toNumber?: () => number } | number) =>
      typeof v === 'number' ? v : (v as { toNumber?: () => number }).toNumber?.() ?? 0;
    const data = {
      ...updated,
      amount: toNum(updated.amount),
      date: updated.date.toISOString().split('T')[0],
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      rejectedAt: updated.rejectedAt?.toISOString() ?? null,
      items: updated.items.map((i) => ({
        ...i,
        previousPrice: toNum(i.previousPrice),
        currentPrice: toNum(i.currentPrice),
        unitPrice: toNum(i.unitPrice),
        amount: toNum(i.amount),
        daysCharged: i.daysCharged ?? undefined,
      })),
      attachments: updated.attachments.map((a) => ({
        ...a,
        uploadedAt: a.uploadedAt.toISOString(),
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Credit notes] approve error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to approve credit note' },
      { status: 500 }
    );
  }
}
