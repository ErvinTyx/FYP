/**
 * GET /api/refunds - List with optional filters
 * POST /api/refunds - Create (draft or submit for approval)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

function serializeRefund(r: {
  id: string;
  refundNumber: string;
  invoiceType: string;
  sourceId: string;
  originalInvoice: string;
  customerName: string;
  customerId: string;
  amount: { toNumber?: () => number } | number;
  refundMethod: string | null;
  reason: string | null;
  reasonDescription: string | null;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  attachments: Array<{ id: string; fileName: string; fileUrl: string; fileSize: number; uploadedAt: Date }>;
}) {
  const toNum = (v: { toNumber?: () => number } | number) =>
    typeof v === 'number' ? v : (v as { toNumber?: () => number }).toNumber?.() ?? 0;
  return {
    ...r,
    amount: toNum(r.amount),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    attachments: r.attachments.map((a) => ({
      ...a,
      uploadedAt: a.uploadedAt.toISOString(),
    })),
  };
}

async function generateRefundNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REF-${year}-`;
  const latest = await prisma.refund.findFirst({
    where: { refundNumber: { startsWith: prefix } },
    orderBy: { refundNumber: 'desc' },
  });
  let seq = 1;
  if (latest) {
    const part = latest.refundNumber.split('-')[2];
    seq = parseInt(part || '0', 10) + 1;
  }
  return `${prefix}${seq.toString().padStart(3, '0')}`;
}

async function getTotalCredited(sourceId: string): Promise<number> {
  const list = await prisma.creditNote.findMany({
    where: { sourceId, status: 'Approved' },
    select: { amount: true },
  });
  const toNum = (v: unknown) =>
    typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0);
  return list.reduce((sum, cn) => sum + toNum(cn.amount), 0);
}

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
    const status = searchParams.get('status') || undefined;
    const customerName = searchParams.get('customerName') || undefined;
    const invoiceType = searchParams.get('invoiceType') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerName) where.customerName = { contains: customerName };
    if (invoiceType) where.invoiceType = invoiceType;

    const list = await prisma.refund.findMany({
      where,
      include: { attachments: true },
      orderBy: { createdAt: 'desc' },
    });
    const data = list.map((r) => serializeRefund(r as Parameters<typeof serializeRefund>[0]));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Refunds] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to list refunds' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      invoiceType,
      sourceId,
      originalInvoice,
      customerName,
      customerId,
      amount,
      refundMethod,
      reason,
      reasonDescription,
      status,
      attachments,
    } = body;

    if (!invoiceType || !sourceId || !originalInvoice || !customerName || !customerId) {
      return NextResponse.json(
        { success: false, message: 'invoiceType, sourceId, originalInvoice, customerName, customerId are required' },
        { status: 400 }
      );
    }
    const numAmount = Number(amount);
    if (!(numAmount > 0)) {
      return NextResponse.json(
        { success: false, message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }
    const validStatus = status === 'Draft' || status === 'Pending Approval' ? status : 'Draft';
    const validType = ['deposit', 'monthlyRental', 'additionalCharge'].includes(invoiceType) ? invoiceType : 'deposit';

    const totalCredited = await getTotalCredited(sourceId);
    if (numAmount > totalCredited) {
      return NextResponse.json(
        { success: false, message: `Refund amount cannot exceed total credited amount (RM${totalCredited.toFixed(2)})` },
        { status: 400 }
      );
    }
    if (validStatus === 'Pending Approval' && (!reason || typeof reason !== 'string' || !reason.trim())) {
      return NextResponse.json(
        { success: false, message: 'Reason is required when submitting for approval' },
        { status: 400 }
      );
    }

    const refundNumber = await generateRefundNumber();
    const createdBy = session.user.email || session.user.name || 'Unknown';

    const attachmentRows = Array.isArray(attachments)
      ? attachments.map((a: { fileName?: string; fileUrl?: string; fileSize?: number }) => ({
          fileName: String(a.fileName || ''),
          fileUrl: String(a.fileUrl || ''),
          fileSize: Number(a.fileSize) || 0,
        }))
      : [];

    const created = await prisma.refund.create({
      data: {
        refundNumber,
        invoiceType: validType,
        sourceId,
        originalInvoice,
        customerName,
        customerId,
        amount: numAmount,
        refundMethod: refundMethod || null,
        reason: reason?.trim() || null,
        reasonDescription: reasonDescription?.trim() || null,
        status: validStatus,
        createdBy,
        attachments: attachmentRows.length > 0 ? { create: attachmentRows } : undefined,
      },
      include: { attachments: true },
    });

    const data = serializeRefund(created as Parameters<typeof serializeRefund>[0]);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Refunds] POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create refund' },
      { status: 500 }
    );
  }
}
