/**
 * POST /api/credit-notes/[id]/apply
 * Manually apply an approved credit note to a target invoice.
 * Validates: same agreementId, target is unpaid, sufficient remaining balance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { resolveAgreementId } from '../../resolveAgreementId';

const ALLOWED_ROLES = ['super_user', 'admin', 'finance'];

const UNPAID_DEPOSIT_STATUSES = ['Pending Payment', 'Overdue', 'Rejected'];
const UNPAID_MONTHLY_STATUSES = ['Pending Payment', 'Overdue', 'Rejected'];
const UNPAID_CHARGE_STATUSES = ['pending_payment', 'rejected'];

interface RouteParams { params: Promise<{ id: string }> }

const toNum = (v: { toNumber?: () => number } | number | unknown) => {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'toNumber' in v && typeof (v as { toNumber: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  return 0;
};

async function getRemainingBalance(creditNoteId: string, creditAmount: number): Promise<number> {
  const apps = await prisma.creditNoteApplication.findMany({
    where: { creditNoteId },
    select: { amountApplied: true },
  });
  const totalApplied = apps.reduce((s, a) => s + toNum(a.amountApplied), 0);
  return Math.max(0, creditAmount - totalApplied);
}

async function getInvoiceInfo(
  invoiceType: string,
  invoiceId: string
): Promise<{ total: number; invoiceNumber: string; isUnpaid: boolean; agreementId: string | null } | null> {
  // Sum already-applied credits for this target invoice
  const existingApps = await prisma.creditNoteApplication.findMany({
    where: { targetInvoiceId: invoiceId },
    select: { amountApplied: true },
  });
  const totalAlreadyApplied = existingApps.reduce((s, a) => s + toNum(a.amountApplied), 0);

  if (invoiceType === 'deposit') {
    const deposit = await prisma.deposit.findUnique({
      where: { id: invoiceId },
      select: { depositAmount: true, status: true, depositNumber: true, agreementId: true },
    });
    if (!deposit) return null;
    return {
      total: Math.max(0, toNum(deposit.depositAmount) - totalAlreadyApplied),
      invoiceNumber: deposit.depositNumber,
      isUnpaid: UNPAID_DEPOSIT_STATUSES.includes(deposit.status),
      agreementId: deposit.agreementId,
    };
  }

  if (invoiceType === 'monthlyRental') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
      where: { id: invoiceId },
      select: { totalAmount: true, status: true, invoiceNumber: true, agreementId: true },
    });
    if (!invoice) return null;
    return {
      total: Math.max(0, toNum(invoice.totalAmount) - totalAlreadyApplied),
      invoiceNumber: invoice.invoiceNumber,
      isUnpaid: UNPAID_MONTHLY_STATUSES.includes(invoice.status),
      agreementId: invoice.agreementId,
    };
  }

  if (invoiceType === 'additionalCharge') {
    const charge = await prisma.additionalCharge.findUnique({
      where: { id: invoiceId },
      select: { totalCharges: true, status: true, invoiceNo: true, deliverySetId: true, returnRequestId: true, openRepairSlipId: true },
    });
    if (!charge) return null;
    // Resolve agreementId for additional charge
    const agId = await resolveAgreementId('additionalCharge', invoiceId);
    return {
      total: Math.max(0, toNum(charge.totalCharges) - totalAlreadyApplied),
      invoiceNumber: charge.invoiceNo,
      isUnpaid: UNPAID_CHARGE_STATUSES.includes(charge.status),
      agreementId: agId,
    };
  }

  return null;
}

async function markInvoicePaidIfCovered(
  invoiceType: string,
  invoiceId: string,
  appliedBy: string
): Promise<void> {
  // Recalculate outstanding
  const existingApps = await prisma.creditNoteApplication.findMany({
    where: { targetInvoiceId: invoiceId },
    select: { amountApplied: true },
  });
  const totalApplied = existingApps.reduce((s, a) => s + toNum(a.amountApplied), 0);

  let invoiceTotal = 0;
  if (invoiceType === 'deposit') {
    const d = await prisma.deposit.findUnique({ where: { id: invoiceId }, select: { depositAmount: true } });
    invoiceTotal = toNum(d?.depositAmount);
  } else if (invoiceType === 'monthlyRental') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = await (prisma as any).monthlyRentalInvoice.findUnique({ where: { id: invoiceId }, select: { totalAmount: true } });
    invoiceTotal = toNum(inv?.totalAmount);
  } else if (invoiceType === 'additionalCharge') {
    const c = await prisma.additionalCharge.findUnique({ where: { id: invoiceId }, select: { totalCharges: true } });
    invoiceTotal = toNum(c?.totalCharges);
  }

  if (totalApplied < invoiceTotal) return;

  if (invoiceType === 'deposit') {
    await prisma.deposit.update({
      where: { id: invoiceId },
      data: { status: 'Paid', approvedBy: appliedBy, approvedAt: new Date(), referenceNumber: 'Credit Note Applied' },
    });
  } else if (invoiceType === 'monthlyRental') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).monthlyRentalInvoice.update({
      where: { id: invoiceId },
      data: { status: 'Paid', approvedBy: appliedBy, approvedAt: new Date(), referenceNumber: 'Credit Note Applied' },
    });
  } else if (invoiceType === 'additionalCharge') {
    await prisma.additionalCharge.update({
      where: { id: invoiceId },
      data: { status: 'approved', approvalDate: new Date(), referenceId: 'Credit Note Applied' },
    });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to apply credit notes' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Credit note ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { targetInvoiceType, targetInvoiceId, amount, notes } = body;

    if (!targetInvoiceType || !targetInvoiceId || !amount) {
      return NextResponse.json(
        { success: false, message: 'targetInvoiceType, targetInvoiceId, and amount are required' },
        { status: 400 }
      );
    }
    if (!['deposit', 'monthlyRental', 'additionalCharge'].includes(targetInvoiceType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid targetInvoiceType' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (!(numAmount > 0)) {
      return NextResponse.json(
        { success: false, message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get credit note
    const cn = await prisma.creditNote.findUnique({
      where: { id },
      select: { id: true, status: true, amount: true, agreementId: true, invoiceType: true },
    });
    if (!cn) {
      return NextResponse.json({ success: false, message: 'Credit note not found' }, { status: 404 });
    }
    if (cn.status !== 'Approved') {
      return NextResponse.json(
        { success: false, message: 'Only approved credit notes can be applied' },
        { status: 400 }
      );
    }

    // Check remaining balance
    const creditAmount = toNum(cn.amount);
    const remaining = await getRemainingBalance(id, creditAmount);
    if (numAmount > remaining) {
      return NextResponse.json(
        { success: false, message: `Amount exceeds remaining credit balance (RM${remaining.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Get target invoice info
    const invoiceInfo = await getInvoiceInfo(targetInvoiceType, targetInvoiceId);
    if (!invoiceInfo) {
      return NextResponse.json(
        { success: false, message: 'Target invoice not found' },
        { status: 404 }
      );
    }
    if (!invoiceInfo.isUnpaid) {
      return NextResponse.json(
        { success: false, message: 'Target invoice is already paid' },
        { status: 400 }
      );
    }

    // Validate same agreement
    if (cn.agreementId && invoiceInfo.agreementId && cn.agreementId !== invoiceInfo.agreementId) {
      return NextResponse.json(
        { success: false, message: 'Credit note can only be applied to invoices in the same agreement/project' },
        { status: 400 }
      );
    }

    // Check amount doesn't exceed outstanding
    if (numAmount > invoiceInfo.total) {
      return NextResponse.json(
        { success: false, message: `Amount exceeds invoice outstanding (RM${invoiceInfo.total.toFixed(2)})` },
        { status: 400 }
      );
    }

    const appliedBy = session.user.email || session.user.name || 'Unknown';

    // Create application record
    const application = await prisma.creditNoteApplication.create({
      data: {
        creditNoteId: id,
        targetInvoiceType,
        targetInvoiceId,
        targetInvoiceNumber: invoiceInfo.invoiceNumber,
        amountApplied: numAmount,
        appliedBy,
        notes: notes || null,
      },
    });

    // Mark invoice as paid if fully covered
    await markInvoicePaidIfCovered(targetInvoiceType, targetInvoiceId, appliedBy);

    return NextResponse.json({
      success: true,
      message: `RM${numAmount.toFixed(2)} applied to ${invoiceInfo.invoiceNumber}`,
      application: {
        ...application,
        amountApplied: toNum(application.amountApplied),
        appliedAt: application.appliedAt.toISOString(),
      },
      remainingBalance: remaining - numAmount,
    });
  } catch (error) {
    console.error('[Credit notes] apply error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to apply credit note' },
      { status: 500 }
    );
  }
}
