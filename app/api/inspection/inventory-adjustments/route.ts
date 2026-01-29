/**
 * Inventory Adjustment API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/inventory-adjustments
 * Purpose: Handle HTTP requests for Inventory Adjustment operations
 * 
 * Endpoints:
 * POST /api/inspection/inventory-adjustments - Create new inventory adjustment
 * GET /api/inspection/inventory-adjustments - Get all inventory adjustments
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/inspection/inventory-adjustments
 * Create a new inventory adjustment in the database
 */
export async function POST(request: NextRequest) {
  try {
    const {
      adjustmentType,
      conditionReportId,
      repairSlipId,
      scaffoldingItemId,
      scaffoldingItemName,
      quantity,
      fromStatus,
      toStatus,
      referenceId,
      referenceType,
      adjustedBy,
      adjustedAt,
      notes,
    } = await request.json();

    // Validate required fields
    if (!adjustmentType || !scaffoldingItemId || !scaffoldingItemName || !referenceId || !referenceType || !adjustedBy) {
      return NextResponse.json(
        {
          success: false,
          message: 'Required fields missing: adjustmentType, scaffoldingItemId, scaffoldingItemName, referenceId, referenceType, adjustedBy',
        },
        { status: 400 }
      );
    }

    // Create inventory adjustment
    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        adjustmentType,
        conditionReportId: conditionReportId || null,
        repairSlipId: repairSlipId || null,
        scaffoldingItemId,
        scaffoldingItemName,
        quantity: quantity || 0,
        fromStatus: fromStatus || '',
        toStatus: toStatus || '',
        referenceId,
        referenceType,
        adjustedBy,
        adjustedAt: adjustedAt || new Date().toISOString(),
        notes: notes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Inventory adjustment created successfully',
        data: adjustment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Inventory Adjustment API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating inventory adjustment',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inspection/inventory-adjustments
 * Get all inventory adjustments
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adjustmentType = searchParams.get('adjustmentType');
    const referenceType = searchParams.get('referenceType');
    const referenceId = searchParams.get('referenceId');

    // Build filter conditions
    const where: any = {};
    if (adjustmentType) {
      where.adjustmentType = adjustmentType;
    }
    if (referenceType) {
      where.referenceType = referenceType;
    }
    if (referenceId) {
      where.referenceId = {
        contains: referenceId,
      };
    }

    // Get all inventory adjustments with filters
    const adjustments = await prisma.inventoryAdjustment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: adjustments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Inventory Adjustment API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving inventory adjustments',
      },
      { status: 500 }
    );
  }
}
