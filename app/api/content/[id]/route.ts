/**
 * Content Management Dynamic API Route
 * Path: /api/content/[id]
 * Purpose: Handle specific content item operations (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/content/[id]
 * Get a specific content item by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Content ID is required' },
        { status: 400 }
      );
    }

    const contentItem = await prisma.contentItem.findUnique({
      where: { id },
    });

    if (!contentItem) {
      return NextResponse.json(
        { success: false, message: 'Content item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...contentItem,
        metadata: contentItem.metadata ? JSON.parse(contentItem.metadata) : {},
        lastUpdated: contentItem.updatedAt.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[Content API] GET by ID error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch content item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/content/[id]
 * Update a specific content item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Content ID is required' },
        { status: 400 }
      );
    }

    const existingItem = await prisma.contentItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Content item not found' },
        { status: 404 }
      );
    }

    const { type, title, content, status, imageUrl, metadata, updatedBy } = body;

    const updatedItem = await prisma.contentItem.update({
      where: { id },
      data: {
        type: type !== undefined ? type : existingItem.type,
        title: title !== undefined ? title : existingItem.title,
        content: content !== undefined ? content : existingItem.content,
        status: status !== undefined ? status : existingItem.status,
        imageUrl: imageUrl !== undefined ? imageUrl : existingItem.imageUrl,
        metadata: metadata !== undefined ? JSON.stringify(metadata) : existingItem.metadata,
        updatedBy: updatedBy || existingItem.updatedBy,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Content updated successfully',
      data: {
        ...updatedItem,
        metadata: updatedItem.metadata ? JSON.parse(updatedItem.metadata) : {},
        lastUpdated: updatedItem.updatedAt.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[Content API] PUT error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update content item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content/[id]
 * Delete a specific content item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Content ID is required' },
        { status: 400 }
      );
    }

    const existingItem = await prisma.contentItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Content item not found' },
        { status: 404 }
      );
    }

    await prisma.contentItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    console.error('[Content API] DELETE error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete content item' },
      { status: 500 }
    );
  }
}
