import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type {
  RentalPerformanceData,
  RentalPerformanceResponse,
  RentalPerformanceByCategory,
  RentalTrend,
} from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const category = searchParams.get('category');

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    // Get all scaffolding items
    const scaffoldingItems = await prisma.scaffoldingItem.findMany({
      where: category && category !== 'all' ? { category } : undefined,
      orderBy: { name: 'asc' },
    });

    // Get delivery data - count deliveries per item
    const deliverySetItems = await prisma.deliverySetItem.findMany({
      where: {
        scaffoldingItemId: { not: null },
        deliverySet: {
          status: 'Completed',
          ...(Object.keys(dateFilter).length > 0 && {
            createdAt: dateFilter,
          }),
        },
      },
      include: {
        deliverySet: {
          select: {
            createdAt: true,
            status: true,
          },
        },
      },
    });

    // Get RFQ items for revenue calculation
    const rfqItems = await prisma.rFQItem.findMany({
      where: {
        rfq: {
          status: { in: ['Approved', 'In Progress', 'Completed'] },
          ...(Object.keys(dateFilter).length > 0 && {
            createdAt: dateFilter,
          }),
        },
      },
      include: {
        rfq: {
          select: {
            createdAt: true,
            status: true,
          },
        },
      },
    });

    // Get return data for duration calculation
    const returnItems = await prisma.returnRequestItem.findMany({
      where: {
        scaffoldingItemId: { not: null },
        returnRequest: {
          status: 'Completed',
          ...(Object.keys(dateFilter).length > 0 && {
            createdAt: dateFilter,
          }),
        },
      },
      include: {
        returnRequest: {
          select: {
            createdAt: true,
            requestDate: true,
          },
        },
      },
    });

    // Aggregate data by scaffolding item
    const itemDataMap = new Map<string, {
      rentals: number;
      revenue: number;
      totalDuration: number;
      durationCount: number;
      quantityRented: number;
    }>();

    // Count deliveries per scaffolding item
    for (const item of deliverySetItems) {
      if (!item.scaffoldingItemId) continue;
      const existing = itemDataMap.get(item.scaffoldingItemId) || {
        rentals: 0,
        revenue: 0,
        totalDuration: 0,
        durationCount: 0,
        quantityRented: 0,
      };
      existing.rentals += 1;
      existing.quantityRented += item.quantity;
      itemDataMap.set(item.scaffoldingItemId, existing);
    }

    // Add revenue from RFQ items
    for (const item of rfqItems) {
      const existing = itemDataMap.get(item.scaffoldingItemId) || {
        rentals: 0,
        revenue: 0,
        totalDuration: 0,
        durationCount: 0,
        quantityRented: 0,
      };
      existing.revenue += Number(item.totalPrice);
      itemDataMap.set(item.scaffoldingItemId, existing);
    }

    // Calculate average duration from return requests
    for (const item of returnItems) {
      if (!item.scaffoldingItemId) continue;
      const existing = itemDataMap.get(item.scaffoldingItemId);
      if (existing && item.returnRequest.requestDate) {
        // Estimate duration: assume rental started 30 days before return
        const returnDate = new Date(item.returnRequest.requestDate);
        const startDate = new Date(returnDate);
        startDate.setDate(startDate.getDate() - 30); // Default estimate
        const duration = Math.ceil((returnDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        existing.totalDuration += duration;
        existing.durationCount += 1;
        itemDataMap.set(item.scaffoldingItemId, existing);
      }
    }

    // Build response data
    const data: RentalPerformanceData[] = scaffoldingItems.map((item) => {
      const itemData = itemDataMap.get(item.id) || {
        rentals: 0,
        revenue: 0,
        totalDuration: 0,
        durationCount: 0,
        quantityRented: 0,
      };

      // Get total quantity (available is what's at warehouse, so total is higher when items are rented)
      const totalQuantity = item.available + itemData.quantityRented;
      const utilizationRate = totalQuantity > 0
        ? Math.round((itemData.quantityRented / totalQuantity) * 100)
        : 0;

      return {
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        category: item.category,
        totalRentals: itemData.rentals,
        totalRevenue: itemData.revenue,
        avgRentalDuration: itemData.durationCount > 0
          ? Math.round(itemData.totalDuration / itemData.durationCount)
          : 30, // Default estimate
        utilizationRate,
        totalQuantity: totalQuantity || item.available,
        quantityRented: itemData.quantityRented,
      };
    });

    // Return all items with actual data - no random placeholders
    const finalData = data;

    // Calculate summary
    const summary = {
      totalRentals: finalData.reduce((sum, item) => sum + item.totalRentals, 0),
      totalRevenue: finalData.reduce((sum, item) => sum + item.totalRevenue, 0),
      avgDuration: finalData.length > 0
        ? Math.round(finalData.reduce((sum, item) => sum + item.avgRentalDuration, 0) / finalData.length)
        : 0,
      avgUtilization: finalData.length > 0
        ? Math.round(finalData.reduce((sum, item) => sum + item.utilizationRate, 0) / finalData.length)
        : 0,
    };

    // Calculate by category
    const categoryMap = new Map<string, { revenue: number; rentals: number }>();
    for (const item of finalData) {
      const existing = categoryMap.get(item.category) || { revenue: 0, rentals: 0 };
      existing.revenue += item.totalRevenue;
      existing.rentals += item.totalRentals;
      categoryMap.set(item.category, existing);
    }
    const byCategory: RentalPerformanceByCategory[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        revenue: data.revenue,
        rentals: data.rentals,
      })
    );

    // Calculate trends (last 6 months)
    const trends: RentalTrend[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      // Count RFQ items created in this month
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthRfqItems = rfqItems.filter(item => {
        const createdAt = new Date(item.rfq.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      const monthDeliveries = deliverySetItems.filter(item => {
        const createdAt = new Date(item.deliverySet.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      trends.push({
        month: monthName,
        rentals: monthDeliveries.length,
        revenue: monthRfqItems.reduce((sum, item) => sum + Number(item.totalPrice), 0),
      });
    }

    // Get unique categories
    const categories = Array.from(new Set(scaffoldingItems.map(item => item.category)));

    const response: RentalPerformanceResponse = {
      data: finalData,
      summary,
      byCategory,
      trends,
      categories,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching rental performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental performance data' },
      { status: 500 }
    );
  }
}
