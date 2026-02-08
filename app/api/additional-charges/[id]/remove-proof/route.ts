/**
 * PUT /api/additional-charges/[id]/remove-proof
 * Remove proof of payment and reset status to pending_payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Only allow removal when payment is not yet paid
    if (charge.status === 'paid') {
      return NextResponse.json(
        { success: false, message: 'Cannot remove proof after payment is paid' },
        { status: 400 }
      );
    }

    // Must have proof to remove
    if (!charge.proofOfPaymentUrl) {
      return NextResponse.json(
        { success: false, message: 'No proof of payment to remove' },
        { status: 400 }
      );
    }

    const updated = await prisma.additionalCharge.update({
      where: { id },
      data: {
        proofOfPaymentUrl: null,
        status: 'pending_payment',
        uploadedByEmail: null,
      },
      include: { items: true },
    });

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
    console.error('[Additional Charges API] remove-proof error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove proof of payment' },
      { status: 500 }
    );
  }
}
