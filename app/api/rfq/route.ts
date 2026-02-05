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
import { computeRfqItemDurationAndSubtotal } from '@/lib/term-of-hire';

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
      requiredDate,
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

    // Validate requiredDate >= requestedDate
    const reqDate = requestedDate ? new Date(requestedDate) : new Date();
    const reqByDate = requiredDate ? new Date(requiredDate) : new Date();
    if (reqByDate < reqDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Required date must be on or after the requested date',
        },
        { status: 400 }
      );
    }

    // Create RFQ with transaction
    const result = await prisma.$transaction(async (tx) => {
      const rfqNumber = generateRFQNumber();

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
          requiredDate: reqByDate,
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
            const deliverDate = item.deliverDate ? new Date(item.deliverDate) : null;
            const returnDate = item.returnDate ? new Date(item.returnDate) : null;
            const totalPrice = item.totalPrice ?? 0;
            const { durationDays } = computeRfqItemDurationAndSubtotal(deliverDate, returnDate, totalPrice);
            return {
              rfqId: rfq.id,
              setName: item.setName || 'Set 1',
              deliverDate,
              returnDate,
              durationDays: durationDays ?? undefined,
              scaffoldingItemId: item.scaffoldingItemId || '',
              scaffoldingItemName: item.scaffoldingItemName || '',
              quantity: item.quantity || 0,
              unit: item.unit || '',
              unitPrice: item.unitPrice || 0,
              totalPrice,
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
