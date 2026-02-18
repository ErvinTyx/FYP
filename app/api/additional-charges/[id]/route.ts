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
      include: { 
        items: true,
      },
    });

    if (!charge) {
      return NextResponse.json(
        { success: false, message: 'Additional charge not found' },
        { status: 404 }
      );
    }

    // Fetch correct DO number from related entities - generate from requestId if DO not issued yet
    let correctDoId: string | null = null;
    
    if (charge.deliverySetId) {
      // For delivery charges: get DO number from deliverySet.doIssued.doNumber or generate from requestId
      const deliverySet = await prisma.deliverySet.findUnique({
        where: { id: charge.deliverySetId },
        select: {
          doIssued: {
            select: { doNumber: true },
          },
          deliveryRequest: {
            select: {
              requestId: true,
              agreementNo: true,
            },
          },
        },
      });
      if (deliverySet?.doIssued?.doNumber) {
        // Use actual DO number if issued
        correctDoId = deliverySet.doIssued.doNumber;
      } else if (deliverySet?.deliveryRequest) {
        // Generate DO number from requestId format: DEL-RA-2026-001-20260218-2 -> DO-RA-2026-001-20260218-2
        const dr = deliverySet.deliveryRequest;
        const requestIdPrefix = `DEL-${dr.agreementNo}-`;
        const uniqueSuffix = dr.requestId.startsWith(requestIdPrefix)
          ? dr.requestId.slice(requestIdPrefix.length)
          : dr.requestId;
        correctDoId = `DO-${dr.agreementNo}-${uniqueSuffix}`;
      }
    } else if (charge.returnRequestId) {
      // For return charges: get DO number from returnRequest.deliverySet.doIssued.doNumber or generate from requestId
      const returnRequest = await prisma.returnRequest.findUnique({
        where: { id: charge.returnRequestId },
        select: {
          deliverySet: {
            select: {
              doIssued: {
                select: { doNumber: true },
              },
              deliveryRequest: {
                select: {
                  requestId: true,
                  agreementNo: true,
                },
              },
            },
          },
        },
      });
      if (returnRequest?.deliverySet?.doIssued?.doNumber) {
        // Use actual DO number if issued
        correctDoId = returnRequest.deliverySet.doIssued.doNumber;
      } else if (returnRequest?.deliverySet?.deliveryRequest) {
        // Generate DO number from delivery requestId format: DEL-RA-2026-001-20260218-2 -> DO-RA-2026-001-20260218-2
        const dr = returnRequest.deliverySet.deliveryRequest;
        const requestIdPrefix = `DEL-${dr.agreementNo}-`;
        const uniqueSuffix = dr.requestId.startsWith(requestIdPrefix)
          ? dr.requestId.slice(requestIdPrefix.length)
          : dr.requestId;
        correctDoId = `DO-${dr.agreementNo}-${uniqueSuffix}`;
      }
    } else if (charge.conditionReportId) {
      // For repair slip charges: get DO number from conditionReport.deliveryOrderNumber
      const conditionReport = await prisma.conditionReport.findUnique({
        where: { id: charge.conditionReportId },
        select: { deliveryOrderNumber: true },
      });
      if (conditionReport?.deliveryOrderNumber) {
        correctDoId = conditionReport.deliveryOrderNumber;
      }
    }

    const serialized = {
      ...charge,
      doId: correctDoId || '', // Use empty string if no DO number found, never use rental agreement ID
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
