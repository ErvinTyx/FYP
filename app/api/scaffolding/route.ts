import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Roles allowed to manage scaffolding items
const ALLOWED_ROLES = ['super_user', 'admin', 'operations', 'production'];

/**
 * GET /api/scaffolding
 * List all scaffolding items with optional filters
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

    // Get optional query params for filtering
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (status && status !== 'all') {
      if (status === 'Unavailable') {
        where.itemStatus = 'Unavailable';
      } else {
        where.status = status;
      }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { itemCode: { contains: search } },
      ];
    }

    const scaffoldingItems = await prisma.scaffoldingItem.findMany({
      where,
      orderBy: {
        itemCode: 'asc',
      },
      include: {
        damageRepairs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Transform the data for the frontend (damageRepairs from relation → array shape)
    const transformedItems = scaffoldingItems.map(item => ({
      id: item.id,
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      available: item.available,
      price: Number(item.price),
      originPrice: item.originPrice != null ? Number(item.originPrice) : 0,
      status: item.status,
      location: item.location,
      itemStatus: item.itemStatus,
      imageUrl: item.imageUrl,
      damageRepairs: item.damageRepairs.length > 0
        ? item.damageRepairs.map(dr => ({
            description: dr.description,
            repairChargePerUnit: Number(dr.repairChargePerUnit),
            partsLabourCostPerUnit: Number(dr.partsLabourCostPerUnit),
          }))
        : undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: transformedItems,
    });
  } catch (error) {
    console.error('Get scaffolding items error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching scaffolding items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scaffolding
 * Create a new scaffolding item
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
        { success: false, message: 'Forbidden: You do not have permission to create scaffolding items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, category, available, price, originPrice, location, itemStatus, imageUrl, damageRepairs } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, message: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Generate item code
    const lastItem = await prisma.scaffoldingItem.findFirst({
      orderBy: { itemCode: 'desc' },
    });
    
    let nextNumber = 1;
    if (lastItem) {
      const match = lastItem.itemCode.match(/SC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const itemCode = `SC-${String(nextNumber).padStart(3, '0')}`;

    const avail = available ?? 0;

    // Determine status based on availability only (Low Stock when available < 30)
    const LOW_STOCK_THRESHOLD = 30;
    let status = 'Available';
    if (avail === 0) {
      status = 'Out of Stock';
    } else if (avail < LOW_STOCK_THRESHOLD) {
      status = 'Low Stock';
    }

    const scaffoldingItem = await prisma.scaffoldingItem.create({
      data: {
        itemCode,
        name,
        category,
        available: avail,
        price: price ?? 0,
        originPrice: originPrice != null ? originPrice : 0,
        status,
        location: location || 'Warehouse A',
        itemStatus: itemStatus || 'Available',
        imageUrl,
        damageRepairs: Array.isArray(damageRepairs) && damageRepairs.length > 0
          ? {
              create: damageRepairs.map((dr: { description?: string; repairChargePerUnit?: number; partsLabourCostPerUnit?: number }) => ({
                description: dr.description ?? '',
                repairChargePerUnit: dr.repairChargePerUnit ?? 0,
                partsLabourCostPerUnit: dr.partsLabourCostPerUnit ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        damageRepairs: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Scaffolding item created successfully',
      data: {
        id: scaffoldingItem.id,
        itemCode: scaffoldingItem.itemCode,
        name: scaffoldingItem.name,
        category: scaffoldingItem.category,
        available: scaffoldingItem.available,
        price: Number(scaffoldingItem.price),
        originPrice: scaffoldingItem.originPrice != null ? Number(scaffoldingItem.originPrice) : 0,
        status: scaffoldingItem.status,
        location: scaffoldingItem.location,
        itemStatus: scaffoldingItem.itemStatus,
        imageUrl: scaffoldingItem.imageUrl,
        damageRepairs: scaffoldingItem.damageRepairs.length > 0
          ? scaffoldingItem.damageRepairs.map(dr => ({
              description: dr.description,
              repairChargePerUnit: Number(dr.repairChargePerUnit),
              partsLabourCostPerUnit: Number(dr.partsLabourCostPerUnit),
            }))
          : undefined,
      },
    });
  } catch (error) {
    console.error('Create scaffolding item error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the scaffolding item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scaffolding
 * Update an existing scaffolding item
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
        { success: false, message: 'Forbidden: You do not have permission to update scaffolding items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, category, available, price, originPrice, location, itemStatus, imageUrl, damageRepairs } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.scaffoldingItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Scaffolding item not found' },
        { status: 404 }
      );
    }

    const newAvailable = available !== undefined ? available : existingItem.available;

    // Determine status based on availability only (Low Stock when available < 30)
    const LOW_STOCK_THRESHOLD = 30;
    let status = 'Available';
    if (newAvailable === 0) {
      status = 'Out of Stock';
    } else if (newAvailable < LOW_STOCK_THRESHOLD) {
      status = 'Low Stock';
    }

    // Replace damage repair entries: delete existing, create from payload
    const damageRepairsArray = Array.isArray(damageRepairs) ? damageRepairs : [];

    const updatedItem = await prisma.$transaction(async (tx) => {
      await tx.scaffoldingDamageRepair.deleteMany({
        where: { scaffoldingItemId: id },
      });
      const item = await tx.scaffoldingItem.update({
        where: { id },
        data: {
          name: name !== undefined ? name : existingItem.name,
          category: category !== undefined ? category : existingItem.category,
          available: newAvailable,
          price: price !== undefined ? price : existingItem.price,
          originPrice: originPrice !== undefined ? originPrice : existingItem.originPrice,
          status,
          location: location !== undefined ? location : existingItem.location,
          itemStatus: itemStatus !== undefined ? itemStatus : existingItem.itemStatus,
          imageUrl: imageUrl !== undefined ? imageUrl : existingItem.imageUrl,
          ...(damageRepairsArray.length > 0 && {
            damageRepairs: {
              create: damageRepairsArray.map((dr: { description?: string; repairChargePerUnit?: number; partsLabourCostPerUnit?: number }) => ({
                description: dr.description ?? '',
                repairChargePerUnit: dr.repairChargePerUnit ?? 0,
                partsLabourCostPerUnit: dr.partsLabourCostPerUnit ?? 0,
              })),
            },
          }),
        },
        include: {
          damageRepairs: { orderBy: { createdAt: 'asc' } },
        },
      });
      return item;
    });

    return NextResponse.json({
      success: true,
      message: 'Scaffolding item updated successfully',
      data: {
        id: updatedItem.id,
        itemCode: updatedItem.itemCode,
        name: updatedItem.name,
        category: updatedItem.category,
        available: updatedItem.available,
        price: Number(updatedItem.price),
        originPrice: updatedItem.originPrice != null ? Number(updatedItem.originPrice) : 0,
        status: updatedItem.status,
        location: updatedItem.location,
        itemStatus: updatedItem.itemStatus,
        imageUrl: updatedItem.imageUrl,
        damageRepairs: updatedItem.damageRepairs.length > 0
          ? updatedItem.damageRepairs.map(dr => ({
              description: dr.description,
              repairChargePerUnit: Number(dr.repairChargePerUnit),
              partsLabourCostPerUnit: Number(dr.partsLabourCostPerUnit),
            }))
          : undefined,
      },
    });
  } catch (error) {
    console.error('Update scaffolding item error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the scaffolding item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scaffolding
 * Delete a scaffolding item
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

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to delete scaffolding items' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.scaffoldingItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Scaffolding item not found' },
        { status: 404 }
      );
    }

    await prisma.scaffoldingItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Scaffolding item deleted successfully',
    });
  } catch (error) {
    console.error('Delete scaffolding item error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the scaffolding item' },
      { status: 500 }
    );
  }
}
