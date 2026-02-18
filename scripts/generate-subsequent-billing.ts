#!/usr/bin/env node
/**
 * Cron script to automatically generate subsequent monthly rental invoices
 * after the billingEndDate of the latest invoice has passed.
 * 
 * This script:
 * - Finds active rental agreements
 * - Checks if billingEndDate has passed for the latest invoice
 * - Generates the next invoice in sequence based on termOfHire
 * - Respects the termOfHire limit (won't generate beyond the rental period)
 * 
 * Run this script via crontab:
 * 0 0 * * * cd /path/to/project && npx tsx scripts/generate-subsequent-billing.ts >> logs/subsequent-billing.log 2>&1
 */

import "dotenv/config";
import prisma from "../src/lib/prisma";
import { calculateBillingPeriod, getCycleNumber } from "../src/lib/billing-helpers";

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
      console.log(`[${new Date().toISOString()}] Agreement ${agreementId} not found`);
      return { success: false, reason: 'Agreement not found' };
    }
    
    console.log(`[${new Date().toISOString()}] Processing agreement ${agreement.agreementNumber} (status: ${agreement.status}, termOfHire: ${agreement.termOfHire})`);

    // Get latest invoice for this agreement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
      where: { agreementId },
      orderBy: { billingEndDate: 'desc' },
    });

    if (!latestInvoice) {
      // No invoices yet - first invoice should be generated manually
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber} has no invoices yet. Skipping (first invoice should be manual).`);
      return { success: false, reason: 'No existing invoices' };
    }

    // Check if billingEndDate has passed
    // Compare dates only (ignore time) to avoid timezone/time issues
    // Use UTC for consistent date comparison
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const billingEndDate = new Date(latestInvoice.billingEndDate);
    const billingEndDateOnly = new Date(Date.UTC(billingEndDate.getUTCFullYear(), billingEndDate.getUTCMonth(), billingEndDate.getUTCDate(), 0, 0, 0, 0));
    
    console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Checking billing period - Today: ${today.toISOString().slice(0, 10)}, Billing End: ${billingEndDateOnly.toISOString().slice(0, 10)}, Latest Invoice: ${latestInvoice.invoiceNumber}`);
    
    // Check if today is AFTER the billing end date (period has ended)
    if (today <= billingEndDateOnly) {
      // Billing period hasn't ended yet (today is same day or before end date)
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Latest invoice ${latestInvoice.invoiceNumber} billing period hasn't ended yet (ends ${billingEndDateOnly.toISOString().slice(0, 10)}, today is ${today.toISOString().slice(0, 10)})`);
      return { success: false, reason: 'Billing period not ended' };
    }
    
    console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Billing period has ended (${billingEndDateOnly.toISOString().slice(0, 10)} < ${today.toISOString().slice(0, 10)}), proceeding to generate next invoice`);

    // Get anchor date (earliest requiredDate)
    const anchorDate = await getEarliestRequiredDate(agreementId);
    if (!anchorDate) {
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Could not determine anchor date`);
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
    
    const lastEndDateStr = `${lastEndYear}-${String(lastEndMonth + 1).padStart(2, '0')}-${String(lastEndDay).padStart(2, '0')}`;
    console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Last invoice ends ${lastEndDateStr}, next period starts ${billingStartDate.toISOString().slice(0, 10)}, ends ${nextBillingEndDate.toISOString().slice(0, 10)}`);
    
    // Calculate cycle number for termOfHire limit checking
    // We need to check if this billing period would exceed the termOfHire limit
    const nextCycleNumber = getCycleNumber(anchorDate, billingStartDate);
    
    // Parse termOfHire to get max cycles
    const termOfHireMonths = parseMonthsFromTermOfHire(agreement.termOfHire);
    console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: termOfHire="${agreement.termOfHire}", parsed months=${termOfHireMonths}, cycle number=${nextCycleNumber}`);
    
    if (termOfHireMonths === 0) {
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Could not parse termOfHire`);
      return { success: false, reason: 'Invalid termOfHire' };
    }

    // Check if this billing period would exceed the termOfHire limit
    // Calculate the end date based on termOfHire (termOfHireMonths * 30 days from anchor)
    const maxEndDate = new Date(anchorDate);
    maxEndDate.setDate(maxEndDate.getDate() + (termOfHireMonths * 30) - 1); // -1 because anchor date is day 1
    
    if (billingStartDate > maxEndDate) {
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Billing start date ${billingStartDate.toISOString().slice(0, 10)} exceeds termOfHire limit (max end: ${maxEndDate.toISOString().slice(0, 10)})`);
      return { success: false, reason: 'Exceeds termOfHire limit' };
    }
    
    console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Calculated next billing period - Cycle ${nextCycleNumber}, Start: ${billingStartDate.toISOString().slice(0, 10)}, End: ${nextBillingEndDate.toISOString().slice(0, 10)}, Month/Year: ${targetMonth}/${targetYear}`);

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
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Invoice already exists for ${targetMonth}/${targetYear} (${existingInvoice.invoiceNumber})`);
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
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: Overlapping invoice exists (${overlappingInvoice.invoiceNumber})`);
      return { success: false, reason: 'Overlapping invoice exists' };
    }

    // Calculate billing amount
    const billing = await calculateBillingAmount(
      agreementId,
      billingStartDate,
      nextBillingEndDate
    );

    if (billing.items.length === 0) {
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: No billable items found`);
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
      console.log(`[${new Date().toISOString()}] Agreement ${agreement.agreementNumber}: No delivery request found`);
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

    console.log(
      `[${new Date().toISOString()}] Generated invoice ${invoiceNumber} for agreement ${agreement.agreementNumber}: ` +
      `Cycle ${nextCycleNumber}/${termOfHireMonths}, Amount: RM ${billing.totalAmount.toFixed(2)}, ` +
      `Period: ${billingStartDate.toISOString().slice(0, 10)} to ${nextBillingEndDate.toISOString().slice(0, 10)}`
    );

    return { 
      success: true, 
      invoiceNumber,
      cycleNumber: nextCycleNumber,
      amount: billing.totalAmount,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating invoice for agreement ${agreementId}:`, error);
    return { success: false, reason: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check and generate subsequent invoices for all active agreements
 */
async function checkAndGenerateSubsequentInvoices() {
  try {
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
      console.log(`[${new Date().toISOString()}] No active agreements found`);
      return { checked: 0, generated: 0, errors: 0 };
    }

    console.log(`[${new Date().toISOString()}] Found ${activeAgreements.length} active agreement(s)`);

    let generatedCount = 0;
    let errorCount = 0;

    // Process each agreement
    for (const agreement of activeAgreements) {
      const result = await generateSubsequentInvoice(agreement.id);
      if (result.success) {
        generatedCount++;
      } else if (result.reason && !['No existing invoices', 'Billing period not ended', 'Invoice already exists', 'Overlapping invoice exists'].includes(result.reason)) {
        // Count as error only if it's not a normal skip reason
        errorCount++;
      }
    }

    console.log(`[${new Date().toISOString()}] Summary: Checked ${activeAgreements.length} agreement(s), Generated ${generatedCount} invoice(s), Errors: ${errorCount}`);
    
    return {
      checked: activeAgreements.length,
      generated: generatedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking agreements:`, error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`\n=== Subsequent Billing Generation Started at ${new Date().toISOString()} ===\n`);

  try {
    const results = await checkAndGenerateSubsequentInvoices();

    console.log(`\n=== Summary ===`);
    console.log(`Agreements checked: ${results.checked}`);
    console.log(`Invoices generated: ${results.generated}`);
    console.log(`Errors: ${results.errors}`);
    console.log(`=== Subsequent Billing Generation Completed at ${new Date().toISOString()} ===\n`);

  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] Fatal error in subsequent billing generation:`, error);
    process.exit(1);
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
}

// Run the script
main();
