import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CustomerRentalBehaviourRow, CustomerRentalBehaviourResponse } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const dateFrom = dateFromStr ? new Date(dateFromStr) : null;
    const dateTo = dateToStr ? new Date(dateToStr) : null;

    const customers = await prisma.user.findMany({
      where: { customer: { isNot: null } },
      include: { customer: true },
    });

    const rfqs = await prisma.rFQ.findMany({
      where: { status: { in: ['Approved', 'In Progress', 'Completed'] } },
    });

    const invoiceWhere: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      invoiceWhere.billingEndDate = {};
      if (dateFrom) (invoiceWhere.billingEndDate as { gte?: Date }).gte = dateFrom;
      if (dateTo) (invoiceWhere.billingEndDate as { lte?: Date }).lte = dateTo;
    }
    const invoices = await (prisma as any).monthlyRentalInvoice.findMany({
      where: Object.keys(invoiceWhere).length ? invoiceWhere : undefined,
    });
    const agreements = await prisma.rentalAgreement.findMany({
      where: { rfqId: { not: null } },
      include: { rfq: true },
    });

    const customerMap = new Map<string, {
      customer_name: string;
      industry_type: string;
      projects: Set<string>;
      total_rental_value: number;
      last_rental_date: Date | null;
    }>();

    for (const user of customers) {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
      customerMap.set(user.id, {
        customer_name: name,
        industry_type: user.customer?.customerType ?? 'N/A',
        projects: new Set(),
        total_rental_value: 0,
        last_rental_date: null,
      });
    }

    for (const inv of invoices) {
      const custId = inv.customerId || inv.agreementId || 'unknown';

      if (!customerMap.has(custId)) {
        customerMap.set(custId, {
          customer_name: custId,
          industry_type: 'N/A',
          projects: new Set(),
          total_rental_value: 0,
          last_rental_date: null,
        });
      }
      const entry = customerMap.get(custId)!;
      entry.total_rental_value += Number(inv.totalAmount);
      if (inv.billingEndDate) {
        const d = new Date(inv.billingEndDate);
        if (!entry.last_rental_date || d > entry.last_rental_date) {
          entry.last_rental_date = d;
        }
      }
      if (inv.agreementId) entry.projects.add(inv.agreementId);
    }

    for (const ag of agreements) {
      const custName = ag.hirer;
      const matchedUser = customers.find(
        u => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() === custName || u.email === custName
      );
      const custId = matchedUser?.id ?? custName;
      if (!customerMap.has(custId)) {
        customerMap.set(custId, {
          customer_name: custName,
          industry_type: 'N/A',
          projects: new Set(),
          total_rental_value: 0,
          last_rental_date: null,
        });
      }
      customerMap.get(custId)!.projects.add(ag.id);
    }

    const data: CustomerRentalBehaviourRow[] = Array.from(customerMap.entries()).map(([customer_id, v]) => {
      const total_projects = v.projects.size;
      let rental_frequency = 'Low';
      if (total_projects >= 10) rental_frequency = 'Very High';
      else if (total_projects >= 5) rental_frequency = 'High';
      else if (total_projects >= 2) rental_frequency = 'Medium';

      return {
        customer_id,
        customer_name: v.customer_name,
        industry_type: v.industry_type,
        total_projects,
        total_rental_value: v.total_rental_value,
        rental_frequency,
        last_rental_date: v.last_rental_date?.toISOString().split('T')[0] ?? null,
      };
    });

    await prisma.$transaction([
      prisma.customerRentalBehaviour.deleteMany(),
      prisma.customerRentalBehaviour.createMany({
        data: data.map(r => ({
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          industry_type: r.industry_type,
          total_projects: r.total_projects,
          total_rental_value: r.total_rental_value,
          rental_frequency: r.rental_frequency,
          last_rental_date: r.last_rental_date ? new Date(r.last_rental_date) : null,
        })),
      }),
    ]);

    const stored = await prisma.customerRentalBehaviour.findMany();
    const responseData: CustomerRentalBehaviourRow[] = stored.map(r => ({
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      industry_type: r.industry_type,
      total_projects: r.total_projects,
      total_rental_value: Number(r.total_rental_value),
      rental_frequency: r.rental_frequency,
      last_rental_date: r.last_rental_date ? r.last_rental_date.toISOString().split('T')[0] : null,
    }));

    return NextResponse.json({ data: responseData } satisfies CustomerRentalBehaviourResponse);
  } catch (error) {
    console.error('Error fetching customer behaviour data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer behaviour data' },
      { status: 500 }
    );
  }
}
