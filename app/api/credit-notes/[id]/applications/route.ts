/**
 * GET /api/credit-notes/[id]/applications
 * Returns all credit note applications for a given credit note,
 * plus computed remaining balance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

interface RouteParams { params: Promise<{ id: string }> }

const toNum = (v: { toNumber?: () => number } | number | unknown) => {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'toNumber' in v && typeof (v as { toNumber: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  return 0;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Credit note ID is required' }, { status: 400 });
    }

    const cn = await prisma.creditNote.findUnique({
      where: { id },
      select: { id: true, amount: true, status: true, agreementId: true },
    });
    if (!cn) {
      return NextResponse.json({ success: false, message: 'Credit note not found' }, { status: 404 });
    }

    const applications = await prisma.creditNoteApplication.findMany({
      where: { creditNoteId: id },
      orderBy: { appliedAt: 'desc' },
    });

    const totalAmount = toNum(cn.amount);
    const totalApplied = applications.reduce((s, a) => s + toNum(a.amountApplied), 0);
    
    // Also subtract refunds (including Draft and Pending Approval, not just Approved)
    // This ensures refunds count as "applied" even before they're approved
    const refunds = await prisma.refund.findMany({
      where: { creditNoteId: id },
      select: { amount: true },
    });
    const totalRefunded = refunds.reduce((s, r) => s + toNum(r.amount), 0);
    
    const remainingBalance = Math.max(0, totalAmount - totalApplied - totalRefunded);

    const serialized = applications.map((a) => ({
      ...a,
      amountApplied: toNum(a.amountApplied),
      appliedAt: a.appliedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: serialized,
      totalAmount,
      totalApplied,
      remainingBalance,
      agreementId: cn.agreementId,
    });
  } catch (error) {
    console.error('[Credit notes] applications GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
