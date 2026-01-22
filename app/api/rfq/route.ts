/**
 * RFQ API Route Module
 * Module: Request for Quotation (RFQ)
 * Path: /api/rfq
 * Purpose: Handle HTTP requests for RFQ operations
 * 
 * Endpoints:
 * POST /api/rfq - Create new RFQ
 * GET /api/rfq - Get all RFQs
 * GET /api/rfq/[id] - Get specific RFQ
 * PUT /api/rfq/[id] - Update RFQ
 * DELETE /api/rfq/[id] - Delete RFQ
 * GET /api/rfq/stats - Get RFQ statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createRFQ,
  getAllRFQs,
  getRFQStats,
  CreateRFQPayload,
} from '@/services/rfq.service';

/**
 * POST /api/rfq
 * Create a new RFQ in the database
 */
export async function POST(request: NextRequest) {
  try {
    const payload: CreateRFQPayload = await request.json();

    // Validate required fields
    if (!payload.customerName || !payload.customerEmail || !payload.projectName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: customerName, customerEmail, projectName',
        },
        { status: 400 }
      );
    }

    const rfq = await createRFQ(payload);

    return NextResponse.json(
      {
        success: true,
        message: 'RFQ created successfully',
        data: rfq,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[RFQ API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create RFQ',
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

    const rfqs = await getAllRFQs(filters);

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
        error: error instanceof Error ? error.message : 'Failed to retrieve RFQs',
      },
      { status: 500 }
    );
  }
}
