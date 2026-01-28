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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'return/route.ts:GET:entry',message:'GET return started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H5'})}).catch(()=>{});
  // #endregion
  try {
    const session = await auth();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'return/route.ts:GET:auth',message:'Auth result',data:{hasSession:!!session,hasUser:!!session?.user,userRoles:session?.user?.roles},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-H4'})}).catch(()=>{});
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'return/route.ts:GET:before-query',message:'About to query',data:{hasReturnRequest:!!prisma.returnRequest,modelType:typeof prisma.returnRequest},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    const returnRequests = await prisma.returnRequest.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data for the frontend
    const transformedRequests = returnRequests.map(req => ({
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
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
      items: req.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
      })),
    }));

    return NextResponse.json({
      success: true,
      returnRequests: transformedRequests,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'return/route.ts:GET:error',message:'Caught error',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2-H5'})}).catch(()=>{});
    // #endregion
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
        status: 'Requested',
        items: items ? {
          create: items.map((item: { name: string; quantity: number }) => ({
            name: item.name,
            quantity: item.quantity,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

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
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, message: 'Return request not found' },
        { status: 404 }
      );
    }

    const updatedRequest = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: updateData.status,
        scheduledDate: updateData.scheduledDate ? new Date(updateData.scheduledDate) : undefined,
        pickupFee: updateData.pickupFee,
        pickupAddress: updateData.pickupAddress,
        customerPhone: updateData.customerPhone,
        customerEmail: updateData.customerEmail,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Return request updated successfully',
      returnRequest: updatedRequest,
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
