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

    const [applications, refunds] = await Promise.all([
      prisma.creditNoteApplication.findMany({
        where: { creditNoteId: id },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.refund.findMany({
        where: { creditNoteId: id },
        select: { id: true, refundNumber: true, amount: true, createdBy: true, createdAt: true, status: true },
      }),
    ]);

    const totalAmount = toNum(cn.amount);
    const totalFromApplications = applications.reduce((s, a) => s + toNum(a.amountApplied), 0);
    const totalRefunded = refunds.reduce((s, r) => s + toNum(r.amount), 0);
    const totalApplied = totalFromApplications + totalRefunded;
    const remainingBalance = Math.max(0, totalAmount - totalApplied);

    const serializedApps = applications.map((a) => ({
      ...a,
      applicationType: 'invoice' as const,
      amountApplied: toNum(a.amountApplied),
      appliedAt: a.appliedAt.toISOString(),
    }));

    const serializedRefunds = refunds.map((r) => ({
      id: r.id,
      applicationType: 'refund' as const,
      targetInvoiceNumber: r.refundNumber,
      targetInvoiceType: 'refund' as const,
      amountApplied: toNum(r.amount),
      appliedBy: r.createdBy,
      appliedAt: r.createdAt.toISOString(),
      notes: undefined,
      refundStatus: r.status,
    }));

    const merged = [...serializedApps, ...serializedRefunds].sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: merged,
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
