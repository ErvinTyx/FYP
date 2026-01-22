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
import { getRFQById, updateRFQ, deleteRFQ, UpdateRFQPayload } from '@/services/rfq.service';

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
    const rfqId = params.id;

    if (!rfqId) {
      return NextResponse.json(
        {
          success: false,
          error: 'RFQ ID is required',
        },
        { status: 400 }
      );
    }

    const rfq = await getRFQById(rfqId);

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
        error: error instanceof Error ? error.message : 'Failed to retrieve RFQ',
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
    const rfqId = params.id;
    const payload = await request.json();

    if (!rfqId) {
      return NextResponse.json(
        {
          success: false,
          error: 'RFQ ID is required',
        },
        { status: 400 }
      );
    }

    const updatePayload: UpdateRFQPayload = {
      rfqId,
      ...payload,
    };

    const updatedRFQ = await updateRFQ(updatePayload);

    return NextResponse.json(
      {
        success: true,
        message: 'RFQ updated successfully',
        data: updatedRFQ,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RFQ API] PUT [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update RFQ',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rfq/[id]
 * Delete an RFQ
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const rfqId = params.id;

    if (!rfqId) {
      return NextResponse.json(
        {
          success: false,
          error: 'RFQ ID is required',
        },
        { status: 400 }
      );
    }

    const success = await deleteRFQ(rfqId);

    if (success) {
      return NextResponse.json(
        {
          success: true,
          message: 'RFQ deleted successfully',
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete RFQ',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[RFQ API] DELETE [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete RFQ',
      },
      { status: 500 }
    );
  }
}
