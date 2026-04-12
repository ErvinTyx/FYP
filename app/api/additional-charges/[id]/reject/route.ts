/**
 * PUT /api/additional-charges/[id]/reject
 * Body: { reason }; require non-empty reason; send rejection email to uploadedByEmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendAdditionalChargeRejectionEmail } from '@/lib/email';

const APPROVAL_ROLES = ['super_user', 'admin', 'finance'];

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    const canReject = session.user.roles?.some((role: string) => APPROVAL_ROLES.includes(role));
    if (!canReject) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to reject charges' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Charge ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json(
        { success: false, message: 'reason is required and must be non-empty' },
        { status: 400 }
      );
    }

    const charge = await (prisma as any).additionalCharge.findUnique({
      where: { id },
      include: {
        items: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!charge) {
      return NextResponse.json(
        { success: false, message: 'Additional charge not found' },
        { status: 404 }
      );
    }
    if (charge.status !== 'pending_approval') {
      return NextResponse.json(
        { success: false, message: 'Only charges with Pending Approval status can be rejected' },
        { status: 400 }
      );
    }

    const updated = await (prisma as any).additionalCharge.update({
      where: { id },
      data: {
        rejectionReason: reason,
        status: 'rejected',
        rejectionDate: new Date(),
      },
      include: {
        items: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (updated.uploadedByEmail) {
      try {
        const customerDisplayName = [updated.customer?.firstName, updated.customer?.lastName].filter(Boolean).join(' ') || 'Customer';
        await sendAdditionalChargeRejectionEmail(
          updated.uploadedByEmail,
          updated.invoiceNo,
          reason,
          updated.id,
          customerDisplayName
        );
      } catch (emailErr) {
        console.error('[Additional Charges API] Rejection email failed:', emailErr);
      }
    }

    const serialized = {
      ...updated,
      totalCharges: Number(updated.totalCharges),
      dueDate: updated.dueDate.toISOString(),
      approvalDate: updated.approvalDate?.toISOString() ?? null,
      rejectionDate: updated.rejectionDate?.toISOString() ?? null,
      items: updated.items.map((i: { unitPrice: unknown; amount: unknown; [key: string]: unknown }) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Additional Charges API] reject error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reject charge' },
      { status: 500 }
    );
  }
}
