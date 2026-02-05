import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

/**
 * PATCH /api/project-closure-requests/:id
 * Update closure request (e.g. approve).
 * Body: { status?: string, approvedBy?: string, approvedAt?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, approvedBy, approvedAt } = body;

    const prismaAny = prisma as unknown as {
      projectClosureRequest: {
        findUnique: (args: { where: { id: string } }) => Promise<{
          id: string;
          closureRequestNumber: string;
          agreementId: string;
          requestDate: Date;
          status: string;
          approvedBy: string | null;
          approvedAt: Date | null;
        } | null>;
        update: (args: {
          where: { id: string };
          data: Record<string, unknown>;
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

    const existing = await prismaAny.projectClosureRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Closure request not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (approvedBy !== undefined) data.approvedBy = approvedBy;
    if (approvedAt !== undefined) data.approvedAt = approvedAt ? new Date(approvedAt) : null;
    if (status === 'approved') {
      data.approvedBy = approvedBy ?? session.user.email ?? null;
      data.approvedAt = approvedAt ? new Date(approvedAt) : new Date();
    }

    const updated = await prismaAny.projectClosureRequest.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        closureRequestNumber: updated.closureRequestNumber,
        agreementId: updated.agreementId,
        requestDate: updated.requestDate.toISOString(),
        status: updated.status,
        approvedBy: updated.approvedBy,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PATCH project-closure-requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update closure request' },
      { status: 500 }
    );
  }
}
