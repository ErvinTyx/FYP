/**
 * RFQ API Route Module
 * Module: Request for Quotation (RFQ)
 * Path: /api/rfq
 * Purpose: Handle HTTP requests for RFQ operations
 * 
 * Endpoints:
 * POST /api/rfq - Create new RFQ
 * GET /api/rfq - Get all RFQs
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Helper function to generate unique RFQ number
 */
function generateRFQNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `RFQ-${dateStr}-${random}`;
}

/**
 * POST /api/rfq
 * Create a new RFQ in the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      createdBy,
      items,
    } = body;

    // Debug logging
    console.log('[RFQ API] POST body:', JSON.stringify(body, null, 2));
    console.log('[RFQ API] Items received:', items?.length || 0, 'items');

    // Validate required fields
    if (!customerName || !customerEmail || !projectName || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          message: 'Required fields missing: customerName, customerEmail, projectName, createdBy',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate requestedDate (header only)
    const reqDate = requestedDate ? new Date(requestedDate) : new Date();
    if (Number.isNaN(reqDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid requested date',
        },
        { status: 400 }
      );
    }

    // Validate item requiredDate >= requestedDate
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.requiredDate) {
          return NextResponse.json(
            {
              success: false,
              message: 'Each item must include requiredDate',
            },
            { status: 400 }
          );
        }
        const itemRequiredDate = new Date(item.requiredDate);
        if (Number.isNaN(itemRequiredDate.getTime())) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid item requiredDate',
            },
            { status: 400 }
          );
        }
        if (itemRequiredDate < reqDate) {
          return NextResponse.json(
            {
              success: false,
              message: 'Item requiredDate must be on or after requested date',
            },
            { status: 400 }
          );
        }
      }
    }

    // Create RFQ with transaction
    const result = await prisma.$transaction(async (tx) => {
      const rfqNumber = generateRFQNumber();

      // Aggregate requested quantities by scaffolding item
      const requestedQuantities = new Map<string, number>();
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const itemId = item.scaffoldingItemId;
          const qty = Number(item.quantity || 0);
          if (!itemId) {
            throw new Error('RFQ_STOCK: Missing scaffolding item');
          }
          if (!Number.isFinite(qty) || qty <= 0) {
            throw new Error('RFQ_STOCK: Invalid quantity');
          }
          requestedQuantities.set(itemId, (requestedQuantities.get(itemId) || 0) + qty);
        }
      }

      if (requestedQuantities.size > 0) {
        const itemIds = Array.from(requestedQuantities.keys());
        const scaffoldingItems = await (tx.scaffoldingItem as any).findMany({
          where: { id: { in: itemIds } },
          select: { id: true, available: true, reservedQuantity: true },
        });
        if (scaffoldingItems.length !== itemIds.length) {
          throw new Error('RFQ_STOCK: Scaffolding item not found');
        }

        for (const scaffoldingItem of scaffoldingItems) {
          const requestedQty = requestedQuantities.get(scaffoldingItem.id) || 0;
          const currentAvailable = Number(scaffoldingItem.available || 0);
          const currentReserved = Number(scaffoldingItem.reservedQuantity || 0);
          const availableForRfq = currentAvailable - currentReserved;
          if (requestedQty > availableForRfq) {
            throw new Error('RFQ_STOCK: Insufficient stock');
          }
          const newReserved = currentReserved + requestedQty;
          await (tx.scaffoldingItem as any).update({
            where: { id: scaffoldingItem.id },
            data: { reservedQuantity: newReserved },
          });
        }
      }

      // Create RFQ header
      const rfq = await tx.rFQ.create({
        data: {
          rfqNumber,
          customerName,
          customerEmail,
          customerPhone: customerPhone || '',
          projectName,
          projectLocation: projectLocation || '',
          requestedDate: reqDate,
          status: status || 'draft',
          totalAmount: totalAmount || 0,
          notes: notes || '',
          createdBy,
        },
      });

      // Create RFQ items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.rFQItem.createMany({
          data: items.map((item: any) => {
            return {
              rfqId: rfq.id,
              setName: item.setName || 'Set 1',
              requiredDate: new Date(item.requiredDate),
              rentalMonths: item.rentalMonths || 1,
              scaffoldingItemId: item.scaffoldingItemId || '',
              scaffoldingItemName: item.scaffoldingItemName || '',
              quantity: item.quantity || 0,
              unit: item.unit || '',
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
              notes: item.notes || '',
            };
          }),
        });
      }

      // Return complete RFQ with items
      return tx.rFQ.findUnique({
        where: { id: rfq.id },
        include: {
          items: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: 'RFQ created successfully',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[RFQ API] POST error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while creating RFQ';
    if (message.startsWith('RFQ_STOCK:')) {
      return NextResponse.json(
        {
          success: false,
          message: message.replace('RFQ_STOCK: ', ''),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating RFQ',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rfq
 * Get all RFQs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const customerEmail = searchParams.get('customerEmail');
    const createdBy = searchParams.get('createdBy');

    const filters: any = {};
    if (status) filters.status = status;
    if (customerEmail) filters.customerEmail = customerEmail;
    if (createdBy) filters.createdBy = createdBy;

    const rfqs = await prisma.rFQ.findMany({
      where: filters,
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
        data: rfqs,
        count: rfqs.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RFQ API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving RFQs',
      },
      { status: 500 }
    );
  }
}
