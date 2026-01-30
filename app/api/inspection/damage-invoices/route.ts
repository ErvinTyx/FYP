/**
 * Damage Invoice API Route Module
 * Module: Inspection & Maintenance
 * Path: /api/inspection/damage-invoices
 * Purpose: Handle HTTP requests for Damage Invoice operations
 * 
 * Endpoints:
 * POST /api/inspection/damage-invoices - Create new damage invoice
 * GET /api/inspection/damage-invoices - Get all damage invoices
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Helper function to generate unique invoice number
 */
function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `DI-${dateStr}-${random}`;
}

/**
 * POST /api/inspection/damage-invoices
 * Create a new damage invoice in the database
 */
export async function POST(request: NextRequest) {
  try {
    const {
      orpNumber,
      invoiceDate,
      vendor,
      items,
      subtotal,
      tax,
      total,
      paymentStatus,
      notes,
      createdFrom,
    } = await request.json();

    // Validate required fields
    if (!orpNumber) {
      return NextResponse.json(
        {
          success: false,
          message: 'Required field missing: orpNumber',
        },
        { status: 400 }
      );
    }

    // Create damage invoice with transaction
    const result = await prisma.$transaction(async (tx) => {
      const invoiceNumber = generateInvoiceNumber();

      // Create Damage Invoice header
      const damageInvoice = await tx.damageInvoice.create({
        data: {
          invoiceNumber,
          orpNumber,
          invoiceDate: invoiceDate || new Date().toISOString(),
          vendor: vendor || null,
          subtotal: parseFloat((subtotal || 0).toString()),
          tax: parseFloat((tax || 0).toString()),
          total: parseFloat((total || 0).toString()),
          paymentStatus: paymentStatus || 'pending',
          notes: notes || null,
          createdFrom: createdFrom || 'repair-slip',
        },
      });

      // Create invoice items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.invoiceItem.createMany({
          data: items.map((item: any) => ({
            damageInvoiceId: damageInvoice.id,
            description: item.description || '',
            quantity: item.quantity || 0,
            unitPrice: parseFloat((item.unitPrice || 0).toString()),
            total: parseFloat((item.total || 0).toString()),
          })),
        });
      }

      // Fetch the created invoice with items
      return await tx.damageInvoice.findUnique({
        where: { id: damageInvoice.id },
        include: { items: true },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Damage invoice created successfully',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Damage Invoice API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating damage invoice',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inspection/damage-invoices
 * Get all damage invoices
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentStatus = searchParams.get('paymentStatus');
    const orpNumber = searchParams.get('orpNumber');

    // Build filter conditions
    const where: any = {};
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    if (orpNumber) {
      where.orpNumber = {
        contains: orpNumber,
      };
    }

    // Get all damage invoices with filters
    const invoices = await prisma.damageInvoice.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data to match frontend expectations
    const transformedInvoices = invoices.map((invoice: any) => ({
      ...invoice,
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      items: invoice.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
    }));

    return NextResponse.json(
      {
        success: true,
        data: transformedInvoices,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Damage Invoice API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving damage invoices',
      },
      { status: 500 }
    );
  }
}
