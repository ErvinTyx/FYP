/**
 * Open Repair Slip Dynamic API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/open-repair-slips/[id]
 * Purpose: Handle HTTP requests for specific repair slip operations
 * 
 * Endpoints:
 * GET /api/inspection/open-repair-slips/[id] - Get specific repair slip
 * PUT /api/inspection/open-repair-slips/[id] - Update repair slip
 * DELETE /api/inspection/open-repair-slips/[id] - Delete repair slip
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/inspection/open-repair-slips/[id]
 * Get a specific repair slip by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: slipId } = await params;

    if (!slipId || slipId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Repair slip ID is required',
        },
        { status: 400 }
      );
    }

    const repairSlip = await prisma.openRepairSlip.findUnique({
      where: { id: slipId },
      include: {
        items: true,
        additionalCharge: true,
      },
    });

    if (!repairSlip) {
      return NextResponse.json(
        {
          success: false,
          message: 'Repair slip not found',
        },
        { status: 404 }
      );
    }

    // Transform data; normalize repairActionEntries (single quantity: issueQuantity = affectedItems)
    const transformItem = (item: any) => {
      const entries = JSON.parse(item.repairActionEntries || '[]');
      const normalizedEntries = entries.map((e: any) => ({
        ...e,
        issueQuantity: Number(e.issueQuantity ?? e.affectedItems ?? 0),
        affectedItems: Number(e.issueQuantity ?? e.affectedItems ?? 0),
      }));
      return {
        ...item,
        quantityRepair: item.quantityRepair || 0,
        quantityWriteOff: item.quantityWriteOff || 0,
        costPerUnit: Number(item.costPerUnit),
        totalCost: Number(item.totalCost),
        writeOffCostPerUnit: Number(item.writeOffCostPerUnit || 0),
        writeOffTotalCost: Number(item.writeOffTotalCost || 0),
        totalRepairCost: Number(item.totalRepairCost || 0),
        estimatedCostFromRFQ: Number(item.estimatedCostFromRFQ),
        finalCost: Number(item.finalCost),
        repairActions: JSON.parse(item.repairActions || '[]'),
        repairActionEntries: JSON.parse(item.repairActionEntries || '[]'),
        beforeImages: JSON.parse(item.beforeImages || '[]'),
        afterImages: JSON.parse(item.afterImages || '[]'),
      };
    };
    const transformedSlip = {
      ...repairSlip,
      estimatedCost: Number(repairSlip.estimatedCost),
      actualCost: Number(repairSlip.actualCost),
      items: repairSlip.items.map(transformItem),
    };

    return NextResponse.json(
      {
        success: true,
        data: transformedSlip,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Open Repair Slip API] GET by ID error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving repair slip',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inspection/open-repair-slips/[id]
 * Update a specific repair slip
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: slipId } = await params;
    const body = await request.json();

    if (!slipId || slipId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Repair slip ID is required',
        },
        { status: 400 }
      );
    }

    // Check if repair slip exists
    const existingSlip = await prisma.openRepairSlip.findUnique({
      where: { id: slipId },
    });

    if (!existingSlip) {
      return NextResponse.json(
        {
          success: false,
          message: 'Repair slip not found',
        },
        { status: 404 }
      );
    }

    const {
      status,
      priority,
      assignedTo,
      startDate,
      completionDate,
      estimatedCost,
      actualCost,
      repairNotes,
      invoiceNumber,
      damageInvoiceId,
      inventoryLevel,
      items,
    } = body;

    // Update repair slip with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update header
      const updatedSlip = await tx.openRepairSlip.update({
        where: { id: slipId },
        data: {
          status: status !== undefined ? status : existingSlip.status,
          priority: priority !== undefined ? priority : existingSlip.priority,
          assignedTo: assignedTo !== undefined ? assignedTo : existingSlip.assignedTo,
          startDate: startDate !== undefined ? startDate : existingSlip.startDate,
          completionDate: completionDate !== undefined ? completionDate : existingSlip.completionDate,
          estimatedCost: estimatedCost !== undefined ? parseFloat(estimatedCost.toString()) : existingSlip.estimatedCost,
          actualCost: actualCost !== undefined ? parseFloat(actualCost.toString()) : existingSlip.actualCost,
          repairNotes: repairNotes !== undefined ? repairNotes : existingSlip.repairNotes,
          invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : existingSlip.invoiceNumber,
          damageInvoiceId: damageInvoiceId !== undefined ? damageInvoiceId : existingSlip.damageInvoiceId,
          inventoryLevel: inventoryLevel !== undefined ? inventoryLevel : existingSlip.inventoryLevel,
        },
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items and recreate
        await tx.repairItem.deleteMany({
          where: { openRepairSlipId: slipId },
        });

        if (items.length > 0) {
          await tx.repairItem.createMany({
            data: items.map((item: any) => {
              const entries = Array.isArray(item.repairActionEntries) ? item.repairActionEntries : [];
              const normalizedEntries = entries.map((e: any) => ({
                ...e,
                issueQuantity: Number(e.issueQuantity ?? e.affectedItems ?? 0),
                affectedItems: Number(e.issueQuantity ?? e.affectedItems ?? 0),
                totalCost: Number(e.issueQuantity ?? e.affectedItems ?? 0) * Number(e.costPerUnit ?? 0),
              }));
              return {
                openRepairSlipId: slipId,
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
      }

      // Fetch updated slip with items
      return await tx.openRepairSlip.findUnique({
        where: { id: slipId },
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
        message: 'Repair slip updated successfully',
        data: transformedResult,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Open Repair Slip API] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating repair slip',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inspection/open-repair-slips/[id]
 * Delete a specific repair slip
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: slipId } = await params;

    if (!slipId || slipId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Repair slip ID is required',
        },
        { status: 400 }
      );
    }

    // Check if repair slip exists
    const existingSlip = await prisma.openRepairSlip.findUnique({
      where: { id: slipId },
    });

    if (!existingSlip) {
      return NextResponse.json(
        {
          success: false,
          message: 'Repair slip not found',
        },
        { status: 404 }
      );
    }

    // Delete repair slip (items will be cascade deleted)
    await prisma.openRepairSlip.delete({
      where: { id: slipId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Repair slip deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Open Repair Slip API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting repair slip',
      },
      { status: 500 }
    );
  }
}
