import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
 * POST /api/cron/check-overdue
 * Cron endpoint to check and update overdue items
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
    const results = {
      deposits: { updated: 0 },
      additionalCharges: { updated: 0 },
      monthlyRentals: { updated: 0 },
    };

    // Check and update overdue deposits (Pending Payment or Rejected)
    const overdueDeposits = await prisma.deposit.findMany({
      where: {
        status: {
          in: ['Pending Payment', 'Rejected'],
        },
        dueDate: {
          lt: now,
        },
      },
    });

    if (overdueDeposits.length > 0) {
      const depositResult = await prisma.deposit.updateMany({
        where: {
          id: {
            in: overdueDeposits.map(d => d.id),
          },
        },
        data: {
          status: 'Overdue',
        },
      });
      results.deposits.updated = depositResult.count;
    }

    // Check and update overdue additional charges (pending_payment or rejected)
    const overdueCharges = await prisma.additionalCharge.findMany({
      where: {
        status: {
          in: ['pending_payment', 'rejected'],
        },
        dueDate: {
          lt: now,
        },
      },
    });

    if (overdueCharges.length > 0) {
      const chargeResult = await prisma.additionalCharge.updateMany({
        where: {
          id: {
            in: overdueCharges.map(c => c.id),
          },
        },
        data: {
          status: 'overdue',
        },
      });
      results.additionalCharges.updated = chargeResult.count;
    }

    // Check and update overdue monthly rental invoices with interest (Pending Payment or Rejected)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdueInvoices = await (prisma as any).monthlyRentalInvoice.findMany({
      where: {
        status: {
          in: ['Pending Payment', 'Rejected'],
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        agreement: true,
      },
    });

    if (overdueInvoices.length > 0) {
      let updatedCount = 0;
      
      for (const invoice of overdueInvoices) {
        const defaultInterest = invoice.agreement?.defaultInterest 
          ? Number(invoice.agreement.defaultInterest) 
          : 1.5;
        
        const baseAmount = Number(invoice.baseAmount);
        const overdueCharges = calculateOverdueCharges(
          baseAmount,
          invoice.dueDate,
          defaultInterest
        );
        
        const totalAmount = baseAmount + overdueCharges;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).monthlyRentalInvoice.update({
          where: { id: invoice.id },
          data: {
            status: 'Overdue',
            overdueCharges,
            totalAmount,
          },
        });

        updatedCount++;
      }

      results.monthlyRentals.updated = updatedCount;
    }

    const totalUpdated = 
      results.deposits.updated + 
      results.additionalCharges.updated + 
      results.monthlyRentals.updated;

    return NextResponse.json({
      success: true,
      message: 'Overdue check completed',
      results: {
        deposits: results.deposits.updated,
        additionalCharges: results.additionalCharges.updated,
        monthlyRentals: results.monthlyRentals.updated,
        total: totalUpdated,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in overdue check cron:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while checking overdue items',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/check-overdue
 * Health check endpoint (does not require authentication)
 */
export async function GET() {
  const hasSecret = !!process.env.CRON_SECRET;
  const allowLocalhost = process.env.CRON_ALLOW_LOCALHOST === 'true';
  
  return NextResponse.json({
    success: true,
    message: 'Overdue check cron endpoint is active',
    usage: 'POST to this endpoint to run the overdue check',
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
