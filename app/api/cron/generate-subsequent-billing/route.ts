import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateBillingPeriod, getCycleNumber } from '@/lib/billing-helpers';

/**
 * Verify authentication for cron endpoint
 * Supports:
 * 1. Bearer token in Authorization header (for external cron services)
 * 2. X-Cron-Secret header (alternative method)
 * 3. Internal system calls from localhost (if CRON_ALLOW_LOCALHOST is enabled)
 */
function verifyCronAuth(request: NextRequest): { authorized: boolean; reason?: string } {
  // Check if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not set in environment variables');
    // In development, allow if explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.CRON_ALLOW_NO_SECRET === 'true') {
      return { authorized: true, reason: 'Development mode - no secret required' };
    }
    return { authorized: false, reason: 'Cron endpoint not configured (CRON_SECRET missing)' };
  }

  // Method 1: Check Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === cronSecret) {
      return { authorized: true, reason: 'Bearer token valid' };
    }
  }

  // Method 2: Check X-Cron-Secret header
  const cronSecretHeader = request.headers.get('x-cron-secret');
  if (cronSecretHeader === cronSecret) {
    return { authorized: true, reason: 'X-Cron-Secret header valid' };
  }

  // Method 3: Allow internal/localhost calls if enabled
  const allowLocalhost = process.env.CRON_ALLOW_LOCALHOST === 'true';
  if (allowLocalhost) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const host = request.headers.get('host');
    
    // Check if request is from localhost
    const isLocalhost = 
      host?.includes('localhost') ||
      host?.includes('127.0.0.1') ||
      forwardedFor?.includes('127.0.0.1') ||
      realIp === '127.0.0.1';
    
    if (isLocalhost) {
      return { authorized: true, reason: 'Localhost request allowed' };
    }
  }

  return { authorized: false, reason: 'Invalid or missing authentication' };
}

/**
 * Parse number of months from termOfHire string (e.g. "9 months (270 days)" → 9)
 */
function parseMonthsFromTermOfHire(termOfHire: string | null | undefined): number {
  if (!termOfHire?.trim()) return 0;
  const match = termOfHire.match(/(\d+)\s*months?/i);
  return match ? Math.max(0, parseInt(match[1], 10)) : 0;
}

