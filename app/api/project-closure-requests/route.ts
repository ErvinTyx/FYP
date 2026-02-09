import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

/**
 * Generate next PCR-YYYY-NNN (e.g. PCR-2026-001)
 */
async function generateClosureRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PCR-${year}-`;

  const prismaAny = prisma as unknown as {
    projectClosureRequest: {
      findMany: (args: { where: { closureRequestNumber: { startsWith: string } }; orderBy: { closureRequestNumber: 'desc' }; take: number }) => Promise<{ closureRequestNumber: string }[]>;
    };
  };

  const latest = await prismaAny.projectClosureRequest.findMany({
    where: { closureRequestNumber: { startsWith: prefix } },
    orderBy: { closureRequestNumber: 'desc' },
    take: 1,
  });

  let seq = 1;
  if (latest.length > 0) {
    const parts = latest[0].closureRequestNumber.split('-');
    const n = parseInt(parts[2] ?? '0', 10);
    seq = n + 1;
  }
  return `${prefix}${seq.toString().padStart(3, '0')}`;
}

/**
 * GET /api/project-closure-requests
 * Returns signed agreements with their closure request (if any) for the Project Closure page.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Only agreements with signedStatus 'completed' appear (match common casings for DB compatibility)
    const agreements = await prisma.rentalAgreement.findMany({
      where: { signedStatus: { in: ['completed', 'Completed', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
    });

    const agreementIds = agreements.map((a) => a.id);
    const prismaAny = prisma as unknown as {
      projectClosureRequest: {
        findMany: (args: { where: { agreementId: { in: string[] } }; orderBy: { createdAt: 'desc' } }) => Promise<{
          id: string;
          closureRequestNumber: string;
          agreementId: string;
          requestDate: Date;
          status: string;
          approvedBy: string | null;
          approvedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }[]>;
      };
    };

    let closureRequests: Awaited<ReturnType<typeof prismaAny.projectClosureRequest.findMany>> = [];
    if (agreementIds.length > 0 && 'projectClosureRequest' in prismaAny) {
      closureRequests = await prismaAny.projectClosureRequest.findMany({
        where: { agreementId: { in: agreementIds } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const byAgreementId = new Map<string, (typeof closureRequests)[0]>();
    for (const cr of closureRequests) {
      if (!byAgreementId.has(cr.agreementId)) byAgreementId.set(cr.agreementId, cr);
    }

    // Fetch latest ReturnRequest status per agreement (by agreementNo)
    const agreementNumbers = agreements.map((a) => a.agreementNumber);
    const returnRequests = await prisma.returnRequest.findMany({
      where: { agreementNo: { in: agreementNumbers } },
      orderBy: { createdAt: 'desc' },
      select: { agreementNo: true, status: true },
    });
    const returnStatusByAgreementNo = new Map<string, string>();
    for (const rr of returnRequests) {
      if (!returnStatusByAgreementNo.has(rr.agreementNo)) {
        returnStatusByAgreementNo.set(rr.agreementNo, rr.status);
      }
    }

    // AdditionalCharge status per agreement (via ReturnRequest.agreementNo) for Scaffolding Shortage Detection badge
    const returnRequestsWithId = await prisma.returnRequest.findMany({
      where: { agreementNo: { in: agreementNumbers } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, agreementNo: true },
    });
    const returnRequestIdByAgreementNo = new Map<string, string>();
    for (const rr of returnRequestsWithId) {
      if (!returnRequestIdByAgreementNo.has(rr.agreementNo)) returnRequestIdByAgreementNo.set(rr.agreementNo, rr.id);
    }
    const returnRequestIds = [...returnRequestIdByAgreementNo.values()];
    const prismaAc = prisma as unknown as {
      additionalCharge: {
        findMany: (args: { where: { returnRequestId: { in: string[] } }; select: { returnRequestId: true; status: true } }) => Promise<{ returnRequestId: string | null; status: string }[]>;
      };
    };
    let additionalCharges: { returnRequestId: string; status: string }[] = [];
    if (returnRequestIds.length > 0 && 'additionalCharge' in prismaAc) {
      const raw = await prismaAc.additionalCharge.findMany({
        where: { returnRequestId: { in: returnRequestIds } },
        select: { returnRequestId: true, status: true },
      });
      additionalCharges = raw.filter((c): c is { returnRequestId: string; status: string } => c.returnRequestId != null);
    }
    const statusByReturnRequestId = new Map<string, string>();
    for (const ac of additionalCharges) {
      statusByReturnRequestId.set(ac.returnRequestId, ac.status);
    }
    const additionalChargeStatusByAgreementNo = new Map<string, string>();
    for (const [agreementNo, rrId] of returnRequestIdByAgreementNo) {
      const status = statusByReturnRequestId.get(rrId);
      if (status) additionalChargeStatusByAgreementNo.set(agreementNo, status);
    }

    // MonthlyRentalInvoice status per agreement (for View badges: Pending Payment | Pending Approval | Paid)
    // 1) Invoices linked by agreementId; 2) Invoices linked via deliveryRequest.agreementNo (agreementId often null)
    const monthlyRentalByAgreementId = new Map<string, 'Paid' | 'Pending Payment' | 'Pending Approval'>();
    if (agreementIds.length > 0) {
      const prismaMri = prisma as any;
      const byAgreementId = await prismaMri.monthlyRentalInvoice.findMany({
        where: { agreementId: { in: agreementIds } },
        select: { agreementId: true, status: true },
      });
      for (const inv of byAgreementId) {
        const aid = inv.agreementId;
        if (!aid) continue;
        const current = monthlyRentalByAgreementId.get(aid);
        if (inv.status === 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Payment');
        } else if (inv.status === 'Pending Approval' && current !== 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Approval');
        } else if (inv.status === 'Paid' && current !== 'Pending Payment' && current !== 'Pending Approval') {
          monthlyRentalByAgreementId.set(aid, 'Paid');
        }
      }
      const agreementIdByNumber = new Map(agreements.map((a) => [a.agreementNumber, a.id]));
      const byDeliveryAgreementNo = await prismaMri.monthlyRentalInvoice.findMany({
        where: { deliveryRequest: { agreementNo: { in: agreementNumbers } } },
        select: { status: true, deliveryRequest: { select: { agreementNo: true } } },
      } as any);
      for (const inv of byDeliveryAgreementNo) {
        const agreementNo = inv.deliveryRequest?.agreementNo;
        if (!agreementNo) continue;
        const aid = agreementIdByNumber.get(agreementNo);
        if (!aid) continue;
        const current = monthlyRentalByAgreementId.get(aid);
        if (inv.status === 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Payment');
        } else if (inv.status === 'Pending Approval' && current !== 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Approval');
        } else if (inv.status === 'Paid' && current !== 'Pending Payment' && current !== 'Pending Approval') {
          monthlyRentalByAgreementId.set(aid, 'Paid');
        }
      }
    }

    // Deposit status per agreement (for View badges: Paid vs Pending Payment)
    const prismaDep = prisma as unknown as {
      deposit: {
        findMany: (args: { where: { agreementId: { in: string[] } }; select: { agreementId: true; status: true } }) => Promise<{ agreementId: string; status: string }[]>;
      };
    };
    const depositStatusByAgreementId = new Map<string, string>();
    if (agreementIds.length > 0 && 'deposit' in prismaDep) {
      const deposits = await prismaDep.deposit.findMany({
        where: { agreementId: { in: agreementIds } },
        select: { agreementId: true, status: true },
      });
      for (const d of deposits) {
        if (!depositStatusByAgreementId.has(d.agreementId)) {
          depositStatusByAgreementId.set(d.agreementId, d.status);
        }
      }
    }

    // Earliest requiredDate per rfqId (from rFQItem) for Rental Start Date
    const agreementsWithRfq = agreements as Array<(typeof agreements)[0] & { rfqId?: string | null }>;
    const rfqIds = [...new Set(agreementsWithRfq.map((a) => a.rfqId).filter(Boolean))] as string[];
    const minDeliverByRfqId = new Map<string, Date>();
    if (rfqIds.length > 0) {
      const items = await prisma.rFQItem.findMany({
        where: { rfqId: { in: rfqIds } },
        select: { rfqId: true, requiredDate: true } as { rfqId: true; requiredDate: true },
      });
      for (const item of items) {
        const d = (item as { rfqId: string; requiredDate: Date }).requiredDate;
        if (d == null) continue;
        const existing = minDeliverByRfqId.get(item.rfqId);
        if (existing == null || d.getTime() < existing.getTime()) {
          minDeliverByRfqId.set(item.rfqId, d);
        }
      }
    }

    const rows = agreements.map((agreement) => {
      const closureRequest = byAgreementId.get(agreement.id) ?? null;
      const returnRequestStatus = returnStatusByAgreementNo.get(agreement.agreementNumber) ?? null;
      const ag = agreement as typeof agreement & { rfqId?: string | null };
      const rentalStartDate = ag.rfqId ? minDeliverByRfqId.get(ag.rfqId)?.toISOString() ?? null : null;
      const additionalChargeStatus = additionalChargeStatusByAgreementNo.get(agreement.agreementNumber) ?? null;
      const monthlyRentalPaymentStatus = monthlyRentalByAgreementId.get(agreement.id) ?? null;
      const depositStatus = depositStatusByAgreementId.get(agreement.id) ?? null;
      return {
        agreement: {
          id: agreement.id,
          agreementNumber: agreement.agreementNumber,
          projectName: agreement.projectName,
          hirer: agreement.hirer,
          hirerSignatoryName: agreement.hirerSignatoryName,
          termOfHire: agreement.termOfHire,
          rentalStartDate,
          additionalChargeStatus,
          monthlyRentalPaymentStatus,
          depositStatus,
        },
        closureRequest: closureRequest
          ? {
              id: closureRequest.id,
              closureRequestNumber: closureRequest.closureRequestNumber,
              agreementId: closureRequest.agreementId,
              requestDate: closureRequest.requestDate.toISOString(),
              status: closureRequest.status,
              approvedBy: closureRequest.approvedBy,
              approvedAt: closureRequest.approvedAt?.toISOString() ?? null,
              createdAt: closureRequest.createdAt.toISOString(),
              updatedAt: closureRequest.updatedAt.toISOString(),
            }
          : null,
        returnRequestStatus,
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET project-closure-requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load project closure list' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-closure-requests
 * Create a closure request for an agreement (when user checks Request Date).
 * Body: { agreementId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { agreementId } = body;
    if (!agreementId || typeof agreementId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'agreementId is required' },
        { status: 400 }
      );
    }

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { id: agreementId },
    });
    if (!agreement) {
      return NextResponse.json({ success: false, message: 'Agreement not found' }, { status: 404 });
    }
    const signedOk = agreement.signedStatus && ['completed', 'Completed', 'COMPLETED'].includes(agreement.signedStatus);
    if (!signedOk) {
      return NextResponse.json(
        { success: false, message: 'Only signed agreements (signedStatus completed) can have a closure request' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as unknown as {
      projectClosureRequest: {
        findFirst: (args: { where: { agreementId: string } }) => Promise<{ id: string } | null>;
        create: (args: {
          data: {
            closureRequestNumber: string;
            agreementId: string;
            requestDate: Date;
            status: string;
          };
        }) => Promise<{
          id: string;
          closureRequestNumber: string;
          agreementId: string;
          requestDate: Date;
          status: string;
          approvedBy: string | null;
          approvedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }>;
      };
    };

    const existing = await prismaAny.projectClosureRequest.findFirst({
      where: { agreementId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'This agreement already has a closure request' },
        { status: 400 }
      );
    }

    const closureRequestNumber = await generateClosureRequestNumber();
    const requestDate = new Date();

    const created = await prismaAny.projectClosureRequest.create({
      data: {
        closureRequestNumber,
        agreementId,
        requestDate,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        closureRequestNumber: created.closureRequestNumber,
        agreementId: created.agreementId,
        requestDate: created.requestDate.toISOString(),
        status: created.status,
        approvedBy: created.approvedBy,
        approvedAt: created.approvedAt?.toISOString() ?? null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST project-closure-requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create closure request' },
      { status: 500 }
    );
  }
}
