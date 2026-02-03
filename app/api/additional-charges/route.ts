/**
 * Additional Charges API
 * POST: create from open repair slip
 * GET: list with optional openRepairSlipId, status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAdditionalChargeInvoiceNo } from '@/lib/additional-charge-utils';

/** Build AdditionalChargeItem rows from RepairItem[] (Damage + Repair from repairActionEntries) */
function buildChargeItemsFromRepairItems(repairItems: Array<{
  scaffoldingItemName: string;
  quantityWriteOff: number;
  writeOffTotalCost: number | { toNumber?: () => number };
  writeOffCostPerUnit: number | { toNumber?: () => number };
  repairActionEntries: Array<{ action: string; issueQuantity: number; costPerUnit: number; totalCost: number }>;
}>): Array<{ itemName: string; itemType: string; repairDescription: string | null; quantity: number; unitPrice: number; amount: number }> {
  const rows: Array<{ itemName: string; itemType: string; repairDescription: string | null; quantity: number; unitPrice: number; amount: number }> = [];
  const toNum = (v: number | { toNumber?: () => number }) => (typeof v === 'number' ? v : (v as { toNumber: () => number }).toNumber?.() ?? 0);

  for (const item of repairItems) {
    const name = item.scaffoldingItemName || 'Item';
    const qtyWriteOff = Number(item.quantityWriteOff ?? 0);
    const writeOffTotal = toNum(item.writeOffTotalCost ?? 0);
    const writeOffPerUnit = toNum(item.writeOffCostPerUnit ?? 0);

    if (qtyWriteOff > 0 && writeOffTotal > 0) {
      rows.push({
        itemName: name,
        itemType: 'Damage',
        repairDescription: null,
        quantity: qtyWriteOff,
        unitPrice: writeOffPerUnit,
        amount: writeOffTotal,
      });
    }

    const entries = Array.isArray(item.repairActionEntries) ? item.repairActionEntries : [];
    for (const entry of entries) {
      const qty = Number(entry.issueQuantity ?? 0);
      const costPerUnit = Number(entry.costPerUnit ?? 0);
      const total = Number(entry.totalCost ?? 0);
      if (qty > 0 || total > 0) {
        rows.push({
          itemName: name,
          itemType: 'Repair',
          repairDescription: entry.action || null,
          quantity: qty,
          unitPrice: costPerUnit,
          amount: total,
        });
      }
    }
  }
  return rows;
}

/**
 * POST /api/additional-charges
 * Body: { openRepairSlipId }
 * Creates AdditionalCharge + items from repair slip; dueDate = now + 7 days, status = pending_payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { openRepairSlipId } = body;

    if (!openRepairSlipId) {
      return NextResponse.json(
        { success: false, message: 'openRepairSlipId is required' },
        { status: 400 }
      );
    }

    const slip = await prisma.openRepairSlip.findUnique({
      where: { id: openRepairSlipId },
      include: {
        items: true,
        conditionReport: true,
      },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, message: 'Open repair slip not found' },
        { status: 404 }
      );
    }

    const existing = await prisma.additionalCharge.findUnique({
      where: { openRepairSlipId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An additional charge already exists for this repair slip' },
        { status: 400 }
      );
    }

    const repairItemsForBuild = slip.items.map((item) => ({
      scaffoldingItemName: item.scaffoldingItemName,
      quantityWriteOff: item.quantityWriteOff,
      writeOffTotalCost: item.writeOffTotalCost,
      writeOffCostPerUnit: item.writeOffCostPerUnit,
      repairActionEntries: JSON.parse(item.repairActionEntries || '[]') as Array<{ action: string; issueQuantity: number; costPerUnit: number; totalCost: number }>,
    }));

    const itemRows = buildChargeItemsFromRepairItems(repairItemsForBuild);
    if (itemRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No chargeable items (Damage/Repair with cost) in this repair slip' },
        { status: 400 }
      );
    }

    const totalCharges = itemRows.reduce((sum, r) => sum + r.amount, 0);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoiceNo = generateAdditionalChargeInvoiceNo();
    const conditionReport = slip.conditionReport;
    const customerName = conditionReport?.customerName ?? 'Customer';
    const doId = conditionReport?.deliveryOrderNumber ?? slip.rcfNumber;
    const returnedDate = conditionReport?.returnDate ?? null;

    const charge = await prisma.$transaction(async (tx) => {
      const created = await tx.additionalCharge.create({
        data: {
          invoiceNo,
          openRepairSlipId: slip.id,
          conditionReportId: slip.conditionReportId,
          customerName,
          doId,
          returnedDate,
          dueDate,
          status: 'pending_payment',
          totalCharges,
          items: {
            create: itemRows.map((r) => ({
              itemName: r.itemName,
              itemType: r.itemType,
              repairDescription: r.repairDescription,
              quantity: r.quantity,
              unitPrice: r.unitPrice,
              amount: r.amount,
            })),
          },
        },
        include: { items: true },
      });
      return created;
    });

    const serialized = {
      ...charge,
      totalCharges: Number(charge.totalCharges),
      dueDate: charge.dueDate.toISOString(),
      approvalDate: charge.approvalDate?.toISOString() ?? null,
      rejectionDate: charge.rejectionDate?.toISOString() ?? null,
      items: charge.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
    };

    return NextResponse.json({ success: true, data: serialized }, { status: 201 });
  } catch (error) {
    console.error('[Additional Charges API] POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create additional charge' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/additional-charges
 * Query: openRepairSlipId?, status?
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const openRepairSlipId = searchParams.get('openRepairSlipId') || undefined;
    const status = searchParams.get('status') || undefined;
    const customerName = searchParams.get('customerName') || undefined;

    const where: { openRepairSlipId?: string; status?: string; customerName?: { contains: string } } = {};
    if (openRepairSlipId) where.openRepairSlipId = openRepairSlipId;
    if (status) where.status = status;
    if (customerName) where.customerName = { contains: customerName };

    const list = await prisma.additionalCharge.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = list.map((c) => ({
      ...c,
      totalCharges: Number(c.totalCharges),
      dueDate: c.dueDate.toISOString(),
      approvalDate: c.approvalDate?.toISOString() ?? null,
      rejectionDate: c.rejectionDate?.toISOString() ?? null,
      items: c.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
    }));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error('[Additional Charges API] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to list additional charges' },
      { status: 500 }
    );
  }
}
