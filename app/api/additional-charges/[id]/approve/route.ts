/**
 * PUT /api/additional-charges/[id]/approve
 * Body: { referenceId }; require non-empty referenceId
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

    const body = await request.json();
    const referenceId = typeof body.referenceId === 'string' ? body.referenceId.trim() : '';
    if (!referenceId) {
      return NextResponse.json(
        { success: false, message: 'referenceId is required and must be non-empty' },
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
        referenceId,
        status: 'approved',
        approvalDate: new Date(),
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
    console.error('[Additional Charges API] approve error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to approve charge' },
      { status: 500 }
    );
  }
}
