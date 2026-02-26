import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ProjectFinancialReportRow, ProjectFinancialReportResponse } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const agreements = await prisma.rentalAgreement.findMany({
      where: { status: { in: ['Signed', 'Active', 'Completed'] } },
      include: {
        rfq: true,
        monthlyInvoices: true,
      },
    });

    // When date range is provided, filter by project activity (invoice billing period) instead of agreement createdAt
    const dateFromObj = dateFrom ? new Date(dateFrom) : null;
    const dateToObj = dateTo ? new Date(dateTo) : null;
    const filteredAgreements =
      dateFromObj && dateToObj
        ? agreements.filter((ag) => {
            const hasInvoiceInRange = ag.monthlyInvoices.some((inv) => {
              const start = new Date(inv.billingStartDate);
              const end = new Date(inv.billingEndDate);
              return end >= dateFromObj && start <= dateToObj;
            });
            return hasInvoiceInRange;
          })
        : agreements;

    const data: ProjectFinancialReportRow[] = [];

    for (const agreement of filteredAgreements) {
      const totalRentalRevenue = agreement.monthlyInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0
      );

      let totalRepairCost = 0;
      let totalDamageCost = 0;
      let transportationCost = 0;

      if (agreement.rfqId) {
        const deliverySets = await prisma.deliverySet.findMany({
          where: { deliveryRequest: { rfqId: agreement.rfqId } },
        });

        const returnRequests = await prisma.returnRequest.findMany({
          where: {
            deliverySet: { deliveryRequest: { rfqId: agreement.rfqId } },
          },
        });

        transportationCost =
          deliverySets.reduce((sum, ds) => sum + Number(ds.deliveryFee ?? 0), 0) +
          returnRequests.reduce((sum, rr) => sum + Number(rr.pickupFee ?? 0), 0);

        const returnIds = returnRequests.map(rr => rr.id);
        const deliverySetIds = deliverySets.map(ds => ds.id);

        const orConditions: object[] = [];
        if (returnIds.length > 0) orConditions.push({ returnRequestId: { in: returnIds } });
        if (deliverySetIds.length > 0) orConditions.push({ deliverySetId: { in: deliverySetIds } });

        const additionalCharges = orConditions.length > 0
          ? await prisma.additionalCharge.findMany({
              where: { OR: orConditions },
              include: { items: true },
            })
          : [];

        for (const ac of additionalCharges) {
          const chargeTotal = Number(ac.totalCharges);
          const hasRepair = ac.items.some(i => i.itemType === 'Repair');
          if (hasRepair) {
            totalRepairCost += chargeTotal;
          } else {
            totalDamageCost += chargeTotal;
          }
        }
      }

      const totalCosts = totalRepairCost + totalDamageCost + transportationCost;
      const netProfit = totalRentalRevenue - totalCosts;
      const profitMargin =
        totalRentalRevenue > 0 ? Math.round((netProfit / totalRentalRevenue) * 100) : 0;

      const projectStart = agreement.rfq?.requestedDate ?? agreement.createdAt;
      const sortedInvoices = [...agreement.monthlyInvoices].sort(
        (a, b) => new Date(b.billingEndDate).getTime() - new Date(a.billingEndDate).getTime()
      );
      const projectEnd = sortedInvoices[0]?.billingEndDate ?? agreement.updatedAt;

      data.push({
        project_id: agreement.id,
        customer_id: agreement.hirer,
        project_start_date: new Date(projectStart).toISOString().split('T')[0],
        project_end_date: new Date(projectEnd).toISOString().split('T')[0],
        total_rental_revenue: totalRentalRevenue,
        total_repair_cost: totalRepairCost,
        total_damage_cost: totalDamageCost,
        transportation_cost: transportationCost,
        net_profit: netProfit,
        profit_margin: profitMargin,
      });
    }

    const totalRevenue = data.reduce((sum, r) => sum + r.total_rental_revenue, 0);
    const totalProfit = data.reduce((sum, r) => sum + r.net_profit, 0);
    const avgMargin =
      data.length > 0 ? Math.round(data.reduce((sum, r) => sum + r.profit_margin, 0) / data.length) : 0;

    await prisma.$transaction([
      prisma.projectFinancialReport.deleteMany(),
      prisma.projectFinancialReport.createMany({
        data: data.map(r => ({
          project_id: r.project_id,
          customer_id: r.customer_id,
          project_start_date: new Date(r.project_start_date),
          project_end_date: new Date(r.project_end_date),
          total_rental_revenue: r.total_rental_revenue,
          total_repair_cost: r.total_repair_cost,
          total_damage_cost: r.total_damage_cost,
          transportation_cost: r.transportation_cost,
          net_profit: r.net_profit,
          profit_margin: r.profit_margin,
        })),
      }),
    ]);

    const stored = await prisma.projectFinancialReport.findMany();
    const responseData: ProjectFinancialReportRow[] = stored.map(r => ({
      project_id: r.project_id,
      customer_id: r.customer_id,
      project_start_date: r.project_start_date.toISOString().split('T')[0],
      project_end_date: r.project_end_date.toISOString().split('T')[0],
      total_rental_revenue: Number(r.total_rental_revenue),
      total_repair_cost: Number(r.total_repair_cost),
      total_damage_cost: Number(r.total_damage_cost),
      transportation_cost: Number(r.transportation_cost),
      net_profit: Number(r.net_profit),
      profit_margin: Number(r.profit_margin),
    }));

    const response: ProjectFinancialReportResponse = {
      data: responseData,
      summary: { totalRevenue, totalProfit, avgMargin },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching financial profitability data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial profitability data' },
      { status: 500 }
    );
  }
}
