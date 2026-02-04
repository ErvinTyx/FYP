import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type {
  InventoryUtilizationData,
  InventoryUtilizationResponse,
  UtilizationByCategory,
  UtilizationByLocation,
} from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const location = searchParams.get('location');

    // Build where clause
    const where: { category?: string; location?: string } = {};
    if (category && category !== 'all') where.category = category;
    if (location && location !== 'all') where.location = location;

    // Get all scaffolding items
    const scaffoldingItems = await prisma.scaffoldingItem.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { name: 'asc' },
    });

    // Get active deliveries to calculate what's currently rented out
    const activeDeliveryItems = await prisma.deliverySetItem.findMany({
      where: {
        scaffoldingItemId: { not: null },
        deliverySet: {
          status: { notIn: ['Completed', 'Cancelled'] },
        },
      },
    });

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
      const daysSinceReturn = Math.ceil((now.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const existing = idleDaysMap.get(item.scaffoldingItemId) || { totalDays: 0, count: 0 };
      existing.totalDays += Math.min(daysSinceReturn, 90); // Cap at 90 days
      existing.count += 1;
      idleDaysMap.set(item.scaffoldingItemId, existing);
    }

    // Determine condition based on status and available quantity
    function determineCondition(item: typeof scaffoldingItems[0]): 'Excellent' | 'Good' | 'Fair' | 'Needs Maintenance' {
      if (item.itemStatus === 'Under Maintenance' || item.status === 'Unavailable') {
        return 'Needs Maintenance';
      }
      if (item.available === 0) {
        return 'Fair';
      }
      if (item.status === 'Available' && item.itemStatus === 'Available') {
        return item.available > 50 ? 'Excellent' : 'Good';
      }
      return 'Good';
    }

    // Build response data
    const data: InventoryUtilizationData[] = scaffoldingItems.map((item) => {
      const inUse = rentedMap.get(item.id) || 0;
      const idle = item.available;
      const totalQuantity = inUse + idle;
      const utilizationRate = totalQuantity > 0 ? Math.round((inUse / totalQuantity) * 100) : 0;

      const idleData = idleDaysMap.get(item.id);
      const avgIdleDays = idleData && idleData.count > 0
        ? Math.round(idleData.totalDays / idleData.count)
        : 0; // No return history - show 0 idle days

      return {
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        category: item.category,
        totalQuantity: totalQuantity || item.available,
        inUse,
        idle,
        utilizationRate,
        avgIdleDays,
        location: item.location || 'Warehouse A',
        condition: determineCondition(item),
        price: Number(item.price),
      };
    });

    // Calculate summary
    const summary = {
      totalItems: data.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalInUse: data.reduce((sum, item) => sum + item.inUse, 0),
      totalIdle: data.reduce((sum, item) => sum + item.idle, 0),
      avgUtilization: data.length > 0
        ? Math.round(data.reduce((sum, item) => sum + item.utilizationRate, 0) / data.length)
        : 0,
      avgIdleDays: data.length > 0
        ? Math.round(data.reduce((sum, item) => sum + item.avgIdleDays, 0) / data.length)
        : 0,
      totalValue: data.reduce((sum, item) => sum + (item.totalQuantity * item.price), 0),
      idleValue: data.reduce((sum, item) => sum + (item.idle * item.price), 0),
    };

    // Calculate by category
    const categoryMap = new Map<string, { total: number; inUse: number; idle: number }>();
    for (const item of data) {
      const existing = categoryMap.get(item.category) || { total: 0, inUse: 0, idle: 0 };
      existing.total += item.totalQuantity;
      existing.inUse += item.inUse;
      existing.idle += item.idle;
      categoryMap.set(item.category, existing);
    }
    const byCategory: UtilizationByCategory[] = Array.from(categoryMap.entries()).map(
      ([category, stats]) => ({
        category,
        total: stats.total,
        inUse: stats.inUse,
        idle: stats.idle,
        utilizationRate: stats.total > 0 ? Math.round((stats.inUse / stats.total) * 100) : 0,
      })
    );

    // Calculate by location
    const locationMap = new Map<string, { total: number; inUse: number; idle: number }>();
    for (const item of data) {
      const existing = locationMap.get(item.location) || { total: 0, inUse: 0, idle: 0 };
      existing.total += item.totalQuantity;
      existing.inUse += item.inUse;
      existing.idle += item.idle;
      locationMap.set(item.location, existing);
    }
    const byLocation: UtilizationByLocation[] = Array.from(locationMap.entries()).map(
      ([location, stats]) => ({
        location,
        total: stats.total,
        inUse: stats.inUse,
        idle: stats.idle,
      })
    );

    // Get unique categories and locations
    const categories = Array.from(new Set(scaffoldingItems.map(item => item.category)));
    const locations = Array.from(new Set(scaffoldingItems.map(item => item.location || 'Warehouse A')));

    const response: InventoryUtilizationResponse = {
      data,
      summary,
      byCategory,
      byLocation,
      categories,
      locations,
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
