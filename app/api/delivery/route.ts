import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Roles allowed to manage delivery requests
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

/**
 * GET /api/delivery
 * List all delivery requests with their sets and items
 */
export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:GET:entry',message:'GET delivery started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H5'})}).catch(()=>{});
  // #endregion
  try {
    const session = await auth();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:GET:auth',message:'Auth result',data:{hasSession:!!session,hasUser:!!session?.user,userRoles:session?.user?.roles},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-H4'})}).catch(()=>{});
    // #endregion
    
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:GET:before-query',message:'About to query',data:{hasDeliveryRequest:!!prisma.deliveryRequest,modelType:typeof prisma.deliveryRequest},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    const deliveryRequests = await prisma.deliveryRequest.findMany({
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

    // Transform the data for the frontend
    const transformedRequests = deliveryRequests.map(req => ({
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
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
      sets: req.sets.map(set => ({
        id: set.id,
        setName: set.setName,
        scheduledPeriod: set.scheduledPeriod,
        status: set.status,
        quotedAmount: set.quotedAmount ? Number(set.quotedAmount) : undefined,
        deliveryFee: set.deliveryFee ? Number(set.deliveryFee) : undefined,
        deliveryDate: set.deliveryDate?.toISOString().split('T')[0],
        packingListIssued: set.packingListIssued,
        driverAcknowledged: set.driverAcknowledged,
        customerAcknowledged: set.customerAcknowledged,
        otp: set.otp,
        signedDO: set.signedDO,
        items: set.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
        })),
      })),
    }));

    return NextResponse.json({
      success: true,
      deliveryRequests: transformedRequests,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'delivery/route.ts:GET:error',message:'Caught error',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2-H5'})}).catch(()=>{});
    // #endregion
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
      return NextResponse.json(
        { success: false, message: 'A delivery request with this ID already exists' },
        { status: 400 }
      );
    }

    // Create the delivery request with sets and items
    const newRequest = await prisma.deliveryRequest.create({
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

    return NextResponse.json({
      success: true,
      message: 'Delivery request created successfully',
      deliveryRequest: newRequest,
    });
  } catch (error) {
    console.error('Create delivery request error:', error);
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
      });

      if (!existingSet) {
        return NextResponse.json(
          { success: false, message: 'Delivery set not found' },
          { status: 404 }
        );
      }

      const updatedSet = await prisma.deliverySet.update({
        where: { id: setId },
        data: {
          status: updateData.status,
          quotedAmount: updateData.quotedAmount,
          deliveryFee: updateData.deliveryFee,
          deliveryDate: updateData.deliveryDate ? new Date(updateData.deliveryDate) : undefined,
          packingListIssued: updateData.packingListIssued,
          driverAcknowledged: updateData.driverAcknowledged,
          customerAcknowledged: updateData.customerAcknowledged,
          otp: updateData.otp,
          signedDO: updateData.signedDO,
        },
        include: {
          items: true,
        },
      });

      // Update deliveredSets count if status is Customer Confirmed
      if (updateData.status === 'Customer Confirmed') {
        await prisma.deliveryRequest.update({
          where: { id: existingSet.deliveryRequestId },
          data: {
            deliveredSets: {
              increment: 1,
            },
          },
        });
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
