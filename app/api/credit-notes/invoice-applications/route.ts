/**
 * GET /api/credit-notes/invoice-applications?invoiceId=X
 * Returns all credit note applications targeting a specific invoice,
 * including the credit note number for each application.
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

    const invoiceId = request.nextUrl.searchParams.get('invoiceId');
    if (!invoiceId) {
      return NextResponse.json(
        { success: false, message: 'invoiceId is required' },
        { status: 400 }
      );
    }

    const applications = await prisma.creditNoteApplication.findMany({
      where: { targetInvoiceId: invoiceId },
      include: {
        creditNote: {
          select: { creditNoteNumber: true },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const totalApplied = applications.reduce((s, a) => s + toNum(a.amountApplied), 0);

    const serialized = applications.map((a) => ({
      id: a.id,
      creditNoteId: a.creditNoteId,
      creditNoteNumber: a.creditNote.creditNoteNumber,
      targetInvoiceType: a.targetInvoiceType,
      targetInvoiceId: a.targetInvoiceId,
      targetInvoiceNumber: a.targetInvoiceNumber,
      amountApplied: toNum(a.amountApplied),
      appliedBy: a.appliedBy,
      appliedAt: a.appliedAt.toISOString(),
      notes: a.notes,
    }));

    return NextResponse.json({
      success: true,
      data: serialized,
      totalApplied,
    });
  } catch (error) {
    console.error('[Credit notes] invoice-applications error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch invoice applications' },
      { status: 500 }
    );
  }
}
