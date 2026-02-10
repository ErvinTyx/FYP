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
 * Compute termOfHire from rFQItem (same rfqId): sum of rentalMonths once per set (group by setName).
 * Each set contributes its rental duration once; multiple items in the same set are not double-counted.
 * Returns e.g. "9 months (270 days)" or null if no items.
 */
export async function computeTermOfHireFromRfqItems(
  prisma: PrismaClient,
  rfqId: string
): Promise<string | null> {
  type Row = { setName: string; rentalMonths: number };
  const rows = await prisma.rFQItem.findMany({
    where: { rfqId },
    select: { setName: true, rentalMonths: true } as { setName: true; rentalMonths: true },
  });
  const items = rows as unknown as Row[];
  if (items.length === 0) return null;
  const monthsBySet = new Map<string, number>();
  for (const row of items) {
    const name = row.setName ?? 'Set 1';
    if (!monthsBySet.has(name)) {
      monthsBySet.set(name, row.rentalMonths ?? 0);
    }
  }
  const totalMonths = [...monthsBySet.values()].reduce((a, b) => a + b, 0);
  if (totalMonths < 1) return null;
  const days = totalMonths * 30;
  return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'} (${days} days)`;
}

/**
 * Compute monthly rental from rFQItem (same rfqId).
 *
 * Formula (per set, grouped by setName):
 *   setTotal = sum(quantity × unitPrice × 30) × rentalMonths
 * Grand total = sum of all setTotals
 * Monthly rental = grandTotal / termOfHire (total months across all sets)
 */
export async function computeMonthlyRentalFromRfqItems(
  prisma: PrismaClient,
  rfqId: string
): Promise<number> {
  type Row = { setName: string; rentalMonths: number; quantity: number; unitPrice: unknown };
  const rows = await prisma.rFQItem.findMany({
    where: { rfqId },
    select: { setName: true, rentalMonths: true, quantity: true, unitPrice: true } as {
      setName: true; rentalMonths: true; quantity: true; unitPrice: true;
    },
  });
  const items = rows as unknown as Row[];
  if (items.length === 0) return 0;

  // Group items by setName
  const setMap = new Map<string, { rentalMonths: number; itemSum: number }>();
  for (const item of items) {
    const name = item.setName ?? 'Set 1';
    const existing = setMap.get(name);
    const lineValue = (item.quantity || 0) * (Number(item.unitPrice) || 0) * 30;
    if (existing) {
      existing.itemSum += lineValue;
    } else {
      setMap.set(name, {
        rentalMonths: item.rentalMonths ?? 1,
        itemSum: lineValue,
      });
    }
  }

  // Calculate grand total: each set's (sum of qty × unitPrice × 30) × rentalMonths
  let grandTotal = 0;
  let totalMonths = 0;
  for (const setData of setMap.values()) {
    grandTotal += setData.itemSum * setData.rentalMonths;
    totalMonths += setData.rentalMonths;
  }

  // Divide by term of hire (total months across all sets)
  if (totalMonths <= 0) return 0;
  const monthlyRental = grandTotal / totalMonths;
  return Math.round(monthlyRental * 100) / 100;
}
