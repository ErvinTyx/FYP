/**
 * Shared utilities for Additional Charge creation from Delivery & Return workflows.
 * Invoice format: AC-YYYYMMDD-XXXXX (matches repair-slip charges)
 */

import { prisma } from '@/lib/prisma';

export function generateAdditionalChargeInvoiceNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `AC-${dateStr}-${random}`;
}

export async function createChargeForReturn(params: {
  returnRequestId: string;
  pickupFee: number;
  customerName: string;
  agreementNo: string;
}) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const invoiceNo = generateAdditionalChargeInvoiceNo();

  return prisma.additionalCharge.create({
    data: {
      invoiceNo,
      returnRequestId: params.returnRequestId,
      customerName: params.customerName,
      doId: params.agreementNo,
      dueDate,
      status: 'pending_payment',
      totalCharges: params.pickupFee,
      items: {
        create: [
          {
            itemName: 'Return Pickup Fee',
            itemType: 'Other',
            quantity: 1,
            unitPrice: params.pickupFee,
            amount: params.pickupFee,
          },
        ],
      },
    },
    include: { items: true },
  });
}

export async function createChargeForDelivery(params: {
  deliverySetId: string;
  deliveryFee: number;
  customerName: string;
  agreementNo: string;
}) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const invoiceNo = generateAdditionalChargeInvoiceNo();

  return prisma.additionalCharge.create({
    data: {
      invoiceNo,
      deliverySetId: params.deliverySetId,
      customerName: params.customerName,
      doId: params.agreementNo,
      dueDate,
      status: 'pending_payment',
      totalCharges: params.deliveryFee,
      items: {
        create: [
          {
            itemName: 'Delivery Fee',
            itemType: 'Other',
            quantity: 1,
            unitPrice: params.deliveryFee,
            amount: params.deliveryFee,
          },
        ],
      },
    },
    include: { items: true },
  });
}
