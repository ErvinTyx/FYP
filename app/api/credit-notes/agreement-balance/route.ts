/**
 * GET /api/credit-notes/agreement-balance?agreementId=X
 * Returns total approved credit, total applied, and remaining balance
 * across all credit notes for a given agreement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const d = v as { toNumber?: () => number };
  return d?.toNumber?.() ?? Number(v) ?? 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const agreementId = request.nextUrl.searchParams.get('agreementId');
    if (!agreementId) {
      return NextResponse.json(
        { success: false, message: 'agreementId is required' },
        { status: 400 }
      );
    }

    // Find all approved credit notes for this agreement
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        agreementId,
        status: 'Approved',
      },
      include: {
        applications: true,
      },
    });

    const totalApprovedCredit = creditNotes.reduce((s, cn) => s + toNum(cn.amount), 0);
    const totalApplied = creditNotes.reduce(
      (s, cn) => s + cn.applications.reduce((sa, a) => sa + toNum(a.amountApplied), 0),
      0
    );
    
    // Also subtract refunds (including Draft and Pending Approval, not just Approved)
    // This ensures refunds count as "applied" even before they're approved
    const cnIds = creditNotes.map((cn) => cn.id);
    const refunds = cnIds.length > 0
      ? await prisma.refund.findMany({
          where: { creditNoteId: { in: cnIds } },
          select: { creditNoteId: true, amount: true },
        })
      : [];
    const refundedByCN = new Map<string, number>();
    for (const r of refunds) {
      if (!r.creditNoteId) continue;
      refundedByCN.set(r.creditNoteId, (refundedByCN.get(r.creditNoteId) || 0) + toNum(r.amount));
    }
    const totalRefunded = Array.from(refundedByCN.values()).reduce((s, v) => s + v, 0);
    
    const remainingBalance = Math.max(0, totalApprovedCredit - totalApplied - totalRefunded);

    const creditNoteBreakdown = creditNotes.map((cn) => {
      const amount = toNum(cn.amount);
      const applied = cn.applications.reduce((s, a) => s + toNum(a.amountApplied), 0);
      const refunded = refundedByCN.get(cn.id) || 0;
      return {
        id: cn.id,
        creditNoteNumber: cn.creditNoteNumber,
        amount,
        applied,
        refunded,
        remaining: Math.max(0, amount - applied - refunded),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        agreementId,
        totalApprovedCredit,
        totalApplied,
        remainingBalance,
        creditNotes: creditNoteBreakdown,
      },
    });
  } catch (error) {
    console.error('[Credit notes] agreement-balance error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch agreement balance' },
      { status: 500 }
    );
  }
}
