/**
 * GET /api/credit-notes/customers?q=<string>&agreementId=<string>
 * Search customers who have invoices by name or email, for the credit note form.
 * Queries distinct Users who have deposits (via agreement.customerId),
 * monthly rental invoices (via customerId), or additional charges (via customerId).
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
    const q = (searchParams.get('q') || '').trim();
    const agreementId = searchParams.get('agreementId')?.trim() || undefined;

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, customers: [] });
    }

    const nameFilter = {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
      ],
    };

    // When an agreementId is provided, scope to the agreement's customer only
    if (agreementId) {
      const agreement = await prisma.rentalAgreement.findUnique({
        where: { id: agreementId },
        select: { customerId: true },
      });
      if (agreement?.customerId) {
        const user = await prisma.user.findUnique({
          where: { id: agreement.customerId },
          select: { id: true, firstName: true, lastName: true, email: true },
        });
        if (user) {
          return NextResponse.json({
            success: true,
            customers: [{
              id: user.id,
              name: [user.firstName, user.lastName].filter(Boolean).join(' '),
              email: user.email,
            }],
          });
        }
      }
      return NextResponse.json({ success: true, customers: [] });
    }

    // Collect distinct customer IDs from the three invoice sources
    const userIdSet = new Set<string>();

    // From deposits via agreement.customerId
    const depositsWithAgreement = await prisma.deposit.findMany({
      where: {
        agreement: {
          customer: nameFilter,
        },
      },
      select: { agreement: { select: { customerId: true } } },
      take: LIMIT,
    });
    for (const d of depositsWithAgreement) {
      if (d.agreement.customerId) userIdSet.add(d.agreement.customerId);
    }

    // From monthly rental invoices via customerId
    const invoices = await prisma.monthlyRentalInvoice.findMany({
      where: { customer: nameFilter },
      select: { customerId: true },
      take: LIMIT,
    });
    for (const inv of invoices) {
      if (inv.customerId) userIdSet.add(inv.customerId);
    }

    // From additional charges via customerId
    const charges = await prisma.additionalCharge.findMany({
      where: { customer: nameFilter },
      select: { customerId: true },
      take: LIMIT,
    });
    for (const c of charges) {
      if (c.customerId) userIdSet.add(c.customerId);
    }

    if (userIdSet.size === 0) {
      return NextResponse.json({ success: true, customers: [] });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIdSet) } },
      select: { id: true, firstName: true, lastName: true, email: true },
      take: LIMIT,
    });

    const customers = users.map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' '),
      email: u.email,
    }));

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('[Credit notes customers] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to search customers' },
      { status: 500 }
    );
  }
}