/**
 * Get the earliest requiredDate from RFQ items for a given agreement.
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
 * Generate a unique invoice number in format MRI-YYYYMMDD-XXX
 * Ensures uniqueness by checking all existing invoices with the same date prefix
 */
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MRI-${dateStr}-`;
  
  // Find all invoices with the same date prefix to ensure uniqueness
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingInvoices = await (prisma as any).monthlyRentalInvoice.findMany({
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
  if (existingInvoices.length > 0) {
    // Get the highest sequence number from existing invoices
    const sequences = existingInvoices.map((inv: { invoiceNumber: string }) => {
      const parts = inv.invoiceNumber.split('-');
      return parseInt(parts[parts.length - 1], 10);
    });
    const maxSequence = Math.max(...sequences);
    sequence = maxSequence + 1;
  }
  
  const invoiceNumber = `${prefix}${sequence.toString().padStart(3, '0')}`;
  
  // Double-check uniqueness (safety check)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const duplicateCheck = await (prisma as any).monthlyRentalInvoice.findUnique({
    where: { invoiceNumber },
  });
  
  if (duplicateCheck) {
    // If somehow a duplicate exists, increment and try again
    sequence += 1;
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }
  
  return invoiceNumber;
}

/**
 * Calculate billing amount using the agreement's flat monthly rental.
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

  // Flat monthly rental from agreement
  const monthlyRental = Number(agreement.monthlyRental) || 0;

  // Get RFQ items to calculate per-item line totals
  type RfqItemRow = {
    id: string;
    setName: string;
    rentalMonths: number;
    quantity: number;
    unitPrice: unknown;
    scaffoldingItemId: string;
    scaffoldingItemName: string;
  };

  let rfqItems: RfqItemRow[] = [];
  if (agreement.rfqId) {
    const rows = await prisma.rFQItem.findMany({
      where: { rfqId: agreement.rfqId },
      select: {
        id: true,
        setName: true,
        rentalMonths: true,
        quantity: true,
        unitPrice: true,
        scaffoldingItemId: true,
        scaffoldingItemName: true,
      },
    });
    rfqItems = rows as unknown as RfqItemRow[];
  }

  // Calculate totalMonths (sum of unique set months)
  const monthsBySet = new Map<string, number>();
  for (const rfqItem of rfqItems) {
    const setName = rfqItem.setName ?? 'Set 1';
    if (!monthsBySet.has(setName)) {
      monthsBySet.set(setName, rfqItem.rentalMonths ?? 1);
    }
  }
  const totalMonths = [...monthsBySet.values()].reduce((a, b) => a + b, 0);

  // Build a map of rfqItemId -> agreedMonthlyRate from AgreementItems
  const agreedRateByRfqItemId = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const agreementItem of (agreement.items as any[])) {
    if (agreementItem.rfqItemId) {
      agreedRateByRfqItemId.set(agreementItem.rfqItemId, Number(agreementItem.agreedMonthlyRate) || 0);
    }
  }

  // Build line items
  const items: Array<{
    scaffoldingItemId: string;
    scaffoldingItemName: string;
    quantityBilled: number;
    unitPrice: number;
    daysCharged: number;
    lineTotal: number;
  }> = [];

  let runningTotal = 0;
  for (let i = 0; i < rfqItems.length; i++) {
    const rfqItem = rfqItems[i];
    const setName = rfqItem.setName ?? 'Set 1';
    const rentalMonths = rfqItem.rentalMonths ?? 1;
    const quantity = rfqItem.quantity || 0;
    // Use agreed rate from AgreementItem if available, otherwise use RFQ unitPrice
    const unitPrice = agreedRateByRfqItemId.has(rfqItem.id)
      ? agreedRateByRfqItemId.get(rfqItem.id)!
      : Number(rfqItem.unitPrice) || 0;

    let lineTotal: number;
    if (i === rfqItems.length - 1) {
      // Last item: ensure sum equals monthlyRental exactly (no rounding drift)
      lineTotal = Math.round((monthlyRental - runningTotal) * 100) / 100;
    } else {
      lineTotal = totalMonths > 0
        ? Math.round((quantity * unitPrice * 30 * rentalMonths / totalMonths) * 100) / 100
        : 0;
      runningTotal += lineTotal;
    }

    // Append set name to item name to distinguish same item across different sets
    const displayName = monthsBySet.size > 1
      ? `${rfqItem.scaffoldingItemName} (${setName})`
      : rfqItem.scaffoldingItemName;

    items.push({
      scaffoldingItemId: rfqItem.scaffoldingItemId,
      scaffoldingItemName: displayName,
      quantityBilled: quantity,
      unitPrice,
      daysCharged: 30,
      lineTotal,
    });
  }

  // Get customer info from first delivery
  const deliveries = await prisma.deliveryRequest.findMany({
    where: { agreementNo: agreement.agreementNumber },
    take: 1,
  });

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
 * Generate subsequent invoice for an agreement
 */
async function generateSubsequentInvoice(agreementId: string) {
  try {
    // Get agreement
    const agreement = await prisma.rentalAgreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      return { success: false, reason: 'Agreement not found' };
    }

    // Get latest invoice for this agreement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: { agreementId },
      orderBy: { billingEndDate: 'desc' },
    });

    if (!latestInvoice) {
      // No invoices yet - first invoice should be generated manually
      return { success: false, reason: 'No existing invoices' };
    }

    // Check if billingEndDate has passed
    // Use UTC for consistent date comparison
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const billingEndDate = new Date(latestInvoice.billingEndDate);
    const billingEndDateOnly = new Date(Date.UTC(billingEndDate.getUTCFullYear(), billingEndDate.getUTCMonth(), billingEndDate.getUTCDate(), 0, 0, 0, 0));
    
    if (today <= billingEndDateOnly) {
      // Billing period hasn't ended yet
      return { success: false, reason: 'Billing period not ended' };
    }

    // Get anchor date (earliest requiredDate)
    const anchorDate = await getEarliestRequiredDate(agreementId);
    if (!anchorDate) {
      return { success: false, reason: 'No anchor date' };
    }

    // Calculate next billing period
    // The next billing period should start the day AFTER the last invoice's billingEndDate
    const lastEnd = new Date(latestInvoice.billingEndDate);
    
    // Use UTC to avoid timezone issues - get the date components in UTC
    const lastEndYear = lastEnd.getUTCFullYear();
    const lastEndMonth = lastEnd.getUTCMonth();
    const lastEndDay = lastEnd.getUTCDate();
    
    // Next billing period starts the day after the last invoice ends (in UTC)
    const billingStartDate = new Date(Date.UTC(lastEndYear, lastEndMonth, lastEndDay + 1, 0, 0, 0, 0));
    
    // Next billing period ends 30 days later (29 days after start, 30 days inclusive)
    const nextBillingEndDate = new Date(billingStartDate);
    nextBillingEndDate.setUTCDate(nextBillingEndDate.getUTCDate() + 29);
    nextBillingEndDate.setUTCHours(23, 59, 59, 999); // Set to end of day
    
    const daysInPeriod = 30;
    const targetMonth = billingStartDate.getMonth() + 1;
    const targetYear = billingStartDate.getFullYear();
    
    // Calculate cycle number for termOfHire limit checking
    const nextCycleNumber = getCycleNumber(anchorDate, billingStartDate);
    
    // Parse termOfHire to get max cycles
    const termOfHireMonths = parseMonthsFromTermOfHire(agreement.termOfHire);
    if (termOfHireMonths === 0) {
      return { success: false, reason: 'Invalid termOfHire' };
    }

    // Check if this billing period would exceed the termOfHire limit
    // Calculate the end date based on termOfHire (termOfHireMonths * 30 days from anchor)
    const maxEndDate = new Date(anchorDate);
    maxEndDate.setDate(maxEndDate.getDate() + (termOfHireMonths * 30) - 1); // -1 because anchor date is day 1
    
    if (billingStartDate > maxEndDate) {
      return { success: false, reason: 'Exceeds termOfHire limit' };
    }

    // Check if invoice already exists for this billing period
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: {
        agreementId,
        billingMonth: targetMonth,
        billingYear: targetYear,
      },
    });

    if (existingInvoice) {
      return { success: false, reason: 'Invoice already exists' };
    }

    // Also check for overlapping billing periods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlappingInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: {
        agreementId,
        OR: [
          {
            billingStartDate: { lte: billingStartDate },
            billingEndDate: { gte: billingStartDate },
          },
          {
            billingStartDate: { lte: nextBillingEndDate },
            billingEndDate: { gte: nextBillingEndDate },
          },
          {
            billingStartDate: { gte: billingStartDate },
            billingEndDate: { lte: nextBillingEndDate },
          },
        ],
      },
    });

    if (overlappingInvoice) {
      return { success: false, reason: 'Overlapping invoice exists' };
    }

    // Calculate billing amount
    const billing = await calculateBillingAmount(
      agreementId,
      billingStartDate,
      nextBillingEndDate
    );

    if (billing.items.length === 0) {
      return { success: false, reason: 'No billable items' };
    }

    // Get first delivery request for this agreement
    const firstDelivery = await prisma.deliveryRequest.findFirst({
      where: {
        agreementNo: agreement.agreementNumber,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!firstDelivery) {
      return { success: false, reason: 'No delivery request' };
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate due date (7 days from now) in UTC
    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() + 7);
    dueDate.setUTCHours(23, 59, 59, 999);

    // Create invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newInvoice = await (prisma as any).monthlyRentalInvoice.create({
      data: {
        invoiceNumber,
        deliveryRequestId: firstDelivery.id,
        agreementId,
        customerName: billing.customerName,
        customerEmail: billing.customerEmail,
        customerPhone: billing.customerPhone,
        billingMonth: targetMonth,
        billingYear: targetYear,
        billingStartDate,
        billingEndDate: nextBillingEndDate,
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
    });

    return { 
      success: true, 
      invoiceNumber,
      cycleNumber: nextCycleNumber,
      amount: billing.totalAmount,
      agreementNumber: agreement.agreementNumber,
    };
  } catch (error) {
    console.error(`Error generating invoice for agreement ${agreementId}:`, error);
    return { success: false, reason: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * POST /api/cron/generate-subsequent-billing
 * Cron endpoint to automatically generate subsequent monthly rental invoices
 * 
 * This endpoint can be called by:
 * - External cron services (cron-job.org, EasyCron, etc.) - requires CRON_SECRET
 * - Vercel Cron (if deployed on Vercel) - requires CRON_SECRET
 * - System crontab via curl - requires CRON_SECRET
 * - Internal system (if CRON_ALLOW_LOCALHOST=true) - from localhost only
 * 
 * Security:
 * - Requires CRON_SECRET environment variable
 * - Accepts authentication via:
 *   1. Authorization: Bearer <CRON_SECRET>
 *   2. X-Cron-Secret: <CRON_SECRET> header
 *   3. Localhost requests (if CRON_ALLOW_LOCALHOST=true)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = verifyCronAuth(request);
    if (!authResult.authorized) {
      console.warn(`[Cron] Unauthorized access attempt: ${authResult.reason}`);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized',
          error: 'Invalid or missing authentication. This endpoint requires a valid CRON_SECRET.',
        },
        { status: 401 }
      );
    }

    console.log(`[Cron] Authorized request: ${authResult.reason}`);

    const now = new Date();
    
    // Find all active agreements
    const activeAgreements = await prisma.rentalAgreement.findMany({
      where: {
        status: {
          in: ['Active', 'active', 'Signed', 'signed'],
        },
      },
      select: {
        id: true,
        agreementNumber: true,
        termOfHire: true,
      },
    });

    if (activeAgreements.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active agreements found',
        results: {
          checked: 0,
          generated: 0,
          errors: 0,
        },
        timestamp: new Date().toISOString(),
      });
    }

    let generatedCount = 0;
    let errorCount = 0;
    const generatedInvoices: Array<{
      invoiceNumber: string;
      agreementNumber: string;
      cycleNumber: number;
      amount: number;
    }> = [];
    const errors: Array<{
      agreementNumber: string;
      reason: string;
    }> = [];

    // Process each agreement
    for (const agreement of activeAgreements) {
      const result = await generateSubsequentInvoice(agreement.id);
      if (result.success) {
        generatedCount++;
        generatedInvoices.push({
          invoiceNumber: result.invoiceNumber!,
          agreementNumber: result.agreementNumber!,
          cycleNumber: result.cycleNumber!,
          amount: result.amount!,
        });
      } else if (result.reason && !['No existing invoices', 'Billing period not ended', 'Invoice already exists', 'Overlapping invoice exists'].includes(result.reason)) {
        // Count as error only if it's not a normal skip reason
        errorCount++;
        errors.push({
          agreementNumber: agreement.agreementNumber,
          reason: result.reason,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subsequent billing generation completed',
      results: {
        checked: activeAgreements.length,
        generated: generatedCount,
        errors: errorCount,
        invoices: generatedInvoices,
        errorsList: errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in subsequent billing generation cron:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while generating subsequent invoices',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/generate-subsequent-billing
 * Health check endpoint (does not require authentication)
 */
export async function GET() {
  const hasSecret = !!process.env.CRON_SECRET;
  const allowLocalhost = process.env.CRON_ALLOW_LOCALHOST === 'true';
  
  return NextResponse.json({
    success: true,
    message: 'Subsequent billing generation cron endpoint is active',
    usage: 'POST to this endpoint to run the subsequent billing generation',
    authentication: {
      required: true,
      methods: [
        'Authorization: Bearer <CRON_SECRET>',
        'X-Cron-Secret: <CRON_SECRET>',
        ...(allowLocalhost ? ['Localhost requests (if enabled)'] : []),
      ],
      configured: hasSecret,
      allowLocalhost,
    },
  });
}
