/**
 * Condition Report Dynamic API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/condition-reports/[id]
 * Purpose: Handle HTTP requests for specific condition report operations
 * 
 * Endpoints:
 * GET /api/inspection/condition-reports/[id] - Get specific condition report
 * PUT /api/inspection/condition-reports/[id] - Update condition report
 * DELETE /api/inspection/condition-reports/[id] - Delete condition report
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/inspection/condition-reports/[id]
 * Get a specific condition report by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await Promise.resolve(params);

    // Validate report ID
    if (!reportId || reportId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Report ID is required',
        },
        { status: 400 }
      );
    }

    // Get condition report with items
    const conditionReport = await prisma.conditionReport.findUnique({
      where: { id: reportId },
      include: {
        items: true,
      },
    });

    if (!conditionReport) {
      return NextResponse.json(
        {
          success: false,
          message: 'Condition report not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: conditionReport,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Condition Report API] GET [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving condition report',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inspection/condition-reports/[id]
 * Update an existing condition report
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await Promise.resolve(params);
    const {
      deliveryOrderNumber,
      customerName,
      returnedBy,
      returnDate,
      inspectionDate,
      inspectedBy,
      status,
      items,
      notes,
    } = await request.json();

    // Validate report ID
    if (!reportId || reportId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Report ID is required',
        },
        { status: 400 }
      );
    }

    // Check if report exists
    const existingReport = await prisma.conditionReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json(
        {
          success: false,
          message: 'Condition report not found',
        },
        { status: 404 }
      );
    }

    // Update with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Calculate totals from items
      let totalItemsInspected = 0;
      let totalGood = 0;
      let totalRepair = 0;
      let totalWriteOff = 0;
      let totalDamaged = 0;
      let totalRepairCost = 0;

      if (items && Array.isArray(items)) {
        items.forEach((item: any) => {
          totalItemsInspected += item.quantity || 0;
          totalGood += item.quantityGood || 0;
          totalRepair += item.quantityRepair || 0;
          totalWriteOff += item.quantityWriteOff || 0;
          totalDamaged += (item.quantityRepair || 0) + (item.quantityWriteOff || 0);
          totalRepairCost += item.estimatedRepairCost || 0;
        });
      }

      // Update condition report
      const updatedReport = await tx.conditionReport.update({
        where: { id: reportId },
        data: {
          deliveryOrderNumber: deliveryOrderNumber || existingReport.deliveryOrderNumber,
          customerName: customerName || existingReport.customerName,
          returnedBy: returnedBy !== undefined ? returnedBy : existingReport.returnedBy,
          returnDate: returnDate || existingReport.returnDate,
          inspectionDate: inspectionDate || existingReport.inspectionDate,
          inspectedBy: inspectedBy || existingReport.inspectedBy,
          status: status || existingReport.status,
          totalItemsInspected,
          totalGood,
          totalRepair,
          totalWriteOff,
          totalDamaged,
          totalRepairCost: parseFloat(totalRepairCost.toString()),
          notes: notes !== undefined ? notes : existingReport.notes,
        },
      });

      // Delete existing items
      await tx.inspectionItem.deleteMany({
        where: { conditionReportId: reportId },
      });

      // Create new items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.inspectionItem.createMany({
          data: items.map((item: any) => ({
            conditionReportId: reportId,
            scaffoldingItemId: item.scaffoldingItemId || '',
            scaffoldingItemName: item.scaffoldingItemName || '',
            quantity: item.quantity || 0,
            quantityGood: item.quantityGood || 0,
            quantityRepair: item.quantityRepair || 0,
            quantityWriteOff: item.quantityWriteOff || 0,
            condition: item.condition || 'good',
            damageDescription: item.damageDescription || '',
            repairRequired: item.repairRequired || false,
            estimatedRepairCost: parseFloat((item.estimatedRepairCost || 0).toString()),
            originalItemPrice: parseFloat((item.originalItemPrice || 0).toString()),
            inspectionChecklist: JSON.stringify(item.inspectionChecklist || {}),
            images: JSON.stringify(item.images || []),
          })),
        });
      }

      return updatedReport;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Condition report updated successfully',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Condition Report API] PUT [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating condition report',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inspection/condition-reports/[id]
 * Delete a condition report
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await Promise.resolve(params);

    // Validate report ID
    if (!reportId || reportId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Report ID is required',
        },
        { status: 400 }
      );
    }

    // Check if report exists
    const existingReport = await prisma.conditionReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json(
        {
          success: false,
          message: 'Condition report not found',
        },
        { status: 404 }
      );
    }

    // Delete with cascade (items and adjustments deleted automatically)
    await prisma.conditionReport.delete({
      where: { id: reportId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Condition report deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Condition Report API] DELETE [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting condition report',
      },
      { status: 500 }
    );
  }
}
