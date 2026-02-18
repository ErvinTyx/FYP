import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computeTermOfHireFromRfqItems } from '@/lib/term-of-hire';

/**
 * GET /api/rfq/[id]/term-of-hire
 * Returns computed term of hire for the given RFQ.
 * Monthly rental is computed on the client as Total Rental (RM) / Total Rental Month.
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
    const termOfHire = await computeTermOfHireFromRfqItems(prisma, rfqId);
    return NextResponse.json({ success: true, termOfHire });
  } catch (error) {
    console.error('[RFQ term-of-hire] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to compute term of hire' },
      { status: 500 }
    );
  }
}
