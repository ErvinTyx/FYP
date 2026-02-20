import type { PrismaClient } from '@prisma/client';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute durationDays for a single rFQItem from deliverDate and returnDate.
 * Returns { durationDays: number } or { durationDays: null } if dates missing/invalid.
 */
export function computeRfqItemDurationAndSubtotal(
  deliverDate: Date | null,
  returnDate: Date | null,
  _totalPrice?: number | unknown
): { durationDays: number | null } {
  if (deliverDate == null || returnDate == null) return { durationDays: null };
  const days = Math.ceil((returnDate.getTime() - deliverDate.getTime()) / MS_PER_DAY);
  if (days < 0) return { durationDays: null };
  return { durationDays: days };
}

/**
 * Format term of hire for display from total days.
 * - If < 30 days: "XX days"
 * - If >= 30 and remainder 0: "X month(s) (ZZ days)"
 * - If >= 30 and remainder > 0: "X month(s) Y days (ZZ days)"
 */
export function formatTermOfHireFromDays(days: number): string {
  const totalDays = Math.max(0, Math.floor(days));
  if (totalDays < 30) return `${totalDays} days`;
  const months = Math.floor(totalDays / 30);
  const remainder = totalDays % 30;
  const monthLabel = months === 1 ? 'month' : 'months';
  if (remainder === 0) {
    return `${months} ${monthLabel} (${totalDays} days)`;
  }
  const dayLabel = remainder === 1 ? 'day' : 'days';
  return `${months} ${monthLabel} ${remainder} ${dayLabel} (${totalDays} days)`;
}

/**
 * From total term days, compute "total rental month" for billing/display.
 * Rule: full months = floor(days/30), remainder = days % 30.
 * If remainder >= 15, round up to next month; otherwise use full months.
 * Examples: 67 days → 2 months 7 days → 2; 75 days → 2 months 15 days → 3.
 */
export function getTotalRentalMonthFromDays(days: number): number {
  const d = Math.max(0, Math.floor(days));
  const fullMonths = Math.floor(d / 30);
  const remainder = d % 30;
  return fullMonths + (remainder >= 15 ? 1 : 0);
}

/**
 * Parse total days from a term-of-hire string.
 * Supports: "2 months 16 days (76 days)", "1 month (30 days)", "16 days"
 */
export function parseDaysFromTermOfHireString(str: string | null | undefined): number | null {
  if (!str?.trim()) return null;
  const s = str.trim();
  const parenMatch = s.match(/\((\d+)\s*days?\)/i);
  if (parenMatch) return parseInt(parenMatch[1], 10);
  const onlyDaysMatch = s.match(/^(\d+)\s*days?$/i);
  if (onlyDaysMatch) return parseInt(onlyDaysMatch[1], 10);
  return null;
}

/**
 * Compute term of hire from RFQ items (grouped by set).
 * Per set: end date = Required Date + (Rental Duration in months × 30 days).
 * Earliest start = min(Required Date) across all sets.
 * Latest end = max(end date) across all sets.
 * Term (days) = Latest end − Earliest start. Returns formatted string or null if no items.
 */
export async function computeTermOfHireFromRfqItems(
  prisma: PrismaClient,
  rfqId: string
): Promise<string | null> {
  type Row = { setName: string; requiredDate: Date; rentalMonths: number };
  const rows = await prisma.rFQItem.findMany({
    where: { rfqId },
    select: { setName: true, requiredDate: true, rentalMonths: true } as {
      setName: true;
      requiredDate: true;
      rentalMonths: true;
    },
  });
  const items = rows as unknown as Row[];
  if (items.length === 0) return null;

  // One (requiredDate, rentalMonths) per set (setName); use earliest requiredDate per set
  const setMap = new Map<
    string,
    { requiredDate: number; rentalMonths: number }
  >();
  for (const row of items) {
    const name = row.setName ?? 'Set 1';
    const reqTime = row.requiredDate.getTime();
    const months = Math.max(1, row.rentalMonths ?? 1);
    const existing = setMap.get(name);
    if (!existing) {
      setMap.set(name, { requiredDate: reqTime, rentalMonths: months });
    } else if (reqTime < existing.requiredDate) {
      existing.requiredDate = reqTime;
    }
  }

  let earliestStart = Infinity;
  let latestEnd = -Infinity;
  for (const set of setMap.values()) {
    const endTime = set.requiredDate + set.rentalMonths * 30 * MS_PER_DAY;
    if (set.requiredDate < earliestStart) earliestStart = set.requiredDate;
    if (endTime > latestEnd) latestEnd = endTime;
  }
  if (earliestStart === Infinity || latestEnd === -Infinity) return null;
  const termDays = Math.ceil((latestEnd - earliestStart) / MS_PER_DAY);
  if (termDays < 0) return null;
  return formatTermOfHireFromDays(termDays);
}
