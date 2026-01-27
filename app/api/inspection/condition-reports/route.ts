/**
 * Condition Report API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/condition-reports
 * Purpose: Handle HTTP requests for Condition Report (RCF) operations
 * 
 * Endpoints:
 * POST /api/inspection/condition-reports - Create new condition report
 * GET /api/inspection/condition-reports - Get all condition reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Helper function to generate unique RCF number
 */
function generateRCFNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `RCF-${dateStr}-${random}`;
}

/**
 * POST /api/inspection/condition-reports
 * Create a new condition report in the database
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!deliveryOrderNumber || !customerName || !inspectionDate || !inspectedBy) {
      return NextResponse.json(
        {
          success: false,
          message: 'Required fields missing: deliveryOrderNumber, customerName, inspectionDate, inspectedBy',
        },
        { status: 400 }
      );
    }

    // Create condition report with transaction
    const result = await prisma.$transaction(async (tx) => {
      const rcfNumber = generateRCFNumber();

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

      // Create Condition Report header
      const conditionReport = await tx.conditionReport.create({
        data: {
          rcfNumber,
          deliveryOrderNumber,
          customerName,
          returnedBy: returnedBy || '',
          returnDate,
          inspectionDate,
          inspectedBy,
          status: status || 'pending',
          totalItemsInspected,
          totalGood,
          totalRepair,
          totalWriteOff,
          totalDamaged,
          totalRepairCost: parseFloat(totalRepairCost.toString()),
          notes: notes || '',
        },
      });

      // Create inspection items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.inspectionItem.createMany({
          data: items.map((item: any) => ({
            conditionReportId: conditionReport.id,
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

      return conditionReport;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Condition report created successfully',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Condition Report API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating condition report',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inspection/condition-reports
 * Get all condition reports
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerName = searchParams.get('customerName');
    const status = searchParams.get('status');

    // Build filter conditions
    const where: any = {};
    if (customerName) {
      where.customerName = {
        contains: customerName,
        mode: 'insensitive',
      };
    }
    if (status) {
      where.status = status;
    }

    // Get all condition reports with filters
    const conditionReports = await prisma.conditionReport.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: conditionReports,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Condition Report API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving condition reports',
      },
      { status: 500 }
    );
  }
}
