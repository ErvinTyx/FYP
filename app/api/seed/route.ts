import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Only admin/super_user can seed data
const ALLOWED_ROLES = ['super_user', 'admin'];

/**
 * POST /api/seed
 * Seed the database with sample delivery and return requests
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin can seed data' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'clear') {
      // Clear all delivery and return requests
      await prisma.deliverySetItem.deleteMany({});
      await prisma.deliverySet.deleteMany({});
      await prisma.deliveryRequest.deleteMany({});
      await prisma.returnRequestItem.deleteMany({});
      await prisma.returnRequest.deleteMany({});

      return NextResponse.json({
        success: true,
        message: 'All delivery and return requests cleared',
      });
    }

    if (action === 'seed') {
      // Clear existing data first
      await prisma.deliverySetItem.deleteMany({});
      await prisma.deliverySet.deleteMany({});
      await prisma.deliveryRequest.deleteMany({});
      await prisma.returnRequestItem.deleteMany({});
      await prisma.returnRequest.deleteMany({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).rFQItem.deleteMany({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).rFQ.deleteMany({});

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

      // Create sample RFQs (Quotations) first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rfq1 = await (prisma as any).rFQ.create({
        data: {
          rfqNumber: `RFQ-${dateStr}-00001`,
          customerName: 'ABC Construction Sdn Bhd',
          customerEmail: 'abc@construction.com',
          customerPhone: '+60123456789',
          projectName: 'KL Sentral Tower Project',
          projectLocation: 'No. 123, Jalan Raja Laut, 50350 Kuala Lumpur',
          requestedDate: new Date(),
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'approved',
          totalAmount: 25000,
          notes: 'High-rise scaffolding requirement',
          createdBy: 'system',
          items: {
            create: [
              { scaffoldingItemId: 'SC-001', scaffoldingItemName: 'CRAB BASIC STANDARD C60', quantity: 100, unit: 'pcs', unitPrice: 0.59, totalPrice: 59 },
              { scaffoldingItemId: 'SC-006', scaffoldingItemName: 'CRAB STANDARD 2.00M C60', quantity: 200, unit: 'pcs', unitPrice: 2.59, totalPrice: 518 },
              { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantity: 50, unit: 'pcs', unitPrice: 1.30, totalPrice: 65 },
              { scaffoldingItemId: 'SC-015', scaffoldingItemName: 'CRAB U-HEAD C60 / 600', quantity: 80, unit: 'pcs', unitPrice: 2.07, totalPrice: 165.6 },
            ],
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rfq2 = await (prisma as any).rFQ.create({
        data: {
          rfqNumber: `RFQ-${dateStr}-00002`,
          customerName: 'XYZ Development Sdn Bhd',
          customerEmail: 'xyz@development.com',
          customerPhone: '+60198765432',
          projectName: 'Ampang Tower Construction',
          projectLocation: 'Lot 45, Jalan Ampang, 50450 Kuala Lumpur',
          requestedDate: new Date(),
          requiredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'approved',
          totalAmount: 15000,
          notes: 'Commercial building scaffolding',
          createdBy: 'system',
          items: {
            create: [
              { scaffoldingItemId: 'SC-011', scaffoldingItemName: 'CRAB STANDARD 0.75M C60', quantity: 200, unit: 'pcs', unitPrice: 1.21, totalPrice: 242 },
              { scaffoldingItemId: 'SC-004', scaffoldingItemName: 'CRAB LEDGER 1.50M', quantity: 300, unit: 'pcs', unitPrice: 1.12, totalPrice: 336 },
              { scaffoldingItemId: 'SC-003', scaffoldingItemName: 'CRAB STANDARD 1.00M C60', quantity: 150, unit: 'pcs', unitPrice: 1.46, totalPrice: 219 },
            ],
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rfq3 = await (prisma as any).rFQ.create({
        data: {
          rfqNumber: `RFQ-${dateStr}-00003`,
          customerName: 'Metro Builders Sdn Bhd',
          customerEmail: 'metro@builders.com',
          customerPhone: '+60127654321',
          projectName: 'Sentul Mixed Development',
          projectLocation: 'No. 88, Jalan Sentul, 51100 Kuala Lumpur',
          requestedDate: new Date(),
          requiredDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: 'approved',
          totalAmount: 30000,
          notes: 'Multi-phase construction project',
          createdBy: 'system',
          items: {
            create: [
              { scaffoldingItemId: 'SC-001', scaffoldingItemName: 'CRAB BASIC STANDARD C60', quantity: 80, unit: 'pcs', unitPrice: 0.59, totalPrice: 47.2 },
              { scaffoldingItemId: 'SC-012', scaffoldingItemName: 'CRAB TRIANGLE 1.5M', quantity: 100, unit: 'pcs', unitPrice: 2.78, totalPrice: 278 },
              { scaffoldingItemId: 'SC-003', scaffoldingItemName: 'CRAB STANDARD 1.00M C60', quantity: 120, unit: 'pcs', unitPrice: 1.46, totalPrice: 175.2 },
              { scaffoldingItemId: 'SC-005', scaffoldingItemName: 'CRAB BRACE H2 X L1.50M', quantity: 200, unit: 'pcs', unitPrice: 1.50, totalPrice: 300 },
              { scaffoldingItemId: 'SC-014', scaffoldingItemName: 'CRAB JACK BASE C60 / 600', quantity: 80, unit: 'pcs', unitPrice: 1.30, totalPrice: 104 },
            ],
          },
        },
      });

      // Sample Delivery Requests linked to RFQs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deliveryRequests: any[] = [
        {
          requestId: `DEL-${rfq1.rfqNumber}-${dateStr}`,
          customerName: rfq1.customerName,
          agreementNo: rfq1.rfqNumber,
          customerPhone: rfq1.customerPhone,
          customerEmail: rfq1.customerEmail,
          deliveryAddress: rfq1.projectLocation,
          deliveryType: 'delivery',
          totalSets: 2,
          deliveredSets: 0,
          rfqId: rfq1.id,
          sets: {
            create: [
              {
                setName: 'Set A - Foundation Phase',
                scheduledPeriod: '1 Jan 2026 - 31 Mar 2026',
                status: 'Pending',
                items: {
                  create: [
                    { name: 'CRAB BASIC STANDARD C60', quantity: 100, scaffoldingItemId: 'SC-001' },
                    { name: 'CRAB STANDARD 2.00M C60', quantity: 200, scaffoldingItemId: 'SC-006' },
                    { name: 'CRAB JACK BASE C60 / 600', quantity: 50, scaffoldingItemId: 'SC-014' },
                  ],
                },
              },
              {
                setName: 'Set B - Main Structure',
                scheduledPeriod: '1 Apr 2026 - 30 Jun 2026',
                status: 'Pending',
                items: {
                  create: [
                    { name: 'CRAB U-HEAD C60 / 600', quantity: 80, scaffoldingItemId: 'SC-015' },
                  ],
                },
              },
            ],
          },
        },
        {
          requestId: `DEL-${rfq2.rfqNumber}-${dateStr}`,
          customerName: rfq2.customerName,
          agreementNo: rfq2.rfqNumber,
          customerPhone: rfq2.customerPhone,
          customerEmail: rfq2.customerEmail,
          deliveryAddress: rfq2.projectLocation,
          deliveryType: 'pickup',
          totalSets: 1,
          deliveredSets: 0,
          pickupTime: '10:00 AM',
          rfqId: rfq2.id,
          sets: {
            create: [
              {
                setName: 'Set A - Tower Construction',
                scheduledPeriod: '15 Jan 2026 - 15 Apr 2026',
                status: 'Quoted',
                quotedAmount: 15000,
                deliveryFee: 500,
                items: {
                  create: [
                    { name: 'CRAB STANDARD 0.75M C60', quantity: 200, scaffoldingItemId: 'SC-011' },
                    { name: 'CRAB LEDGER 1.50M', quantity: 300, scaffoldingItemId: 'SC-004' },
                    { name: 'CRAB STANDARD 1.00M C60', quantity: 150, scaffoldingItemId: 'SC-003' },
                  ],
                },
              },
            ],
          },
        },
        {
          requestId: `DEL-${rfq3.rfqNumber}-${dateStr}`,
          customerName: rfq3.customerName,
          agreementNo: rfq3.rfqNumber,
          customerPhone: rfq3.customerPhone,
          customerEmail: rfq3.customerEmail,
          deliveryAddress: rfq3.projectLocation,
          deliveryType: 'delivery',
          totalSets: 3,
          deliveredSets: 1,
          rfqId: rfq3.id,
          sets: {
            create: [
              {
                setName: 'Set A - Phase 1',
                scheduledPeriod: '1 Dec 2025 - 28 Feb 2026',
                status: 'Customer Confirmed',
                quotedAmount: 12000,
                deliveryFee: 450,
                packingListIssued: true,
                driverAcknowledged: true,
                customerAcknowledged: true,
                items: {
                  create: [
                    { name: 'CRAB BASIC STANDARD C60', quantity: 80, scaffoldingItemId: 'SC-001' },
                    { name: 'CRAB TRIANGLE 1.5M', quantity: 100, scaffoldingItemId: 'SC-012' },
                  ],
                },
              },
              {
                setName: 'Set B - Phase 2',
                scheduledPeriod: '1 Mar 2026 - 31 May 2026',
                status: 'Confirmed',
                quotedAmount: 18000,
                deliveryFee: 600,
                items: {
                  create: [
                    { name: 'CRAB STANDARD 1.00M C60', quantity: 120, scaffoldingItemId: 'SC-003' },
                    { name: 'CRAB BRACE H2 X L1.50M', quantity: 200, scaffoldingItemId: 'SC-005' },
                    { name: 'CRAB JACK BASE C60 / 600', quantity: 80, scaffoldingItemId: 'SC-014' },
                  ],
                },
              },
              {
                setName: 'Set C - Phase 3',
                scheduledPeriod: '1 Jun 2026 - 31 Aug 2026',
                status: 'Pending',
                items: {
                  create: [
                    { name: 'CRAB BASIC STANDARD C60', quantity: 50, scaffoldingItemId: 'SC-001' },
                  ],
                },
              },
            ],
          },
        },
      ];

      // Create delivery requests
      for (const req of deliveryRequests) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.deliveryRequest.create as any)({ data: req });
      }

      // Sample Return Requests (linked to the same RFQs/customers)
      const returnRequests = [
        {
          requestId: `RET-${rfq1.rfqNumber}-${dateStr}-200001`,
          customerName: rfq1.customerName,
          agreementNo: rfq1.rfqNumber,
          setName: 'Set A - Foundation Phase',
          status: 'Agreed',
          reason: 'Project phase completed - returning foundation scaffolding',
          pickupAddress: rfq1.projectLocation,
          customerPhone: rfq1.customerPhone,
          customerEmail: rfq1.customerEmail,
          returnType: 'full',
          collectionMethod: 'transport',
          items: {
            create: [
              { name: 'CRAB BASIC STANDARD C60', quantity: 100, quantityReturned: 100, itemStatus: 'Pending' },
              { name: 'CRAB STANDARD 2.00M C60', quantity: 200, quantityReturned: 200, itemStatus: 'Pending' },
              { name: 'CRAB JACK BASE C60 / 600', quantity: 50, quantityReturned: 50, itemStatus: 'Pending' },
            ],
          },
        },
        {
          requestId: `RET-${rfq2.rfqNumber}-${dateStr}-200002`,
          customerName: rfq2.customerName,
          agreementNo: rfq2.rfqNumber,
          setName: 'Set A - Tower Section (Partial)',
          status: 'Quoted',
          reason: 'Excess equipment not needed for current phase',
          pickupAddress: rfq2.projectLocation,
          customerPhone: rfq2.customerPhone,
          customerEmail: rfq2.customerEmail,
          pickupFee: 350,
          returnType: 'partial',
          collectionMethod: 'transport',
          items: {
            create: [
              { name: 'CRAB STANDARD 0.75M C60', quantity: 50, quantityReturned: 50, itemStatus: 'Pending' },
              { name: 'CRAB LEDGER 1.50M', quantity: 80, quantityReturned: 80, itemStatus: 'Pending' },
            ],
          },
        },
        {
          requestId: `RET-${rfq3.rfqNumber}-${dateStr}-200003`,
          customerName: rfq3.customerName,
          agreementNo: rfq3.rfqNumber,
          setName: 'Set A - Phase 1',
          status: 'Scheduled',
          reason: 'Phase 1 construction completed',
          pickupAddress: rfq3.projectLocation,
          customerPhone: rfq3.customerPhone,
          customerEmail: rfq3.customerEmail,
          pickupFee: 400,
          returnType: 'full',
          collectionMethod: 'transport',
          pickupDate: new Date('2026-02-05').toISOString(),
          pickupTimeSlot: '09:00 - 12:00',
          pickupDriver: 'Ahmad bin Ali',
          driverContact: '+60191234567',
          items: {
            create: [
              { name: 'CRAB BASIC STANDARD C60', quantity: 80, quantityReturned: 80, itemStatus: 'Pending' },
              { name: 'CRAB TRIANGLE 1.5M', quantity: 100, quantityReturned: 100, itemStatus: 'Pending' },
            ],
          },
        },
        {
          requestId: `RET-${dateStr}-200004`,
          customerName: 'Premium Projects Sdn Bhd',
          agreementNo: 'RFQ-20251220-00004',
          setName: 'Set A - Main Structure',
          status: 'Received',
          reason: 'Project phase ended - all equipment returned',
          pickupAddress: 'No. 55, Jalan Bukit Bintang, 55100 Kuala Lumpur',
          customerPhone: '+60163456789',
          customerEmail: 'premium@projects.com',
          pickupFee: 500,
          returnType: 'full',
          collectionMethod: 'transport',
          pickupDate: new Date('2026-01-25').toISOString(),
          pickupTimeSlot: '14:00 - 17:00',
          pickupDriver: 'Muthu a/l Samy',
          driverContact: '+60179876543',
          grnNumber: 'GRN-2026-0001',
          items: {
            create: [
              { name: 'CRAB STANDARD 1.00M C60', quantity: 60, quantityReturned: 58, itemStatus: 'Good', notes: '2 units damaged' },
              { name: 'CRAB BRACE H2 X L1.50M', quantity: 120, quantityReturned: 120, itemStatus: 'Good' },
              { name: 'CRAB TRIANGLE 1.5M', quantity: 40, quantityReturned: 38, itemStatus: 'Damaged', notes: 'Surface damage' },
            ],
          },
        },
        {
          requestId: `RET-${dateStr}-200005`,
          customerName: 'Skyline Developers Sdn Bhd',
          agreementNo: 'RFQ-20260105-00005',
          setName: 'Set B - Extension',
          status: 'Requested',
          reason: 'Project scope reduced - returning unused scaffolding',
          pickupAddress: 'No. 100, Jalan Tun Razak, 50400 Kuala Lumpur',
          customerPhone: '+60145678901',
          customerEmail: 'skyline@developers.com',
          returnType: 'partial',
          collectionMethod: 'self-return',
          items: {
            create: [
              { name: 'CRAB STANDARD 0.50M C60', quantity: 50, quantityReturned: 50, itemStatus: 'Pending' },
              { name: 'CRAB LEDGER 0.70M', quantity: 100, quantityReturned: 100, itemStatus: 'Pending' },
            ],
          },
        },
      ];

      // Create return requests
      for (const req of returnRequests) {
        await prisma.returnRequest.create({ data: req });
      }

      return NextResponse.json({
        success: true,
        message: 'Sample data seeded successfully',
        data: {
          rfqs: 3,
          deliveryRequests: deliveryRequests.length,
          returnRequests: returnRequests.length,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action. Use "clear" or "seed"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Seed data error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while seeding data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seed
 * Get current data counts
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deliveryCount = await prisma.deliveryRequest.count();
    const returnCount = await prisma.returnRequest.count();

    return NextResponse.json({
      success: true,
      data: {
        deliveryRequests: deliveryCount,
        returnRequests: returnCount,
      },
    });
  } catch (error) {
    console.error('Get counts error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
