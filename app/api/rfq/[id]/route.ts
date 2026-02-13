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
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/rfq/[id]
 * Get a specific RFQ by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params in Next.js 16
    const { id: rfqId } = await params;

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
    const { id: rfqId } = await params;
    const {
      customerName,
      customerEmail,
      customerPhone,
      projectName,
      projectLocation,
      requestedDate,
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
      include: {
        items: true,
      },
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
      if (status) updateData.status = status;
      if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
      if (notes !== undefined) updateData.notes = notes;

      // If status is changing to rejected, restore reserved quantities once
      if (status === 'rejected' && existingRFQ.status !== 'rejected') {
        const quantities = new Map<string, number>();
        for (const item of existingRFQ.items) {
          if (!item.scaffoldingItemId) continue;
          const qty = Number(item.quantity || 0);
          if (qty > 0) {
            quantities.set(item.scaffoldingItemId, (quantities.get(item.scaffoldingItemId) || 0) + qty);
          }
        }
        if (quantities.size > 0) {
          const itemIds = Array.from(quantities.keys());
          const scaffoldingItems = await (tx.scaffoldingItem as any).findMany({
            where: { id: { in: itemIds } },
            select: { id: true, reservedQuantity: true },
          });
          for (const scaffoldingItem of scaffoldingItems) {
            const addBack = quantities.get(scaffoldingItem.id) || 0;
            const currentReserved = Number(scaffoldingItem.reservedQuantity || 0);
            const newReserved = Math.max(0, currentReserved - addBack);
            await (tx.scaffoldingItem as any).update({
              where: { id: scaffoldingItem.id },
              data: { reservedQuantity: newReserved },
            });
          }
        }
      }

      // Update RFQ header
      await tx.rFQ.update({
        where: { id: rfqId },
        data: updateData,
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.rFQItem.deleteMany({
          where: { rfqId },
        });

        // Create new items
        if (items.length > 0) {
          await tx.rFQItem.createMany({
            data: items.map((item: any) => {
              return {
                rfqId,
                setName: item.setName || 'Set 1',
                requiredDate: new Date(item.requiredDate),
                rentalMonths: item.rentalMonths || 1,
                scaffoldingItemId: item.scaffoldingItemId || '',
                scaffoldingItemName: item.scaffoldingItemName || '',
                quantity: item.quantity || 0,
                unit: item.unit || '',
                unitPrice: item.unitPrice || 0,
                totalPrice: item.totalPrice ?? 0,
                notes: item.notes || '',
              };
            }),
          });
        }
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
    const { id: rfqId } = await params;

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

    // Delete RFQ (sets and items will cascade delete)
    await prisma.rFQ.delete({
      where: { id: rfqId },
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