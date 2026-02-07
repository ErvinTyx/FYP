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
 * Compute monthly rental from rFQItem (same rfqId): sum of totalPrice for all items.
 */
export async function computeMonthlyRentalFromRfqItems(
  prisma: PrismaClient,
  rfqId: string
): Promise<number> {
  type Row = { totalPrice: unknown };
  const rows = await prisma.rFQItem.findMany({
    where: { rfqId },
    select: { totalPrice: true },
  });
  const items = rows as unknown as Row[];
  const sum = items.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
  return Math.round(sum * 100) / 100;
}
