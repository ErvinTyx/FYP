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
  customerId: string | null;
  customer: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
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
    const search = searchParams.get('search')?.trim() || undefined;
    const invoiceType = searchParams.get('invoiceType') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerName) where.customer = { OR: [{ firstName: { contains: customerName } }, { lastName: { contains: customerName } }] };
    if (invoiceType) where.invoiceType = invoiceType;
    if (search) {
      (where as Record<string, unknown>).OR = [
        { refundNumber: { contains: search } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
        { customer: { email: { contains: search } } },
        { originalInvoice: { contains: search } },
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);
    const pageSize = [5, 10, 25, 50].includes(rawPageSize) ? rawPageSize : 10;
    const orderByParam = searchParams.get('orderBy') ?? 'latest';
    const orderDir = orderByParam === 'earliest' ? 'asc' : 'desc';
    const skip = (page - 1) * pageSize;

    const [total, approvedRefunds, pendingCount] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where: { AND: [where, { status: 'Approved' }] },
        select: { amount: true },
      }),
      prisma.refund.count({ where: { AND: [where, { status: 'Pending Approval' }] } }),
    ]);

    const totalAmount = approvedRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const approvedCount = approvedRefunds.length;

    const list = await prisma.refund.findMany({
      where,
      include: {
        attachments: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: orderDir },
      skip,
      take: pageSize,
    });
    const data = list.map((r) => serializeRefund(r as Parameters<typeof serializeRefund>[0]));
    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
      orderBy: orderByParam,
      summary: { totalAmount, pendingCount, approvedCount },
    });
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
      creditNoteId,
      amount,
      refundMethod,
      reason,
      reasonDescription,
      status,
      attachments,
    } = body;

    if (!creditNoteId) {
      return NextResponse.json(
        { success: false, message: 'creditNoteId is required — please select a credit note' },
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

    // Fetch credit note and derive invoice fields from it
    const toNum = (v: unknown) =>
      typeof v === 'number' ? v : Number((v as { toNumber?: () => number })?.toNumber?.() ?? 0);
    const creditNote = await prisma.creditNote.findUnique({
      where: { id: creditNoteId },
      select: {
        id: true,
        creditNoteNumber: true,
        amount: true,
        sourceId: true,
        agreementId: true,
        invoiceType: true,
        originalInvoice: true,
        customerId: true,
        status: true,
      },
    });
    if (!creditNote) {
      return NextResponse.json(
        { success: false, message: 'Credit note not found' },
        { status: 404 }
      );
    }
    if (creditNote.status !== 'Approved') {
      return NextResponse.json(
        { success: false, message: 'Only approved credit notes can be refunded' },
        { status: 400 }
      );
    }

    // Derive invoice fields from credit note (for return-item CNs, sourceId may be agreementId)
    const invoiceType = creditNote.invoiceType || 'monthlyRental';
    const sourceId = creditNote.sourceId ?? creditNote.agreementId ?? '';
    const originalInvoice = creditNote.originalInvoice || creditNote.creditNoteNumber || 'N/A';
    const customerId = creditNote.customerId || null;

    if (!sourceId) {
      return NextResponse.json(
        { success: false, message: 'Credit note has no source reference; cannot create refund' },
        { status: 400 }
      );
    }

    const validType = ['deposit', 'monthlyRental', 'additionalCharge'].includes(invoiceType) ? invoiceType : 'monthlyRental';

    // Calculate remaining balance for this specific credit note
    const cnAmount = toNum(creditNote.amount);
    const cnApps = await prisma.creditNoteApplication.findMany({
      where: { creditNoteId },
      select: { amountApplied: true },
    });
    const totalApplied = cnApps.reduce((s, a) => s + toNum(a.amountApplied), 0);
    const cnRefunds = await prisma.refund.findMany({
      where: { creditNoteId },
      select: { amount: true },
    });
    const totalRefunded = cnRefunds.reduce((s, r) => s + toNum(r.amount), 0);
    const maxRefundable = Math.max(0, cnAmount - totalApplied - totalRefunded);

    if (numAmount > maxRefundable) {
      return NextResponse.json(
        {
          success: false,
          message: `Refund amount cannot exceed credit note remaining balance (RM${maxRefundable.toFixed(2)})`,
        },
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
        customerId,
        creditNoteId,
        creditNoteNumber: creditNote.creditNoteNumber,
        amount: numAmount,
        refundMethod: refundMethod || null,
        reason: reason?.trim() || null,
        reasonDescription: reasonDescription?.trim() || null,
        status: validStatus,
        createdBy,
        attachments: attachmentRows.length > 0 ? { create: attachmentRows } : undefined,
      },
      include: {
        attachments: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
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
