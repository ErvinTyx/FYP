import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createChargeForReturn } from '@/lib/additional-charge-utils';

// Roles allowed to manage return requests
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

/**
 * GET /api/return
 * List all return requests with their items
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
        { success: false, message: 'Forbidden: You do not have permission to view return requests' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requestId = searchParams.get('requestId');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (requestId) {
      where.requestId = {
        contains: requestId,
      };
    }

    const returnRequests = await prisma.returnRequest.findMany({
      where,
      include: {
        items: {
          include: {
            conditions: true, // Include normalized condition breakdown
          },
        },
        schedule: true,
        pickupConfirm: true,
        driverRecording: true,
        warehouseReceipt: true,
        inspection: true,
        rcf: true,
        notification: true,
        completion: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Batch-fetch additional charge statuses for all return requests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allReturnIds = returnRequests.map((req: any) => req.id);
    const returnChargeRecords = allReturnIds.length > 0
      ? await prisma.additionalCharge.findMany({
          where: { returnRequestId: { in: allReturnIds } },
          select: { returnRequestId: true, status: true },
        })
      : [];
    const returnChargeStatusMap = new Map(returnChargeRecords.map(c => [c.returnRequestId, c.status]));

    // Transform the data for the frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRequests = returnRequests.map((req: any, index: number) => {
      try {
        return {
          id: req.id,
          requestId: req.requestId,
          customerName: req.customerName,
          agreementNo: req.agreementNo,
          setName: req.setName,
          requestDate: req.requestDate.toISOString().split('T')[0],
          status: req.status,
          reason: req.reason,
          pickupAddress: req.pickupAddress,
          customerPhone: req.customerPhone,
          customerEmail: req.customerEmail,
          pickupFee: req.pickupFee ? Number(req.pickupFee) : undefined,
          returnType: req.returnType,
          collectionMethod: req.collectionMethod,
          deliverySetId: req.deliverySetId || null,
          deliverySetIds: Array.isArray(req.deliverySetIds) ? req.deliverySetIds : null,
          additionalChargeStatus: returnChargeStatusMap.get(req.id) || null,
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString(),
          // Flatten step data from normalized tables
          // Schedule step
          scheduledDate: req.schedule?.scheduledDate?.toISOString().split('T')[0],
          pickupDate: req.schedule?.scheduledDate?.toISOString(),
          pickupTimeSlot: req.schedule?.timeSlot,
          // Pickup Confirm step
          pickupDriver: req.pickupConfirm?.pickupDriver,
          driverContact: req.pickupConfirm?.driverContact,
          // Driver Recording step
          driverRecordPhotos: req.driverRecording?.driverPhotos,
          // Warehouse Receipt step
          warehousePhotos: req.warehouseReceipt?.warehousePhotos,
          // Inspection step
          grnNumber: req.inspection?.grnNumber,
          productionNotes: req.inspection?.productionNotes,
          hasExternalGoods: req.inspection?.hasExternalGoods ?? false,
          externalGoodsNotes: req.inspection?.externalGoodsNotes,
          externalGoodsPhotos: req.inspection?.externalGoodsPhotos,
          damagePhotos: req.inspection?.damagePhotos,
          // RCF step
          rcfNumber: req.rcf?.rcfNumber,
          // Notification step
          customerNotificationSent: req.notification?.notificationSent ?? false,
          // Completion step
          inventoryUpdated: req.completion?.inventoryUpdated ?? false,
          soaUpdated: req.completion?.soaUpdated ?? false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: req.items.map((item: any) => {
            // Build statusBreakdown from normalized ReturnItemCondition table
            let statusBreakdown: { Good: number; Repair: number; Replace: number } | null = null;
            let primaryStatus = 'Good';

            if (item.conditions && item.conditions.length > 0) {
              statusBreakdown = { Good: 0, Repair: 0, Replace: 0 };
              let maxQty = 0;
              for (const cond of item.conditions) {
                if (cond.status === 'Good') statusBreakdown.Good = cond.quantity;
                else if (cond.status === 'Damaged' || cond.status === 'Repair') statusBreakdown.Repair = cond.quantity;
                else if (cond.status === 'Replace') statusBreakdown.Replace = cond.quantity;
                
                // Determine primary status (highest quantity)
                if (cond.quantity > maxQty) {
                  maxQty = cond.quantity;
                  // Normalize legacy 'Damaged' to 'Repair'
                  primaryStatus = cond.status === 'Damaged' ? 'Repair' : cond.status;
                }
              }
            }

            return {
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              quantityReturned: item.quantityReturned,
              status: primaryStatus,
              statusBreakdown,
              notes: item.notes,
              scaffoldingItemId: item.scaffoldingItemId || null,
            };
          }),
        };
      } catch (transformErr) {
        throw transformErr;
      }
    });

    return NextResponse.json({
      success: true,
      returnRequests: transformedRequests,
    });
  } catch (error) {
    console.error('Get return requests error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching return requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/return
 * Create a new return request
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
        { success: false, message: 'Forbidden: You do not have permission to create return requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      requestId,
      customerName,
      agreementNo,
      setName,
      reason,
      pickupAddress,
      customerPhone,
      customerEmail,
      returnType,
      collectionMethod,
      items,
      deliverySetId,
      deliverySetIds,
    } = body;

    // Validate required fields
    if (!requestId || !customerName || !agreementNo || !setName || !reason || !pickupAddress || !returnType || !collectionMethod) {
      return NextResponse.json(
        { success: false, message: 'Request ID, customer name, agreement number, set name, reason, pickup address, return type, and collection method are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required for the return request' },
        { status: 400 }
      );
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qty = item?.quantity;
      if (qty == null || typeof qty !== 'number' || Number.isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
        return NextResponse.json(
          { success: false, message: `Item "${(item?.name ?? 'item')}" must have a valid quantity (whole number, at least 1)` },
          { status: 400 }
        );
      }
    }

    // Check if request ID already exists
    const existingRequest = await prisma.returnRequest.findUnique({
      where: { requestId },
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, message: 'A return request with this ID already exists' },
        { status: 400 }
      );
    }

    // Validate quantities against returnable per set per item (so total quantity is not duplicated)
    const setIds = (Array.isArray(deliverySetIds) && deliverySetIds.length > 0)
      ? deliverySetIds as string[]
      : (deliverySetId ? [deliverySetId] : []);

    if (setIds.length > 0) {
      // Delivered per set per item
      const deliverySetItems = await prisma.deliverySetItem.findMany({
        where: { deliverySetId: { in: setIds } },
        select: { deliverySetId: true, scaffoldingItemId: true, quantity: true },
      });
      const deliveredBySet: Record<string, Record<string, number>> = {};
      for (const row of deliverySetItems) {
        const setId = row.deliverySetId;
        const itemId = row.scaffoldingItemId ?? '';
        if (!itemId) continue;
        if (!deliveredBySet[setId]) deliveredBySet[setId] = {};
        deliveredBySet[setId][itemId] = (deliveredBySet[setId][itemId] ?? 0) + row.quantity;
      }

      // Already returned per set per item (from existing return requests referencing these sets)
      // Use only deliverySetId in Prisma query (deliverySetIds may not be in generated client); fetch deliverySetIds via raw.
      const existingReturns = await prisma.returnRequest.findMany({
        where: { deliverySetId: { in: setIds } },
        select: {
          id: true,
          deliverySetId: true,
          items: { select: { scaffoldingItemId: true, quantity: true } },
        },
      });
      const rrIds = existingReturns.map((r) => r.id);
      type RawRow = { id: string; deliverySetIds: string | unknown };
      const rawDeliverySetIds: RawRow[] = rrIds.length > 0
        ? await prisma.$queryRaw<RawRow[]>`
            SELECT id, deliverySetIds FROM returnrequest WHERE id IN (${Prisma.join(rrIds)})
          `
        : [];
      const deliverySetIdsByRrId = new Map<string, string[]>();
      for (const row of rawDeliverySetIds) {
        if (row.deliverySetIds == null) continue;
        const parsed: unknown =
          typeof row.deliverySetIds === 'string' ? (JSON.parse(row.deliverySetIds) as unknown) : row.deliverySetIds;
        deliverySetIdsByRrId.set(
          row.id,
          Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
        );
      }
      const returnedBySet: Record<string, Record<string, number>> = {};
      for (const rr of existingReturns) {
        const idsFromJson = deliverySetIdsByRrId.get(rr.id);
        const refSetIds: string[] =
          Array.isArray(idsFromJson) && idsFromJson.length > 0
            ? idsFromJson.filter((id: string) => setIds.includes(id))
            : (rr.deliverySetId && setIds.includes(rr.deliverySetId) ? [rr.deliverySetId] : []);
        for (const setId of refSetIds) {
          if (!returnedBySet[setId]) returnedBySet[setId] = {};
          for (const ri of rr.items) {
            const itemId = ri.scaffoldingItemId ?? '';
            if (!itemId) continue;
            returnedBySet[setId][itemId] = (returnedBySet[setId][itemId] ?? 0) + ri.quantity;
          }
        }
      }

      // Total returnable per item (sum over linked sets of max(0, delivered - returned))
      const totalReturnable: Record<string, number> = {};
      for (const setId of setIds) {
        const delivered = deliveredBySet[setId] ?? {};
        const returned = returnedBySet[setId] ?? {};
        for (const itemId of Object.keys(delivered)) {
          const returnable = Math.max(0, (delivered[itemId] ?? 0) - (returned[itemId] ?? 0));
          totalReturnable[itemId] = (totalReturnable[itemId] ?? 0) + returnable;
        }
      }

      // Normalize request items: sum quantities per scaffoldingItemId (handle duplicates)
      const itemsByItemId = new Map<string, { name: string; quantity: number; scaffoldingItemId: string }>();
      for (const item of items as Array<{ name: string; quantity: number; scaffoldingItemId?: string }>) {
        const id = (item.scaffoldingItemId ?? '').trim();
        const qty = Math.max(1, Math.floor(Number(item.quantity)) || 1);
        if (itemsByItemId.has(id)) {
          const existing = itemsByItemId.get(id)!;
          existing.quantity += qty;
        } else {
          itemsByItemId.set(id, {
            name: item.name ?? 'Item',
            quantity: qty,
            scaffoldingItemId: id,
          });
        }
      }

      for (const [, entry] of itemsByItemId) {
        const itemId = entry.scaffoldingItemId;
        if (!itemId) continue; // skip quantity validation when no scaffoldingItemId
        const allowed = totalReturnable[itemId] ?? 0;
        if (allowed < 1) {
          return NextResponse.json(
            { success: false, message: `Item "${entry.name}" is not delivered in any selected set or has no quantity left to return` },
            { status: 400 }
          );
        }
        if (entry.quantity > allowed) {
          return NextResponse.json(
            { success: false, message: `Quantity for item "${entry.name}" (${entry.quantity}) exceeds returnable amount (${allowed}) across the selected set(s)` },
            { status: 400 }
          );
        }
      }
    }

    // Create the return request with items (deliverySetIds set separately - Prisma create input may not include Json)
    const newRequest = await prisma.returnRequest.create({
      data: {
        requestId,
        customerName,
        agreementNo,
        setName,
        reason,
        pickupAddress,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        returnType,
        collectionMethod,
        status: collectionMethod === 'self-return' ? 'Agreed' : 'Requested',
        ...(deliverySetId ? { deliverySet: { connect: { id: deliverySetId } } } : {}),
        items: items ? {
          create: items.map((item: { name: string; quantity: number; quantityReturned?: number; scaffoldingItemId?: string }) => ({
            name: item.name,
            quantity: Math.max(1, Math.floor(Number(item.quantity))),
            quantityReturned: Math.max(1, Math.floor(Number(item.quantityReturned ?? item.quantity))),
            scaffoldingItemId: item.scaffoldingItemId || null,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    // Set deliverySetIds via raw update if present (column exists; avoids Prisma create input type gap)
    if (Array.isArray(deliverySetIds) && deliverySetIds.length > 0) {
      const jsonValue = JSON.stringify(deliverySetIds);
      await prisma.$executeRaw`
        UPDATE returnrequest SET deliverySetIds = ${jsonValue}
        WHERE id = ${newRequest.id}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Return request created successfully',
      returnRequest: {
        ...newRequest,
        deliverySetIds: Array.isArray(deliverySetIds) && deliverySetIds.length > 0 ? deliverySetIds : null,
      },
    });
  } catch (error) {
    console.error('Create return request error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while creating the return request';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/return
 * Update a return request status
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
        { success: false, message: 'Forbidden: You do not have permission to update return requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Return request ID is required' },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        schedule: true,
        pickupConfirm: true,
        driverRecording: true,
        warehouseReceipt: true,
        inspection: true,
        rcf: true,
        notification: true,
        completion: true,
        deliverySet: {
          include: {
            doIssued: true,
            deliveryRequest: {
              select: {
                requestId: true,
                agreementNo: true,
              },
            },
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, message: 'Return request not found' },
        { status: 404 }
      );
    }

    // Update main request fields (only status and basic info)
    const dataToUpdate: Record<string, unknown> = {};
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
    if (updateData.pickupFee !== undefined) dataToUpdate.pickupFee = updateData.pickupFee;
    if (updateData.pickupAddress !== undefined) dataToUpdate.pickupAddress = updateData.pickupAddress;
    if (updateData.customerPhone !== undefined) dataToUpdate.customerPhone = updateData.customerPhone;
    if (updateData.customerEmail !== undefined) dataToUpdate.customerEmail = updateData.customerEmail;

    await prisma.returnRequest.update({
      where: { id },
      data: dataToUpdate,
    });

    // Additional Charge: create when quotation agreed, cleanup when reverted
    const pickupFeeNum = updateData.pickupFee !== undefined
      ? Number(updateData.pickupFee)
      : Number(existingRequest.pickupFee ?? 0);
    if (updateData.status === 'Agreed' && pickupFeeNum > 0) {
      const existingCharge = await prisma.additionalCharge.findUnique({
        where: { returnRequestId: id },
      });
      if (!existingCharge) {
        // Get DO number: use actual DO if issued, otherwise generate from delivery requestId format
        let doNumber: string;
        const deliverySet = existingRequest.deliverySet;
        if (deliverySet?.doIssued?.doNumber) {
          // Use actual DO number if already issued
          doNumber = deliverySet.doIssued.doNumber;
        } else if (deliverySet?.deliveryRequest) {
          // Generate DO number from delivery requestId format: DEL-RA-2026-001-20260218-2 -> DO-RA-2026-001-20260218-2
          const dr = deliverySet.deliveryRequest;
          const requestIdPrefix = `DEL-${dr.agreementNo}-`;
          const uniqueSuffix = dr.requestId.startsWith(requestIdPrefix)
            ? dr.requestId.slice(requestIdPrefix.length)
            : dr.requestId;
          doNumber = `DO-${dr.agreementNo}-${uniqueSuffix}`;
        } else {
          // Fallback: should not happen, but use agreement number as last resort
          doNumber = existingRequest.agreementNo;
        }
        await createChargeForReturn({
          returnRequestId: id,
          pickupFee: pickupFeeNum,
          customerName: existingRequest.customerName,
          doNumber: doNumber,
        });
      }
    } else if (updateData.status === 'Requested' && updateData.pickupFee === null) {
      await prisma.additionalCharge.deleteMany({
        where: { returnRequestId: id },
      });
    }

    // Upsert Schedule step
    if (updateData.scheduledDate !== undefined || updateData.pickupDate !== undefined || 
        updateData.pickupTimeSlot !== undefined) {
      await prisma.returnSchedule.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          scheduledDate: updateData.pickupDate ? new Date(updateData.pickupDate) : (updateData.scheduledDate ? new Date(updateData.scheduledDate) : null),
          timeSlot: updateData.pickupTimeSlot,
          approvedAt: new Date(),
        },
        update: {
          scheduledDate: updateData.pickupDate ? new Date(updateData.pickupDate) : (updateData.scheduledDate ? new Date(updateData.scheduledDate) : undefined),
          timeSlot: updateData.pickupTimeSlot,
        },
      });
    }

    // Upsert Pickup Confirm step
    if (updateData.pickupDriver !== undefined || updateData.driverContact !== undefined) {
      await prisma.returnPickupConfirm.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          pickupDriver: updateData.pickupDriver,
          driverContact: updateData.driverContact,
          confirmedAt: new Date(),
        },
        update: {
          pickupDriver: updateData.pickupDriver,
          driverContact: updateData.driverContact,
        },
      });
    }

    // Upsert Driver Recording step
    if (updateData.driverRecordPhotos !== undefined) {
      await prisma.returnDriverRecording.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          driverPhotos: updateData.driverRecordPhotos,
          recordedAt: new Date(),
          inTransitAt: new Date(),
        },
        update: {
          driverPhotos: updateData.driverRecordPhotos,
        },
      });
    }

    // Upsert Warehouse Receipt step
    if (updateData.warehousePhotos !== undefined) {
      await prisma.returnWarehouseReceipt.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          warehousePhotos: updateData.warehousePhotos,
          receivedAt: new Date(),
        },
        update: {
          warehousePhotos: updateData.warehousePhotos,
        },
      });
    }

    // Upsert Inspection step
    if (updateData.grnNumber !== undefined || updateData.productionNotes !== undefined ||
        updateData.hasExternalGoods !== undefined || updateData.externalGoodsNotes !== undefined ||
        updateData.externalGoodsPhotos !== undefined || updateData.damagePhotos !== undefined) {
      await prisma.returnInspection.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          grnNumber: updateData.grnNumber,
          inspectedAt: new Date(),
          productionNotes: updateData.productionNotes,
          hasExternalGoods: updateData.hasExternalGoods ?? false,
          externalGoodsNotes: updateData.externalGoodsNotes,
          externalGoodsPhotos: updateData.externalGoodsPhotos,
          damagePhotos: updateData.damagePhotos,
        },
        update: {
          grnNumber: updateData.grnNumber,
          productionNotes: updateData.productionNotes,
          hasExternalGoods: updateData.hasExternalGoods,
          externalGoodsNotes: updateData.externalGoodsNotes,
          externalGoodsPhotos: updateData.externalGoodsPhotos,
          damagePhotos: updateData.damagePhotos,
        },
      });
    }

    // Upsert RCF step
    if (updateData.rcfNumber !== undefined) {
      await prisma.returnRCF.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          rcfNumber: updateData.rcfNumber,
          generatedAt: new Date(),
          skipped: false,
        },
        update: {
          rcfNumber: updateData.rcfNumber,
        },
      });
    }

    // IMPORTANT: Update items BEFORE creating condition report
    // This ensures condition data is in DB when condition report is generated
    if (updateData.items && Array.isArray(updateData.items)) {
      for (const item of updateData.items) {
        if (item.id) {
          // Update basic item fields
          await prisma.returnRequestItem.update({
            where: { id: item.id },
            data: {
              quantityReturned: item.quantityReturned ?? undefined,
              notes: item.notes ?? undefined,
            },
          });

          // Save conditions to ReturnItemCondition table if statusBreakdown provided
          if (item.statusBreakdown && typeof item.statusBreakdown === 'object') {
            const breakdown = item.statusBreakdown as { Good?: number; Repair?: number; Damaged?: number; Replace?: number };
            
            // Delete existing conditions for this item and recreate
            await prisma.returnItemCondition.deleteMany({
              where: { returnRequestItemId: item.id },
            });

            // Create new condition records for non-zero quantities
            const conditionsToCreate = [];
            if (breakdown.Good && breakdown.Good > 0) {
              conditionsToCreate.push({ returnRequestItemId: item.id, status: 'Good', quantity: breakdown.Good });
            }
            const repairQty = breakdown.Repair || breakdown.Damaged || 0;
            if (repairQty > 0) {
              conditionsToCreate.push({ returnRequestItemId: item.id, status: 'Repair', quantity: repairQty });
            }
            if (breakdown.Replace && breakdown.Replace > 0) {
              conditionsToCreate.push({ returnRequestItemId: item.id, status: 'Replace', quantity: breakdown.Replace });
            }

            if (conditionsToCreate.length > 0) {
              await prisma.returnItemCondition.createMany({
                data: conditionsToCreate,
              });
            }
          }
        }
      }
    }

    // Auto-create Condition Report when status becomes 'Sorting Complete'
    // This integrates Return Management with Inspection & Maintenance module
    if (updateData.status === 'Sorting Complete') {
      // Check if condition report already exists for this return
      const existingConditionReport = await prisma.conditionReport.findUnique({
        where: { returnRequestId: id },
      });

      if (!existingConditionReport) {
        // Fetch the full return request with items and their conditions for mapping
        const returnWithItems = await prisma.returnRequest.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                conditions: true, // Include normalized condition records
              },
            },
            inspection: true,
            rcf: true,
            pickupConfirm: true, // Driver name for "Returned By" (not customer name)
          },
        });

        if (returnWithItems) {
          // Returned By = driver name from return management (pickupDriver), not customer name
          const driverName = returnWithItems.pickupConfirm?.pickupDriver ?? returnWithItems.customerName;
          // Generate RCF number for condition report (use existing or create new)
          const rcfNumber = returnWithItems.rcf?.rcfNumber || 
            `RCF-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

          // Calculate totals from return items
          let totalItemsInspected = 0;
          let totalGood = 0;
          let totalRepair = 0;
          let totalWriteOff = 0;
          let totalDamaged = 0;

          // Map return items to inspection items
          const inspectionItems = returnWithItems.items.map(item => {
            // Get quantities from ReturnItemCondition table
            let quantityGood = 0;
            let quantityRepair = 0;
            let quantityWriteOff = 0;

            if (item.conditions && item.conditions.length > 0) {
              for (const cond of item.conditions) {
                if (cond.status === 'Good') quantityGood = cond.quantity;
                else if (cond.status === 'Damaged' || cond.status === 'Repair') quantityRepair = cond.quantity;
                else if (cond.status === 'Replace') quantityWriteOff = cond.quantity;
              }
            }

            const quantity = quantityGood + quantityRepair + quantityWriteOff;

            totalItemsInspected += quantity;
            totalGood += quantityGood;
            totalRepair += quantityRepair;
            totalWriteOff += quantityWriteOff;
            totalDamaged += quantityRepair + quantityWriteOff;

            // Determine condition based on status breakdown
            let condition = 'good';
            if (quantityWriteOff > 0) {
              condition = 'beyond-repair';
            } else if (quantityRepair > 0) {
              condition = 'major-damage';
            }

            return {
              scaffoldingItemId: item.scaffoldingItemId || '',
              scaffoldingItemName: item.name,
              quantity,
              quantityGood,
              quantityRepair,
              quantityWriteOff,
              condition,
              damageDescription: item.notes || '',
              repairRequired: quantityRepair > 0 || quantityWriteOff > 0,
              estimatedRepairCost: 0, // Will be calculated in inspection module
              originalItemPrice: 0, // Will be fetched from inventory
              inspectionChecklist: JSON.stringify({}),
              images: JSON.stringify([]),
            };
          });
          // Create the condition report linked to return request
          await prisma.conditionReport.create({
            data: {
              rcfNumber,
              deliveryOrderNumber: returnWithItems.agreementNo,
              customerName: returnWithItems.customerName,
              returnedBy: driverName,
              returnDate: new Date().toISOString().split('T')[0],
              inspectionDate: new Date().toISOString().split('T')[0],
              inspectedBy: session.user.email || 'System',
              status: 'pending',
              totalItemsInspected,
              totalGood,
              totalRepair,
              totalWriteOff,
              totalDamaged,
              totalRepairCost: 0,
              notes: returnWithItems.inspection?.productionNotes || 'Auto-created from Return Management workflow',
              returnRequestId: id,
              items: {
                create: inspectionItems,
              },
            },
          });

          console.log(`[Return API] Auto-created condition report ${rcfNumber} for return ${id}`);
        }
      }
    }

    // Upsert Notification step
    if (updateData.customerNotificationSent !== undefined) {
      await prisma.returnNotification.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          notificationSent: updateData.customerNotificationSent,
          notifiedAt: updateData.customerNotificationSent ? new Date() : null,
        },
        update: {
          notificationSent: updateData.customerNotificationSent,
          notifiedAt: updateData.customerNotificationSent ? new Date() : undefined,
        },
      });
    }

    // Upsert Completion step
    if (updateData.inventoryUpdated !== undefined || updateData.soaUpdated !== undefined) {
      // If inventoryUpdated is being set to true, add good-condition item quantities back to inventory
      if (updateData.inventoryUpdated === true && !existingRequest.completion?.inventoryUpdated) {
        const returnItems = await prisma.returnRequestItem.findMany({
          where: { returnRequestId: id },
          include: { conditions: true },
        });

        const LOW_STOCK_THRESHOLD = 30;

        await prisma.$transaction(async (tx) => {
          for (const item of returnItems) {
            if (!item.scaffoldingItemId) continue;

            // Find the "Good" condition quantity for this item
            let goodQty = 0;
            for (const cond of item.conditions) {
              if (cond.status === 'Good') {
                goodQty = cond.quantity;
                break;
              }
            }

            if (goodQty > 0) {
              const current = await tx.scaffoldingItem.findUnique({
                where: { id: item.scaffoldingItemId },
              });

              if (current) {
                const newAvailable = current.available + goodQty;
                let status = 'Available';
                if (newAvailable === 0) {
                  status = 'Out of Stock';
                } else if (newAvailable < LOW_STOCK_THRESHOLD) {
                  status = 'Low Stock';
                }

                await tx.scaffoldingItem.update({
                  where: { id: item.scaffoldingItemId },
                  data: { available: newAvailable, status },
                });
              }
            }
          }
        });

        console.log(`[Return API] Inventory updated for return ${id} — good-condition items added back to stock`);
      }

      await prisma.returnCompletion.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          inventoryUpdated: updateData.inventoryUpdated ?? false,
          soaUpdated: updateData.soaUpdated ?? false,
          completedAt: updateData.inventoryUpdated ? new Date() : null,
        },
        update: {
          inventoryUpdated: updateData.inventoryUpdated,
          soaUpdated: updateData.soaUpdated,
          completedAt: updateData.inventoryUpdated ? new Date() : undefined,
        },
      });
    }

    // Note: Items and their conditions are updated earlier in the flow (before condition report creation)
    // to ensure ReturnItemCondition data is available when auto-creating condition reports

    // Fetch updated request with all relations including condition report
    const finalRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: { 
        items: true,
        schedule: true,
        pickupConfirm: true,
        driverRecording: true,
        warehouseReceipt: true,
        inspection: true,
        rcf: true,
        notification: true,
        completion: true,
        conditionReport: {
          select: {
            id: true,
            rcfNumber: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Return request updated successfully',
      returnRequest: finalRequest,
      // Include condition report info if created
      conditionReportCreated: updateData.status === 'Sorting Complete' && finalRequest?.conditionReport ? true : false,
    });
  } catch (error) {
    console.error('Update return request error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the return request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/return
 * Delete a return request
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
        { success: false, message: 'Forbidden: Only admin can delete return requests' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Return request ID is required' },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, message: 'Return request not found' },
        { status: 404 }
      );
    }

    // Delete the request (items will cascade delete)
    await prisma.returnRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Return request deleted successfully',
    });
  } catch (error) {
    console.error('Delete return request error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the return request' },
      { status: 500 }
    );
  }
}
