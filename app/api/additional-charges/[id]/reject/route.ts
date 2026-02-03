/**
 * PUT /api/additional-charges/[id]/reject
 * Body: { reason }; require non-empty reason; send rejection email to uploadedByEmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAdditionalChargeRejectionEmail } from '@/lib/email';

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Charge ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json(
        { success: false, message: 'reason is required and must be non-empty' },
        { status: 400 }
      );
    }

    const charge = await prisma.additionalCharge.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!charge) {
      return NextResponse.json(
        { success: false, message: 'Additional charge not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.additionalCharge.update({
      where: { id },
      data: {
        rejectionReason: reason,
        status: 'rejected',
        rejectionDate: new Date(),
      },
      include: { items: true },
    });

    if (updated.uploadedByEmail) {
      try {
        await sendAdditionalChargeRejectionEmail(
          updated.uploadedByEmail,
          updated.invoiceNo,
          reason,
          updated.id,
          updated.customerName
        );
      } catch (emailErr) {
        console.error('[Additional Charges API] Rejection email failed:', emailErr);
      }
    }

    const serialized = {
      ...updated,
      totalCharges: Number(updated.totalCharges),
      dueDate: updated.dueDate.toISOString(),
      approvalDate: updated.approvalDate?.toISOString() ?? null,
      rejectionDate: updated.rejectionDate?.toISOString() ?? null,
      items: updated.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Additional Charges API] reject error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reject charge' },
      { status: 500 }
    );
  }
}
