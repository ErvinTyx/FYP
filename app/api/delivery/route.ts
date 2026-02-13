import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createChargeForDelivery } from '@/lib/additional-charge-utils';
import { calculateUsageDays, calculateDailyRate, enforceMinimumCharge, calculateBillingPeriod, getCycleNumber } from '@/lib/billing-helpers';

// Roles allowed to manage delivery requests
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

/**
 * Auto-generate first monthly rental invoice when delivery is completed
 * Uses agreement-based billing with daily proration
 */
async function autoGenerateMonthlyInvoice(deliveryRequestId: string) {
  // Get delivery request
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId },
    include: {
      sets: {
        where: { status: 'Completed' },
        include: {
          items: true,
          completion: true,
        },
      },
    },
  });

  if (!delivery) {
    console.log(`Delivery request ${deliveryRequestId} not found, skipping invoice generation`);
    return;
  }

  // Find agreement by agreement number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agreement = await (prisma.rentalAgreement.findFirst as any)({
    where: {
      agreementNumber: delivery.agreementNo,
    },
    include: {
      items: true,
    },
  });

  if (!agreement) {
    console.log(`Agreement ${delivery.agreementNo} not found for delivery ${deliveryRequestId}, skipping invoice generation`);
    return;
  }

  // Validate agreement status (must be active)
  const activeStatuses = ['Active', 'active', 'Signed', 'signed'];
  if (!activeStatuses.includes(agreement.status)) {
    console.log(`Agreement ${agreement.id} is not active (status: ${agreement.status}), skipping invoice generation`);
    return;
  }

  // Get the earliest requiredDate from RFQ items as billing cycle anchor
  let anchorDate: Date | null = null;
  if (agreement.rfqId) {
    const rfqItems = await prisma.rFQItem.findMany({
      where: { rfqId: agreement.rfqId },
      select: { requiredDate: true },
      orderBy: { requiredDate: 'asc' },
      take: 1,
    });
    if (rfqItems.length > 0) {
      anchorDate = new Date(rfqItems[0].requiredDate);
    }
  }

  if (!anchorDate) {
    console.log(`No requiredDate found for agreement ${agreement.id}, skipping invoice generation`);
    return;
  }

  // Determine billing cycle: find latest existing invoice or start from cycle 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestExistingInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
    where: { agreementId: agreement.id },
    orderBy: { billingStartDate: 'desc' },
  });

  let cycleNumber: number;
  if (latestExistingInvoice) {
    const lastEnd = new Date(latestExistingInvoice.billingEndDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(nextStart.getDate() + 1);
    cycleNumber = getCycleNumber(anchorDate, nextStart);
  } else {
    cycleNumber = 1;
  }

  const { start: billingStartDate, end: billingEndDate, daysInPeriod } = calculateBillingPeriod(anchorDate, cycleNumber);
  const billingMonth = billingStartDate.getMonth() + 1;
  const billingYear = billingStartDate.getFullYear();

  // Check if invoice already exists for this agreement and billing period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
    where: {
      agreementId: agreement.id,
      billingMonth,
      billingYear,
    },
  });

  if (existingInvoice) {
    console.log(`Invoice already exists for agreement ${agreement.id} for period starting ${billingStartDate.toISOString().slice(0, 10)}`);
    return;
  }

  // Get all deliveries for this agreement
  const allDeliveries = await prisma.deliveryRequest.findMany({
    where: {
      agreementNo: agreement.agreementNumber,
    },
    include: {
      sets: {
        where: { status: 'Completed' },
        include: {
          items: true,
          completion: true,
        },
      },
    },
  });

  // Get all returns for this agreement
  const returns = await prisma.returnRequest.findMany({
    where: {
      agreementNo: agreement.agreementNumber,
      status: { in: ['Completed', 'Sorting Complete', 'Customer Notified'] },
    },
    include: {
      items: true,
      completion: true,
    },
  });

  // Calculate delivered quantities per item and track delivery dates
  const deliveredData: Record<string, { qty: number; earliestDelivery: Date | null }> = {};
  for (const del of allDeliveries) {
    for (const set of del.sets) {
      const deliveryDate = set.completion?.deliveredAt 
        ? new Date(set.completion.deliveredAt)
        : (set.createdAt ? new Date(set.createdAt) : null);
      
      for (const item of set.items) {
        const itemId = item.scaffoldingItemId || item.name;
        if (!deliveredData[itemId]) {
          deliveredData[itemId] = { qty: 0, earliestDelivery: null };
        }
        deliveredData[itemId].qty += item.quantity;
        
        if (deliveryDate) {
          if (!deliveredData[itemId].earliestDelivery || deliveryDate < deliveredData[itemId].earliestDelivery) {
            deliveredData[itemId].earliestDelivery = deliveryDate;
          }
        }
      }
    }
  }

  // Calculate returned quantities per item and track return dates
  const returnedData: Record<string, { qty: number; latestReturn: Date | null }> = {};
  for (const returnReq of returns) {
    const returnDate = returnReq.completion?.completedAt
      ? new Date(returnReq.completion.completedAt)
      : null;
    
    for (const item of returnReq.items) {
      const itemId = item.scaffoldingItemId || item.name;
      if (!returnedData[itemId]) {
        returnedData[itemId] = { qty: 0, latestReturn: null };
      }
      returnedData[itemId].qty += item.quantityReturned;
      
      if (returnDate) {
        if (!returnedData[itemId].latestReturn || returnDate > returnedData[itemId].latestReturn) {
          returnedData[itemId].latestReturn = returnDate;
        }
      }
    }
  }

  // Calculate billing for each AgreementItem using 30-day period
  let totalAmount = 0;
  const items: Array<{
    scaffoldingItemId: string;
    scaffoldingItemName: string;
    quantityBilled: number;
    unitPrice: number;
    daysCharged: number;
    lineTotal: number;
  }> = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const agreementItem of (agreement.items as any[])) {
    const itemId = agreementItem.scaffoldingItemId;
    const delivered = deliveredData[itemId] || { qty: 0, earliestDelivery: null };
    const returned = returnedData[itemId] || { qty: 0, latestReturn: null };
    
    const netQty = delivered.qty - returned.qty;
    if (netQty > 0) {
      // Calculate usage days within the 30-day billing period
      const usageDays = calculateUsageDays(
        delivered.earliestDelivery,
        returned.latestReturn,
        billingStartDate,
        billingEndDate
      );

      // Calculate daily rate (monthly rate / 30)
      const dailyRate = calculateDailyRate(
        Number(agreementItem.agreedMonthlyRate)
      );

      // Enforce minimum rental duration
      const totalRentalDays = usageDays;
      const chargeDays = enforceMinimumCharge(
        totalRentalDays,
        agreementItem.minimumRentalMonths
      );

      // Calculate line total: netQty × dailyRate × chargeDays
      const lineTotal = netQty * dailyRate * chargeDays;
      totalAmount += lineTotal;

      items.push({
        scaffoldingItemId: itemId,
        scaffoldingItemName: agreementItem.scaffoldingItemName,
        quantityBilled: netQty,
        unitPrice: dailyRate,
        daysCharged: chargeDays,
        lineTotal,
      });
    }
  }

  if (items.length === 0) {
    console.log(`No billable items found for delivery ${deliveryRequestId}`);
    return;
  }

  // Generate invoice number
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MRI-${dateStr}-`;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestInvoice = await (prisma as any).monthlyRentalInvoice.findFirst({
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
  if (latestInvoice) {
    const lastSequence = parseInt(latestInvoice.invoiceNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }
  const invoiceNumber = `${prefix}${sequence.toString().padStart(3, '0')}`;

  // Calculate due date (7 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  // Create invoice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).monthlyRentalInvoice.create({
    data: {
      invoiceNumber,
      deliveryRequestId,
      agreementId: agreement.id,
      customerName: delivery.customerName,
      customerEmail: delivery.customerEmail,
      customerPhone: delivery.customerPhone,
      billingMonth,
      billingYear,
      billingStartDate,
      billingEndDate,
      daysInPeriod,
      baseAmount: totalAmount,
      overdueCharges: 0,
      totalAmount,
      status: 'Pending Payment',
      dueDate,
      items: {
        create: items,
      },
    },
  });

  console.log(`Auto-generated monthly invoice ${invoiceNumber} for agreement ${agreement.id} (delivery ${deliveryRequestId}), period: ${billingStartDate.toISOString().slice(0, 10)} to ${billingEndDate.toISOString().slice(0, 10)}`);
}

/**
 * GET /api/delivery
 * List all delivery requests with their sets and items
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to view delivery requests' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requestId = searchParams.get('requestId');

    // Build where clause for sets filtering
    const setsWhere: Record<string, unknown> = {};
    if (status) {
      setsWhere.status = status;
    }

    // Build where clause for main query
    const where: Record<string, unknown> = {};
    if (requestId) {
      where.requestId = {
        contains: requestId,
      };
    }

    // Try to include rfq relation and step tables, fall back to basic query if relation doesn't exist yet
    let deliveryRequests;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deliveryRequests = await (prisma.deliveryRequest.findMany as any)({
        where,
        include: {
          sets: {
            where: Object.keys(setsWhere).length > 0 ? setsWhere : undefined,
            include: {
              items: true,
              packingList: true,
              stockCheck: true,
              schedule: true,
              packingLoading: true,
              dispatch: true,
              doIssued: true,
              completion: true,
              customerAck: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          rfq: {
            include: {
              items: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch {
      // Fallback: rfq relation might not exist yet (migration not run)
      deliveryRequests = await prisma.deliveryRequest.findMany({
        where,
        include: {
          sets: {
            where: Object.keys(setsWhere).length > 0 ? setsWhere : undefined,
            include: {
              items: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    // Batch-fetch additional charge statuses for all delivery sets
    const allSetIds: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deliveryRequests.forEach((req: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.sets?.forEach((set: any) => { allSetIds.push(set.id); });
    });
    const chargeRecords = allSetIds.length > 0
      ? await prisma.additionalCharge.findMany({
          where: { deliverySetId: { in: allSetIds } },
          select: { deliverySetId: true, status: true },
        })
      : [];
    const chargeStatusMap = new Map(chargeRecords.map(c => [c.deliverySetId, c.status]));

    // Collect all scaffoldingItemIds to fetch real stock levels
    const allScaffoldingItemIds = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deliveryRequests.forEach((req: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.sets?.forEach((set: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set.items?.forEach((item: any) => {
          if (item.scaffoldingItemId) {
            allScaffoldingItemIds.add(item.scaffoldingItemId);
          }
        });
      });
    });

    // Fetch real stock levels from ScaffoldingItem
    const scaffoldingItems = allScaffoldingItemIds.size > 0 
      ? await prisma.scaffoldingItem.findMany({
          where: { id: { in: Array.from(allScaffoldingItemIds) } },
          select: { id: true, available: true, name: true }
        })
      : [];
    
    // Build lookup map for stock levels
    const stockMap = new Map(scaffoldingItems.map(s => [s.id, s.available]));

    // Transform the data for the frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRequests = deliveryRequests.map((req: any) => ({
      id: req.id,
      requestId: req.requestId,
      customerName: req.customerName,
      agreementNo: req.agreementNo,
      customerPhone: req.customerPhone,
      customerEmail: req.customerEmail,
      deliveryAddress: req.deliveryAddress,
      deliveryType: req.deliveryType,
      requestDate: req.requestDate.toISOString().split('T')[0],
      totalSets: req.totalSets,
      deliveredSets: req.deliveredSets,
      pickupTime: req.pickupTime,
      rfqId: req.rfqId || null,
      rfq: req.rfq ? {
        id: req.rfq.id,
        rfqNumber: req.rfq.rfqNumber,
        customerName: req.rfq.customerName,
        customerEmail: req.rfq.customerEmail,
        customerPhone: req.rfq.customerPhone,
        projectName: req.rfq.projectName,
        projectLocation: req.rfq.projectLocation,
        status: req.rfq.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: req.rfq.items.map((item: any) => ({
          id: item.id,
          scaffoldingItemId: item.scaffoldingItemId,
          scaffoldingItemName: item.scaffoldingItemName,
          quantity: item.quantity,
          unit: item.unit,
        })),
      } : null,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sets: req.sets.map((set: any) => ({
        id: set.id,
        setName: set.setName,
        scheduledPeriod: set.scheduledPeriod,
        status: set.status,
        quotedAmount: set.quotedAmount ? Number(set.quotedAmount) : undefined,
        deliveryFee: set.deliveryFee ? Number(set.deliveryFee) : undefined,
        createdBy: set.createdBy,
        notes: set.notes,
        // Flatten step data for backward compatibility
        // Packing List step
        packingListNumber: set.packingList?.packingListNumber,
        packingListDate: set.packingList?.packingListDate?.toISOString(),
        packingListIssued: !!set.packingList?.packingListNumber,
        // Stock Check step
        stockCheckDate: set.stockCheck?.checkDate?.toISOString(),
        stockCheckBy: set.stockCheck?.checkedBy,
        stockCheckNotes: set.stockCheck?.notes,
        allItemsAvailable: set.stockCheck?.allItemsAvailable,
        // Schedule step
        scheduledTimeSlot: set.schedule?.scheduledTimeSlot,
        scheduleConfirmedAt: set.schedule?.confirmedAt?.toISOString(),
        scheduleConfirmedBy: set.schedule?.confirmedBy,
        deliveryDate: set.schedule?.scheduledDate?.toISOString().split('T')[0],
        // Packing & Loading step
        packingStartedAt: set.packingLoading?.packingStartedAt?.toISOString(),
        packingStartedBy: set.packingLoading?.packingStartedBy,
        loadingCompletedAt: set.packingLoading?.loadingCompletedAt?.toISOString(),
        loadingCompletedBy: set.packingLoading?.loadingCompletedBy,
        packingPhotos: set.packingLoading?.packingPhotos,
        // Dispatch step
        driverName: set.dispatch?.driverName,
        driverContact: set.dispatch?.driverContact,
        vehicleNumber: set.dispatch?.vehicleNumber,
        driverSignature: set.dispatch?.driverSignature,
        driverAcknowledgedAt: set.dispatch?.driverAcknowledgedAt?.toISOString(),
        driverAcknowledged: !!set.dispatch?.driverAcknowledgedAt,
        dispatchedAt: set.dispatch?.dispatchedAt?.toISOString(),
        // DO Issued step
        doNumber: set.doIssued?.doNumber,
        doIssuedAt: set.doIssued?.doIssuedAt?.toISOString(),
        doIssuedBy: set.doIssued?.doIssuedBy,
        signedDO: set.doIssued?.signedDO,
        // Completion step
        deliveredAt: set.completion?.deliveredAt?.toISOString(),
        deliveryPhotos: set.completion?.deliveryPhotos,
        // Customer Acknowledgement step
        customerAcknowledgedAt: set.customerAck?.customerAcknowledgedAt?.toISOString(),
        customerAcknowledged: !!set.customerAck?.customerAcknowledgedAt,
        customerSignature: set.customerAck?.customerSignature,
        customerSignedBy: set.customerAck?.customerSignedBy,
        customerOTP: set.customerAck?.customerOTP,
        verifiedOTP: set.customerAck?.verifiedOTP,
        inventoryUpdatedAt: set.customerAck?.inventoryUpdatedAt?.toISOString(),
        inventoryStatus: set.customerAck?.inventoryStatus,
        additionalChargeStatus: chargeStatusMap.get(set.id) || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: set.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          scaffoldingItemId: item.scaffoldingItemId,
          availableStock: item.scaffoldingItemId ? (stockMap.get(item.scaffoldingItemId) ?? 0) : 0,
        })),
      })),
    }));

    return NextResponse.json({
      success: true,
      deliveryRequests: transformedRequests,
    });
  } catch (error) {
    console.error('Get delivery requests error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching delivery requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/delivery
 * Create a new delivery request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to create delivery requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      requestId,
      customerName,
      agreementNo,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryType,
      sets,
      rfqId,
    } = body;

    // Validate required fields
    if (!requestId || !customerName || !agreementNo || !deliveryAddress || !deliveryType) {
      return NextResponse.json(
        { success: false, message: 'Request ID, customer name, agreement number, delivery address, and delivery type are required' },
        { status: 400 }
      );
    }

    // Check if request ID already exists
    const existingRequest = await prisma.deliveryRequest.findUnique({
      where: { requestId },
    });

    if (existingRequest) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d2590d8-86ad-4922-ad03-c79aa639f05e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:POST',message:'Request ID already exists',data:{requestId,agreementNo},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { success: false, message: 'A delivery request with this ID already exists' },
        { status: 400 }
      );
    }

    // Check for duplicate set names across existing delivery requests for this agreement
    if (sets && sets.length > 0) {
      const existingSets = await prisma.deliverySet.findMany({
        where: { deliveryRequest: { agreementNo } },
        select: { setName: true },
      });
      const existingSetNames = new Set(existingSets.map((s: { setName: string }) => s.setName));
      const incomingSetNames = sets.map((s: { setName: string }) => s.setName);
      const duplicates = sets.filter((s: { setName: string }) => existingSetNames.has(s.setName));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d2590d8-86ad-4922-ad03-c79aa639f05e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:POST',message:'Duplicate set check',data:{agreementNo,requestId,incomingSetNames,existingSetNamesArray:[...existingSetNames],duplicateSetNames:duplicates.map((s: { setName: string }) => s.setName)},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      if (duplicates.length > 0) {
        const names = duplicates.map((s: { setName: string }) => s.setName).join(', ');
        return NextResponse.json(
          { success: false, message: `Sets already requested for this agreement: ${names}` },
          { status: 400 }
        );
      }
    }

    // Create the delivery request with sets and items
    // Try with rfq fields first, fall back if migration not run
    let newRequest;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newRequest = await (prisma.deliveryRequest.create as any)({
        data: {
          requestId,
          customerName,
          agreementNo,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          deliveryAddress,
          deliveryType,
          totalSets: sets?.length || 0,
          deliveredSets: 0,
          rfqId: rfqId || null,
          sets: sets ? {
            create: sets.map((set: { setName: string; scheduledPeriod: string; items?: { name: string; quantity: number; scaffoldingItemId?: string }[] }) => ({
              setName: set.setName,
              scheduledPeriod: set.scheduledPeriod,
              status: 'Pending',
              items: set.items ? {
                create: set.items.map((item: { name: string; quantity: number; scaffoldingItemId?: string }) => ({
                  name: item.name,
                  quantity: item.quantity,
                  scaffoldingItemId: item.scaffoldingItemId || null,
                })),
              } : undefined,
            })),
          } : undefined,
        },
        include: {
          sets: {
            include: {
              items: true,
            },
          },
          rfq: {
            include: {
              items: true,
            },
          },
        },
      });
    } catch {
      // Fallback: rfqId/scaffoldingItemId fields might not exist yet (migration not run)
      newRequest = await prisma.deliveryRequest.create({
        data: {
          requestId,
          customerName,
          agreementNo,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          deliveryAddress,
          deliveryType,
          totalSets: sets?.length || 0,
          deliveredSets: 0,
          sets: sets ? {
            create: sets.map((set: { setName: string; scheduledPeriod: string; items?: { name: string; quantity: number }[] }) => ({
              setName: set.setName,
              scheduledPeriod: set.scheduledPeriod,
              status: 'Pending',
              items: set.items ? {
                create: set.items.map((item: { name: string; quantity: number }) => ({
                  name: item.name,
                  quantity: item.quantity,
                })),
              } : undefined,
            })),
          } : undefined,
        },
        include: {
          sets: {
            include: {
              items: true,
            },
          },
        },
      });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d2590d8-86ad-4922-ad03-c79aa639f05e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:POST',message:'Delivery request created',data:{requestId:newRequest?.requestId},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({
      success: true,
      message: 'Delivery request created successfully',
      deliveryRequest: newRequest,
    });
  } catch (error) {
    console.error('Create delivery request error:', error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d2590d8-86ad-4922-ad03-c79aa639f05e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:POST',message:'Create delivery request error',data:{error: String(error), stack: error instanceof Error ? error.stack : undefined},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the delivery request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/delivery
 * Update a delivery request or set status
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to update delivery requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, setId, ...updateData } = body;

    // If setId is provided, update the specific set
    if (setId) {
      const existingSet = await prisma.deliverySet.findUnique({
        where: { id: setId },
        include: {
          items: true,
          deliveryRequest: true,
          packingList: true,
          stockCheck: true,
          schedule: true,
          packingLoading: true,
          dispatch: true,
          doIssued: true,
          completion: true,
          customerAck: true,
        },
      });

      if (!existingSet) {
        return NextResponse.json(
          { success: false, message: 'Delivery set not found' },
          { status: 404 }
        );
      }

      // Update main set fields
      const setUpdateData: Record<string, unknown> = {};
      if (updateData.status !== undefined) setUpdateData.status = updateData.status;
      if (updateData.quotedAmount !== undefined) setUpdateData.quotedAmount = updateData.quotedAmount;
      if (updateData.deliveryFee !== undefined) setUpdateData.deliveryFee = updateData.deliveryFee;
      if (updateData.createdBy !== undefined) setUpdateData.createdBy = updateData.createdBy;
      if (updateData.notes !== undefined) setUpdateData.notes = updateData.notes;

      // Update main set
      await prisma.deliverySet.update({
        where: { id: setId },
        data: setUpdateData,
      });

      // Additional Charge: create when quotation agreed, cleanup when reverted
      const deliveryFeeNum = updateData.deliveryFee !== undefined
        ? Number(updateData.deliveryFee)
        : Number(existingSet.deliveryFee ?? 0);
      const dr = existingSet.deliveryRequest;
      if (updateData.status === 'Confirmed' && deliveryFeeNum > 0 && dr) {
        const existingCharge = await prisma.additionalCharge.findUnique({
          where: { deliverySetId: setId },
        });
        if (!existingCharge) {
          await createChargeForDelivery({
            deliverySetId: setId,
            deliveryFee: deliveryFeeNum,
            customerName: dr.customerName,
            agreementNo: dr.agreementNo,
          });
        }
      } else if (updateData.status === 'Pending' && updateData.deliveryFee === null) {
        await prisma.additionalCharge.deleteMany({
          where: { deliverySetId: setId },
        });
      }

      // Upsert Packing List step
      if (updateData.packingListNumber !== undefined || updateData.packingListDate !== undefined) {
        await prisma.deliveryPackingList.upsert({
          where: { deliverySetId: setId },
          create: {
            deliverySetId: setId,
            packingListNumber: updateData.packingListNumber,
            packingListDate: updateData.packingListDate ? new Date(updateData.packingListDate) : null,
            issuedAt: new Date(),
          },
          update: {
            packingListNumber: updateData.packingListNumber,
            packingListDate: updateData.packingListDate ? new Date(updateData.packingListDate) : undefined,
          },
        });
      }

      // Upsert Stock Check step with validation and deduction
      if (updateData.stockCheckDate !== undefined || updateData.stockCheckBy !== undefined || 
          updateData.stockCheckNotes !== undefined || updateData.allItemsAvailable !== undefined) {
        
        // Check if stock check was already completed (prevent double-deduction)
        const alreadyStockChecked = existingSet.stockCheck?.checkDate !== null && existingSet.stockCheck?.checkDate !== undefined;
        
        if (!alreadyStockChecked && existingSet.items && existingSet.items.length > 0) {
          // Get items with scaffoldingItemId for stock validation
          const itemsWithScaffoldingId = existingSet.items.filter(item => item.scaffoldingItemId);
          
          if (itemsWithScaffoldingId.length > 0) {
            // Fetch real stock levels from ScaffoldingItem
            const scaffoldingItemIds = itemsWithScaffoldingId.map(item => item.scaffoldingItemId).filter((id): id is string => id !== null);
            
            const scaffoldingItems = await prisma.scaffoldingItem.findMany({
              where: { id: { in: scaffoldingItemIds } }
            });
            
            // Build lookup map for stock levels
            const stockMap = new Map(scaffoldingItems.map(s => [s.id, { available: s.available, name: s.name }]));
            
            // Validate stock availability
            const insufficientItems: { name: string; required: number; available: number }[] = [];
            
            for (const item of itemsWithScaffoldingId) {
              if (item.scaffoldingItemId) {
                const stockInfo = stockMap.get(item.scaffoldingItemId);
                const available = stockInfo?.available ?? 0;
                
                if (available < item.quantity) {
                  insufficientItems.push({
                    name: item.name,
                    required: item.quantity,
                    available: available,
                  });
                }
              }
            }
            
            // If any items have insufficient stock, return error
            if (insufficientItems.length > 0) {
              return NextResponse.json({
                success: false,
                message: 'Insufficient stock for some items',
                insufficientItems,
              }, { status: 400 });
            }
            
            // All items have sufficient stock - perform deduction in a transaction
            const LOW_STOCK_THRESHOLD = 30;
            
            await prisma.$transaction(async (tx) => {
              // Deduct stock for each item
              for (const item of itemsWithScaffoldingId) {
                if (item.scaffoldingItemId) {
                  const current = await tx.scaffoldingItem.findUnique({
                    where: { id: item.scaffoldingItemId }
                  });
                  
                  if (current) {
                    const newAvailable = current.available - item.quantity;
                    
                    // Calculate new status based on available quantity
                    let status = 'Available';
                    if (newAvailable === 0) {
                      status = 'Out of Stock';
                    } else if (newAvailable < LOW_STOCK_THRESHOLD) {
                      status = 'Low Stock';
                    }
                    
                    await tx.scaffoldingItem.update({
                      where: { id: item.scaffoldingItemId },
                      data: { 
                        available: newAvailable,
                        status,
                      }
                    });
                  }
                }
              }
              
              // Create/update stock check record within the same transaction
              await tx.deliveryStockCheck.upsert({
                where: { deliverySetId: setId },
                create: {
                  deliverySetId: setId,
                  checkDate: updateData.stockCheckDate ? new Date(updateData.stockCheckDate) : new Date(),
                  checkedBy: updateData.stockCheckBy,
                  notes: updateData.stockCheckNotes,
                  allItemsAvailable: true, // Always true since we validated
                },
                update: {
                  checkDate: updateData.stockCheckDate ? new Date(updateData.stockCheckDate) : undefined,
                  checkedBy: updateData.stockCheckBy,
                  notes: updateData.stockCheckNotes,
                  allItemsAvailable: true,
                },
              });
            });
          } else {
            // No items with scaffoldingItemId - just create stock check record (legacy behavior)
            await prisma.deliveryStockCheck.upsert({
              where: { deliverySetId: setId },
              create: {
                deliverySetId: setId,
                checkDate: updateData.stockCheckDate ? new Date(updateData.stockCheckDate) : new Date(),
                checkedBy: updateData.stockCheckBy,
                notes: updateData.stockCheckNotes,
                allItemsAvailable: updateData.allItemsAvailable,
              },
              update: {
                checkDate: updateData.stockCheckDate ? new Date(updateData.stockCheckDate) : undefined,
                checkedBy: updateData.stockCheckBy,
                notes: updateData.stockCheckNotes,
                allItemsAvailable: updateData.allItemsAvailable,
              },
            });
          }
        } else if (alreadyStockChecked) {
          // Stock check was already done - just update notes if provided (no re-deduction)
          await prisma.deliveryStockCheck.update({
            where: { deliverySetId: setId },
            data: {
              notes: updateData.stockCheckNotes,
            },
          });
        } else {
          // No items to check - create stock check record
          await prisma.deliveryStockCheck.upsert({
            where: { deliverySetId: setId },
            create: {
              deliverySetId: setId,
              checkDate: updateData.stockCheckDate ? new Date(updateData.stockCheckDate) : new Date(),
              checkedBy: updateData.stockCheckBy,
              notes: updateData.stockCheckNotes,
              allItemsAvailable: updateData.allItemsAvailable,
            },
            update: {
              checkDate: updateData.stockCheckDate ? new Date(updateData.stockCheckDate) : undefined,
              checkedBy: updateData.stockCheckBy,
              notes: updateData.stockCheckNotes,
              allItemsAvailable: updateData.allItemsAvailable,
            },
          });
        }
      }

      // Upsert Schedule step
      if (updateData.scheduledTimeSlot !== undefined || updateData.scheduleConfirmedAt !== undefined || 
          updateData.scheduleConfirmedBy !== undefined || updateData.deliveryDate !== undefined) {
        await prisma.deliverySchedule.upsert({
          where: { deliverySetId: setId },
          create: {
            deliverySetId: setId,
            scheduledDate: updateData.deliveryDate ? new Date(updateData.deliveryDate) : null,
            scheduledTimeSlot: updateData.scheduledTimeSlot || null,
            confirmedAt: updateData.scheduleConfirmedAt ? new Date(updateData.scheduleConfirmedAt) : null,
            confirmedBy: updateData.scheduleConfirmedBy,
          },
          update: {
            scheduledDate: updateData.deliveryDate ? new Date(updateData.deliveryDate) : undefined,
            // Only update scheduledTimeSlot if a non-null value is provided (don't overwrite with null)
            ...(updateData.scheduledTimeSlot && { scheduledTimeSlot: updateData.scheduledTimeSlot }),
            // Only update confirmedAt if explicitly provided (don't clear existing value)
            ...(updateData.scheduleConfirmedAt !== undefined && { confirmedAt: updateData.scheduleConfirmedAt ? new Date(updateData.scheduleConfirmedAt) : null }),
            // Only update confirmedBy if explicitly provided
            ...(updateData.scheduleConfirmedBy !== undefined && { confirmedBy: updateData.scheduleConfirmedBy }),
          },
        });
      }

      // Upsert Packing & Loading step
      if (updateData.packingStartedAt !== undefined || updateData.packingStartedBy !== undefined ||
          updateData.loadingCompletedAt !== undefined || updateData.loadingCompletedBy !== undefined ||
          updateData.packingPhotos !== undefined) {
        await prisma.deliveryPackingLoading.upsert({
          where: { deliverySetId: setId },
          create: {
            deliverySetId: setId,
            packingStartedAt: updateData.packingStartedAt ? new Date(updateData.packingStartedAt) : null,
            packingStartedBy: updateData.packingStartedBy,
            loadingCompletedAt: updateData.loadingCompletedAt ? new Date(updateData.loadingCompletedAt) : null,
            loadingCompletedBy: updateData.loadingCompletedBy,
            packingPhotos: updateData.packingPhotos,
          },
          update: {
            packingStartedAt: updateData.packingStartedAt ? new Date(updateData.packingStartedAt) : undefined,
            packingStartedBy: updateData.packingStartedBy,
            loadingCompletedAt: updateData.loadingCompletedAt ? new Date(updateData.loadingCompletedAt) : undefined,
            loadingCompletedBy: updateData.loadingCompletedBy,
            packingPhotos: updateData.packingPhotos,
          },
        });
      }

      // Upsert Dispatch step
      if (updateData.driverName !== undefined || updateData.driverContact !== undefined ||
          updateData.vehicleNumber !== undefined || updateData.driverSignature !== undefined ||
          updateData.driverAcknowledgedAt !== undefined || updateData.dispatchedAt !== undefined) {
        await prisma.deliveryDispatch.upsert({
          where: { deliverySetId: setId },
          create: {
            deliverySetId: setId,
            driverName: updateData.driverName,
            driverContact: updateData.driverContact,
            vehicleNumber: updateData.vehicleNumber,
            driverSignature: updateData.driverSignature,
            driverAcknowledgedAt: updateData.driverAcknowledgedAt ? new Date(updateData.driverAcknowledgedAt) : null,
            dispatchedAt: updateData.dispatchedAt ? new Date(updateData.dispatchedAt) : null,
          },
          update: {
            driverName: updateData.driverName,
            driverContact: updateData.driverContact,
            vehicleNumber: updateData.vehicleNumber,
            driverSignature: updateData.driverSignature,
            driverAcknowledgedAt: updateData.driverAcknowledgedAt ? new Date(updateData.driverAcknowledgedAt) : undefined,
            dispatchedAt: updateData.dispatchedAt ? new Date(updateData.dispatchedAt) : undefined,
          },
        });
      }

      // Upsert DO Issued step
      if (updateData.doNumber !== undefined || updateData.doIssuedAt !== undefined ||
          updateData.doIssuedBy !== undefined || updateData.signedDO !== undefined) {
        // Validate that DO number is unique (not used by another set in a different request)
        // Allow same DO number for sets in the same request (request-level DO)
        if (updateData.doNumber) {
          const currentSet = await prisma.deliverySet.findUnique({
            where: { id: setId },
            include: { deliveryRequest: true },
          });
          
          if (currentSet) {
            // Get all sets in the same request
            const requestSets = await prisma.deliverySet.findMany({
              where: { deliveryRequestId: currentSet.deliveryRequestId },
              select: { id: true },
            });
            const requestSetIds = requestSets.map(s => s.id);
            
            // Check if DO number exists for a set NOT in this request
            const existingDO = await prisma.deliveryDOIssued.findFirst({
              where: {
                doNumber: updateData.doNumber,
                deliverySetId: { notIn: requestSetIds }, // Exclude all sets in this request
              },
            });
            
            if (existingDO) {
              return NextResponse.json(
                { success: false, message: `DO number ${updateData.doNumber} already exists for another request` },
                { status: 400 }
              );
            }
          }
        }
        
        await prisma.deliveryDOIssued.upsert({
          where: { deliverySetId: setId },
          create: {
            deliverySetId: setId,
            doNumber: updateData.doNumber,
            doIssuedAt: updateData.doIssuedAt ? new Date(updateData.doIssuedAt) : null,
            doIssuedBy: updateData.doIssuedBy,
            signedDO: updateData.signedDO,
          },
          update: {
            doNumber: updateData.doNumber,
            doIssuedAt: updateData.doIssuedAt ? new Date(updateData.doIssuedAt) : undefined,
            doIssuedBy: updateData.doIssuedBy,
            signedDO: updateData.signedDO,
          },
        });
      }

      // Upsert Completion step
      if (updateData.deliveredAt !== undefined || updateData.deliveryPhotos !== undefined) {
        await prisma.deliveryCompletion.upsert({
          where: { deliverySetId: setId },
          create: {
            deliverySetId: setId,
            deliveredAt: updateData.deliveredAt ? new Date(updateData.deliveredAt) : null,
            deliveryPhotos: updateData.deliveryPhotos,
          },
          update: {
            deliveredAt: updateData.deliveredAt ? new Date(updateData.deliveredAt) : undefined,
            deliveryPhotos: updateData.deliveryPhotos,
          },
        });
      }

      // Upsert Customer Acknowledgement step
      if (updateData.customerAcknowledgedAt !== undefined || updateData.customerSignature !== undefined ||
          updateData.customerSignedBy !== undefined || updateData.customerOTP !== undefined ||
          updateData.verifiedOTP !== undefined || updateData.inventoryUpdatedAt !== undefined ||
          updateData.inventoryStatus !== undefined) {
        await prisma.deliveryCustomerAck.upsert({
          where: { deliverySetId: setId },
          create: {
            deliverySetId: setId,
            customerAcknowledgedAt: updateData.customerAcknowledgedAt ? new Date(updateData.customerAcknowledgedAt) : null,
            customerSignature: updateData.customerSignature,
            customerSignedBy: updateData.customerSignedBy,
            customerOTP: updateData.customerOTP,
            verifiedOTP: updateData.verifiedOTP,
            inventoryUpdatedAt: updateData.inventoryUpdatedAt ? new Date(updateData.inventoryUpdatedAt) : null,
            inventoryStatus: updateData.inventoryStatus,
          },
          update: {
            customerAcknowledgedAt: updateData.customerAcknowledgedAt ? new Date(updateData.customerAcknowledgedAt) : undefined,
            customerSignature: updateData.customerSignature,
            customerSignedBy: updateData.customerSignedBy,
            customerOTP: updateData.customerOTP,
            verifiedOTP: updateData.verifiedOTP,
            inventoryUpdatedAt: updateData.inventoryUpdatedAt ? new Date(updateData.inventoryUpdatedAt) : undefined,
            inventoryStatus: updateData.inventoryStatus,
          },
        });
      }

      // Fetch the updated set with all relations
      const updatedSet = await prisma.deliverySet.findUnique({
        where: { id: setId },
        include: {
          items: true,
          packingList: true,
          stockCheck: true,
          schedule: true,
          packingLoading: true,
          dispatch: true,
          doIssued: true,
          completion: true,
          customerAck: true,
        },
      });

      // Update deliveredSets count if status is Customer Confirmed or Completed
      if (updateData.status === 'Customer Confirmed' || updateData.status === 'Completed') {
        await prisma.deliveryRequest.update({
          where: { id: existingSet.deliveryRequestId },
          data: {
            deliveredSets: {
              increment: 1,
            },
          },
        });

        // Auto-generate first monthly rental invoice if delivery is completed
        if (updateData.status === 'Completed') {
          try {
            await autoGenerateMonthlyInvoice(existingSet.deliveryRequestId);
          } catch (invoiceError) {
            // Log error but don't fail the delivery update
            console.error('Failed to auto-generate monthly invoice:', invoiceError);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Delivery set updated successfully',
        deliverySet: updatedSet,
      });
    }

    // Otherwise update the delivery request itself
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Delivery request ID or set ID is required' },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.deliveryRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, message: 'Delivery request not found' },
        { status: 404 }
      );
    }

    const updatedRequest = await prisma.deliveryRequest.update({
      where: { id },
      data: {
        customerName: updateData.customerName,
        customerPhone: updateData.customerPhone,
        customerEmail: updateData.customerEmail,
        deliveryAddress: updateData.deliveryAddress,
        pickupTime: updateData.pickupTime,
      },
      include: {
        sets: {
          include: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery request updated successfully',
      deliveryRequest: updatedRequest,
    });
  } catch (error) {
    console.error('Update delivery request error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the delivery request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/delivery
 * Delete a delivery request
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin/super_user can delete
    const hasAdminRole = session.user.roles?.some(role => ['super_user', 'admin'].includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin can delete delivery requests' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Delivery request ID is required' },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.deliveryRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, message: 'Delivery request not found' },
        { status: 404 }
      );
    }

    // Delete the request (sets and items will cascade delete)
    await prisma.deliveryRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery request deleted successfully',
    });
  } catch (error) {
    console.error('Delete delivery request error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the delivery request' },
      { status: 500 }
    );
  }
}
