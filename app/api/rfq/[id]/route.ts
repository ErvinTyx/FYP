/**
 * RFQ Dynamic API Route Module
 * Module: Request for Quotation (RFQ)
 * Path: /api/rfq/[id]
 * Purpose: Handle HTTP requests for specific RFQ operations
 * 
 * Endpoints:
 * GET /api/rfq/[id] - Get specific RFQ
 * PUT /api/rfq/[id] - Update RFQ
 * DELETE /api/rfq/[id] - Delete RFQ
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/rfq/[id]
 * Get a specific RFQ by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 16
    const { id: rfqId } = await Promise.resolve(params);

    // Validate RFQ ID
    if (!rfqId || rfqId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'RFQ ID is required',
        },
        { status: 400 }
      );
    }

    // Check if RFQ exists
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        items: true,
      },
    });

    if (!rfq) {
      return NextResponse.json(
        {
          success: false,
          message: 'RFQ not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: rfq,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RFQ API] GET [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving RFQ',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rfq/[id]
 * Update an existing RFQ
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 16
    const { id: rfqId } = await Promise.resolve(params);
    const {
      customerName,
      customerEmail,
      customerPhone,
      projectName,
      projectLocation,
      requestedDate,
      requiredDate,
      status,
      totalAmount,
      notes,
      items,
    } = await request.json();

    // Validate RFQ ID
    if (!rfqId || rfqId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'RFQ ID is required',
        },
        { status: 400 }
      );
    }

    // Check if RFQ exists
    const existingRFQ = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      select: { id: true },
    });

    if (!existingRFQ) {
      return NextResponse.json(
        {
          success: false,
          message: 'RFQ not found',
        },
        { status: 404 }
      );
    }

    // Update RFQ with transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {};

      if (customerName) updateData.customerName = customerName;
      if (customerEmail) updateData.customerEmail = customerEmail;
      if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
      if (projectName) updateData.projectName = projectName;
      if (projectLocation !== undefined) updateData.projectLocation = projectLocation;
      if (requestedDate) updateData.requestedDate = new Date(requestedDate);
      if (requiredDate) updateData.requiredDate = new Date(requiredDate);
      if (status) updateData.status = status;
      if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
      if (notes !== undefined) updateData.notes = notes;

      // Update RFQ header
      await tx.rFQ.update({
        where: { id: rfqId },
        data: updateData,
      });

      // Update items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        // Delete existing items
        await tx.rFQItem.deleteMany({
          where: { rfqId },
        });

        // Create new items
        await tx.rFQItem.createMany({
          data: items.map((item: any) => ({
            rfqId,
            scaffoldingItemId: item.scaffoldingItemId || '',
            scaffoldingItemName: item.scaffoldingItemName || '',
            quantity: item.quantity || 0,
            unit: item.unit || '',
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            notes: item.notes || '',
          })),
        });
      }

      // Return updated RFQ with items
      return tx.rFQ.findUnique({
        where: { id: rfqId },
        include: {
          items: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: 'RFQ updated successfully',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RFQ API] PUT [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating RFQ',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rfq/[id]
 * Delete an RFQ and its items
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 16
    const { id: rfqId } = await Promise.resolve(params);

    // Validate RFQ ID
    if (!rfqId || rfqId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'RFQ ID is required',
        },
        { status: 400 }
      );
    }

    // Check if RFQ exists
    const existingRFQ = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      select: { id: true },
    });

    if (!existingRFQ) {
      return NextResponse.json(
        {
          success: false,
          message: 'RFQ not found',
        },
        { status: 404 }
      );
    }

    // Delete RFQ and items with transaction
    await prisma.$transaction(async (tx) => {
      // Delete associated items first
      await tx.rFQItem.deleteMany({
        where: { rfqId },
      });

      // Delete RFQ
      await tx.rFQ.delete({
        where: { id: rfqId },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: 'RFQ deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RFQ API] DELETE [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting RFQ',
      },
      { status: 500 }
    );
  }
}