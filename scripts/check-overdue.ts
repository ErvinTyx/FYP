#!/usr/bin/env node
/**
 * Cron script to check and update overdue items:
 * - Deposits
 * - Additional Charges
 * - Monthly Rental Invoices (with interest calculation)
 * 
 * Run this script via crontab:
 * 0 0 * * * cd /path/to/project && npx tsx scripts/check-overdue.ts >> logs/overdue-check.log 2>&1
 */

import "dotenv/config";
import prisma from "../src/lib/prisma";

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
 * Check and update overdue deposits
 */
async function checkOverdueDeposits() {
  try {
    const now = new Date();
    
    // Find deposits that are pending payment or rejected and past due date
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

    if (overdueDeposits.length === 0) {
      console.log(`[${new Date().toISOString()}] No overdue deposits found`);
      return { updated: 0 };
    }

    // Update status to Overdue
    const result = await prisma.deposit.updateMany({
      where: {
        id: {
          in: overdueDeposits.map(d => d.id),
        },
      },
      data: {
        status: 'Overdue',
      },
    });

    console.log(`[${new Date().toISOString()}] Updated ${result.count} deposit(s) to Overdue status`);
    return { updated: result.count };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking overdue deposits:`, error);
    throw error;
  }
}

/**
 * Check and update overdue additional charges
 */
async function checkOverdueAdditionalCharges() {
  try {
    const now = new Date();
    
    // Find additional charges that are pending payment or rejected and past due date
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

    if (overdueCharges.length === 0) {
      console.log(`[${new Date().toISOString()}] No overdue additional charges found`);
      return { updated: 0 };
    }

    // Update status to overdue (using snake_case to match database pattern)
    // Note: If 'overdue' is not a valid status in your schema, you may need to add it
    // or use a different approach (e.g., keep as 'pending_payment' and track separately)
    const result = await prisma.additionalCharge.updateMany({
      where: {
        id: {
          in: overdueCharges.map(c => c.id),
        },
      },
      data: {
        status: 'overdue',
      },
    });

    console.log(`[${new Date().toISOString()}] Updated ${result.count} additional charge(s) to overdue status`);
    return { updated: result.count };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking overdue additional charges:`, error);
    throw error;
  }
}

/**
 * Check and update overdue monthly rental invoices
 * Also calculates and applies default interest
 */
async function checkOverdueMonthlyRentals() {
  try {
    const now = new Date();
    
    // Find invoices that are pending payment or rejected and past due date
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

    if (overdueInvoices.length === 0) {
      console.log(`[${new Date().toISOString()}] No overdue monthly rental invoices found`);
      return { updated: 0 };
    }

    let updatedCount = 0;
    
    // Update each invoice with overdue status and calculate interest
    for (const invoice of overdueInvoices) {
      const defaultInterest = invoice.agreement?.defaultInterest 
        ? Number(invoice.agreement.defaultInterest) 
        : 1.5; // Default to 1.5% if not specified
      
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
      console.log(
        `[${new Date().toISOString()}] Updated invoice ${invoice.invoiceNumber}: ` +
        `Overdue charges: ${overdueCharges.toFixed(2)}, Total: ${totalAmount.toFixed(2)}`
      );
    }

    console.log(`[${new Date().toISOString()}] Updated ${updatedCount} monthly rental invoice(s) to Overdue status with interest`);
    return { updated: updatedCount };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking overdue monthly rentals:`, error);
    throw error;
  }
}

/**
 * Main function to run all overdue checks
 */
async function main() {
  console.log(`\n=== Overdue Check Started at ${new Date().toISOString()} ===\n`);

  const results = {
    deposits: { updated: 0 },
    additionalCharges: { updated: 0 },
    monthlyRentals: { updated: 0 },
  };

  try {
    // Check deposits
    console.log('Checking deposits...');
    results.deposits = await checkOverdueDeposits();

    // Check additional charges
    console.log('Checking additional charges...');
    results.additionalCharges = await checkOverdueAdditionalCharges();

    // Check monthly rentals
    console.log('Checking monthly rental invoices...');
    results.monthlyRentals = await checkOverdueMonthlyRentals();

    const totalUpdated = 
      results.deposits.updated + 
      results.additionalCharges.updated + 
      results.monthlyRentals.updated;

    console.log(`\n=== Summary ===`);
    console.log(`Deposits updated: ${results.deposits.updated}`);
    console.log(`Additional charges updated: ${results.additionalCharges.updated}`);
    console.log(`Monthly rental invoices updated: ${results.monthlyRentals.updated}`);
    console.log(`Total items updated: ${totalUpdated}`);
    console.log(`=== Overdue Check Completed at ${new Date().toISOString()} ===\n`);

  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] Fatal error in overdue check:`, error);
    process.exit(1);
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
}

// Run the script
main();
