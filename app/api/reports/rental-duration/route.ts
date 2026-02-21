import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { RentalDurationRow, RentalDurationResponse } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
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
      const rental_days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const extension_days = 0;
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
