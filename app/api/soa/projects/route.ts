/**
 * GET /api/soa/projects
 * List rental agreements (projects) for SOA with optional name search.
 * Query: search (optional) - filter by projectName or hirer (customer) name.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

function mapStatus(agreementStatus: string): string {
  const s = (agreementStatus || '').toLowerCase();
  if (s === 'completed' || s === 'closed') return 'Completed';
  if (s === 'on hold' || s === 'onhold') return 'On Hold';
  if (s === 'terminated') return 'Terminated';
  return 'Active';
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((r: string) => ALLOWED_ROLES.includes(r));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    const where: { OR?: Array<{ projectName?: { contains: string }; hirer?: { contains: string } }> } = {};
    if (search) {
      where.OR = [
        { projectName: { contains: search } },
        { hirer: { contains: search } },
      ];
    }

    const agreements = await prisma.rentalAgreement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectName: true,
        hirer: true,
        status: true,
        createdAt: true,
      },
    });

    const projects = agreements.map((a) => ({
      id: a.id,
      projectName: a.projectName,
      customerId: a.id,
      customerName: a.hirer || 'Customer',
      startDate: a.createdAt.toISOString().slice(0, 10),
      endDate: undefined as string | undefined,
      status: mapStatus(a.status),
    }));

    return NextResponse.json({ success: true, projects });
  } catch (e) {
    console.error('[SOA projects]', e);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
