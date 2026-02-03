/**
 * GET /api/credit-notes - List with optional filters
 * POST /api/credit-notes - Create (draft or submit for approval)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

function serializeCreditNote(cn: {
  id: string;
  creditNoteNumber: string;
  customerName: string;
  customerId: string;
  invoiceType: string;
  sourceId: string | null;
  originalInvoice: string;
  deliveryOrderId: string | null;
  amount: { toNumber?: () => number } | number;
  reason: string;
  reasonDescription: string | null;
  date: Date;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    previousPrice: { toNumber?: () => number } | number;
    currentPrice: { toNumber?: () => number } | number;
    unitPrice: { toNumber?: () => number } | number;
    amount: { toNumber?: () => number } | number;
    daysCharged: number | null;
  }>;
  attachments: Array<{ id: string; fileName: string; fileUrl: string; fileSize: number; uploadedAt: Date }>;
}) {
  const toNum = (v: { toNumber?: () => number } | number) =>
    typeof v === 'number' ? v : (v as { toNumber?: () => number }).toNumber?.() ?? 0;
  return {
    ...cn,
    amount: toNum(cn.amount),
    date: cn.date.toISOString().split('T')[0],
    createdAt: cn.createdAt.toISOString(),
    updatedAt: cn.updatedAt.toISOString(),
    approvedAt: cn.approvedAt?.toISOString() ?? null,
    rejectedAt: cn.rejectedAt?.toISOString() ?? null,
    items: cn.items.map((i) => ({
      ...i,
      previousPrice: toNum(i.previousPrice),
      currentPrice: toNum(i.currentPrice),
      unitPrice: toNum(i.unitPrice),
      amount: toNum(i.amount),
      daysCharged: i.daysCharged ?? undefined,
    })),
    attachments: cn.attachments.map((a) => ({
      ...a,
      uploadedAt: a.uploadedAt.toISOString(),
    })),
  };
}

async function generateCreditNoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CN-${year}-`;
  const latest = await prisma.creditNote.findFirst({
    where: { creditNoteNumber: { startsWith: prefix } },
    orderBy: { creditNoteNumber: 'desc' },
  });
  let seq = 1;
  if (latest) {
    const part = latest.creditNoteNumber.split('-')[2];
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
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to view credit notes' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const customerName = searchParams.get('customerName') || undefined;
    const invoiceType = searchParams.get('invoiceType') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerName) where.customerName = { contains: customerName };
    if (invoiceType) where.invoiceType = invoiceType;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo);
    }

    const list = await prisma.creditNote.findMany({
      where,
      include: { items: true, attachments: true },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = list.map((cn) => serializeCreditNote(cn as Parameters<typeof serializeCreditNote>[0]));
    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Credit notes] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to list credit notes' },
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
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to create credit notes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      customerName,
      customerId,
      invoiceType,
      sourceId,
      originalInvoice,
      deliveryOrderId,
      reason,
      reasonDescription,
      date,
      status,
      items,
      attachments,
    } = body;

    if (!customerName || !customerId || !invoiceType || !originalInvoice || !reason || !date) {
      return NextResponse.json(
        { success: false, message: 'customerName, customerId, invoiceType, originalInvoice, reason, and date are required' },
        { status: 400 }
      );
    }
    const validStatus = status === 'Draft' || status === 'Pending Approval' ? status : 'Draft';
    const validInvoiceType = ['deposit', 'monthlyRental', 'additionalCharge'].includes(invoiceType)
      ? invoiceType
      : 'monthlyRental';

    const itemsArray = Array.isArray(items) ? items : [];
    if (validStatus === 'Pending Approval' && itemsArray.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one line item is required when submitting for approval' },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    const itemRows = itemsArray.map((item: { description?: string; quantity?: number; previousPrice?: number; currentPrice?: number; amount?: number; daysCharged?: number }) => {
      const qty = Number(item.quantity) || 0;
      const prev = Number(item.previousPrice) || 0;
      const curr = Number(item.currentPrice) ?? Number(item.amount) / (qty || 1);
      const amt = Number(item.amount) ?? qty * curr;
      totalAmount += amt;
      return {
        description: String(item.description || ''),
        quantity: qty,
        previousPrice: prev,
        currentPrice: curr,
        unitPrice: curr,
        amount: amt,
        daysCharged: item.daysCharged != null ? Number(item.daysCharged) : null,
      };
    });

    if (validStatus === 'Pending Approval' && totalAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Total amount must be greater than zero when submitting for approval' },
        { status: 400 }
      );
    }

    const creditNoteNumber = await generateCreditNoteNumber();
    const createdBy = session.user.email || session.user.name || 'Unknown';

    const attachmentRows = Array.isArray(attachments)
      ? attachments.map((a: { fileName?: string; fileUrl?: string; fileSize?: number }) => ({
          fileName: String(a.fileName || ''),
          fileUrl: String(a.fileUrl || ''),
          fileSize: Number(a.fileSize) || 0,
        }))
      : [];

    const created = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        customerName,
        customerId,
        invoiceType: validInvoiceType,
        sourceId: sourceId || null,
        originalInvoice,
        deliveryOrderId: deliveryOrderId || null,
        amount: totalAmount,
        reason,
        reasonDescription: reasonDescription || null,
        date: new Date(date),
        status: validStatus,
        createdBy,
        items: { create: itemRows },
        attachments: attachmentRows.length > 0 ? { create: attachmentRows } : undefined,
      },
      include: { items: true, attachments: true },
    });

    const serialized = serializeCreditNote(created as Parameters<typeof serializeCreditNote>[0]);
    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Credit notes] POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create credit note' },
      { status: 500 }
    );
  }
}
