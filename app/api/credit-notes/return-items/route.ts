/**
 * GET /api/credit-notes/return-items?customerName=X&invoiceType=monthlyRental
 *
 * Fetches completed return requests for a customer, calculates each returned
 * item's rental duration (deliveredAt → warehouseReceipt.receivedAt), enforces
 * minimum charges from the agreement, and returns line items with calculated
 * amounts using the same billing formula as monthly rental invoices.
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
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName')?.trim();
    const invoiceType = searchParams.get('invoiceType') || 'monthlyRental';

    if (!customerName) {
      return NextResponse.json(
        { success: false, message: 'customerName is required' },
        { status: 400 }
      );
    }

    // 1. Find all completed return requests for this customer
    const returnRequests = await prisma.returnRequest.findMany({
      where: {
        customerName,
        status: 'Completed',
      },
      include: {
        items: true,
        warehouseReceipt: true,
        deliverySet: {
          include: {
            completion: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (returnRequests.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        message: 'No completed return requests found for this customer',
      });
    }

    // 2. Collect unique agreement numbers from return requests
    const agreementNos = [...new Set(returnRequests.map((rr) => rr.agreementNo))];

    // 3. Look up rental agreements with their items and RFQ items
    const agreements = await prisma.rentalAgreement.findMany({
      where: { agreementNumber: { in: agreementNos } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      include: { items: true } as any,
    });

    // Build maps for quick lookup
    const agreementByNumber = new Map<string, typeof agreements[0]>();
    for (const ag of agreements) {
      agreementByNumber.set(ag.agreementNumber, ag);
    }

    // 4. Get RFQ items for all related agreements (for the formula: totalMonths, rentalMonths, unitPrice)
    type RfqItemRow = {
      id: string;
      rfqId: string;
      setName: string;
      rentalMonths: number;
      quantity: number;
      unitPrice: unknown;
      scaffoldingItemId: string;
      scaffoldingItemName: string;
    };

    const rfqIds = agreements.map((a) => a.rfqId).filter(Boolean) as string[];
    let allRfqItems: RfqItemRow[] = [];
    if (rfqIds.length > 0) {
      const rows = await prisma.rFQItem.findMany({
        where: { rfqId: { in: rfqIds } },
        select: {
          id: true,
          rfqId: true,
          setName: true,
          rentalMonths: true,
          quantity: true,
          unitPrice: true,
          scaffoldingItemId: true,
          scaffoldingItemName: true,
        },
      });
      allRfqItems = rows as unknown as RfqItemRow[];
    }

    // Group RFQ items by rfqId for quick lookup
    const rfqItemsByRfqId = new Map<string, RfqItemRow[]>();
    for (const item of allRfqItems) {
      const list = rfqItemsByRfqId.get(item.rfqId) || [];
      list.push(item);
      rfqItemsByRfqId.set(item.rfqId, list);
    }

    // 5. Process each return request and build credit note line items
    const resultItems: Array<{
      scaffoldingItemId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      rentalMonths: number;       // original rental months from RFQ
      actualDays: number;
      actualMonths: number;
      chargedMonths: number;
      minimumMonths: number;
      previousPrice: number;      // full-period line total (original agreement)
      currentPrice: number;       // charged amount for actual/min period
      lineTotal: number;          // same as currentPrice
      returnRequestId: string;
      returnRequestNumber: string;
      setName: string;
      startDate: string | null;
      endDate: string | null;
      agreementNo: string;
    }> = [];

    for (const rr of returnRequests) {
      const agreement = agreementByNumber.get(rr.agreementNo);
      if (!agreement) continue;

      // Get delivery date (startDate) from DeliveryCompletion
      const deliveredAt = rr.deliverySet?.completion?.deliveredAt ?? null;

      // Get return date (endDate) from ReturnWarehouseReceipt
      const receivedAt = rr.warehouseReceipt?.receivedAt ?? null;

      // Get agreement-level minimumCharges (in months)
      const globalMinimumCharges = Number(agreement.minimumCharges) || 0;

      // Get RFQ items for this agreement
      const rfqItems = agreement.rfqId
        ? (rfqItemsByRfqId.get(agreement.rfqId) || [])
        : [];

      // Calculate totalMonths (sum of unique set months) - same as billing formula
      const monthsBySet = new Map<string, number>();
      for (const rfqItem of rfqItems) {
        const setName = rfqItem.setName ?? 'Set 1';
        if (!monthsBySet.has(setName)) {
          monthsBySet.set(setName, rfqItem.rentalMonths ?? 1);
        }
      }
      const totalMonths = [...monthsBySet.values()].reduce((a, b) => a + b, 0);

      // Build agreedMonthlyRate map from AgreementItems by scaffoldingItemId
      const agreedRateByScaffoldingId = new Map<string, { rate: number; minimumRentalMonths: number }>();
      const agreedRateByRfqItemId = new Map<string, { rate: number; minimumRentalMonths: number }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const agItem of ((agreement as any).items || []) as Array<{
        rfqItemId: string | null;
        scaffoldingItemId: string;
        agreedMonthlyRate: unknown;
        minimumRentalMonths: number;
      }>) {
        const rate = Number(agItem.agreedMonthlyRate) || 0;
        const minMonths = agItem.minimumRentalMonths ?? 1;
        if (agItem.scaffoldingItemId) {
          agreedRateByScaffoldingId.set(agItem.scaffoldingItemId, { rate, minimumRentalMonths: minMonths });
        }
        if (agItem.rfqItemId) {
          agreedRateByRfqItemId.set(agItem.rfqItemId, { rate, minimumRentalMonths: minMonths });
        }
      }

      // Process each return item
      for (const retItem of rr.items) {
        if (!retItem.scaffoldingItemId) continue;

        const quantityReturned = retItem.quantityReturned || retItem.quantity || 0;
        if (quantityReturned <= 0) continue;

        // Find the matching RFQ item (match by scaffoldingItemId and setName if possible)
        let matchedRfqItem: RfqItemRow | undefined;
        // Try to match by scaffoldingItemId + setName first
        matchedRfqItem = rfqItems.find(
          (ri) => ri.scaffoldingItemId === retItem.scaffoldingItemId && ri.setName === rr.setName
        );
        // Fallback: match by scaffoldingItemId only
        if (!matchedRfqItem) {
          matchedRfqItem = rfqItems.find(
            (ri) => ri.scaffoldingItemId === retItem.scaffoldingItemId
          );
        }

        // Determine unit price (agreed rate > RFQ unitPrice > 0)
        const agreedInfo = agreedRateByScaffoldingId.get(retItem.scaffoldingItemId);
        let unitPrice = 0;
        let minimumMonths = globalMinimumCharges;

        if (agreedInfo) {
          unitPrice = agreedInfo.rate;
          minimumMonths = agreedInfo.minimumRentalMonths || globalMinimumCharges;
        } else if (matchedRfqItem) {
          // Try by rfqItemId
          const rateByRfqId = agreedRateByRfqItemId.get(matchedRfqItem.id);
          if (rateByRfqId) {
            unitPrice = rateByRfqId.rate;
            minimumMonths = rateByRfqId.minimumRentalMonths || globalMinimumCharges;
          } else {
            unitPrice = Number(matchedRfqItem.unitPrice) || 0;
          }
        }

        const rentalMonths = matchedRfqItem?.rentalMonths ?? 1;

        // Calculate actual days and months
        let actualDays = 0;
        let actualMonths = 0;
        if (deliveredAt && receivedAt) {
          const start = new Date(deliveredAt);
          const end = new Date(receivedAt);
          actualDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          actualMonths = Math.ceil(actualDays / 30);
        }

        // Enforce minimum charges
        const chargedMonths = Math.max(actualMonths, minimumMonths);

        // Calculate line totals using same formula: qty × unitPrice × 30 × months / totalMonths
        const safeTotalMonths = totalMonths > 0 ? totalMonths : 1;

        // Original full-period line total (previousPrice)
        const previousPrice = Math.round(
          (quantityReturned * unitPrice * 30 * rentalMonths / safeTotalMonths) * 100
        ) / 100;

        // Charged amount for actual/min period (currentPrice)
        const currentPrice = Math.round(
          (quantityReturned * unitPrice * 30 * chargedMonths / safeTotalMonths) * 100
        ) / 100;

        resultItems.push({
          scaffoldingItemId: retItem.scaffoldingItemId,
          name: retItem.name,
          quantity: quantityReturned,
          unitPrice,
          rentalMonths,
          actualDays,
          actualMonths,
          chargedMonths,
          minimumMonths,
          previousPrice,
          currentPrice,
          lineTotal: currentPrice,
          returnRequestId: rr.id,
          returnRequestNumber: rr.requestId,
          setName: rr.setName,
          startDate: deliveredAt ? new Date(deliveredAt).toISOString().split('T')[0] : null,
          endDate: receivedAt ? new Date(receivedAt).toISOString().split('T')[0] : null,
          agreementNo: rr.agreementNo,
        });
      }
    }

    // Get first agreement id for the credit note
    const firstAgreement = agreements[0];
    const agreementId = firstAgreement?.id ?? null;

    return NextResponse.json({
      success: true,
      items: resultItems,
      agreementId,
      agreementNo: firstAgreement?.agreementNumber ?? null,
    });
  } catch (error) {
    console.error('[credit-notes/return-items] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch return items' },
      { status: 500 }
    );
  }
}
