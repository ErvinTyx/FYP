/**
 * GET /api/refunds/agreements?customerName=X
 * List agreements where hirer matches the selected customer (for refund flow).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName')?.trim();
    const q = searchParams.get('q')?.trim();

    if (!customerName) {
      return NextResponse.json(
        { success: false, message: 'customerName is required' },
        { status: 400 }
      );
    }

    const where: { hirer?: { contains: string }; agreementNumber?: { contains: string } } = {
      hirer: { contains: customerName },
    };

    if (q) {
      where.agreementNumber = { contains: q };
    }

    const agreements = await prisma.rentalAgreement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        agreementNumber: true,
        projectName: true,
        hirer: true,
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      agreements: agreements.map((a) => ({
        id: a.id,
        agreementNumber: a.agreementNumber,
        projectName: a.projectName,
        hirer: a.hirer,
      })),
    });
  } catch (error) {
    console.error('[Refunds agreements] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch agreements' },
      { status: 500 }
    );
  }
}
