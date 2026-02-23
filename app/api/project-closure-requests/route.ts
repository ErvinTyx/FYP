import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

/**
 * Generate next PCR-YYYY-NNN (e.g. PCR-2026-001)
 */
async function generateClosureRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PCR-${year}-`;

  const prismaAny = prisma as unknown as {
    projectClosureRequest: {
      findMany: (args: { where: { closureRequestNumber: { startsWith: string } }; orderBy: { closureRequestNumber: 'desc' }; take: number }) => Promise<{ closureRequestNumber: string }[]>;
    };
  };

  const latest = await prismaAny.projectClosureRequest.findMany({
    where: { closureRequestNumber: { startsWith: prefix } },
    orderBy: { closureRequestNumber: 'desc' },
    take: 1,
  });

  let seq = 1;
  if (latest.length > 0) {
    const parts = latest[0].closureRequestNumber.split('-');
    const n = parseInt(parts[2] ?? '0', 10);
    seq = n + 1;
  }
  return `${prefix}${seq.toString().padStart(3, '0')}`;
}

/**
 * GET /api/project-closure-requests
 * Returns signed agreements with their closure request (if any) for the Project Closure page.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Only agreements with signedStatus 'completed' appear (match common casings for DB compatibility)
    const agreements = await prisma.rentalAgreement.findMany({
      where: { signedStatus: { in: ['completed', 'Completed', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
    });

    const agreementIds = agreements.map((a) => a.id);
    const prismaAny = prisma as unknown as {
      projectClosureRequest: {
        findMany: (args: { where: { agreementId: { in: string[] } }; orderBy: { createdAt: 'desc' } }) => Promise<{
          id: string;
          closureRequestNumber: string;
          agreementId: string;
          requestDate: Date;
          status: string;
          approvedBy: string | null;
          approvedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }[]>;
      };
    };

    let closureRequests: Awaited<ReturnType<typeof prismaAny.projectClosureRequest.findMany>> = [];
    if (agreementIds.length > 0 && 'projectClosureRequest' in prismaAny) {
      closureRequests = await prismaAny.projectClosureRequest.findMany({
        where: { agreementId: { in: agreementIds } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const byAgreementId = new Map<string, (typeof closureRequests)[0]>();
    for (const cr of closureRequests) {
      if (!byAgreementId.has(cr.agreementId)) byAgreementId.set(cr.agreementId, cr);
    }

    // Fetch latest ReturnRequest status per agreement (by agreementNo)
    const agreementNumbers = agreements.map((a) => a.agreementNumber);
    const returnRequests = await prisma.returnRequest.findMany({
      where: { agreementNo: { in: agreementNumbers } },
      orderBy: { createdAt: 'desc' },
      select: { agreementNo: true, status: true },
    });
    const returnStatusByAgreementNo = new Map<string, string>();
    for (const rr of returnRequests) {
      if (!returnStatusByAgreementNo.has(rr.agreementNo)) {
        returnStatusByAgreementNo.set(rr.agreementNo, rr.status);
      }
    }

    // Calculate delivered vs returned quantities per agreement for return completion check
    // Step 1: Get all delivery requests and their sets/items for these agreements
    const deliveryRequests = await prisma.deliveryRequest.findMany({
      where: { agreementNo: { in: agreementNumbers } },
      select: {
        agreementNo: true,
        sets: {
          where: { status: { in: ['Completed', 'Customer Confirmed', 'Delivered'] } },
          select: {
            id: true,
            items: {
              select: {
                scaffoldingItemId: true,
                quantity: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Build delivered quantities per agreement: { agreementNo: { scaffoldingItemId: { name, delivered } } }
    const deliveredByAgreement = new Map<string, Map<string, { name: string; delivered: number }>>();
    const deliverySetIdsByAgreement = new Map<string, string[]>();
    for (const dr of deliveryRequests) {
      if (!deliveredByAgreement.has(dr.agreementNo)) {
        deliveredByAgreement.set(dr.agreementNo, new Map());
        deliverySetIdsByAgreement.set(dr.agreementNo, []);
      }
      const itemMap = deliveredByAgreement.get(dr.agreementNo)!;
      const setIds = deliverySetIdsByAgreement.get(dr.agreementNo)!;
      for (const set of dr.sets) {
        setIds.push(set.id);
        for (const item of set.items) {
          if (!item.scaffoldingItemId) continue;
          const existing = itemMap.get(item.scaffoldingItemId);
          if (existing) {
            existing.delivered += item.quantity;
          } else {
            itemMap.set(item.scaffoldingItemId, { name: item.name, delivered: item.quantity });
          }
        }
      }
    }

    // Step 2: Get all completed return requests and their items for these agreements
    const completedReturnRequests = await prisma.returnRequest.findMany({
      where: {
        agreementNo: { in: agreementNumbers },
        status: 'Completed',
      },
      select: {
        agreementNo: true,
        items: {
          select: {
            scaffoldingItemId: true,
            quantity: true,
          },
        },
      },
    });

    // Build returned quantities per agreement: { agreementNo: { scaffoldingItemId: returned } }
    const returnedByAgreement = new Map<string, Map<string, number>>();
    for (const rr of completedReturnRequests) {
      if (!returnedByAgreement.has(rr.agreementNo)) {
        returnedByAgreement.set(rr.agreementNo, new Map());
      }
      const itemMap = returnedByAgreement.get(rr.agreementNo)!;
      for (const item of rr.items) {
        if (!item.scaffoldingItemId) continue;
        const existing = itemMap.get(item.scaffoldingItemId) ?? 0;
        itemMap.set(item.scaffoldingItemId, existing + item.quantity);
      }
    }

    // Step 3: Calculate return completion status per agreement
    type ReturnCompletionInfo = {
      totalDelivered: number;
      totalReturned: number;
      isComplete: boolean;
      percentage: number;
      itemsRemaining: Array<{ name: string; remaining: number }>;
    };
    const returnCompletionByAgreementNo = new Map<string, ReturnCompletionInfo>();
    for (const agreementNo of agreementNumbers) {
      const delivered = deliveredByAgreement.get(agreementNo);
      const returned = returnedByAgreement.get(agreementNo) ?? new Map<string, number>();

      if (!delivered || delivered.size === 0) {
        // No deliveries yet - return process N/A (treat as not complete)
        returnCompletionByAgreementNo.set(agreementNo, {
          totalDelivered: 0,
          totalReturned: 0,
          isComplete: false,
          percentage: 0,
          itemsRemaining: [],
        });
        continue;
      }

      let totalDelivered = 0;
      let totalReturned = 0;
      const itemsRemaining: Array<{ name: string; remaining: number }> = [];

      for (const [itemId, info] of delivered) {
        const returnedQty = returned.get(itemId) ?? 0;
        totalDelivered += info.delivered;
        totalReturned += Math.min(returnedQty, info.delivered);
        const remaining = info.delivered - returnedQty;
        if (remaining > 0) {
          itemsRemaining.push({ name: info.name, remaining });
        }
      }

      const isComplete = itemsRemaining.length === 0 && totalDelivered > 0;
      const percentage = totalDelivered > 0 ? Math.round((totalReturned / totalDelivered) * 100) : 0;

      returnCompletionByAgreementNo.set(agreementNo, {
        totalDelivered,
        totalReturned,
        isComplete,
        percentage,
        itemsRemaining,
      });
    }

    // AdditionalCharge status per agreement (via ReturnRequest.agreementNo) for Scaffolding Shortage Detection badge
    const returnRequestsWithId = await prisma.returnRequest.findMany({
      where: { agreementNo: { in: agreementNumbers } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, agreementNo: true },
    });
    const returnRequestIdByAgreementNo = new Map<string, string>();
    for (const rr of returnRequestsWithId) {
      if (!returnRequestIdByAgreementNo.has(rr.agreementNo)) returnRequestIdByAgreementNo.set(rr.agreementNo, rr.id);
    }
    const returnRequestIds = [...returnRequestIdByAgreementNo.values()];
    const prismaAc = prisma as unknown as {
      additionalCharge: {
        findMany: (args: { where: { returnRequestId: { in: string[] } }; select: { returnRequestId: true; status: true } }) => Promise<{ returnRequestId: string | null; status: string }[]>;
      };
    };
    let additionalCharges: { returnRequestId: string; status: string }[] = [];
    if (returnRequestIds.length > 0 && 'additionalCharge' in prismaAc) {
      const raw = await prismaAc.additionalCharge.findMany({
        where: { returnRequestId: { in: returnRequestIds } },
        select: { returnRequestId: true, status: true },
      });
      additionalCharges = raw.filter((c): c is { returnRequestId: string; status: string } => c.returnRequestId != null);
    }
    const statusByReturnRequestId = new Map<string, string>();
    for (const ac of additionalCharges) {
      statusByReturnRequestId.set(ac.returnRequestId, ac.status);
    }
    const additionalChargeStatusByAgreementNo = new Map<string, string>();
    for (const [agreementNo, rrId] of returnRequestIdByAgreementNo) {
      const status = statusByReturnRequestId.get(rrId);
      if (status) additionalChargeStatusByAgreementNo.set(agreementNo, status);
    }

    // MonthlyRentalInvoice status per agreement (for View badges: Pending Payment | Pending Approval | Paid)
    // 1) Invoices linked by agreementId; 2) Invoices linked via deliveryRequest.agreementNo (agreementId often null)
    const monthlyRentalByAgreementId = new Map<string, 'Paid' | 'Pending Payment' | 'Pending Approval'>();
    if (agreementIds.length > 0) {
      const prismaMri = prisma as any;
      const byAgreementId = await prismaMri.monthlyRentalInvoice.findMany({
        where: { agreementId: { in: agreementIds } },
        select: { agreementId: true, status: true },
      });
      for (const inv of byAgreementId) {
        const aid = inv.agreementId;
        if (!aid) continue;
        const current = monthlyRentalByAgreementId.get(aid);
        if (inv.status === 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Payment');
        } else if (inv.status === 'Pending Approval' && current !== 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Approval');
        } else if (inv.status === 'Paid' && current !== 'Pending Payment' && current !== 'Pending Approval') {
          monthlyRentalByAgreementId.set(aid, 'Paid');
        }
      }
      const agreementIdByNumber = new Map(agreements.map((a) => [a.agreementNumber, a.id]));
      const byDeliveryAgreementNo = await prismaMri.monthlyRentalInvoice.findMany({
        where: { deliveryRequest: { agreementNo: { in: agreementNumbers } } },
        select: { status: true, deliveryRequest: { select: { agreementNo: true } } },
      } as any);
      for (const inv of byDeliveryAgreementNo) {
        const agreementNo = inv.deliveryRequest?.agreementNo;
        if (!agreementNo) continue;
        const aid = agreementIdByNumber.get(agreementNo);
        if (!aid) continue;
        const current = monthlyRentalByAgreementId.get(aid);
        if (inv.status === 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Payment');
        } else if (inv.status === 'Pending Approval' && current !== 'Pending Payment') {
          monthlyRentalByAgreementId.set(aid, 'Pending Approval');
        } else if (inv.status === 'Paid' && current !== 'Pending Payment' && current !== 'Pending Approval') {
          monthlyRentalByAgreementId.set(aid, 'Paid');
        }
      }
    }

    // Deposit status per agreement (for View badges: Paid vs Pending Payment)
    const prismaDep = prisma as unknown as {
      deposit: {
        findMany: (args: { where: { agreementId: { in: string[] } }; select: { agreementId: true; status: true } }) => Promise<{ agreementId: string; status: string }[]>;
      };
    };
    const depositStatusByAgreementId = new Map<string, string>();
    if (agreementIds.length > 0 && 'deposit' in prismaDep) {
      const deposits = await prismaDep.deposit.findMany({
        where: { agreementId: { in: agreementIds } },
        select: { agreementId: true, status: true },
      });
      for (const d of deposits) {
        if (!depositStatusByAgreementId.has(d.agreementId)) {
          depositStatusByAgreementId.set(d.agreementId, d.status);
        }
      }
    }

    // Earliest requiredDate per rfqId (from rFQItem) for Rental Start Date
    const agreementsWithRfq = agreements as Array<(typeof agreements)[0] & { rfqId?: string | null; totalRentalMonth?: number | null }>;
    const rfqIds = [...new Set(agreementsWithRfq.map((a) => a.rfqId).filter(Boolean))] as string[];
    const minDeliverByRfqId = new Map<string, Date>();
    if (rfqIds.length > 0) {
      const items = await prisma.rFQItem.findMany({
        where: { rfqId: { in: rfqIds } },
        select: { rfqId: true, requiredDate: true } as { rfqId: true; requiredDate: true },
      });
      for (const item of items) {
        const d = (item as { rfqId: string; requiredDate: Date }).requiredDate;
        if (d == null) continue;
        const existing = minDeliverByRfqId.get(item.rfqId);
        if (existing == null || d.getTime() < existing.getTime()) {
          minDeliverByRfqId.set(item.rfqId, d);
        }
      }
    }

    // ========== PAYMENT STATUS CALCULATION ==========
    
    // 1. Monthly Rental Invoices - fetch all invoices per agreement
    const prismaMri = prisma as unknown as {
      monthlyRentalInvoice: {
        findMany: (args: {
          where: { agreementId: { in: string[] } };
          select: { id: true; agreementId: true; invoiceNumber: true; status: true; billingMonth: true; billingYear: true };
          orderBy: { billingStartDate: 'asc' };
        }) => Promise<Array<{
          id: string;
          agreementId: string | null;
          invoiceNumber: string;
          status: string;
          billingMonth: number;
          billingYear: number;
        }>>;
      };
    };
    
    type MonthlyRentalInvoiceInfo = {
      invoiceNumber: string;
      status: string;
      billingMonth: number;
      billingYear: number;
    };
    
    const monthlyRentalInvoicesByAgreementId = new Map<string, MonthlyRentalInvoiceInfo[]>();
    if (agreementIds.length > 0 && 'monthlyRentalInvoice' in prismaMri) {
      const allInvoices = await prismaMri.monthlyRentalInvoice.findMany({
        where: { agreementId: { in: agreementIds } },
        select: { id: true, agreementId: true, invoiceNumber: true, status: true, billingMonth: true, billingYear: true },
        orderBy: { billingStartDate: 'asc' },
      });
      for (const inv of allInvoices) {
        if (!inv.agreementId) continue;
        if (!monthlyRentalInvoicesByAgreementId.has(inv.agreementId)) {
          monthlyRentalInvoicesByAgreementId.set(inv.agreementId, []);
        }
        monthlyRentalInvoicesByAgreementId.get(inv.agreementId)!.push({
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          billingMonth: inv.billingMonth,
          billingYear: inv.billingYear,
        });
      }
    }

    // 2. Deposits - fetch all deposits per agreement
    type DepositInfo = {
      depositNumber: string;
      status: string;
    };
    
    const depositsByAgreementId = new Map<string, DepositInfo[]>();
    if (agreementIds.length > 0 && 'deposit' in prismaDep) {
      const allDeposits = await prismaDep.deposit.findMany({
        where: { agreementId: { in: agreementIds } },
        select: { agreementId: true, status: true, depositNumber: true } as { agreementId: true; status: true; depositNumber: true },
      }) as Array<{ agreementId: string; status: string; depositNumber: string }>;
      for (const dep of allDeposits) {
        if (!depositsByAgreementId.has(dep.agreementId)) {
          depositsByAgreementId.set(dep.agreementId, []);
        }
        depositsByAgreementId.get(dep.agreementId)!.push({
          depositNumber: dep.depositNumber,
          status: dep.status,
        });
      }
    }

    // 3. Damage/Repair Charges - Check for unprocessed damage and fetch charges via openRepairSlipId
    type AdditionalChargeInfo = {
      invoiceNo: string;
      status: string;
      totalCharges: number;
    };
    
    type DamageStatus = {
      hasDamage: boolean;
      totalDamagedItems: number;
      totalRepairItems: number;
      hasUnprocessedDamage: boolean;
      charges: AdditionalChargeInfo[];
    };
    
    const damageStatusByAgreementNo = new Map<string, DamageStatus>();
    
    // Step 3a: Check ReturnItemCondition for damaged/replace items per agreement
    // Get all return request IDs per agreement
    const allReturnRequestsByAgreementNo = new Map<string, string[]>();
    for (const rr of returnRequestsWithId) {
      if (!allReturnRequestsByAgreementNo.has(rr.agreementNo)) {
        allReturnRequestsByAgreementNo.set(rr.agreementNo, []);
      }
      allReturnRequestsByAgreementNo.get(rr.agreementNo)!.push(rr.id);
    }
    
    // Fetch ReturnItemCondition for damaged/replace items
    const allReturnRequestIdsList = returnRequestsWithId.map(rr => rr.id);
    const damagedItemsByAgreementNo = new Map<string, number>();
    
    if (allReturnRequestIdsList.length > 0) {
      // Get all return request items first
      const returnRequestItems = await prisma.returnRequestItem.findMany({
        where: { returnRequestId: { in: allReturnRequestIdsList } },
        select: { id: true, returnRequestId: true },
      });
      const returnRequestItemIds = returnRequestItems.map(ri => ri.id);
      const returnRequestIdByItemId = new Map<string, string>();
      for (const ri of returnRequestItems) {
        returnRequestIdByItemId.set(ri.id, ri.returnRequestId);
      }
      
      // Fetch conditions with Damaged or Replace status
      if (returnRequestItemIds.length > 0) {
        const prismaRic = prisma as unknown as {
          returnItemCondition: {
            findMany: (args: {
              where: { returnRequestItemId: { in: string[] }; status: { in: string[] } };
              select: { returnRequestItemId: true; status: true; quantity: true };
            }) => Promise<Array<{ returnRequestItemId: string; status: string; quantity: number }>>;
          };
        };
        
        if ('returnItemCondition' in prismaRic) {
          const damagedConditions = await prismaRic.returnItemCondition.findMany({
            where: {
              returnRequestItemId: { in: returnRequestItemIds },
              status: { in: ['Damaged', 'Replace'] },
            },
            select: { returnRequestItemId: true, status: true, quantity: true },
          });
          
          for (const cond of damagedConditions) {
            const returnRequestId = returnRequestIdByItemId.get(cond.returnRequestItemId);
            if (!returnRequestId) continue;
            
            // Find agreementNo for this returnRequestId
            let agreementNo: string | null = null;
            for (const [agNo, rrIds] of allReturnRequestsByAgreementNo) {
              if (rrIds.includes(returnRequestId)) {
                agreementNo = agNo;
                break;
              }
            }
            if (!agreementNo) continue;
            
            const current = damagedItemsByAgreementNo.get(agreementNo) ?? 0;
            damagedItemsByAgreementNo.set(agreementNo, current + cond.quantity);
          }
        }
      }
    }
    
    // Step 3b: Check ConditionReport for repair/damaged items
    // Use returnRequestId to link ConditionReport to agreements (more reliable than DO number parsing)
    const conditionReportsByAgreementNo = new Map<string, Array<{ id: string; totalRepair: number; totalDamaged: number }>>();
    
    if (allReturnRequestIdsList.length > 0) {
      // Fetch condition reports linked to return requests
      const allConditionReports = await prisma.conditionReport.findMany({
        where: {
          returnRequestId: { in: allReturnRequestIdsList },
        },
        select: {
          id: true,
          returnRequestId: true,
          totalRepair: true,
          totalDamaged: true,
        },
      });
      
      for (const cr of allConditionReports) {
        if (!cr.returnRequestId) continue;
        
        // Find agreementNo for this returnRequestId
        let agreementNo: string | null = null;
        for (const [agNo, rrIds] of allReturnRequestsByAgreementNo) {
          if (rrIds.includes(cr.returnRequestId)) {
            agreementNo = agNo;
            break;
          }
        }
        if (!agreementNo) continue;
        
        if (!conditionReportsByAgreementNo.has(agreementNo)) {
          conditionReportsByAgreementNo.set(agreementNo, []);
        }
        conditionReportsByAgreementNo.get(agreementNo)!.push({
          id: cr.id,
          totalRepair: cr.totalRepair,
          totalDamaged: cr.totalDamaged,
        });
      }
    }
    
    // Step 3c: Get all OpenRepairSlips for these condition reports
    const allConditionReportIds = [...conditionReportsByAgreementNo.values()].flat().map(cr => cr.id);
    const repairSlipsByConditionReportId = new Map<string, string[]>();
    
    if (allConditionReportIds.length > 0) {
      const repairSlips = await prisma.openRepairSlip.findMany({
        where: { conditionReportId: { in: allConditionReportIds } },
        select: { id: true, conditionReportId: true },
      });
      
      for (const slip of repairSlips) {
        if (!repairSlipsByConditionReportId.has(slip.conditionReportId)) {
          repairSlipsByConditionReportId.set(slip.conditionReportId, []);
        }
        repairSlipsByConditionReportId.get(slip.conditionReportId)!.push(slip.id);
      }
    }
    
    // Step 3d: Fetch AdditionalCharges via openRepairSlipId
    const allRepairSlipIds = [...repairSlipsByConditionReportId.values()].flat();
    const chargesByRepairSlipId = new Map<string, AdditionalChargeInfo>();
    
    if (allRepairSlipIds.length > 0 && 'additionalCharge' in prismaAc) {
      const repairCharges = await (prismaAc as unknown as {
        additionalCharge: {
          findMany: (args: {
            where: { openRepairSlipId: { in: string[] } };
            select: { openRepairSlipId: true; invoiceNo: true; status: true; totalCharges: true };
          }) => Promise<Array<{ openRepairSlipId: string | null; invoiceNo: string; status: string; totalCharges: unknown }>>;
        };
      }).additionalCharge.findMany({
        where: { openRepairSlipId: { in: allRepairSlipIds } },
        select: { openRepairSlipId: true, invoiceNo: true, status: true, totalCharges: true },
      });
      
      for (const charge of repairCharges) {
        if (!charge.openRepairSlipId) continue;
        chargesByRepairSlipId.set(charge.openRepairSlipId, {
          invoiceNo: charge.invoiceNo,
          status: charge.status,
          totalCharges: Number(charge.totalCharges) || 0,
        });
      }
    }
    
    // Step 3e: Build damage status per agreement
    for (const agreementNo of agreementNumbers) {
      const damagedFromReturn = damagedItemsByAgreementNo.get(agreementNo) ?? 0;
      const conditionReports = conditionReportsByAgreementNo.get(agreementNo) ?? [];
      
      let totalRepairFromInspection = 0;
      let totalDamagedFromInspection = 0;
      const charges: AdditionalChargeInfo[] = [];
      let hasUnprocessedDamage = false;
      
      for (const cr of conditionReports) {
        totalRepairFromInspection += cr.totalRepair;
        totalDamagedFromInspection += cr.totalDamaged;
        
        // Check if this condition report has repair slips
        const repairSlipIds = repairSlipsByConditionReportId.get(cr.id) ?? [];
        
        if ((cr.totalRepair > 0 || cr.totalDamaged > 0) && repairSlipIds.length === 0) {
          // Damage exists but no repair slip created
          hasUnprocessedDamage = true;
        }
        
        // Get charges for repair slips
        for (const slipId of repairSlipIds) {
          const charge = chargesByRepairSlipId.get(slipId);
          if (charge) {
            charges.push(charge);
          } else if (cr.totalRepair > 0 || cr.totalDamaged > 0) {
            // Repair slip exists but no charge created yet
            hasUnprocessedDamage = true;
          }
        }
      }
      
      // Also check if there's damage from return but no condition report processed
      if (damagedFromReturn > 0 && conditionReports.length === 0) {
        hasUnprocessedDamage = true;
      }
      
      const hasDamage = damagedFromReturn > 0 || totalRepairFromInspection > 0 || totalDamagedFromInspection > 0;
      
      damageStatusByAgreementNo.set(agreementNo, {
        hasDamage,
        totalDamagedItems: damagedFromReturn + totalDamagedFromInspection,
        totalRepairItems: totalRepairFromInspection,
        hasUnprocessedDamage,
        charges,
      });
    }
    
    // For backward compatibility, also create additionalChargesByAgreementNo
    const additionalChargesByAgreementNo = new Map<string, AdditionalChargeInfo[]>();
    for (const [agreementNo, status] of damageStatusByAgreementNo) {
      additionalChargesByAgreementNo.set(agreementNo, status.charges);
    }

    // Build payment status per agreement
    type PaymentStatus = {
      monthlyRental: {
        expectedMonths: number;
        paidCount: number;
        pendingCount: number;
        isComplete: boolean;
        invoices: MonthlyRentalInvoiceInfo[];
      };
      deposit: {
        exists: boolean;
        status: string | null;
        isComplete: boolean;
        deposits: DepositInfo[];
      };
      additionalCharges: {
        hasDamage: boolean;
        totalDamagedItems: number;
        totalRepairItems: number;
        hasUnprocessedDamage: boolean;
        totalCount: number;
        approvedCount: number;
        isComplete: boolean;
        charges: AdditionalChargeInfo[];
      };
      isAllComplete: boolean;
    };
    
    const paymentStatusByAgreementId = new Map<string, PaymentStatus>();
    for (const agreement of agreementsWithRfq) {
      const expectedMonths = agreement.totalRentalMonth ?? 0;
      const invoices = monthlyRentalInvoicesByAgreementId.get(agreement.id) ?? [];
      const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
      const pendingCount = invoices.filter(inv => inv.status !== 'Paid').length;
      const monthlyRentalComplete = paidCount === expectedMonths && expectedMonths > 0;
      
      const deposits = depositsByAgreementId.get(agreement.id) ?? [];
      const depositExists = deposits.length > 0;
      const allDepositsPaid = deposits.every(d => d.status === 'Paid');
      const depositComplete = !depositExists || allDepositsPaid;
      const depositStatus = deposits.length > 0 ? deposits[0].status : null;
      
      // Get damage status for this agreement
      const damageStatus = damageStatusByAgreementNo.get(agreement.agreementNumber);
      const charges = damageStatus?.charges ?? [];
      // Treat both 'approved' and 'paid' as complete statuses
      const approvedCount = charges.filter(c => c.status.toLowerCase() === 'approved' || c.status.toLowerCase() === 'paid').length;
      const hasDamage = damageStatus?.hasDamage ?? false;
      const hasUnprocessedDamage = damageStatus?.hasUnprocessedDamage ?? false;
      
      // Additional charges complete if:
      // - No damage at all (N/A), OR
      // - Has damage, no unprocessed damage, and all charges are approved/paid
      const additionalChargesComplete = !hasDamage || (!hasUnprocessedDamage && charges.length > 0 && approvedCount === charges.length);
      
      const isAllComplete = monthlyRentalComplete && depositComplete && additionalChargesComplete;
      
      paymentStatusByAgreementId.set(agreement.id, {
        monthlyRental: {
          expectedMonths,
          paidCount,
          pendingCount,
          isComplete: monthlyRentalComplete,
          invoices,
        },
        deposit: {
          exists: depositExists,
          status: depositStatus,
          isComplete: depositComplete,
          deposits,
        },
        additionalCharges: {
          hasDamage,
          totalDamagedItems: damageStatus?.totalDamagedItems ?? 0,
          totalRepairItems: damageStatus?.totalRepairItems ?? 0,
          hasUnprocessedDamage,
          totalCount: charges.length,
          approvedCount,
          isComplete: additionalChargesComplete,
          charges,
        },
        isAllComplete,
      });
    }

    const rows = agreements.map((agreement) => {
      const closureRequest = byAgreementId.get(agreement.id) ?? null;
      const returnRequestStatus = returnStatusByAgreementNo.get(agreement.agreementNumber) ?? null;
      const returnCompletion = returnCompletionByAgreementNo.get(agreement.agreementNumber) ?? null;
      const paymentStatus = paymentStatusByAgreementId.get(agreement.id) ?? null;
      const ag = agreement as typeof agreement & { rfqId?: string | null };
      const rentalStartDate = ag.rfqId ? minDeliverByRfqId.get(ag.rfqId)?.toISOString() ?? null : null;
      const additionalChargeStatus = additionalChargeStatusByAgreementNo.get(agreement.agreementNumber) ?? null;
      const monthlyRentalPaymentStatus = monthlyRentalByAgreementId.get(agreement.id) ?? null;
      const depositStatus = depositStatusByAgreementId.get(agreement.id) ?? null;
      return {
        agreement: {
          id: agreement.id,
          agreementNumber: agreement.agreementNumber,
          projectName: agreement.projectName,
          hirer: agreement.hirer,
          hirerSignatoryName: agreement.hirerSignatoryName,
          termOfHire: agreement.termOfHire,
          rentalStartDate,
          additionalChargeStatus,
          monthlyRentalPaymentStatus,
          depositStatus,
        },
        closureRequest: closureRequest
          ? {
              id: closureRequest.id,
              closureRequestNumber: closureRequest.closureRequestNumber,
              agreementId: closureRequest.agreementId,
              requestDate: closureRequest.requestDate.toISOString(),
              status: closureRequest.status,
              approvedBy: closureRequest.approvedBy,
              approvedAt: closureRequest.approvedAt?.toISOString() ?? null,
              createdAt: closureRequest.createdAt.toISOString(),
              updatedAt: closureRequest.updatedAt.toISOString(),
            }
          : null,
        returnRequestStatus,
        returnCompletion,
        paymentStatus,
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET project-closure-requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load project closure list' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-closure-requests
 * Create a closure request for an agreement (when user checks Request Date).
 * Body: { agreementId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = session.user.roles?.some((role: string) => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { agreementId } = body;
    if (!agreementId || typeof agreementId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'agreementId is required' },
        { status: 400 }
      );
    }

    const agreement = await prisma.rentalAgreement.findUnique({
      where: { id: agreementId },
    });
    if (!agreement) {
      return NextResponse.json({ success: false, message: 'Agreement not found' }, { status: 404 });
    }
    const signedOk = agreement.signedStatus && ['completed', 'Completed', 'COMPLETED'].includes(agreement.signedStatus);
    if (!signedOk) {
      return NextResponse.json(
        { success: false, message: 'Only signed agreements (signedStatus completed) can have a closure request' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as unknown as {
      projectClosureRequest: {
        findFirst: (args: { where: { agreementId: string } }) => Promise<{ id: string } | null>;
        create: (args: {
          data: {
            closureRequestNumber: string;
            agreementId: string;
            requestDate: Date;
            status: string;
          };
        }) => Promise<{
          id: string;
          closureRequestNumber: string;
          agreementId: string;
          requestDate: Date;
          status: string;
          approvedBy: string | null;
          approvedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }>;
      };
    };

    const existing = await prismaAny.projectClosureRequest.findFirst({
      where: { agreementId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'This agreement already has a closure request' },
        { status: 400 }
      );
    }

    const closureRequestNumber = await generateClosureRequestNumber();
    const requestDate = new Date();

    const created = await prismaAny.projectClosureRequest.create({
      data: {
        closureRequestNumber,
        agreementId,
        requestDate,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        closureRequestNumber: created.closureRequestNumber,
        agreementId: created.agreementId,
        requestDate: created.requestDate.toISOString(),
        status: created.status,
        approvedBy: created.approvedBy,
        approvedAt: created.approvedAt?.toISOString() ?? null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST project-closure-requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create closure request' },
      { status: 500 }
    );
  }
}
