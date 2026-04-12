/**
 * PUT /api/credit-notes/[id]/approve
 * Approve a credit note (status must be Pending Approval).
 * Auto-applies to source invoice if still unpaid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const APPROVAL_ROLES = ['super_user', 'admin', 'finance'];

const UNPAID_DEPOSIT_STATUSES = ['Pending Payment', 'Overdue', 'Rejected'];
const UNPAID_MONTHLY_STATUSES = ['Pending Payment', 'Overdue', 'Rejected'];
const UNPAID_CHARGE_STATUSES = ['pending_payment', 'rejected'];

interface RouteParams { params: Promise<{ id: string }> }

const toNum = (v: { toNumber?: () => number } | number) =>
  typeof v === 'number' ? v : (v as { toNumber?: () => number }).toNumber?.() ?? 0;

/**
 * Get the outstanding amount for a target invoice (invoice total minus all previously applied credits).
 */
async function getInvoiceOutstanding(
  invoiceType: string,
  invoiceId: string
): Promise<{ outstanding: number; invoiceTotal: number; invoiceNumber: string; isUnpaid: boolean } | null> {
  // Sum already-applied credits for this target invoice
  const existingApps = await prisma.creditNoteApplication.findMany({
    where: { targetInvoiceId: invoiceId },
    select: { amountApplied: true },
  });
  const totalAlreadyApplied = existingApps.reduce((s, a) => s + toNum(a.amountApplied), 0);

  if (invoiceType === 'deposit') {
    const deposit = await prisma.deposit.findUnique({
      where: { id: invoiceId },
      select: { depositAmount: true, status: true, depositNumber: true },
    });
    if (!deposit) return null;
    const total = toNum(deposit.depositAmount);
    return {
      invoiceTotal: total,
      outstanding: Math.max(0, total - totalAlreadyApplied),
      invoiceNumber: deposit.depositNumber,
      isUnpaid: UNPAID_DEPOSIT_STATUSES.includes(deposit.status),
    };
  }

  if (invoiceType === 'monthlyRental') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
      where: { id: invoiceId },
      select: { totalAmount: true, status: true, invoiceNumber: true },
    });
    if (!invoice) return null;
    const total = toNum(invoice.totalAmount);
    return {
      invoiceTotal: total,
      outstanding: Math.max(0, total - totalAlreadyApplied),
      invoiceNumber: invoice.invoiceNumber,
      isUnpaid: UNPAID_MONTHLY_STATUSES.includes(invoice.status),
    };
  }

  if (invoiceType === 'additionalCharge') {
    const charge = await prisma.additionalCharge.findUnique({
      where: { id: invoiceId },
      select: { totalCharges: true, status: true, invoiceNo: true },
    });
    if (!charge) return null;
    const total = toNum(charge.totalCharges);
    return {
      invoiceTotal: total,
      outstanding: Math.max(0, total - totalAlreadyApplied),
      invoiceNumber: charge.invoiceNo,
      isUnpaid: UNPAID_CHARGE_STATUSES.includes(charge.status),
    };
  }

  return null;
}

/**
 * Mark an invoice as Paid if all credit covers the full amount.
 */
async function markInvoicePaidIfCovered(
  invoiceType: string,
  invoiceId: string,
  approvedBy: string
): Promise<void> {
  const info = await getInvoiceOutstanding(invoiceType, invoiceId);
  if (!info || info.outstanding > 0) return;

  if (invoiceType === 'deposit') {
    await prisma.deposit.update({
      where: { id: invoiceId },
      data: {
        status: 'Paid',
        approvedBy,
        approvedAt: new Date(),
        referenceNumber: 'Credit Note Applied',
      },
    });
  } else if (invoiceType === 'monthlyRental') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).monthlyRentalInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'Paid',
        approvedBy,
        approvedAt: new Date(),
        referenceNumber: 'Credit Note Applied',
      },
    });
  } else if (invoiceType === 'additionalCharge') {
    await prisma.additionalCharge.update({
      where: { id: invoiceId },
      data: {
        status: 'approved',
        approvalDate: new Date(),
        referenceId: 'Credit Note Applied',
      },
    });
  }
}

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

    // --- Auto-apply to source invoice if still unpaid ---
    const creditAmount = toNum(updated.amount);
    if (updated.sourceId && creditAmount > 0) {
      const info = await getInvoiceOutstanding(updated.invoiceType, updated.sourceId);
      if (info && info.isUnpaid && info.outstanding > 0) {
        const applyAmount = Math.min(creditAmount, info.outstanding);
        await prisma.creditNoteApplication.create({
          data: {
            creditNoteId: id,
            targetInvoiceType: updated.invoiceType,
            targetInvoiceId: updated.sourceId,
            targetInvoiceNumber: info.invoiceNumber,
            amountApplied: applyAmount,
            appliedBy: approvedBy,
            notes: 'Auto-applied on approval',
          },
        });
        // Mark invoice as paid if fully covered
        await markInvoicePaidIfCovered(updated.invoiceType, updated.sourceId, approvedBy);
      }
    }

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
        amount: toNum(i.amount),
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
