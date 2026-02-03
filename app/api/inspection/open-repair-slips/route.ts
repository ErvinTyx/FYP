/**
 * Open Repair Slip API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/open-repair-slips
 * Purpose: Handle HTTP requests for Open Repair Slip (ORP) operations
 * 
 * Endpoints:
 * POST /api/inspection/open-repair-slips - Create new repair slip
 * GET /api/inspection/open-repair-slips - Get all repair slips
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Helper function to generate unique ORP number
 */
function generateORPNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `ORP-${dateStr}-${random}`;
}

/**
 * POST /api/inspection/open-repair-slips
 * Create a new open repair slip in the database
 */
export async function POST(request: NextRequest) {
  try {
    const {
      conditionReportId,
      rcfNumber,
      status,
      priority,
      assignedTo,
      startDate,
      estimatedCost,
      actualCost,
      repairNotes,
      createdBy,
      inventoryLevel,
      items,
    } = await request.json();

    // Validate required fields
    if (!conditionReportId || !rcfNumber || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          message: 'Required fields missing: conditionReportId, rcfNumber, createdBy',
        },
        { status: 400 }
      );
    }

    // Create repair slip with transaction
    const result = await prisma.$transaction(async (tx) => {
      const orpNumber = generateORPNumber();

      // Preserve existing condition report status (creating a repair slip should not auto-complete it)
      const existingConditionReport = await tx.conditionReport.findUnique({
        where: { id: conditionReportId },
        select: { status: true },
      });

      // Create Open Repair Slip header
      const openRepairSlip = await tx.openRepairSlip.create({
        data: {
          orpNumber,
          conditionReportId,
          rcfNumber,
          status: status || 'open',
          priority: priority || 'medium',
          assignedTo: assignedTo || null,
          startDate: startDate || null,
          estimatedCost: parseFloat((estimatedCost || 0).toString()),
          actualCost: parseFloat((actualCost || 0).toString()),
          repairNotes: repairNotes || null,
          createdBy,
          inventoryLevel: inventoryLevel || null,
        },
      });

      // Create repair items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.repairItem.createMany({
          data: items.map((item: any) => {
            // Normalize repairActionEntries: single quantity (issueQuantity) drives cost; sync affectedItems
            const entries = Array.isArray(item.repairActionEntries) ? item.repairActionEntries : [];
            const normalizedEntries = entries.map((e: any) => ({
              ...e,
              issueQuantity: Number(e.issueQuantity ?? e.affectedItems ?? 0),
              affectedItems: Number(e.issueQuantity ?? e.affectedItems ?? 0),
              totalCost: Number(e.issueQuantity ?? e.affectedItems ?? 0) * Number(e.costPerUnit ?? 0),
            }));
            return {
              openRepairSlipId: openRepairSlip.id,
              inspectionItemId: item.inspectionItemId || null,
              scaffoldingItemId: item.scaffoldingItemId || '',
              scaffoldingItemName: item.scaffoldingItemName || '',
              quantity: item.quantity || 0,
              quantityRepair: item.quantityRepair ?? 0,
              quantityWriteOff: item.quantityWriteOff ?? 0,
              quantityRepaired: item.quantityRepaired || 0,
              quantityRemaining: item.quantityRemaining ?? item.quantityRepair ?? item.quantity ?? 0,
              damageType: item.damageType || 'other',
              damageDescription: item.damageDescription || '',
              repairActions: JSON.stringify(item.repairActions || []),
              repairActionEntries: JSON.stringify(normalizedEntries),
              repairDescription: item.repairDescription || null,
              repairStatus: item.repairStatus || 'pending',
              writeOffCostPerUnit: parseFloat((item.writeOffCostPerUnit ?? 0).toString()),
              writeOffTotalCost: parseFloat((item.writeOffTotalCost ?? 0).toString()),
              totalRepairCost: parseFloat((item.totalRepairCost ?? 0).toString()),
              costPerUnit: parseFloat((item.costPerUnit || 0).toString()),
              totalCost: parseFloat((item.totalCost || 0).toString()),
              estimatedCostFromRFQ: parseFloat((item.estimatedCostFromRFQ || 0).toString()),
              finalCost: parseFloat((item.finalCost || 0).toString()),
              beforeImages: JSON.stringify(item.beforeImages || []),
              afterImages: JSON.stringify(item.afterImages || []),
              completedDate: item.completedDate || null,
            };
          }),
        });
      }

      if (existingConditionReport?.status) {
        await tx.conditionReport.update({
          where: { id: conditionReportId },
          data: { status: existingConditionReport.status },
        });
      }

      // Fetch the created repair slip with items
      return await tx.openRepairSlip.findUnique({
        where: { id: openRepairSlip.id },
        include: { items: true },
      });
    });

    // Transform data to match frontend expectations; normalize repairActionEntries (single quantity)
    const transformItem = (item: any) => {
      const entries = JSON.parse(item.repairActionEntries || '[]');
      const normalizedEntries = entries.map((e: any) => ({
        ...e,
        issueQuantity: Number(e.issueQuantity ?? e.affectedItems ?? 0),
        affectedItems: Number(e.issueQuantity ?? e.affectedItems ?? 0),
      }));
      return {
        ...item,
        quantityRepair: item.quantityRepair ?? 0,
        quantityWriteOff: item.quantityWriteOff ?? 0,
        writeOffCostPerUnit: Number(item.writeOffCostPerUnit ?? 0),
        writeOffTotalCost: Number(item.writeOffTotalCost ?? 0),
        totalRepairCost: Number(item.totalRepairCost ?? 0),
        costPerUnit: Number(item.costPerUnit),
        totalCost: Number(item.totalCost),
        estimatedCostFromRFQ: Number(item.estimatedCostFromRFQ),
        finalCost: Number(item.finalCost),
        repairActions: JSON.parse(item.repairActions || '[]'),
        repairActionEntries: normalizedEntries,
        beforeImages: JSON.parse(item.beforeImages || '[]'),
        afterImages: JSON.parse(item.afterImages || '[]'),
      };
    };
    const transformedResult = result
      ? {
          ...result,
          estimatedCost: Number(result.estimatedCost),
          actualCost: Number(result.actualCost),
          items: result.items.map(transformItem),
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        message: 'Open repair slip created successfully',
        data: transformedResult,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Open Repair Slip API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating open repair slip',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inspection/open-repair-slips
 * Get all open repair slips
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const rcfNumber = searchParams.get('rcfNumber');

    // Build filter conditions
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (rcfNumber) {
      where.rcfNumber = {
        contains: rcfNumber,
      };
    }

    // Get all repair slips with filters (include additionalCharge for "Generate Invoice" visibility)
    const repairSlips = await prisma.openRepairSlip.findMany({
      where,
      include: {
        items: true,
        additionalCharge: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data to match frontend expectations; normalize repairActionEntries (single quantity)
    const transformItem = (item: any) => {
      const entries = JSON.parse(item.repairActionEntries || '[]');
      const normalizedEntries = entries.map((e: any) => ({
        ...e,
        issueQuantity: Number(e.issueQuantity ?? e.affectedItems ?? 0),
        affectedItems: Number(e.issueQuantity ?? e.affectedItems ?? 0),
      }));
      return {
        ...item,
        quantityRepair: item.quantityRepair ?? 0,
        quantityWriteOff: item.quantityWriteOff ?? 0,
        writeOffCostPerUnit: Number(item.writeOffCostPerUnit ?? 0),
        writeOffTotalCost: Number(item.writeOffTotalCost ?? 0),
        totalRepairCost: Number(item.totalRepairCost ?? 0),
        costPerUnit: Number(item.costPerUnit),
        totalCost: Number(item.totalCost),
        estimatedCostFromRFQ: Number(item.estimatedCostFromRFQ),
        finalCost: Number(item.finalCost),
        repairActions: JSON.parse(item.repairActions || '[]'),
        repairActionEntries: normalizedEntries,
        beforeImages: JSON.parse(item.beforeImages || '[]'),
        afterImages: JSON.parse(item.afterImages || '[]'),
      };
    };
    const transformedSlips = repairSlips.map((slip) => ({
      ...slip,
      estimatedCost: Number(slip.estimatedCost),
      actualCost: Number(slip.actualCost),
      items: slip.items.map(transformItem),
    }));

    return NextResponse.json(
      {
        success: true,
        data: transformedSlips,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Open Repair Slip API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving open repair slips',
      },
      { status: 500 }
    );
  }
}
