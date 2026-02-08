/**
 * GET /api/soa/transactions?agreementId=<id>
 * Returns project info, summary, and unified transaction list for SOA.
 * Each transaction includes entityType and entityId for navigation (View / View document / Download receipt).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

type TransactionType =
  | 'Deposit'
  | 'Deposit Payment'
  | 'Deposit Refund'
  | 'Monthly Bill'
  | 'Monthly Payment'
  | 'Default Interest'
  | 'Additional Charge'
  | 'Additional Charge Payment'
  | 'Credit Note'
  | 'Adjustment';

type EntityType = 'deposit' | 'monthlyRental' | 'additionalCharge' | 'creditNote' | 'refund';

interface RawTx {
  date: Date;
  type: TransactionType;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
  entityType: EntityType;
  entityId: string;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const d = v as { toNumber?: () => number };
  return d?.toNumber?.() ?? Number(v) ?? 0;
}

function mapStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'paid' || lower === 'approved') return 'Paid';
  if (lower === 'pending payment' || lower === 'pending_payment' || lower === 'overdue') return 'Unpaid';
  if (lower === 'pending approval' || lower === 'pending_approval') return 'Pending Approval';
  if (lower === 'rejected') return 'Rejected';
  return 'Unpaid';
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

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
    const rawPageSize = parseInt(request.nextUrl.searchParams.get('pageSize') ?? '10', 10);
    const pageSize = [5, 10, 25, 50].includes(rawPageSize) ? rawPageSize : 10;
    const orderByParam = request.nextUrl.searchParams.get('orderBy') ?? 'latest';
    const orderLatest = orderByParam !== 'earliest';

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        projectName: true,
        hirer: true,
        status: true,
        createdAt: true,
        rfqId: true,
      },
    });

    if (!agreement) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    const rfqId = agreement.rfqId;
    const customerName = agreement.hirer || 'Customer';

    const rawTxs: RawTx[] = [];

    // --- Deposits ---
    const deposits = await prisma.deposit.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
    });
    for (const d of deposits) {
      const amt = toNum(d.depositAmount);
      rawTxs.push({
        date: d.createdAt,
        type: 'Deposit',
        reference: d.depositNumber,
        description: 'Security deposit',
        debit: amt,
        credit: 0,
        status: mapStatus(d.status),
        entityType: 'deposit',
        entityId: d.id,
      });
      if (d.status === 'Paid' && d.approvedAt) {
        rawTxs.push({
          date: d.approvedAt,
          type: 'Deposit Payment',
          reference: d.referenceNumber || d.depositNumber,
          description: 'Deposit payment received',
          debit: 0,
          credit: amt,
          status: 'Paid',
          entityType: 'deposit',
          entityId: d.id,
        });
      }
    }

    // --- Monthly rental invoices ---
    const prismaAny = prisma as unknown as {
      monthlyRentalInvoice: {
        findMany: (args: {
          where: { agreementId: string };
          include: unknown;
          orderBy: { createdAt: string };
        }) => Promise<Array<{
          id: string;
          invoiceNumber: string;
          createdAt: Date;
          dueDate: Date;
          baseAmount: unknown;
          totalAmount: unknown;
          overdueCharges: unknown;
          status: string;
          approvedAt: Date | null;
          referenceNumber: string | null;
        }>>;
      };
    };
    const invoices = await prismaAny.monthlyRentalInvoice.findMany({
      where: { agreementId },
      include: {},
      orderBy: { createdAt: 'asc' },
    });
    for (const inv of invoices) {
      const total = toNum(inv.totalAmount);
      const base = toNum(inv.baseAmount);
      const overdue = toNum(inv.overdueCharges);
      rawTxs.push({
        date: inv.createdAt,
        type: 'Monthly Bill',
        reference: inv.invoiceNumber,
        description: `Monthly rental`,
        debit: total,
        credit: 0,
        status: mapStatus(inv.status),
        entityType: 'monthlyRental',
        entityId: inv.id,
      });
      if (inv.status === 'Paid' && inv.approvedAt) {
        rawTxs.push({
          date: inv.approvedAt,
          type: 'Monthly Payment',
          reference: inv.referenceNumber || inv.invoiceNumber,
          description: 'Payment received',
          debit: 0,
          credit: total,
          status: 'Paid',
          entityType: 'monthlyRental',
          entityId: inv.id,
        });
      }
      if (overdue > 0) {
        rawTxs.push({
          date: inv.dueDate,
          type: 'Default Interest',
          reference: inv.invoiceNumber,
          description: 'Late payment interest',
          debit: overdue,
          credit: 0,
          status: mapStatus(inv.status),
          entityType: 'monthlyRental',
          entityId: inv.id,
        });
      }
    }

    // --- Additional charges (via return or delivery linked to this agreement's rfq) ---
    let additionalChargeIds: string[] = [];
    if (rfqId) {
      // ReturnRequest doesn't have rfqId directly - it links through DeliverySet -> DeliveryRequest -> rfqId
      const returnRequests = await prisma.returnRequest.findMany({
        where: {
          deliverySet: {
            deliveryRequest: {
              rfqId: rfqId,
            },
          },
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
          OR: [
            { openRepairSlipId: { in: openRepairSlipIds } },
            { deliverySetId: { in: deliverySetIds } },
            { returnRequestId: { in: returnRequestIds } },
          ],
        },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });
      additionalChargeIds = charges.map((c) => c.id);
      for (const c of charges) {
        const amt = toNum(c.totalCharges);
        rawTxs.push({
          date: c.createdAt,
          type: 'Additional Charge',
          reference: c.invoiceNo,
          description: `Additional charge - ${c.doId}`,
          debit: amt,
          credit: 0,
          status: mapStatus(c.status),
          entityType: 'additionalCharge',
          entityId: c.id,
        });
        if (c.status === 'approved' && c.approvalDate) {
          rawTxs.push({
            date: c.approvalDate,
            type: 'Additional Charge Payment',
            reference: c.referenceId || c.invoiceNo,
            description: 'Payment received',
            debit: 0,
            credit: amt,
            status: 'Paid',
            entityType: 'additionalCharge',
            entityId: c.id,
          });
        }
      }
    }

    const depositIds = deposits.map((d) => d.id);
    const invoiceIds = invoices.map((i) => i.id);
    const sourceIds = [...depositIds, ...invoiceIds, ...additionalChargeIds];

    // --- Credit notes (sourceId in our entities) ---
    if (sourceIds.length > 0) {
      const creditNotes = await prisma.creditNote.findMany({
        where: { sourceId: { in: sourceIds } },
        orderBy: { date: 'asc' },
      });
      for (const cn of creditNotes) {
        const amt = toNum(cn.amount);
        rawTxs.push({
          date: cn.date,
          type: 'Credit Note',
          reference: cn.creditNoteNumber,
          description: cn.reason || 'Credit note',
          debit: 0,
          credit: amt,
          status: mapStatus(cn.status),
          entityType: 'creditNote',
          entityId: cn.id,
        });
      }
    }

    // --- Refunds (sourceId in our entities) ---
    if (sourceIds.length > 0) {
      const refunds = await prisma.refund.findMany({
        where: { sourceId: { in: sourceIds } },
        orderBy: { createdAt: 'asc' },
      });
      for (const r of refunds) {
        const amt = toNum(r.amount);
        rawTxs.push({
          date: r.createdAt,
          type: 'Deposit Refund',
          reference: r.refundNumber,
          description: r.reason || 'Refund',
          debit: 0,
          credit: amt,
          status: mapStatus(r.status),
          entityType: 'refund',
          entityId: r.id,
        });
      }
    }

    // Sort by date (latest = desc, earliest = asc) and add id, balance
    rawTxs.sort((a, b) =>
      orderLatest ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()
    );
    let balance = 0;
    const allTransactions = rawTxs.map((tx, idx) => {
      balance = balance + tx.debit - tx.credit;
      return {
        id: `tx-${agreementId}-${idx}-${tx.entityId}`,
        date: tx.date.toISOString().slice(0, 10),
        type: tx.type,
        reference: tx.reference,
        description: tx.description,
        debit: tx.debit,
        credit: tx.credit,
        balance,
        status: tx.status as 'Paid' | 'Unpaid' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Partial',
        entityType: tx.entityType,
        entityId: tx.entityId,
      };
    });

    const totalTransactions = allTransactions.length;
    const skip = (page - 1) * pageSize;
    const transactions = allTransactions.slice(skip, skip + pageSize);

    // Summary
    const totalDepositCollected = deposits.reduce((s, d) => s + toNum(d.depositAmount), 0);
    const totalMonthlyBilling = invoices.reduce((s, i) => s + toNum(i.totalAmount), 0);
    const totalPenalty = invoices.reduce((s, i) => s + toNum(i.overdueCharges), 0);
    const chargesForAgreement = rawTxs.filter((t) => t.entityType === 'additionalCharge' && t.debit > 0);
    const totalAdditionalCharges = chargesForAgreement.reduce((s, t) => s + t.debit, 0);
    const totalCredits = rawTxs.reduce((s, t) => s + t.credit, 0);
    const totalDebits = rawTxs.reduce((s, t) => s + t.debit, 0);
    const totalPaid = totalCredits;
    const finalBalance = totalDebits - totalCredits;

    const project = {
      id: agreement.id,
      projectName: agreement.projectName,
      customerId: agreement.id,
      customerName,
      startDate: agreement.createdAt.toISOString().slice(0, 10),
      endDate: undefined as string | undefined,
      status: agreement.status === 'Draft' ? 'Active' : agreement.status === 'Completed' ? 'Completed' : 'Active',
    };

    const summary = {
      totalDepositCollected,
      totalMonthlyBilling,
      totalPenalty,
      totalAdditionalCharges,
      totalPaid,
      finalBalance,
    };

    return NextResponse.json({
      success: true,
      project,
      summary,
      transactions,
      total: totalTransactions,
      page,
      pageSize,
      orderBy: orderByParam,
    });
  } catch (e) {
    console.error('[SOA transactions]', e);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch SOA transactions' },
      { status: 500 }
    );
  }
}
