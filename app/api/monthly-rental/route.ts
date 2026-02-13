import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendMonthlyRentalRejectionEmail } from '@/lib/email';
import { calculateBillingPeriod, getCycleNumber } from '@/lib/billing-helpers';

// Roles allowed to manage monthly rental invoices
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];
const APPROVAL_ROLES = ['super_user', 'admin', 'finance'];

/**
 * Generate a unique invoice number in format MRI-YYYYMMDD-XXX
 */
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MRI-${dateStr}-`;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });
  
  let sequence = 1;
  if (latestInvoice) {
    const lastSequence = parseInt(latestInvoice.invoiceNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}

/**
 * Check and update overdue status for an invoice
 */
function checkOverdueStatus(invoice: { status: string; dueDate: Date }): string {
  if (invoice.status === 'Pending Payment' && new Date() > invoice.dueDate) {
    return 'Overdue';
  }
  return invoice.status;
}

/**
 * Calculate overdue charges based on default interest rate
 */
function calculateOverdueCharges(
  baseAmount: number,
  dueDate: Date,
  defaultInterestRate: number
): number {
  if (new Date() <= dueDate) {
    return 0;
  }
  
  const msPerMonth = 30 * 24 * 60 * 60 * 1000;
  const monthsLate = Math.ceil((Date.now() - dueDate.getTime()) / msPerMonth);
  
  return baseAmount * (defaultInterestRate / 100) * monthsLate;
}

/**
 * Get the earliest requiredDate from RFQ items for a given agreement.
 * This serves as the billing cycle anchor date.
 */
async function getEarliestRequiredDate(agreementId: string): Promise<Date | null> {
  const agreement = await prisma.rentalAgreement.findUnique({
    where: { id: agreementId },
    select: { rfqId: true },
  });

  if (!agreement?.rfqId) return null;

  const rfqItems = await prisma.rFQItem.findMany({
    where: { rfqId: agreement.rfqId },
    select: { requiredDate: true },
    orderBy: { requiredDate: 'asc' },
    take: 1,
  });

  if (rfqItems.length === 0) return null;
  return new Date(rfqItems[0].requiredDate);
}

/**
 * Calculate billing amount using the agreement's flat monthly rental.
 * 
 * Billing periods are 30-day cycles anchored to the earliest requiredDate from RFQ items.
 * The total amount is the agreement's monthlyRental. Line items show delivered items
 * with their proportional share of the monthly rental for reference.
 */
async function calculateBillingAmount(
  agreementId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Get agreement with AgreementItem records
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agreement = await (prisma.rentalAgreement.findUnique as any)({
    where: { id: agreementId },
    include: {
      items: true,
    },
  });

  if (!agreement) {
    throw new Error('Agreement not found');
  }

  // Get original quantities from RFQ items (via rfqItemId in AgreementItem)
  const rfqItemQuantities = new Map<string, number>();
  if (agreement.rfqId) {
    const rfqItems = await prisma.rFQItem.findMany({
      where: { rfqId: agreement.rfqId },
      select: { id: true, quantity: true, scaffoldingItemId: true },
    });
    for (const rfqItem of rfqItems) {
      // Map by scaffoldingItemId to get original quantity
      // If same item appears in multiple sets, we'll use the sum
      const existing = rfqItemQuantities.get(rfqItem.scaffoldingItemId) || 0;
      rfqItemQuantities.set(rfqItem.scaffoldingItemId, existing + rfqItem.quantity);
    }
  }

  // Also create a map by rfqItemId for direct lookup
  const rfqItemQuantitiesByRfqId = new Map<string, number>();
  if (agreement.rfqId) {
    const rfqItems = await prisma.rFQItem.findMany({
      where: { rfqId: agreement.rfqId },
      select: { id: true, quantity: true },
    });
    for (const rfqItem of rfqItems) {
      rfqItemQuantitiesByRfqId.set(rfqItem.id, rfqItem.quantity);
    }
  }

  // Flat monthly rental from agreement
  const monthlyRental = Number(agreement.monthlyRental) || 0;

  // Get all deliveries for this agreement
  const deliveries = await prisma.deliveryRequest.findMany({
    where: {
      agreementNo: agreement.agreementNumber,
    },
    include: {
      sets: {
        where: { status: 'Completed' },
        include: {
          items: true,
          completion: true,
        },
      },
    },
  });

  // Get all returns for this agreement that are completed
  const returns = await prisma.returnRequest.findMany({
    where: {
      agreementNo: agreement.agreementNumber,
      status: { in: ['Completed', 'Sorting Complete', 'Customer Notified'] },
    },
    include: {
      items: true,
      completion: true,
    },
  });

  // Calculate delivered quantities per item
  const deliveredData: Record<string, number> = {};
  for (const delivery of deliveries) {
    for (const set of delivery.sets) {
      for (const item of set.items) {
        const itemId = item.scaffoldingItemId || item.name;
        deliveredData[itemId] = (deliveredData[itemId] || 0) + item.quantity;
      }
    }
  }

  // Calculate returned quantities per item
  const returnedData: Record<string, number> = {};
  for (const returnReq of returns) {
    for (const item of returnReq.items) {
      const itemId = item.scaffoldingItemId || item.name;
      returnedData[itemId] = (returnedData[itemId] || 0) + item.quantityReturned;
    }
  }

  // Build line items for reference — each item gets a proportional share of the monthly rental
  // Show ALL items from the agreement, not just delivered ones
  const items: Array<{
    scaffoldingItemId: string;
    scaffoldingItemName: string;
    quantityBilled: number;
    unitPrice: number;
    daysCharged: number;
    lineTotal: number;
  }> = [];

  // Collect ALL agreement items (not just those with netQty > 0)
  const allAgreementItems: Array<{
    agreementItem: any;
    itemId: string;
    netQty: number;
    itemRate: number;
  }> = [];

  // Group agreement items by scaffoldingItemId to handle duplicates
  // If same item appears in multiple sets, we'll use the sum of quantities
  const agreementItemsByItemId = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const agreementItem of (agreement.items as any[])) {
    const itemId = agreementItem.scaffoldingItemId;
    if (!agreementItemsByItemId.has(itemId)) {
      agreementItemsByItemId.set(itemId, agreementItem);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const agreementItem of (agreement.items as any[])) {
    const itemId = agreementItem.scaffoldingItemId;
    const delivered = deliveredData[itemId] || 0;
    const returned = returnedData[itemId] || 0;
    
    // Use original RFQ quantity - sum all quantities for this item across all sets
    // This handles cases where the same item appears in multiple sets
    let originalQty = 0;
    if (rfqItemQuantities.has(itemId)) {
      // Sum of all quantities for this item across all sets (e.g., Set 1: 3, Set 2: 4 = 7)
      originalQty = rfqItemQuantities.get(itemId) || 0;
    } else {
      // If no RFQ data, use delivered quantity as fallback
      originalQty = delivered - returned;
    }
    
    const itemRate = Number(agreementItem.agreedMonthlyRate) || 0;

    // Only add each unique item once (grouped by scaffoldingItemId)
    if (agreementItemsByItemId.get(itemId) === agreementItem) {
      allAgreementItems.push({
        agreementItem,
        itemId,
        netQty: originalQty, // Use original RFQ quantity (summed across all sets)
        itemRate,
      });
    }
  }

  // Sum of ALL agreedMonthlyRate across ALL agreement items (for proportion calculation)
  // This ensures the proportion is calculated from all items in the agreement
  const totalRate = allAgreementItems.reduce(
    (sum, item) => sum + item.itemRate, 0
  );

  // Calculate line totals ensuring sum equals monthlyRental exactly
  // ALL items get a proportional share based on their agreedMonthlyRate
  // The quantity shows what's actually delivered, but billing is proportional to all items
  let runningTotal = 0;
  
  // Calculate proportional shares for ALL items
  for (let i = 0; i < allAgreementItems.length; i++) {
    const { agreementItem, itemId, netQty, itemRate } = allAgreementItems[i];
    let lineTotal: number;

    if (i === allAgreementItems.length - 1) {
      // Last item: ensure sum equals monthlyRental exactly
      lineTotal = Math.round((monthlyRental - runningTotal) * 100) / 100;
    } else {
      // Proportional share of the flat monthly rental (for ALL items, not just delivered ones)
      lineTotal = totalRate > 0
        ? Math.round((itemRate / totalRate) * monthlyRental * 100) / 100
        : 0;
      runningTotal += lineTotal;
    }

    items.push({
      scaffoldingItemId: itemId,
      scaffoldingItemName: agreementItem.scaffoldingItemName,
      quantityBilled: netQty, // Shows original RFQ/agreement quantity
      unitPrice: itemRate, // agreed monthly rate per item for display
      daysCharged: 30,
      lineTotal, // Proportional share for ALL items
    });
  }

  // Get customer info from first delivery
  let customerName = '';
  let customerEmail: string | null = null;
  let customerPhone: string | null = null;
  
  if (deliveries.length > 0) {
    customerName = deliveries[0].customerName;
    customerEmail = deliveries[0].customerEmail || null;
    customerPhone = deliveries[0].customerPhone || null;
  }

  return {
    totalAmount: monthlyRental,
    items,
    daysInPeriod: 30,
    customerName,
    customerEmail,
    customerPhone,
    agreementNo: agreement.agreementNumber,
  };
}

/**
 * GET /api/monthly-rental
 * List all monthly rental invoices with filtering and lazy overdue detection
 */
export async function GET(request: NextRequest) {
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
        { success: false, message: 'Forbidden: You do not have permission to view invoices' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const deliveryRequestId = searchParams.get('deliveryRequestId');
    const agreementId = searchParams.get('agreementId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const customerName = searchParams.get('customerName') || undefined;
    const customerEmail = searchParams.get('customerEmail') || undefined;

    // If id is provided, return single invoice
    if (id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
        where: { id },
        include: {
          deliveryRequest: {
            include: {
              rfq: true,
              sets: {
                include: { items: true },
              },
            },
          },
          agreement: true,
          items: true,
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { success: false, message: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Check and update overdue status
      const currentStatus = checkOverdueStatus(invoice);
      if (currentStatus !== invoice.status) {
        // Calculate overdue charges
        const defaultInterest = invoice.agreement?.defaultInterest 
          ? Number(invoice.agreement.defaultInterest) 
          : 1.5;
        const overdueCharges = calculateOverdueCharges(
          Number(invoice.baseAmount),
          invoice.dueDate,
          defaultInterest
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).monthlyRentalInvoice.update({
          where: { id },
          data: { 
            status: currentStatus,
            overdueCharges,
            totalAmount: Number(invoice.baseAmount) + overdueCharges,
          },
        });
      }

      return NextResponse.json({
        success: true,
        invoice: transformInvoice(invoice, currentStatus),
      });
    }

    // Build where clause for list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (status) {
      where.status = status;
    }
    if (deliveryRequestId) {
      where.deliveryRequestId = deliveryRequestId;
    }
    if (agreementId) {
      where.agreementId = agreementId;
    }
    if (month) {
      where.billingMonth = parseInt(month, 10);
    }
    if (year) {
      where.billingYear = parseInt(year, 10);
    }
    if (customerName) {
      where.customerName = { contains: customerName };
    }
    if (customerEmail) {
      where.customerEmail = { contains: customerEmail };
    }

    // Pagination and order: page (default 1), pageSize (5, 10, 25, 50), orderBy (latest | earliest)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);
    const pageSize = [5, 10, 25, 50].includes(rawPageSize) ? rawPageSize : 10;
    const orderByParam = searchParams.get('orderBy') ?? 'latest';
    const orderDir = orderByParam === 'earliest' ? 'asc' : 'desc';

    const skip = (page - 1) * pageSize;

    // Get total count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = await (prisma as any).monthlyRentalInvoice.count({ where });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = await (prisma as any).monthlyRentalInvoice.findMany({
      where,
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
      orderBy: {
        createdAt: orderDir,
      },
      skip,
      take: pageSize,
    });

    // Check and update overdue statuses
    const invoicesToUpdate: Array<{ id: string; overdueCharges: number; totalAmount: number }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedInvoices = invoices.map((invoice: any) => {
      const currentStatus = checkOverdueStatus(invoice);
      if (currentStatus !== invoice.status && currentStatus === 'Overdue') {
        const defaultInterest = invoice.agreement?.defaultInterest 
          ? Number(invoice.agreement.defaultInterest) 
          : 1.5;
        const overdueCharges = calculateOverdueCharges(
          Number(invoice.baseAmount),
          invoice.dueDate,
          defaultInterest
        );
        invoicesToUpdate.push({
          id: invoice.id,
          overdueCharges,
          totalAmount: Number(invoice.baseAmount) + overdueCharges,
        });
      }
      return transformInvoice(invoice, currentStatus);
    });

    // Batch update overdue invoices
    for (const update of invoicesToUpdate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).monthlyRentalInvoice.update({
        where: { id: update.id },
        data: {
          status: 'Overdue',
          overdueCharges: update.overdueCharges,
          totalAmount: update.totalAmount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      invoices: transformedInvoices,
      total,
      page,
      pageSize,
      orderBy: orderByParam,
    });
  } catch (error) {
    console.error('Get monthly rental invoices error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monthly-rental
 * Generate a new monthly rental invoice
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
        { success: false, message: 'Forbidden: You do not have permission to create invoices' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { deliveryRequestId, billingMonth, billingYear, agreementId } = body;

    if (!agreementId) {
      return NextResponse.json(
        { success: false, message: 'Agreement ID is required' },
        { status: 400 }
      );
    }

    // Validate agreement exists and is active
    const agreement = await prisma.rentalAgreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      return NextResponse.json(
        { success: false, message: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Check if agreement is in active status (allow 'Active', 'active', or other active statuses)
    const activeStatuses = ['Active', 'active', 'Signed', 'signed'];
    if (!activeStatuses.includes(agreement.status)) {
      return NextResponse.json(
        { success: false, message: 'Cannot generate invoice for non-active agreement' },
        { status: 400 }
      );
    }

    // Determine billing period based on requiredDate (30-day cycles)
    const anchorDate = await getEarliestRequiredDate(agreementId);
    if (!anchorDate) {
      return NextResponse.json(
        { success: false, message: 'Could not determine billing start date. No RFQ items found for this agreement.' },
        { status: 400 }
      );
    }

    // Find the latest existing invoice for this agreement to determine next cycle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestExistingInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: { agreementId },
      orderBy: { billingStartDate: 'desc' },
    });

    let cycleNumber: number;
    if (latestExistingInvoice) {
      // Next cycle starts after the last invoice's billing period
      const lastEnd = new Date(latestExistingInvoice.billingEndDate);
      const nextStart = new Date(lastEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      cycleNumber = getCycleNumber(anchorDate, nextStart);
    } else {
      // First invoice — use cycle 1 (starts from requiredDate)
      cycleNumber = 1;
    }

    // Allow override via billingMonth/billingYear if explicitly provided
    if (billingMonth && billingYear) {
      // User explicitly requested a specific month — find the cycle that starts in that month
      const requestedDate = new Date(billingYear, billingMonth - 1, 1);
      cycleNumber = getCycleNumber(anchorDate, requestedDate);
    }

    const { start: billingStartDate, end: billingEndDate, daysInPeriod } = calculateBillingPeriod(anchorDate, cycleNumber);
    const targetMonth = billingStartDate.getMonth() + 1;
    const targetYear = billingStartDate.getFullYear();

    // Check if invoice already exists for this agreement and billing period
    // Check by month/year (for unique constraint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingInvoiceByMonth = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: {
        agreementId,
        billingMonth: targetMonth,
        billingYear: targetYear,
      },
    });

    if (existingInvoiceByMonth) {
      return NextResponse.json(
        { success: false, message: `Invoice already exists for this agreement for ${targetMonth}/${targetYear}. Invoice: ${existingInvoiceByMonth.invoiceNumber}` },
        { status: 400 }
      );
    }

    // Also check for any overlapping billing periods to prevent duplicates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlappingInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: {
        agreementId,
        OR: [
          {
            // New period starts within existing period
            billingStartDate: { lte: billingStartDate },
            billingEndDate: { gte: billingStartDate },
          },
          {
            // New period ends within existing period
            billingStartDate: { lte: billingEndDate },
            billingEndDate: { gte: billingEndDate },
          },
          {
            // New period completely contains existing period
            billingStartDate: { gte: billingStartDate },
            billingEndDate: { lte: billingEndDate },
          },
        ],
      },
    });

    if (overlappingInvoice) {
      return NextResponse.json(
        { success: false, message: `Invoice already exists for this agreement with overlapping billing period (${overlappingInvoice.billingStartDate.toISOString().slice(0, 10)} to ${overlappingInvoice.billingEndDate.toISOString().slice(0, 10)}). Invoice: ${overlappingInvoice.invoiceNumber}` },
        { status: 400 }
      );
    }

    // Calculate billing amount using agreement-based calculation with 30-day period
    const billing = await calculateBillingAmount(
      agreementId,
      billingStartDate,
      billingEndDate
    );

    if (billing.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No billable items found. All items may have been returned.' },
        { status: 400 }
      );
    }

    // Get first delivery request for this agreement (for backward compatibility with required deliveryRequestId field)
    const firstDelivery = await prisma.deliveryRequest.findFirst({
      where: {
        agreementNo: agreement.agreementNumber,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!firstDelivery) {
      return NextResponse.json(
        { success: false, message: 'No delivery request found for this agreement' },
        { status: 400 }
      );
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate due date (7 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Create invoice with items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newInvoice = await (prisma as any).monthlyRentalInvoice.create({
      data: {
        invoiceNumber,
        deliveryRequestId: deliveryRequestId || firstDelivery.id, // Use provided or first delivery
        agreementId,
        customerName: billing.customerName,
        customerEmail: billing.customerEmail,
        customerPhone: billing.customerPhone,
        billingMonth: targetMonth,
        billingYear: targetYear,
        billingStartDate,
        billingEndDate,
        daysInPeriod,
        baseAmount: billing.totalAmount,
        overdueCharges: 0,
        totalAmount: billing.totalAmount,
        status: 'Pending Payment',
        dueDate,
        items: {
          create: billing.items,
        },
      },
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly rental invoice created successfully',
      invoice: transformInvoice(newInvoice, newInvoice.status),
    });
  } catch (error) {
    console.error('Create monthly rental invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the invoice' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/monthly-rental
 * Update invoice - handles various actions:
 * - upload-proof: Upload payment proof document
 * - approve: Approve invoice with reference number
 * - reject: Reject invoice with reason (sends email)
 */
export async function PUT(request: NextRequest) {
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
        { success: false, message: 'Forbidden: You do not have permission to update invoices' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, action, ...actionData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }

    // Get existing invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
      where: { id },
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: Record<string, any> = {};
    let responseMessage = '';

    switch (action) {
      case 'upload-proof': {
        // Validate current status allows proof upload
        const allowedStatuses = ['Pending Payment', 'Overdue', 'Rejected'];
        if (!allowedStatuses.includes(invoice.status)) {
          return NextResponse.json(
            { success: false, message: `Cannot upload proof when invoice status is ${invoice.status}` },
            { status: 400 }
          );
        }

        const { paymentProofUrl, paymentProofFileName } = actionData;
        if (!paymentProofUrl) {
          return NextResponse.json(
            { success: false, message: 'Payment proof URL is required' },
            { status: 400 }
          );
        }

        updateData = {
          paymentProofUrl,
          paymentProofFileName: paymentProofFileName || null,
          paymentProofUploadedAt: new Date(),
          paymentProofUploadedBy: session.user.email,
          status: 'Pending Approval',
          // Clear rejection fields when re-uploading
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
        };
        responseMessage = 'Payment proof uploaded successfully';
        break;
      }

      case 'approve': {
        // Only specific roles can approve
        const canApprove = session.user.roles?.some(role => APPROVAL_ROLES.includes(role));
        if (!canApprove) {
          return NextResponse.json(
            { success: false, message: 'You do not have permission to approve invoices' },
            { status: 403 }
          );
        }

        if (invoice.status !== 'Pending Approval') {
          return NextResponse.json(
            { success: false, message: 'Only invoices with Pending Approval status can be approved' },
            { status: 400 }
          );
        }

        const { referenceNumber } = actionData;
        if (!referenceNumber) {
          return NextResponse.json(
            { success: false, message: 'Reference number is required for approval' },
            { status: 400 }
          );
        }

        updateData = {
          status: 'Paid',
          approvedBy: session.user.email,
          approvedAt: new Date(),
          referenceNumber,
        };
        responseMessage = 'Invoice approved successfully';
        break;
      }

      case 'reject': {
        // Only specific roles can reject
        const canReject = session.user.roles?.some(role => APPROVAL_ROLES.includes(role));
        if (!canReject) {
          return NextResponse.json(
            { success: false, message: 'You do not have permission to reject invoices' },
            { status: 403 }
          );
        }

        if (invoice.status !== 'Pending Approval') {
          return NextResponse.json(
            { success: false, message: 'Only invoices with Pending Approval status can be rejected' },
            { status: 400 }
          );
        }

        const { rejectionReason } = actionData;
        if (!rejectionReason) {
          return NextResponse.json(
            { success: false, message: 'Rejection reason is required' },
            { status: 400 }
          );
        }

        updateData = {
          status: 'Rejected',
          rejectedBy: session.user.email,
          rejectedAt: new Date(),
          rejectionReason,
        };

        // Send rejection email to the person who uploaded the payment proof
        const customerEmail = invoice.customerEmail || invoice.paymentProofUploadedBy;
        if (customerEmail) {
          await sendMonthlyRentalRejectionEmail(
            customerEmail,
            invoice.customerName,
            invoice.invoiceNumber,
            rejectionReason,
            Number(invoice.totalAmount)
          );
        }

        responseMessage = 'Invoice rejected and notification sent';
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update the invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedInvoice = await (prisma as any).monthlyRentalInvoice.update({
      where: { id },
      data: updateData,
      include: {
        deliveryRequest: {
          include: {
            rfq: true,
          },
        },
        agreement: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: responseMessage,
      invoice: transformInvoice(updatedInvoice, updatedInvoice.status),
    });
  } catch (error) {
    console.error('Update monthly rental invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the invoice' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monthly-rental
 * Delete an invoice (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin/super_user can delete
    const hasAdminRole = session.user.roles?.some(role => ['super_user', 'admin'].includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin can delete invoices' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Check if invoice exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingInvoice = await (prisma as any).monthlyRentalInvoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of non-paid invoices
    if (existingInvoice.status === 'Paid') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete a paid invoice' },
        { status: 400 }
      );
    }

    // Delete the invoice (items will cascade delete)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).monthlyRentalInvoice.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete monthly rental invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the invoice' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to transform invoice for response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformInvoice(invoice: any, currentStatus: string) {
  return {
    ...invoice,
    status: currentStatus,
    baseAmount: Number(invoice.baseAmount),
    overdueCharges: Number(invoice.overdueCharges),
    totalAmount: Number(invoice.totalAmount),
    dueDate: invoice.dueDate.toISOString(),
    billingStartDate: invoice.billingStartDate.toISOString(),
    billingEndDate: invoice.billingEndDate.toISOString(),
    paymentProofUploadedAt: invoice.paymentProofUploadedAt?.toISOString(),
    approvedAt: invoice.approvedAt?.toISOString(),
    rejectedAt: invoice.rejectedAt?.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    items: invoice.items.map((item: { unitPrice: unknown; lineTotal: unknown }) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    deliveryRequest: invoice.deliveryRequest ? {
      ...invoice.deliveryRequest,
      rfq: invoice.deliveryRequest.rfq ? {
        ...invoice.deliveryRequest.rfq,
        totalAmount: Number(invoice.deliveryRequest.rfq.totalAmount),
      } : null,
    } : null,
    agreement: invoice.agreement ? {
      ...invoice.agreement,
      monthlyRental: Number(invoice.agreement.monthlyRental),
      securityDeposit: Number(invoice.agreement.securityDeposit),
      minimumCharges: Number(invoice.agreement.minimumCharges),
      defaultInterest: Number(invoice.agreement.defaultInterest),
    } : null,
  };
}
