import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { RentalDurationRow, RentalDurationResponse } from '@/types/report';

/** Parse the end date from scheduledPeriod (e.g. "1 Jan 2026 - 31 Mar 2026"). Returns null if missing or invalid. */
function parseScheduledPeriodEndDate(scheduledPeriod: string | null | undefined): Date | null {
  if (!scheduledPeriod || typeof scheduledPeriod !== 'string') return null;
  const parts = scheduledPeriod.split(' - ');
  if (parts.length < 2) return null;
  const endStr = parts[1].trim();
  if (!endStr) return null;
  const date = new Date(endStr);
  return isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const dateFrom = dateFromStr ? new Date(dateFromStr) : null;
    const dateTo = dateToStr ? new Date(dateToStr) : null;

    const deliverySetItems = await prisma.deliverySetItem.findMany({
      where: {
        scaffoldingItemId: { not: null },
        deliverySet: { status: 'Completed' },
      },
      include: {
        deliverySet: {
          include: {
            completion: true,
            schedule: true,
            deliveryRequest: { select: { rfqId: true } },
            returnRequests: {
              include: { schedule: true },
            },
          },
        },
      },
    });

    const data: RentalDurationRow[] = [];

    for (const dsi of deliverySetItems) {
      if (!dsi.scaffoldingItemId) continue;

      const rental_start = dsi.deliverySet.completion?.deliveredAt ?? dsi.deliverySet.schedule?.scheduledDate ?? dsi.deliverySet.createdAt;
      const returnReq = dsi.deliverySet.returnRequests[0];
      const rental_end = returnReq?.schedule?.scheduledDate ?? returnReq?.requestDate ?? new Date();
      const startDate = new Date(rental_start);
      const endDate = new Date(rental_end);

      if (dateFrom && dateTo) {
        if (startDate > dateTo || endDate < dateFrom) continue;
      }

      const MS_PER_DAY = 1000 * 60 * 60 * 24;
      const rental_days = Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);

      const agreedEndDate = parseScheduledPeriodEndDate(dsi.deliverySet.scheduledPeriod);
      let extension_days = 0;
      if (agreedEndDate && !isNaN(agreedEndDate.getTime()) && agreedEndDate >= startDate) {
        const agreed_days = Math.ceil((agreedEndDate.getTime() - startDate.getTime()) / MS_PER_DAY);
        extension_days = Math.max(0, rental_days - agreed_days);
      }

      const early_return = rental_days < 30 ? 'Yes' : 'No';

      data.push({
        rental_id: `${dsi.deliverySetId}-${dsi.scaffoldingItemId}-${dsi.id}`,
        item_id: dsi.scaffoldingItemId,
        project_id: dsi.deliverySet.deliveryRequest.rfqId ?? dsi.deliverySet.deliveryRequestId,
        rental_start: new Date(rental_start).toISOString().split('T')[0],
        rental_end: new Date(rental_end).toISOString().split('T')[0],
        rental_days,
        extension_days,
        early_return,
      });
    }

    const totalRentals = data.length;
    const avgDuration = data.length > 0
      ? Math.round(data.reduce((sum, r) => sum + r.rental_days, 0) / data.length)
      : 0;
    const extensionRate = data.length > 0
      ? Math.round((data.filter(r => r.extension_days > 0).length / data.length) * 100)
      : 0;

    await prisma.$transaction([
      prisma.rentalDuration.deleteMany(),
      prisma.rentalDuration.createMany({
        data: data.map(r => ({
          rental_id: r.rental_id,
          item_id: r.item_id,
          project_id: r.project_id,
          rental_start: new Date(r.rental_start),
          rental_end: new Date(r.rental_end),
          rental_days: r.rental_days,
          extension_days: r.extension_days,
          early_return: r.early_return,
        })),
      }),
    ]);

    const stored = await prisma.rentalDuration.findMany();
    const responseData: RentalDurationRow[] = stored.map(r => ({
      rental_id: r.rental_id,
      item_id: r.item_id,
      project_id: r.project_id,
      rental_start: r.rental_start.toISOString().split('T')[0],
      rental_end: r.rental_end.toISOString().split('T')[0],
      rental_days: r.rental_days,
      extension_days: r.extension_days,
      early_return: r.early_return as 'Yes' | 'No',
    }));

    return NextResponse.json({
      data: responseData,
      summary: { totalRentals, avgDuration, extensionRate },
    } satisfies RentalDurationResponse);
  } catch (error) {
    console.error('Error fetching rental duration data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental duration data' },
      { status: 500 }
    );
  }
}
