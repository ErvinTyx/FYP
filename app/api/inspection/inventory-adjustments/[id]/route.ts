/**
 * Inventory Adjustment Dynamic API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/inventory-adjustments/[id]
 * Purpose: Handle HTTP requests for specific inventory adjustment operations
 * 
 * Endpoints:
 * GET /api/inspection/inventory-adjustments/[id] - Get specific adjustment
 * PUT /api/inspection/inventory-adjustments/[id] - Update adjustment
 * DELETE /api/inspection/inventory-adjustments/[id] - Delete adjustment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/inspection/inventory-adjustments/[id]
 * Get a specific inventory adjustment by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: adjustmentId } = await Promise.resolve(params);

    if (!adjustmentId || adjustmentId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Adjustment ID is required',
        },
        { status: 400 }
      );
    }

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!adjustment) {
      return NextResponse.json(
        {
          success: false,
          message: 'Inventory adjustment not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: adjustment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Inventory Adjustment API] GET by ID error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving inventory adjustment',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inspection/inventory-adjustments/[id]
 * Update a specific inventory adjustment
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: adjustmentId } = await Promise.resolve(params);
    const body = await request.json();

    if (!adjustmentId || adjustmentId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Adjustment ID is required',
        },
        { status: 400 }
      );
    }

    // Check if adjustment exists
    const existingAdjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!existingAdjustment) {
      return NextResponse.json(
        {
          success: false,
          message: 'Inventory adjustment not found',
        },
        { status: 404 }
      );
    }

    const {
      adjustmentType,
      quantity,
      fromStatus,
      toStatus,
      notes,
    } = body;

    // Update adjustment
    const updatedAdjustment = await prisma.inventoryAdjustment.update({
      where: { id: adjustmentId },
      data: {
        adjustmentType: adjustmentType !== undefined ? adjustmentType : existingAdjustment.adjustmentType,
        quantity: quantity !== undefined ? quantity : existingAdjustment.quantity,
        fromStatus: fromStatus !== undefined ? fromStatus : existingAdjustment.fromStatus,
        toStatus: toStatus !== undefined ? toStatus : existingAdjustment.toStatus,
        notes: notes !== undefined ? notes : existingAdjustment.notes,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Inventory adjustment updated successfully',
        data: updatedAdjustment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Inventory Adjustment API] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating inventory adjustment',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inspection/inventory-adjustments/[id]
 * Delete a specific inventory adjustment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: adjustmentId } = await Promise.resolve(params);

    if (!adjustmentId || adjustmentId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Adjustment ID is required',
        },
        { status: 400 }
      );
    }

    // Check if adjustment exists
    const existingAdjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!existingAdjustment) {
      return NextResponse.json(
        {
          success: false,
          message: 'Inventory adjustment not found',
        },
        { status: 404 }
      );
    }

    // Delete adjustment
    await prisma.inventoryAdjustment.delete({
      where: { id: adjustmentId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Inventory adjustment deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Inventory Adjustment API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting inventory adjustment',
      },
      { status: 500 }
    );
  }
}
