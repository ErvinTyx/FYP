/**
 * GET /api/credit-notes/eligible-invoices?agreementId=X
 * Returns all unpaid invoices (deposits, monthly rentals, additional charges)
 * for a given agreement, with their outstanding amounts (total minus previously applied credits).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

const UNPAID_DEPOSIT_STATUSES = ['Pending Payment', 'Overdue', 'Rejected'];
const UNPAID_MONTHLY_STATUSES = ['Pending Payment', 'Overdue', 'Rejected'];
const UNPAID_CHARGE_STATUSES = ['pending_payment', 'rejected'];

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const d = v as { toNumber?: () => number };
  return d?.toNumber?.() ?? Number(v) ?? 0;
}

interface EligibleInvoice {
  id: string;
  invoiceNumber: string;
  invoiceType: 'deposit' | 'monthlyRental' | 'additionalCharge';
  totalAmount: number;
  outstanding: number;
  status: string;
  date: string;
  description: string;
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

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, rfqId: true },
    });
    if (!agreement) {
      return NextResponse.json({ success: false, message: 'Agreement not found' }, { status: 404 });
    }

    const results: EligibleInvoice[] = [];

    // Get all existing credit applications for deducting applied amounts
    const allApplications = await prisma.creditNoteApplication.findMany({
      select: { targetInvoiceId: true, amountApplied: true },
    });
    const appliedMap = new Map<string, number>();
    for (const app of allApplications) {
      const current = appliedMap.get(app.targetInvoiceId) || 0;
      appliedMap.set(app.targetInvoiceId, current + toNum(app.amountApplied));
    }

    // --- Deposits ---
    const deposits = await prisma.deposit.findMany({
      where: {
        agreementId,
        status: { in: UNPAID_DEPOSIT_STATUSES },
      },
      orderBy: { createdAt: 'asc' },
    });
    for (const d of deposits) {
      const total = toNum(d.depositAmount);
      const applied = appliedMap.get(d.id) || 0;
      const outstanding = Math.max(0, total - applied);
      if (outstanding > 0) {
        results.push({
          id: d.id,
          invoiceNumber: d.depositNumber,
          invoiceType: 'deposit',
          totalAmount: total,
          outstanding,
          status: d.status,
          date: d.createdAt.toISOString().slice(0, 10),
          description: 'Security deposit',
        });
      }
    }

    // --- Monthly Rental Invoices ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = await (prisma as any).monthlyRentalInvoice.findMany({
      where: {
        agreementId,
        status: { in: UNPAID_MONTHLY_STATUSES },
      },
      orderBy: { createdAt: 'asc' },
    });
    for (const inv of invoices) {
      const total = toNum(inv.totalAmount);
      const applied = appliedMap.get(inv.id) || 0;
      const outstanding = Math.max(0, total - applied);
      if (outstanding > 0) {
        results.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceType: 'monthlyRental',
          totalAmount: total,
          outstanding,
          status: inv.status,
          date: inv.createdAt.toISOString().slice(0, 10),
          description: 'Monthly rental invoice',
        });
      }
    }

    // --- Additional Charges (via rfq chains, same as SOA) ---
    const rfqId = agreement.rfqId;
    if (rfqId) {
      const returnRequests = await prisma.returnRequest.findMany({
        where: {
          deliverySet: { deliveryRequest: { rfqId } },
        },
        select: { id: true },
      });
      const returnRequestIds = returnRequests.map((r) => r.id);

      const conditionReports = await prisma.conditionReport.findMany({
        where: { returnRequestId: { in: returnRequestIds } },
        select: { id: true },
      });
      const conditionReportIds = conditionReports.map((c) => c.id);

      const repairSlips = await prisma.openRepairSlip.findMany({
        where: { conditionReportId: { in: conditionReportIds } },
        select: { id: true },
      });
      const openRepairSlipIds = repairSlips.map((s) => s.id);

      const deliveryRequests = await prisma.deliveryRequest.findMany({
        where: { rfqId },
        select: { id: true },
      });
      const deliveryRequestIds = deliveryRequests.map((d) => d.id);

      const deliverySets = await prisma.deliverySet.findMany({
        where: { deliveryRequestId: { in: deliveryRequestIds } },
        select: { id: true },
      });
      const deliverySetIds = deliverySets.map((ds) => ds.id);

      const charges = await prisma.additionalCharge.findMany({
        where: {
          status: { in: UNPAID_CHARGE_STATUSES },
          OR: [
            { openRepairSlipId: { in: openRepairSlipIds } },
            { deliverySetId: { in: deliverySetIds } },
            { returnRequestId: { in: returnRequestIds } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      for (const c of charges) {
        const total = toNum(c.totalCharges);
        const applied = appliedMap.get(c.id) || 0;
        const outstanding = Math.max(0, total - applied);
        if (outstanding > 0) {
          results.push({
            id: c.id,
            invoiceNumber: c.invoiceNo,
            invoiceType: 'additionalCharge',
            totalAmount: total,
            outstanding,
            status: c.status,
            date: c.createdAt.toISOString().slice(0, 10),
            description: `Additional charge - ${c.doId}`,
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('[Credit notes] eligible-invoices error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch eligible invoices' },
      { status: 500 }
    );
  }
}
