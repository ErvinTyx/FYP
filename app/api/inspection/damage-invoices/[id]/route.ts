/**
 * Damage Invoice Dynamic API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/damage-invoices/[id]
 * Purpose: Handle HTTP requests for specific damage invoice operations
 * 
 * Endpoints:
 * GET /api/inspection/damage-invoices/[id] - Get specific invoice
 * PUT /api/inspection/damage-invoices/[id] - Update invoice
 * DELETE /api/inspection/damage-invoices/[id] - Delete invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/inspection/damage-invoices/[id]
 * Get a specific damage invoice by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: invoiceId } = await params;

    if (!invoiceId || invoiceId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invoice ID is required',
        },
        { status: 400 }
      );
    }

    const invoice = await prisma.damageInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          message: 'Damage invoice not found',
        },
        { status: 404 }
      );
    }

    // Transform data
    const transformedInvoice = {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      items: invoice.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
    };

    return NextResponse.json(
      {
        success: true,
        data: transformedInvoice,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Damage Invoice API] GET by ID error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving damage invoice',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inspection/damage-invoices/[id]
 * Update a specific damage invoice
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: invoiceId } = await params;
    const body = await request.json();

    if (!invoiceId || invoiceId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invoice ID is required',
        },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await prisma.damageInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          message: 'Damage invoice not found',
        },
        { status: 404 }
      );
    }

    const {
      vendor,
      paymentStatus,
      paidDate,
      notes,
      items,
    } = body;

    // Update invoice with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update header
      const updatedInvoice = await tx.damageInvoice.update({
        where: { id: invoiceId },
        data: {
          vendor: vendor !== undefined ? vendor : existingInvoice.vendor,
          paymentStatus: paymentStatus !== undefined ? paymentStatus : existingInvoice.paymentStatus,
          paidDate: paidDate !== undefined ? paidDate : existingInvoice.paidDate,
          notes: notes !== undefined ? notes : existingInvoice.notes,
        },
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items and recreate
        await tx.invoiceItem.deleteMany({
          where: { damageInvoiceId: invoiceId },
        });

        if (items.length > 0) {
          await tx.invoiceItem.createMany({
            data: items.map((item: any) => ({
              damageInvoiceId: invoiceId,
              description: item.description || '',
              quantity: item.quantity || 0,
              unitPrice: parseFloat((item.unitPrice || 0).toString()),
              total: parseFloat((item.total || 0).toString()),
            })),
          });
        }
      }

      // Fetch updated invoice with items
      return await tx.damageInvoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Damage invoice updated successfully',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Damage Invoice API] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating damage invoice',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inspection/damage-invoices/[id]
 * Delete a specific damage invoice
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: invoiceId } = await params;

    if (!invoiceId || invoiceId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invoice ID is required',
        },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await prisma.damageInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          message: 'Damage invoice not found',
        },
        { status: 404 }
      );
    }

    // Delete invoice (items will be cascade deleted)
    await prisma.damageInvoice.delete({
      where: { id: invoiceId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Damage invoice deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Damage Invoice API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting damage invoice',
      },
      { status: 500 }
    );
  }
}
