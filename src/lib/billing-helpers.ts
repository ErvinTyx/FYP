/**
 * Billing helper functions for rental invoice calculations.
 * 
 * Billing periods are 30-day cycles anchored to the earliest requiredDate
 * from the RFQ items associated with the rental agreement.
 */

/**
 * Calculate the billing period (start and end dates) for a given cycle.
 * 
 * Cycle 1: anchorDate → anchorDate + 29 days (30 days inclusive)
 * Cycle 2: anchorDate + 30 → anchorDate + 59 days
 * Cycle N: anchorDate + (N-1)*30 → anchorDate + N*30 - 1
 * 
 * @param anchorDate - The earliest requiredDate from RFQ items (rental start)
 * @param cycleNumber - Which billing cycle (1-based)
 * @returns { start, end, daysInPeriod }
 */
export function calculateBillingPeriod(
  anchorDate: Date,
  cycleNumber: number
): { start: Date; end: Date; daysInPeriod: number } {
  const start = new Date(anchorDate);
  start.setDate(start.getDate() + (cycleNumber - 1) * 30);

  const end = new Date(start);
  end.setDate(end.getDate() + 29); // 30 days inclusive

  return { start, end, daysInPeriod: 30 };
}

/**
 * Determine which billing cycle number a given date falls into,
 * relative to an anchor date (earliest requiredDate).
 * 
 * @param anchorDate - The earliest requiredDate from RFQ items (rental start)
 * @param targetDate - The date to check (e.g. today or a delivery date)
 * @returns The 1-based cycle number
 */
export function getCycleNumber(anchorDate: Date, targetDate: Date): number {
  const diffMs = targetDate.getTime() - anchorDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1; // Before anchor date, treat as cycle 1
  return Math.floor(diffDays / 30) + 1;
}

/**
 * Calculate usage days for an item within a billing period.
 * 
 * @param deliveryDate - Date when item was delivered (null if not delivered)
 * @param returnDate - Date when item was returned (null if not returned)
 * @param periodStart - Start date of the billing period
 * @param periodEnd - End date of the billing period
 * @returns Number of days the item was used in the billing period
 */
export function calculateUsageDays(
  deliveryDate: Date | null,
  returnDate: Date | null,
  periodStart: Date,
  periodEnd: Date
): number {
  // Usage starts from the later of: delivery date or period start
  const usageStart = deliveryDate 
    ? new Date(Math.max(deliveryDate.getTime(), periodStart.getTime()))
    : periodStart;
    
  // Usage ends at the earlier of: return date or period end
  const usageEnd = returnDate
    ? new Date(Math.min(returnDate.getTime(), periodEnd.getTime()))
    : periodEnd;
    
  // Calculate difference in days (inclusive of both start and end days)
  const diffTime = usageEnd.getTime() - usageStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Return at least 0 days (in case of invalid date ranges)
  return Math.max(0, diffDays + 1); // +1 to include both start and end days
}

/**
 * Calculate daily rate from monthly rate.
 * Since billing periods are always 30 days, the daily rate is simply monthlyRate / 30.
 * 
 * @param monthlyRate - Monthly rental rate
 * @returns Daily rate calculated as monthlyRate / 30
 */
export function calculateDailyRate(monthlyRate: number): number {
  return monthlyRate / 30;
}

/**
 * Enforce minimum rental duration
 * 
 * @param totalRentalDays - Total days the item was rented
 * @param minimumRentalMonths - Minimum rental period in months
 * @returns Number of days to charge (either totalRentalDays or minimumDays, whichever is greater)
 */
export function enforceMinimumCharge(
  totalRentalDays: number,
  minimumRentalMonths: number
): number {
  const minimumDays = minimumRentalMonths * 30;
  return Math.max(totalRentalDays, minimumDays);
}
