import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CustomerCreditRiskRow, CustomerCreditRiskResponse } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const dateFrom = dateFromStr ? new Date(dateFromStr) : null;
    const dateTo = dateToStr ? new Date(dateToStr) : null;

    const invoiceWhere: { status: { not: string }; dueDate?: { gte?: Date; lte?: Date } } = { status: { not: 'Paid' } };
    if (dateFrom && dateTo) invoiceWhere.dueDate = { gte: dateFrom, lte: dateTo };
    else if (dateFrom) invoiceWhere.dueDate = { gte: dateFrom };
    else if (dateTo) invoiceWhere.dueDate = { lte: dateTo };

    const invoices = await (prisma as any).monthlyRentalInvoice.findMany({
      where: invoiceWhere,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const depositWhere: { status: { not: string }; dueDate?: { gte?: Date; lte?: Date } } = { status: { not: 'Paid' } };
    if (dateFrom && dateTo) depositWhere.dueDate = { gte: dateFrom, lte: dateTo };
    else if (dateFrom) depositWhere.dueDate = { gte: dateFrom };
    else if (dateTo) depositWhere.dueDate = { lte: dateTo };

    const deposits = await prisma.deposit.findMany({
      where: depositWhere,
    });

    const customerMap = new Map<string, {
      outstanding_balance: number;
      overdue_amount: number;
      aging_days: number;
    }>();

    const now = new Date();

    for (const inv of invoices) {
      const customerDisplayName = [inv.customer?.firstName, inv.customer?.lastName].filter(Boolean).join(' ') || 'Unknown';
      const key = inv.customerId || customerDisplayName;
      const amount = Number(inv.totalAmount);
      const isOverdue = inv.status === 'Overdue';
      const dueDate = new Date(inv.dueDate);
      const aging_days = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const existing = customerMap.get(key) ?? {
        outstanding_balance: 0,
        overdue_amount: 0,
        aging_days: 0,
      };
      existing.outstanding_balance += amount;
      if (isOverdue) existing.overdue_amount += amount;
      if (aging_days > existing.aging_days) existing.aging_days = aging_days;
      customerMap.set(key, existing);
    }

    for (const dep of deposits) {
      const agreement = await prisma.rentalAgreement.findUnique({
        where: { id: dep.agreementId },
        select: { hirer: true },
      });
      const key = agreement?.hirer ?? dep.agreementId;
      const amount = Number(dep.depositAmount);
      const isOverdue = dep.status === 'Overdue';
      const dueDate = new Date(dep.dueDate);
      const aging_days = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const existing = customerMap.get(key) ?? {
        outstanding_balance: 0,
        overdue_amount: 0,
        aging_days: 0,
      };
      existing.outstanding_balance += amount;
      if (isOverdue) existing.overdue_amount += amount;
      if (aging_days > existing.aging_days) existing.aging_days = aging_days;
      customerMap.set(key, existing);
    }

    const data: CustomerCreditRiskRow[] = Array.from(customerMap.entries()).map(([customer_id, v]) => {
      let risk_level: 'Low' | 'Medium' | 'High' = 'Low';
      if (v.aging_days > 60 || v.overdue_amount > 5000) risk_level = 'High';
      else if (v.aging_days > 30 || v.overdue_amount > 1000) risk_level = 'Medium';

      const credit_limit = 50000;

      return {
        customer_id,
        credit_limit,
        outstanding_balance: v.outstanding_balance,
        overdue_amount: v.overdue_amount,
        aging_days: v.aging_days,
        risk_level,
      };
    });

    const highRiskCount = data.filter(r => r.risk_level === 'High').length;
    const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding_balance, 0);

    await prisma.$transaction([
      prisma.customerCreditRisk.deleteMany(),
      prisma.customerCreditRisk.createMany({
        data: data.map(r => ({
          customer_id: r.customer_id,
          credit_limit: r.credit_limit,
          outstanding_balance: r.outstanding_balance,
          overdue_amount: r.overdue_amount,
          aging_days: r.aging_days,
          risk_level: r.risk_level,
        })),
      }),
    ]);

    const stored = await prisma.customerCreditRisk.findMany();
    const responseData: CustomerCreditRiskRow[] = stored.map(r => ({
      customer_id: r.customer_id,
      credit_limit: Number(r.credit_limit),
      outstanding_balance: Number(r.outstanding_balance),
      overdue_amount: Number(r.overdue_amount),
      aging_days: r.aging_days,
      risk_level: r.risk_level as 'Low' | 'Medium' | 'High',
    }));

    return NextResponse.json({
      data: responseData,
      summary: { highRiskCount, totalOutstanding },
    } satisfies CustomerCreditRiskResponse);
  } catch (error) {
    console.error('Error fetching credit risk data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit risk data' },
      { status: 500 }
    );
  }
}
