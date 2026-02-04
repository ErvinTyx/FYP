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

    const creditNotes = await prisma.creditNote.findMany({
      where: { sourceId, status: 'Approved' },
      select: { id: true, creditNoteNumber: true, amount: true, date: true },
    });
    const toNum = (v: unknown) => (typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0));
    const totalCredited = creditNotes.reduce((sum, cn) => sum + toNum(cn.amount), 0);
    const approvedRefunds = await prisma.refund.findMany({
      where: { sourceId, status: 'Approved' },
      select: { amount: true },
    });
    const totalRefunded = approvedRefunds.reduce((sum, refund) => sum + toNum(refund.amount), 0);
    const amountToReturn = Math.max(0, totalCredited - totalRefunded);
    const relatedCreditNotes = creditNotes.map((cn) => ({
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      amount: toNum(cn.amount),
      date: cn.date.toISOString().split('T')[0],
    }));

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
      const invoice = await prisma.monthlyRentalInvoice.findUnique({
        where: { id: sourceId },
        include: { items: true },
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
          customerName: invoice.customerName,
          customerEmail: invoice.customerEmail,
          amount: totalAmount,
          status: invoice.status,
          dueDate: invoice.dueDate.toISOString(),
          billingMonth: invoice.billingMonth,
          billingYear: invoice.billingYear,
          items: invoice.items.map((i) => ({
            id: i.id,
            scaffoldingItemName: i.scaffoldingItemName,
            quantityBilled: i.quantityBilled,
            unitPrice: Number(i.unitPrice),
            daysCharged: i.daysCharged,
            lineTotal: Number(i.lineTotal),
          })),
        },
        relatedCreditNotes,
        totalCredited,
        amountToReturn,
      });
    }

    const charge = await prisma.additionalCharge.findUnique({
      where: { id: sourceId },
      include: { items: true },
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
        customerName: charge.customerName,
        amount: totalCharges,
        status: charge.status,
        dueDate: charge.dueDate.toISOString(),
        items: charge.items.map((i) => ({
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
