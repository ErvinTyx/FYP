import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Try to include rfq relation and step tables, fall back to basic query if relation doesn't exist yet
    let returnRequests;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      returnRequests = await (prisma.returnRequest.findMany as any)({
        where,
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
      returnRequests = await prisma.returnRequest.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

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
          scheduledDate: req.scheduledDate?.toISOString().split('T')[0],
          status: req.status,
          reason: req.reason,
          pickupAddress: req.pickupAddress,
          customerPhone: req.customerPhone,
          customerEmail: req.customerEmail,
          pickupFee: req.pickupFee ? Number(req.pickupFee) : undefined,
          returnType: req.returnType,
          collectionMethod: req.collectionMethod,
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
          // Flatten step data for backward compatibility
          // Schedule step
          scheduledDate: req.schedule?.scheduledDate?.toISOString().split('T')[0] || req.scheduledDate?.toISOString().split('T')[0],
          pickupDate: req.schedule?.scheduledDate ? req.schedule.scheduledDate.toISOString() : (req.pickupDate ? (req.pickupDate instanceof Date ? req.pickupDate.toISOString() : String(req.pickupDate)) : undefined),
          pickupTimeSlot: req.schedule?.timeSlot || req.pickupTimeSlot,
          // Pickup Confirm step
          pickupDriver: req.pickupConfirm?.pickupDriver || req.pickupDriver,
          driverContact: req.pickupConfirm?.driverContact || req.driverContact,
          // Driver Recording step
          driverRecordPhotos: req.driverRecording?.driverPhotos || req.driverRecordPhotos,
          // Warehouse Receipt step
          warehousePhotos: req.warehouseReceipt?.warehousePhotos || req.warehousePhotos,
          // Inspection step
          grnNumber: req.inspection?.grnNumber || req.grnNumber,
          productionNotes: req.inspection?.productionNotes || req.productionNotes,
          hasExternalGoods: req.inspection?.hasExternalGoods ?? req.hasExternalGoods,
          externalGoodsNotes: req.inspection?.externalGoodsNotes || req.externalGoodsNotes,
          damagePhotos: req.inspection?.damagePhotos || req.damagePhotos,
          // RCF step
          rcfNumber: req.rcf?.rcfNumber || req.rcfNumber,
          // Notification step
          customerNotificationSent: req.notification?.notificationSent ?? req.customerNotificationSent,
          // Completion step
          inventoryUpdated: req.completion?.inventoryUpdated ?? req.inventoryUpdated,
          soaUpdated: req.completion?.soaUpdated ?? req.soaUpdated,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: req.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            quantityReturned: item.quantityReturned,
            status: item.itemStatus,
            notes: item.notes,
            scaffoldingItemId: item.scaffoldingItemId || null,
          })),
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
      rfqId,
    } = body;

    // Validate required fields
    if (!requestId || !customerName || !agreementNo || !setName || !reason || !pickupAddress || !returnType || !collectionMethod) {
      return NextResponse.json(
        { success: false, message: 'Request ID, customer name, agreement number, set name, reason, pickup address, return type, and collection method are required' },
        { status: 400 }
      );
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

    // Create the return request with items
    // Try with rfq fields first, fall back if migration not run
    let newRequest;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newRequest = await (prisma.returnRequest.create as any)({
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
          status: 'Requested',
          rfqId: rfqId || null,
          items: items ? {
            create: items.map((item: { name: string; quantity: number; quantityReturned?: number; scaffoldingItemId?: string }) => ({
              name: item.name,
              quantity: item.quantity,
              quantityReturned: item.quantityReturned ?? item.quantity,
              itemStatus: 'Good',
              scaffoldingItemId: item.scaffoldingItemId || null,
            })),
          } : undefined,
        },
        include: {
          items: true,
          rfq: {
            include: {
              items: true,
            },
          },
        },
      });
    } catch {
      // Fallback: rfqId/scaffoldingItemId fields might not exist yet (migration not run)
      newRequest = await prisma.returnRequest.create({
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
          status: 'Requested',
          items: items ? {
            create: items.map((item: { name: string; quantity: number; quantityReturned?: number }) => ({
              name: item.name,
              quantity: item.quantity,
              quantityReturned: item.quantityReturned ?? item.quantity,
              itemStatus: 'Good',
            })),
          } : undefined,
        },
        include: {
          items: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Return request created successfully',
      returnRequest: newRequest,
    });
  } catch (error) {
    console.error('Create return request error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the return request' },
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
        updateData.damagePhotos !== undefined) {
      await prisma.returnInspection.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          grnNumber: updateData.grnNumber,
          inspectedAt: new Date(),
          productionNotes: updateData.productionNotes,
          hasExternalGoods: updateData.hasExternalGoods ?? false,
          externalGoodsNotes: updateData.externalGoodsNotes,
          damagePhotos: updateData.damagePhotos,
        },
        update: {
          grnNumber: updateData.grnNumber,
          productionNotes: updateData.productionNotes,
          hasExternalGoods: updateData.hasExternalGoods,
          externalGoodsNotes: updateData.externalGoodsNotes,
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
          skipped: !updateData.rcfNumber,
        },
        update: {
          rcfNumber: updateData.rcfNumber,
        },
      });
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
      await prisma.returnCompletion.upsert({
        where: { returnRequestId: id },
        create: {
          returnRequestId: id,
          inventoryUpdated: updateData.inventoryUpdated ?? false,
          soaUpdated: updateData.soaUpdated ?? false,
          completedAt: (updateData.inventoryUpdated && updateData.soaUpdated) ? new Date() : null,
        },
        update: {
          inventoryUpdated: updateData.inventoryUpdated,
          soaUpdated: updateData.soaUpdated,
          completedAt: (updateData.inventoryUpdated && updateData.soaUpdated) ? new Date() : undefined,
        },
      });
    }

    // Update items if provided
    if (updateData.items && Array.isArray(updateData.items)) {
      for (const item of updateData.items) {
        if (item.id) {
          await prisma.returnRequestItem.update({
            where: { id: item.id },
            data: {
              quantityReturned: item.quantityReturned ?? undefined,
              itemStatus: item.status ?? undefined,
              statusBreakdown: item.statusBreakdown ?? undefined,
              notes: item.notes ?? undefined,
            },
          });
        }
      }
    }

    // Fetch updated request with all relations
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
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Return request updated successfully',
      returnRequest: finalRequest,
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
