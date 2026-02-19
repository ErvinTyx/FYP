/**
 * Resolve the agreementId for a credit note based on its source invoice.
 * - Deposit: direct agreementId
 * - MonthlyRentalInvoice: direct agreementId
 * - AdditionalCharge: indirect via deliverySet/returnRequest/openRepairSlip chains
 */
import prisma from '@/lib/prisma';

export async function resolveAgreementId(
  invoiceType: string,
  sourceId: string | null | undefined
): Promise<string | null> {
  if (!sourceId) return null;

  try {
    if (invoiceType === 'deposit') {
      const deposit = await prisma.deposit.findUnique({
        where: { id: sourceId },
        select: { agreementId: true },
      });
      return deposit?.agreementId ?? null;
    }

    if (invoiceType === 'monthlyRental') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = await (prisma as any).monthlyRentalInvoice.findUnique({
        where: { id: sourceId },
        select: { agreementId: true },
      });
      return invoice?.agreementId ?? null;
    }

    if (invoiceType === 'additionalCharge') {
      const charge = await prisma.additionalCharge.findUnique({
        where: { id: sourceId },
        select: {
          deliverySetId: true,
          returnRequestId: true,
          openRepairSlipId: true,
        },
      });
      if (!charge) return null;

      // Try via deliverySet -> deliveryRequest -> rfq -> agreement
      if (charge.deliverySetId) {
        const ds = await prisma.deliverySet.findUnique({
          where: { id: charge.deliverySetId },
          select: { deliveryRequest: { select: { rfqId: true } } },
        });
        if (ds?.deliveryRequest?.rfqId) {
          const agreement = await prisma.rentalAgreement.findFirst({
            where: { rfqId: ds.deliveryRequest.rfqId },
            select: { id: true },
          });
          if (agreement) return agreement.id;
        }
      }

      // Try via returnRequest -> deliverySet -> deliveryRequest -> rfq -> agreement
      if (charge.returnRequestId) {
        const rr = await prisma.returnRequest.findUnique({
          where: { id: charge.returnRequestId },
          select: {
            deliverySet: {
              select: { deliveryRequest: { select: { rfqId: true } } },
            },
          },
        });
        if (rr?.deliverySet?.deliveryRequest?.rfqId) {
          const agreement = await prisma.rentalAgreement.findFirst({
            where: { rfqId: rr.deliverySet.deliveryRequest.rfqId },
            select: { id: true },
          });
          if (agreement) return agreement.id;
        }
      }

      // Try via openRepairSlip -> conditionReport -> returnRequest -> deliverySet -> deliveryRequest -> rfq -> agreement
      if (charge.openRepairSlipId) {
        const slip = await prisma.openRepairSlip.findUnique({
          where: { id: charge.openRepairSlipId },
          select: {
            conditionReport: {
              select: {
                returnRequest: {
                  select: {
                    deliverySet: {
                      select: { deliveryRequest: { select: { rfqId: true } } },
                    },
                  },
                },
              },
            },
          },
        });
        const rfqId =
          slip?.conditionReport?.returnRequest?.deliverySet?.deliveryRequest
            ?.rfqId;
        if (rfqId) {
          const agreement = await prisma.rentalAgreement.findFirst({
            where: { rfqId },
            select: { id: true },
          });
          if (agreement) return agreement.id;
        }
      }
    }
  } catch (error) {
    console.error('[resolveAgreementId] Error:', error);
  }

  return null;
}
