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
 * Supports linking to a ReturnRequest via returnRequestId for auto-creation from return workflow
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
      returnRequestId, // Optional: Link to return request for auto-created reports
      rcfNumber: providedRcfNumber, // Optional: Use provided RCF number from return workflow
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

    // Check if a condition report already exists for this return request (prevent duplicates)
    if (returnRequestId) {
      const existingReport = await prisma.conditionReport.findUnique({
        where: { returnRequestId },
      });
      
      if (existingReport) {
        return NextResponse.json(
          {
            success: false,
            message: 'A condition report already exists for this return request',
            existingReportId: existingReport.id,
            existingRcfNumber: existingReport.rcfNumber,
          },
          { status: 409 } // Conflict
        );
      }
    }

    // Create condition report with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Use provided RCF number or generate new one
      const rcfNumber = providedRcfNumber || generateRCFNumber();

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

      // Create Condition Report header with optional return request link
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
          returnRequestId: returnRequestId || null, // Link to return request if provided
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
        
        // Create inventory adjustment records for write-off items (log only)
        const writeOffItems = items.filter((item: any) => (item.quantityWriteOff || 0) > 0);
        if (writeOffItems.length > 0) {
          await tx.inventoryAdjustment.createMany({
            data: writeOffItems.map((item: any) => ({
              adjustmentType: 'write-off-pending',
              conditionReportId: conditionReport.id,
              scaffoldingItemId: item.scaffoldingItemId || '',
              scaffoldingItemName: item.scaffoldingItemName || '',
              quantity: item.quantityWriteOff || 0,
              fromStatus: 'returned',
              toStatus: 'written-off',
              referenceId: rcfNumber,
              referenceType: 'condition-report',
              adjustedBy: inspectedBy,
              adjustedAt: new Date().toISOString().split('T')[0],
              notes: `Write-off from inspection: ${item.damageDescription || 'Beyond repair - requires replacement'}`,
            })),
          });
        }
      }

      // Fetch the complete report with items and return request info
      const completeReport = await tx.conditionReport.findUnique({
        where: { id: conditionReport.id },
        include: { 
          items: true,
          returnRequest: {
            select: {
              id: true,
              requestId: true,
              customerName: true,
              agreementNo: true,
              setName: true,
              status: true,
            },
          },
        },
      });

      return completeReport;
    });

    // Transform items to parse JSON fields
    const transformedResult = {
      ...result,
      items: result?.items?.map((item: any) => ({
        ...item,
        inspectionChecklist: typeof item.inspectionChecklist === 'string' 
          ? JSON.parse(item.inspectionChecklist) 
          : item.inspectionChecklist,
        images: typeof item.images === 'string' 
          ? JSON.parse(item.images) 
          : item.images,
      })) || [],
    };

    return NextResponse.json(
      {
        success: true,
        message: returnRequestId 
          ? 'Condition report created from return request' 
          : 'Condition report created successfully',
        data: transformedResult,
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
 * Supports filters:
 * - customerName: Filter by customer name
 * - status: Filter by status
 * - fromReturn: Filter reports created from returns (true/false)
 * - returnRequestId: Get report for specific return request
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerName = searchParams.get('customerName');
    const status = searchParams.get('status');
    const fromReturn = searchParams.get('fromReturn');
    const returnRequestId = searchParams.get('returnRequestId');

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
    
    // Filter by return request link
    if (fromReturn === 'true') {
      where.returnRequestId = { not: null };
    } else if (fromReturn === 'false') {
      where.returnRequestId = null;
    }
    
    // Get specific report for a return request
    if (returnRequestId) {
      where.returnRequestId = returnRequestId;
    }

    // Get all condition reports with filters and return request info
    const conditionReports = await prisma.conditionReport.findMany({
      where,
      include: {
        items: true,
        returnRequest: {
          select: {
            id: true,
            requestId: true,
            customerName: true,
            agreementNo: true,
            setName: true,
            status: true,
            returnType: true,
            collectionMethod: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform items to parse JSON fields
    const transformedReports = conditionReports.map(report => ({
      ...report,
      // Add convenience flag for UI
      isFromReturn: !!report.returnRequestId,
      items: report.items.map((item: any) => ({
        ...item,
        inspectionChecklist: typeof item.inspectionChecklist === 'string' 
          ? JSON.parse(item.inspectionChecklist) 
          : item.inspectionChecklist,
        images: typeof item.images === 'string' 
          ? JSON.parse(item.images) 
          : item.images,
      })),
    }));

    return NextResponse.json(
      {
        success: true,
        data: transformedReports,
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
