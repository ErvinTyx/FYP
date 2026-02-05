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
 * Compute termOfHire from rFQItem (same rfqId): earliest deliverDate to latest returnDate.
 * Returns e.g. "180 days (15 Jan 2026 - 14 Jul 2026)" or null if no items with both dates.
 */
export async function computeTermOfHireFromRfqItems(
  prisma: PrismaClient,
  rfqId: string
): Promise<string | null> {
  type Row = { deliverDate: Date | null; returnDate: Date | null };
  const rows = await prisma.rFQItem.findMany({
    where: { rfqId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client may be out of sync; schema has deliverDate/returnDate on rFQItem
    select: { deliverDate: true, returnDate: true } as any,
  });
  const items = rows as unknown as Row[];
  const itemsWithDates = items.filter((d) => d.deliverDate != null && d.returnDate != null);
  if (itemsWithDates.length === 0) return null;
  const deliverDates = itemsWithDates.map((d) => d.deliverDate!).filter((d): d is Date => d != null);
  const returnDates = itemsWithDates.map((d) => d.returnDate!).filter((d): d is Date => d != null);
  if (deliverDates.length === 0 || returnDates.length === 0) return null;
  const minDeliver = new Date(Math.min(...deliverDates.map((d) => d.getTime())));
  const maxReturn = new Date(Math.max(...returnDates.map((d) => d.getTime())));
  const totalDays = Math.ceil((maxReturn.getTime() - minDeliver.getTime()) / (24 * 60 * 60 * 1000));
  if (totalDays < 0) return null;
  const days = Math.max(1, totalDays);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
  return `${days} day${days !== 1 ? 's' : ''} (${fmt(minDeliver)} - ${fmt(maxReturn)})`;
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
