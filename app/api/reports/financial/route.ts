import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type {
  FinancialMonthlyData,
  CustomerPaymentData,
  FinancialResponse,
  InvoiceStatusBreakdown,
} from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    // Get monthly rental invoices
    const invoices = await prisma.monthlyRentalInvoice.findMany({
      where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : undefined,
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }],
    });

    // Get deposits
    const deposits = await prisma.deposit.findMany({
      where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : undefined,
    });

    // Get credit notes
    const creditNotes = await prisma.creditNote.findMany({
      where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : undefined,
    });

    // Group invoices by month
    const monthlyMap = new Map<string, {
      invoiced: number;
      paid: number;
      outstanding: number;
      overdue: number;
      deposits: number;
      creditNotes: number;
      invoiceCount: number;
      customers: Set<string>;
    }>();

    for (const invoice of invoices) {
      const key = `${invoice.billingYear}-${String(invoice.billingMonth).padStart(2, '0')}`;
      const existing = monthlyMap.get(key) || {
        invoiced: 0,
        paid: 0,
        outstanding: 0,
        overdue: 0,
        deposits: 0,
        creditNotes: 0,
        invoiceCount: 0,
        customers: new Set<string>(),
      };

      existing.invoiced += Number(invoice.totalAmount);
      existing.invoiceCount += 1;
      existing.customers.add(invoice.customerName);

      if (invoice.status === 'Paid') {
        existing.paid += Number(invoice.totalAmount);
      } else if (invoice.status === 'Overdue') {
        existing.overdue += Number(invoice.totalAmount);
        existing.outstanding += Number(invoice.totalAmount);
      } else {
        existing.outstanding += Number(invoice.totalAmount);
      }

      monthlyMap.set(key, existing);
    }

    // Add deposits to monthly data
    for (const deposit of deposits) {
      const createdAt = new Date(deposit.createdAt);
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(key);
      if (existing) {
        if (deposit.status === 'Paid') {
          existing.deposits += Number(deposit.depositAmount);
          existing.paid += Number(deposit.depositAmount);
        }
        existing.invoiced += Number(deposit.depositAmount);
      }
    }

    // Add credit notes to monthly data
    for (const cn of creditNotes) {
      const createdAt = new Date(cn.createdAt);
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(key);
      if (existing && cn.status === 'Approved') {
        existing.creditNotes += Number(cn.amount);
      }
    }

    // Convert to monthly data array
    const monthlyData: FinancialMonthlyData[] = Array.from(monthlyMap.entries())
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number);
        const paymentRate = data.invoiced > 0
          ? Math.round((data.paid / data.invoiced) * 100)
          : 0;

        let status: 'Excellent' | 'Good' | 'Warning' | 'Critical';
        if (paymentRate >= 90) status = 'Excellent';
        else if (paymentRate >= 80) status = 'Good';
        else if (paymentRate >= 70) status = 'Warning';
        else status = 'Critical';

        const monthDate = new Date(year, month - 1, 1);
        const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        return {
          period: key,
          month: monthName,
          year,
          totalInvoiced: data.invoiced,
          totalPaid: data.paid,
          outstandingAmount: data.outstanding,
          overdueAmount: data.overdue,
          depositAmount: data.deposits,
          creditNoteAmount: data.creditNotes,
          numberOfInvoices: data.invoiceCount,
          numberOfCustomers: data.customers.size,
          paymentRate,
          status,
        };
      })
      .sort((a, b) => b.period.localeCompare(a.period))
      .slice(0, 12); // Last 12 months

    // Group by customer
    const customerMap = new Map<string, {
      customerEmail: string;
      invoiced: number;
      paid: number;
      outstanding: number;
      overdueDays: number;
      lastPayment: Date | null;
      invoiceCount: number;
      depositsPaid: number;
      depositsOutstanding: number;
    }>();

    for (const invoice of invoices) {
      const key = invoice.customerName;
      const existing = customerMap.get(key) || {
        customerEmail: invoice.customerEmail || '',
        invoiced: 0,
        paid: 0,
        outstanding: 0,
        overdueDays: 0,
        lastPayment: null,
        invoiceCount: 0,
        depositsPaid: 0,
        depositsOutstanding: 0,
      };

      existing.invoiced += Number(invoice.totalAmount);
      existing.invoiceCount += 1;

      if (invoice.status === 'Paid') {
        existing.paid += Number(invoice.totalAmount);
        if (invoice.approvedAt) {
          const paymentDate = new Date(invoice.approvedAt);
          if (!existing.lastPayment || paymentDate > existing.lastPayment) {
            existing.lastPayment = paymentDate;
          }
        }
      } else {
        existing.outstanding += Number(invoice.totalAmount);
        if (invoice.status === 'Overdue' && invoice.dueDate) {
          const daysOverdue = Math.ceil(
            (new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysOverdue > existing.overdueDays) {
            existing.overdueDays = daysOverdue;
          }
        }
      }

      customerMap.set(key, existing);
    }

    // Add deposit info to customers
    for (const deposit of deposits) {
      // Find customer from agreement
      const agreement = await prisma.rentalAgreement.findUnique({
        where: { id: deposit.agreementId },
        select: { hirer: true },
      });
      
      if (agreement) {
        const customerName = agreement.hirer;
        const existing = customerMap.get(customerName);
        if (existing) {
          if (deposit.status === 'Paid') {
            existing.depositsPaid += Number(deposit.depositAmount);
          } else {
            existing.depositsOutstanding += Number(deposit.depositAmount);
          }
        }
      }
    }

    // Convert to customer data array
    const customerData: CustomerPaymentData[] = Array.from(customerMap.entries())
      .map(([customerName, data], index) => {
        let status: 'Current' | 'Overdue' | 'Critical';
        if (data.overdueDays === 0 || data.outstanding === 0) status = 'Current';
        else if (data.overdueDays > 30) status = 'Critical';
        else status = 'Overdue';

        return {
          customerId: `CUST-${String(index + 1).padStart(3, '0')}`,
          customerName,
          customerEmail: data.customerEmail,
          totalInvoiced: data.invoiced,
          totalPaid: data.paid,
          outstanding: data.outstanding,
          overdueDays: data.overdueDays,
          lastPaymentDate: data.lastPayment?.toISOString() || null,
          status,
          numberOfInvoices: data.invoiceCount,
          depositsPaid: data.depositsPaid,
          depositsOutstanding: data.depositsOutstanding,
        };
      })
      .sort((a, b) => b.outstanding - a.outstanding);

    // Calculate summary
    const summary = {
      totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      totalPaid: invoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      totalOutstanding: invoices
        .filter(inv => inv.status !== 'Paid')
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      totalOverdue: invoices
        .filter(inv => inv.status === 'Overdue')
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      totalDeposits: deposits
        .filter(d => d.status === 'Paid')
        .reduce((sum, d) => sum + Number(d.depositAmount), 0),
      totalCreditNotes: creditNotes
        .filter(cn => cn.status === 'Approved')
        .reduce((sum, cn) => sum + Number(cn.amount), 0),
      avgPaymentRate: monthlyData.length > 0
        ? Math.round(monthlyData.reduce((sum, m) => sum + m.paymentRate, 0) / monthlyData.length)
        : 0,
      totalCustomers: customerMap.size,
    };

    // Calculate invoice status breakdown
    const statusCount = new Map<string, { count: number; amount: number }>();
    for (const invoice of invoices) {
      const existing = statusCount.get(invoice.status) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += Number(invoice.totalAmount);
      statusCount.set(invoice.status, existing);
    }
    const invoiceStatusBreakdown: InvoiceStatusBreakdown[] = Array.from(statusCount.entries())
      .map(([status, data]) => ({
        status,
        count: data.count,
        amount: data.amount,
      }));

    const response: FinancialResponse = {
      monthlyData,
      customerData,
      summary,
      invoiceStatusBreakdown,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
