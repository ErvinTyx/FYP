import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { DeliveryPerformanceRow, DeliveryPerformanceResponse } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const deliverySets = await prisma.deliverySet.findMany({
      include: {
        deliveryRequest: { select: { rfqId: true } },
        schedule: true,
        completion: true,
        dispatch: true,
        returnRequests: {
          include: {
            schedule: true,
          },
        },
      },
    });

    const data: DeliveryPerformanceRow[] = [];

    for (const ds of deliverySets) {
      const deliveryDate = ds.completion?.deliveredAt ?? ds.schedule?.scheduledDate ?? ds.createdAt;
      const pickupDate = ds.returnRequests[0]?.schedule?.scheduledDate ?? ds.returnRequests[0]?.requestDate ?? deliveryDate;
      const deliveryDateObj = new Date(deliveryDate);
      const pickupDateObj = new Date(pickupDate);
      const expectedPickup = new Date(deliveryDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
      const delay_days = pickupDateObj > expectedPickup
        ? Math.ceil((pickupDateObj.getTime() - expectedPickup.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const transportation_cost = Number(ds.deliveryFee ?? 0) +
        ds.returnRequests.reduce((sum, rr) => sum + Number(rr.pickupFee ?? 0), 0);

      data.push({
        delivery_id: ds.id,
        project_id: ds.deliveryRequest.rfqId ?? ds.deliveryRequestId,
        driver_id: ds.dispatch?.driverName ?? 'N/A',
        delivery_date: new Date(deliveryDate).toISOString().split('T')[0],
        pickup_date: new Date(pickupDate).toISOString().split('T')[0],
        delay_days,
        transportation_cost,
        delivery_status: ds.status,
      });
    }

    const totalDeliveries = data.length;
    const avgDelayDays = data.length > 0
      ? Math.round(data.reduce((sum, r) => sum + r.delay_days, 0) / data.length)
      : 0;
    const totalCost = data.reduce((sum, r) => sum + r.transportation_cost, 0);

    await prisma.$transaction([
      prisma.deliveryPerformance.deleteMany(),
      prisma.deliveryPerformance.createMany({
        data: data.map(r => ({
          delivery_id: r.delivery_id,
          project_id: r.project_id,
          driver_id: r.driver_id,
          delivery_date: new Date(r.delivery_date),
          pickup_date: new Date(r.pickup_date),
          delay_days: r.delay_days,
          transportation_cost: r.transportation_cost,
          delivery_status: r.delivery_status,
        })),
      }),
    ]);

    const stored = await prisma.deliveryPerformance.findMany();
    const responseData: DeliveryPerformanceRow[] = stored.map(r => ({
      delivery_id: r.delivery_id,
      project_id: r.project_id,
      driver_id: r.driver_id,
      delivery_date: r.delivery_date.toISOString().split('T')[0],
      pickup_date: r.pickup_date.toISOString().split('T')[0],
      delay_days: r.delay_days,
      transportation_cost: Number(r.transportation_cost),
      delivery_status: r.delivery_status,
    }));

    return NextResponse.json({
      data: responseData,
      summary: { totalDeliveries, avgDelayDays, totalCost },
    } satisfies DeliveryPerformanceResponse);
  } catch (error) {
    console.error('Error fetching delivery logistics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery logistics data' },
      { status: 500 }
    );
  }
}
