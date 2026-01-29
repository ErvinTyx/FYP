import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Roles allowed to manage inventory items
const ALLOWED_ROLES = ['super_user', 'admin', 'operations', 'production'];

/**
 * GET /api/inventory/items
 * List all inventory items with optional filters
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
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (categoryId && categoryId !== 'all') {
      where.categories = {
        some: {
          categoryId: categoryId
        }
      };
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        categories: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform the data for the frontend
    const transformedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      pricePerDayPc: Number(item.pricePerDayPc),
      pricePerItem: Number(item.pricePerItem),
      replacementPerItem: Number(item.replacementPerItem),
      status: item.status,
      quantityAvailable: item.quantityAvailable,
      quantityTotal: item.quantityTotal,
      categories: item.categories.map(ci => ({
        id: ci.category.id,
        name: ci.category.name,
      })),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: transformedItems,
    });
  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/items
 * Create a new inventory item
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
        { success: false, message: 'Forbidden: You do not have permission to create items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      pricePerDayPc, 
      pricePerItem, 
      replacementPerItem, 
      status, 
      quantityAvailable, 
      quantityTotal,
      categoryIds 
    } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Item name is required' },
        { status: 400 }
      );
    }

    // Determine status based on availability if not provided
    let itemStatus = status || 'Available';
    const available = quantityAvailable || 0;
    const total = quantityTotal || 0;
    
    if (available === 0 && total > 0) {
      itemStatus = 'Out of Stock';
    } else if (available < total * 0.2) {
      itemStatus = 'Low Stock';
    }

    // Create item with category relationships
    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        pricePerDayPc: pricePerDayPc || 0,
        pricePerItem: pricePerItem || 0,
        replacementPerItem: replacementPerItem || 0,
        status: itemStatus,
        quantityAvailable: available,
        quantityTotal: total,
        categories: categoryIds && categoryIds.length > 0 ? {
          create: categoryIds.map((categoryId: string) => ({
            categoryId,
          })),
        } : undefined,
      },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Item created successfully',
      data: {
        id: item.id,
        name: item.name,
        pricePerDayPc: Number(item.pricePerDayPc),
        pricePerItem: Number(item.pricePerItem),
        replacementPerItem: Number(item.replacementPerItem),
        status: item.status,
        quantityAvailable: item.quantityAvailable,
        quantityTotal: item.quantityTotal,
        categories: item.categories.map(ci => ({
          id: ci.category.id,
          name: ci.category.name,
        })),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create item error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/items
 * Update an existing inventory item
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
        { success: false, message: 'Forbidden: You do not have permission to update items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      id, 
      name, 
      pricePerDayPc, 
      pricePerItem, 
      replacementPerItem, 
      status, 
      quantityAvailable, 
      quantityTotal,
      categoryIds 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    // Determine status based on availability
    const newAvailable = quantityAvailable !== undefined ? quantityAvailable : existingItem.quantityAvailable;
    const newTotal = quantityTotal !== undefined ? quantityTotal : existingItem.quantityTotal;
    
    let itemStatus = status || existingItem.status;
    if (newAvailable === 0 && newTotal > 0) {
      itemStatus = 'Out of Stock';
    } else if (newAvailable < newTotal * 0.2) {
      itemStatus = 'Low Stock';
    } else if (newAvailable > 0) {
      itemStatus = 'Available';
    }

    // Update item - if categoryIds provided, update category relationships
    const updateData: Record<string, unknown> = {
      name: name !== undefined ? name.trim() : existingItem.name,
      pricePerDayPc: pricePerDayPc !== undefined ? pricePerDayPc : existingItem.pricePerDayPc,
      pricePerItem: pricePerItem !== undefined ? pricePerItem : existingItem.pricePerItem,
      replacementPerItem: replacementPerItem !== undefined ? replacementPerItem : existingItem.replacementPerItem,
      status: itemStatus,
      quantityAvailable: newAvailable,
      quantityTotal: newTotal,
    };

    // If categoryIds provided, update the relationships
    if (categoryIds !== undefined) {
      // First delete existing category relationships
      await prisma.categoryItem.deleteMany({
        where: { itemId: id },
      });

      // Then create new ones if any
      if (categoryIds.length > 0) {
        await prisma.categoryItem.createMany({
          data: categoryIds.map((categoryId: string) => ({
            categoryId,
            itemId: id,
          })),
        });
      }
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        categories: {
          include: {
            category: true
          }
        }
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Item updated successfully',
      data: {
        id: updatedItem.id,
        name: updatedItem.name,
        pricePerDayPc: Number(updatedItem.pricePerDayPc),
        pricePerItem: Number(updatedItem.pricePerItem),
        replacementPerItem: Number(updatedItem.replacementPerItem),
        status: updatedItem.status,
        quantityAvailable: updatedItem.quantityAvailable,
        quantityTotal: updatedItem.quantityTotal,
        categories: updatedItem.categories.map(ci => ({
          id: ci.category.id,
          name: ci.category.name,
        })),
        createdAt: updatedItem.createdAt.toISOString(),
        updatedAt: updatedItem.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update item error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/items
 * Delete an inventory item
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
        { success: false, message: 'Forbidden: You do not have permission to delete items' },
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
    const existingItem = await prisma.item.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    // Delete will cascade to CategoryItem, VariationType, and ProductVariation
    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting the item' },
      { status: 500 }
    );
  }
}
