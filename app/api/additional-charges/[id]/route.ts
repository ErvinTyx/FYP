/**
 * GET /api/additional-charges/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams { params: Promise<{ id: string }> }

/**
 * GET /api/additional-charges/[id]
 *
 * For delivery/return workflows the listing endpoint groups charges per request
 * but still exposes a single representative AdditionalCharge id to the UI.
 * Here we simply return that specific charge (plus its items) without further
 * aggregation so the detail view reflects the same invoice that was selected
 * in the list.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const serialized = {
      ...charge,
      totalCharges: Number(charge.totalCharges),
      dueDate: charge.dueDate.toISOString(),
      approvalDate: charge.approvalDate?.toISOString() ?? null,
      rejectionDate: charge.rejectionDate?.toISOString() ?? null,
      items: charge.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Additional Charges API] GET by ID error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get additional charge' },
      { status: 500 }
    );
  }
}
