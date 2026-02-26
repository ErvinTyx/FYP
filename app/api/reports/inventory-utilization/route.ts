import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { InventoryUtilizationRow, InventoryUtilizationReportResponse } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const dateFrom = dateFromStr ? new Date(dateFromStr) : null;
    const dateTo = dateToStr ? new Date(dateToStr) : null;

    // Build where clause
    const where: { category?: string; location?: string } = {};
    if (category && category !== 'all') where.category = category;
    if (location && location !== 'all') where.location = location;

    // Get all scaffolding items
    const scaffoldingItems = await prisma.scaffoldingItem.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { name: 'asc' },
    });

    // Get delivered items (currently rented out - delivered but may not yet be returned)
    // Use deliveryRequest.requestDate as fallback when completion/schedule are missing (e.g. seed data)
    const activeDeliveryItemsRaw = await prisma.deliverySetItem.findMany({
      where: {
        scaffoldingItemId: { not: null },
        deliverySet: { status: 'Completed' },
      },
      include: {
        deliverySet: {
          select: {
            completion: { select: { deliveredAt: true } },
            schedule: { select: { scheduledDate: true } },
            createdAt: true,
            deliveryRequest: { select: { requestDate: true } },
          },
        },
      },
    });
    const getDeliveryDate = (item: typeof activeDeliveryItemsRaw[0]) => {
      const ds = item.deliverySet;
      return ds.completion?.deliveredAt ?? ds.schedule?.scheduledDate ?? ds.deliveryRequest?.requestDate ?? ds.createdAt;
    };
    const activeDeliveryItems = dateFrom && dateTo
      ? activeDeliveryItemsRaw.filter((item) => {
          const d = getDeliveryDate(item);
          const date = new Date(d);
          return date >= dateFrom && date <= dateTo;
        })
      : activeDeliveryItemsRaw;

    // Get return request items to estimate idle days
    const returnItems = await prisma.returnRequestItem.findMany({
      where: {
        scaffoldingItemId: { not: null },
        returnRequest: {
          status: 'Completed',
        },
      },
      include: {
        returnRequest: {
          select: {
            requestDate: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate items currently rented per scaffolding item
    const rentedMap = new Map<string, number>();
    for (const item of activeDeliveryItems) {
      if (!item.scaffoldingItemId) continue;
      const current = rentedMap.get(item.scaffoldingItemId) || 0;
      rentedMap.set(item.scaffoldingItemId, current + item.quantity);
    }

    // Calculate average idle days from return history
    const idleDaysMap = new Map<string, { totalDays: number; count: number }>();
    const now = new Date();
    for (const item of returnItems) {
      if (!item.scaffoldingItemId) continue;
      const returnDate = new Date(item.returnRequest.requestDate);
      if (dateFrom && dateTo && (returnDate < dateFrom || returnDate > dateTo)) continue;
      const daysSinceReturn = Math.ceil((now.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const existing = idleDaysMap.get(item.scaffoldingItemId) || { totalDays: 0, count: 0 };
      existing.totalDays += Math.min(daysSinceReturn, 90); // Cap at 90 days
      existing.count += 1;
      idleDaysMap.set(item.scaffoldingItemId, existing);
    }

    // Build response data - new Inventory_Utilization schema
    const data: InventoryUtilizationRow[] = scaffoldingItems.map((item) => {
      const rentedQuantity = rentedMap.get(item.id) || 0;
      const totalQuantity = rentedQuantity + item.available;
      const utilizationRate = totalQuantity > 0 ? Math.round((rentedQuantity / totalQuantity) * 100) : 0;

      const idleData = idleDaysMap.get(item.id);
      const idleDays = idleData && idleData.count > 0
        ? Math.round(idleData.totalDays / idleData.count)
        : 0;

      return {
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        total_quantity: totalQuantity || item.available,
        rented_quantity: rentedQuantity,
        utilization_rate: utilizationRate,
        idle_days: idleDays,
      };
    });

    const totalItems = data.reduce((sum, item) => sum + item.total_quantity, 0);
    const avgUtilization = data.length > 0
      ? Math.round(data.reduce((sum, item) => sum + item.utilization_rate, 0) / data.length)
      : 0;
    const totalIdleDays = data.reduce((sum, item) => sum + item.idle_days, 0);

    await prisma.$transaction([
      prisma.inventoryUtilizationReport.deleteMany(),
      prisma.inventoryUtilizationReport.createMany({
        data: data.map(r => ({
          item_id: r.item_id,
          item_name: r.item_name,
          category: r.category,
          total_quantity: r.total_quantity,
          rented_quantity: r.rented_quantity,
          utilization_rate: r.utilization_rate,
          idle_days: r.idle_days,
        })),
      }),
    ]);

    const stored = await prisma.inventoryUtilizationReport.findMany();
    const responseData: InventoryUtilizationRow[] = stored.map(r => ({
      item_id: r.item_id,
      item_name: r.item_name,
      category: r.category,
      total_quantity: r.total_quantity,
      rented_quantity: r.rented_quantity,
      utilization_rate: Number(r.utilization_rate),
      idle_days: r.idle_days,
    }));

    const response: InventoryUtilizationReportResponse = {
      data: responseData,
      summary: { totalItems, avgUtilization, totalIdleDays },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching inventory utilization data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory utilization data' },
      { status: 500 }
    );
  }
}
