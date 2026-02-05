import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computeTermOfHireFromRfqItems, computeMonthlyRentalFromRfqItems } from '@/lib/term-of-hire';

/**
 * GET /api/rfq/[id]/term-of-hire
 * Returns computed term of hire and monthly rental (total from RFQ items) for the given RFQ.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rfqId } = await context.params;
    if (!rfqId?.trim()) {
      return NextResponse.json(
        { success: false, message: 'RFQ ID is required' },
        { status: 400 }
      );
    }
    const [termOfHire, monthlyRental] = await Promise.all([
      computeTermOfHireFromRfqItems(prisma, rfqId),
      computeMonthlyRentalFromRfqItems(prisma, rfqId),
    ]);
    return NextResponse.json({ success: true, termOfHire, monthlyRental });
  } catch (error) {
    console.error('[RFQ term-of-hire] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to compute term of hire' },
      { status: 500 }
    );
  }
}
