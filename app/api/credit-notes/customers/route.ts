/**
 * GET /api/credit-notes/customers?q=<string>
 * Search customers by name or email for credit note form.
 * Aggregates from Deposit (agreement.hirer), MonthlyRentalInvoice, AdditionalCharge.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];
const LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to view credit note customers' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, customers: [] });
    }

    const customersMap = new Map<string, { customerName: string; customerEmail: string | null; customerId: string }>();

    // From deposits: agreement.hirer as customer name (no email on agreement; RFQ has customerEmail)
    const deposits = await prisma.deposit.findMany({
      where: {
        agreement: {
          hirer: { contains: q },
        },
      },
      include: {
        agreement: {
          include: { rfq: true },
        },
      },
      take: LIMIT,
    });
    for (const d of deposits) {
      const name = d.agreement.hirer || '';
      const email = d.agreement.rfq?.customerEmail || null;
      const key = `${name}|${email || ''}`;
      if (!customersMap.has(key)) {
        customersMap.set(key, {
          customerName: name,
          customerEmail: email,
          customerId: key,
        });
      }
    }

    // From monthly rental invoices
    const invoices = await prisma.monthlyRentalInvoice.findMany({
      where: {
        OR: [
          { customerName: { contains: q } },
          ...(q.includes('@') ? [{ customerEmail: { contains: q } }] : []),
        ],
      },
      select: { customerName: true, customerEmail: true },
      take: LIMIT,
    });
    for (const inv of invoices) {
      const name = inv.customerName || '';
      const email = inv.customerEmail || null;
      const key = `${name}|${email || ''}`;
      if (!customersMap.has(key)) {
        customersMap.set(key, {
          customerName: name,
          customerEmail: email,
          customerId: key,
        });
      }
    }

    // From additional charges (customerName only; no email on model)
    const charges = await prisma.additionalCharge.findMany({
      where: { customerName: { contains: q } },
      select: { customerName: true },
      take: LIMIT,
    });
    for (const c of charges) {
      const name = c.customerName || '';
      const key = `${name}|`;
      if (!customersMap.has(key)) {
        customersMap.set(key, {
          customerName: name,
          customerEmail: null,
          customerId: key,
        });
      }
    }

    const customers = Array.from(customersMap.values()).slice(0, LIMIT);
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('[Credit notes customers] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to search customers' },
      { status: 500 }
    );
  }
}
