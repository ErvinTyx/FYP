/**
 * GET /api/billing/recent-activity
 * Aggregates latest changes across Deposit, MonthlyRentalInvoice, AdditionalCharge, CreditNote, Refund.
 * Query: page (default 1), pageSize (default 10; allow 10, 25, 50).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

type EntityType = 'monthlyRental' | 'deposit' | 'additionalCharge' | 'creditNote' | 'refund';

interface ActivityItem {
  id: string;
  date: string;
  type: EntityType;
  amount: number;
  status: string;
  reference: string;
  entityId: string;
  entityType: EntityType;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const d = v as { toNumber?: () => number };
  return d?.toNumber?.() ?? Number(v) ?? 0;
}

function normalizeStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower.includes('paid')) return 'Paid';
  if (lower.includes('pending') && lower.includes('approval')) return 'Pending Approval';
  if (lower.includes('pending')) return 'Pending';
  if (lower.includes('overdue')) return 'Overdue';
  if (lower.includes('approved')) return 'Approved';
  if (lower.includes('rejected')) return 'Rejected';
  if (lower.includes('expired')) return 'Expired';
  if (lower.includes('draft')) return 'Draft';
  return s || 'Pending';
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const roles = (session.user as { roles?: string[] }).roles ?? [];
    const hasRole = ALLOWED_ROLES.some((r) => roles.includes(r));
    if (!hasRole) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);
    const pageSize = [10, 25, 50].includes(rawPageSize) ? rawPageSize : 10;

    const items: ActivityItem[] = [];

    // Deposits
    const deposits = await prisma.deposit.findMany({
      select: { id: true, depositNumber: true, depositAmount: true, status: true, updatedAt: true, createdAt: true },
    });
    for (const d of deposits) {
      items.push({
        id: `deposit-${d.id}`,
        date: (d.updatedAt ?? d.createdAt).toISOString(),
        type: 'deposit',
        amount: toNum(d.depositAmount),
        status: normalizeStatus(d.status),
        reference: d.depositNumber,
        entityId: d.id,
        entityType: 'deposit',
      });
    }

    // Monthly Rental Invoices
    const invoices = await prisma.monthlyRentalInvoice.findMany({
      select: { id: true, invoiceNumber: true, totalAmount: true, status: true, updatedAt: true, createdAt: true },
    });
    for (const inv of invoices) {
      items.push({
        id: `monthlyRental-${inv.id}`,
        date: (inv.updatedAt ?? inv.createdAt).toISOString(),
        type: 'monthlyRental',
        amount: toNum(inv.totalAmount),
        status: normalizeStatus(inv.status),
        reference: inv.invoiceNumber,
        entityId: inv.id,
        entityType: 'monthlyRental',
      });
    }

    // Additional Charges
    const charges = await prisma.additionalCharge.findMany({
      select: { id: true, invoiceNo: true, totalCharges: true, status: true, updatedAt: true, createdAt: true },
    });
    for (const c of charges) {
      items.push({
        id: `additionalCharge-${c.id}`,
        date: (c.updatedAt ?? c.createdAt).toISOString(),
        type: 'additionalCharge',
        amount: toNum(c.totalCharges),
        status: normalizeStatus(c.status),
        reference: c.invoiceNo,
        entityId: c.id,
        entityType: 'additionalCharge',
      });
    }

    // Credit Notes
    const creditNotes = await prisma.creditNote.findMany({
      select: { id: true, creditNoteNumber: true, amount: true, status: true, updatedAt: true, createdAt: true },
    });
    for (const cn of creditNotes) {
      items.push({
        id: `creditNote-${cn.id}`,
        date: (cn.updatedAt ?? cn.createdAt).toISOString(),
        type: 'creditNote',
        amount: toNum(cn.amount),
        status: normalizeStatus(cn.status),
        reference: cn.creditNoteNumber,
        entityId: cn.id,
        entityType: 'creditNote',
      });
    }

    // Refunds
    const refunds = await prisma.refund.findMany({
      select: { id: true, refundNumber: true, amount: true, status: true, updatedAt: true, createdAt: true },
    });
    for (const r of refunds) {
      items.push({
        id: `refund-${r.id}`,
        date: (r.updatedAt ?? r.createdAt).toISOString(),
        type: 'refund',
        amount: toNum(r.amount),
        status: normalizeStatus(r.status),
        reference: r.refundNumber,
        entityId: r.id,
        entityType: 'refund',
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = items.length;
    const offset = (page - 1) * pageSize;
    const data = items.slice(offset, offset + pageSize);

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
    });
  } catch (e) {
    console.error('[billing/recent-activity]', e);
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
