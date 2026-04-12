/**
 * GET /api/refunds/invoice-details?invoiceType=deposit|monthlyRental|additionalCharge&sourceId=<id>
 * Returns invoice details plus related approved credit notes and totalCredited (max refundable).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invoiceType = searchParams.get('invoiceType');
    const sourceId = searchParams.get('sourceId');
    if (!invoiceType || !sourceId) {
      return NextResponse.json(
        { success: false, message: 'invoiceType and sourceId are required' },
        { status: 400 }
      );
    }
    if (!['deposit', 'monthlyRental', 'additionalCharge'].includes(invoiceType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid invoiceType' },
        { status: 400 }
      );
    }

    // Resolve agreementId for the selected invoice (needed to find return-item credit notes)
    let agreementId: string | null = null;
    if (invoiceType === 'deposit') {
      const deposit = await prisma.deposit.findUnique({ where: { id: sourceId }, select: { agreementId: true } });
      agreementId = deposit?.agreementId ?? null;
    } else if (invoiceType === 'monthlyRental') {
      const invoice = await prisma.monthlyRentalInvoice.findUnique({ where: { id: sourceId }, select: { agreementId: true } });
      agreementId = invoice?.agreementId ?? null;
    } else {
      // Additional charge: resolve agreement via deliverySetId or returnRequestId -> deliverySet -> deliveryRequest -> rfq
      const charge = await prisma.additionalCharge.findUnique({
        where: { id: sourceId },
        select: { deliverySetId: true, returnRequestId: true },
      });
      let rfqId: string | null = null;
      if (charge?.deliverySetId) {
        const ds = await prisma.deliverySet.findUnique({
          where: { id: charge.deliverySetId },
          select: { deliveryRequest: { select: { rfqId: true } } },
        });
        rfqId = ds?.deliveryRequest?.rfqId ?? null;
      }
      if (!rfqId && charge?.returnRequestId) {
        const rr = await prisma.returnRequest.findUnique({
          where: { id: charge.returnRequestId },
          select: { deliverySet: { select: { deliveryRequest: { select: { rfqId: true } } } } },
        });
        rfqId = rr?.deliverySet?.deliveryRequest?.rfqId ?? null;
      }
      if (rfqId) {
        const agreement = await prisma.rentalAgreement.findFirst({ where: { rfqId }, select: { id: true } });
        agreementId = agreement?.id ?? null;
      }
    }

    // Find approved credit notes: (1) sourceId = invoice id, or (2) agreementId = invoice's agreement
    // (2) catches return-item credit notes, which use agreementId as sourceId
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        status: 'Approved',
        OR: [
          { sourceId },
          ...(agreementId ? [{ agreementId }] : []),
        ],
      },
      select: { id: true, creditNoteNumber: true, amount: true, date: true },
    });
    const toNum = (v: unknown) => (typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0));
    const totalCredited = creditNotes.reduce((sum, cn) => sum + toNum(cn.amount), 0);

    // Fetch per-credit-note applications (CreditNoteApplication)
    const cnIds = creditNotes.map((cn) => cn.id);
    const applications = cnIds.length > 0
      ? await prisma.creditNoteApplication.findMany({
          where: { creditNoteId: { in: cnIds } },
          select: { creditNoteId: true, amountApplied: true },
        })
      : [];
    const appliedByCN = new Map<string, number>();
    for (const app of applications) {
      const prev = appliedByCN.get(app.creditNoteId) || 0;
      appliedByCN.set(app.creditNoteId, prev + toNum(app.amountApplied));
    }

    // Fetch per-credit-note approved refunds
    const refundsByCN = cnIds.length > 0
      ? await prisma.refund.findMany({
          where: { creditNoteId: { in: cnIds }, status: 'Approved' },
          select: { creditNoteId: true, amount: true },
        })
      : [];
    const refundedByCN = new Map<string, number>();
    for (const ref of refundsByCN) {
      if (!ref.creditNoteId) continue;
      const prev = refundedByCN.get(ref.creditNoteId) || 0;
      refundedByCN.set(ref.creditNoteId, prev + toNum(ref.amount));
    }

    const relatedCreditNotes = creditNotes.map((cn) => {
      const cnAmount = toNum(cn.amount);
      const totalApplied = appliedByCN.get(cn.id) || 0;
      const totalRefunded = refundedByCN.get(cn.id) || 0;
      const remainingBalance = Math.max(0, cnAmount - totalApplied - totalRefunded);
      return {
        id: cn.id,
        creditNoteNumber: cn.creditNoteNumber,
        amount: cnAmount,
        remainingBalance,
        date: cn.date.toISOString().split('T')[0],
      };
    });

    const amountToReturn = relatedCreditNotes.reduce((sum, cn) => sum + cn.remainingBalance, 0);

    if (invoiceType === 'deposit') {
      const deposit = await prisma.deposit.findUnique({
        where: { id: sourceId },
        include: { agreement: { include: { rfq: true } } },
      });
      if (!deposit) {
        return NextResponse.json({ success: false, message: 'Deposit not found' }, { status: 404 });
      }
      const paidAmount = Number(deposit.depositAmount);
      return NextResponse.json({
        success: true,
        invoice: {
          type: 'deposit',
          id: deposit.id,
          number: deposit.depositNumber,
          customerName: deposit.agreement?.hirer ?? '',
          amount: paidAmount,
          status: deposit.status,
          dueDate: deposit.dueDate.toISOString(),
          agreementNumber: deposit.agreement?.agreementNumber,
        },
        relatedCreditNotes,
        totalCredited,
        amountToReturn,
      });
    }

    if (invoiceType === 'monthlyRental') {
      const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
        where: { id: sourceId },
        include: {
          items: true,
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      });
      if (!invoice) {
        return NextResponse.json({ success: false, message: 'Monthly rental invoice not found' }, { status: 404 });
      }
      const totalAmount = Number(invoice.totalAmount);
      return NextResponse.json({
        success: true,
        invoice: {
          type: 'monthlyRental',
          id: invoice.id,
          number: invoice.invoiceNumber,
          customerId: invoice.customerId ?? null,
          customer: invoice.customer ?? null,
          amount: totalAmount,
          status: invoice.status,
          dueDate: invoice.dueDate.toISOString(),
          billingMonth: invoice.billingMonth,
          billingYear: invoice.billingYear,
          items: invoice.items.map((i: { id: string; scaffoldingItemName: string; quantityBilled: number; unitPrice: unknown; lineTotal: unknown }) => ({
            id: i.id,
            scaffoldingItemName: i.scaffoldingItemName,
            quantityBilled: i.quantityBilled,
            unitPrice: Number(i.unitPrice),
            lineTotal: Number(i.lineTotal),
          })),
        },
        relatedCreditNotes,
        totalCredited,
        amountToReturn,
      });
    }

    const charge = await (prisma as any).additionalCharge.findUnique({
      where: { id: sourceId },
      include: {
        items: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    if (!charge) {
      return NextResponse.json({ success: false, message: 'Additional charge not found' }, { status: 404 });
    }
    const totalCharges = Number(charge.totalCharges);
    return NextResponse.json({
      success: true,
      invoice: {
        type: 'additionalCharge',
        id: charge.id,
        number: charge.invoiceNo,
        customerId: charge.customerId ?? null,
        customer: charge.customer ?? null,
        amount: totalCharges,
        status: charge.status,
        dueDate: charge.dueDate.toISOString(),
        items: charge.items.map((i: { id: string; itemName: string; itemType: string; quantity: number; unitPrice: unknown; amount: unknown }) => ({
          id: i.id,
          itemName: i.itemName,
          itemType: i.itemType,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          amount: Number(i.amount),
        })),
      },
      relatedCreditNotes,
      totalCredited,
      amountToReturn,
    });
  } catch (error) {
    console.error('[Refunds invoice-details] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load invoice details' },
      { status: 500 }
    );
  }
}
