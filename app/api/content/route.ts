/**
 * Content Management API Route
 * Path: /api/content
 * Purpose: CRUD operations for content items with image upload support
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/content
 * Get all content items or filter by type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const contentItems = await prisma.contentItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    // Transform metadata from JSON string to object
    const transformedItems = contentItems.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : {},
      lastUpdated: item.updatedAt.toISOString().split('T')[0],
    }));

    return NextResponse.json({
      success: true,
      data: transformedItems,
    });
  } catch (error) {
    console.error('[Content API] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch content items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content
 * Create a new content item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, content, status, imageUrl, metadata, updatedBy } = body;

    if (!type || !title || !content) {
      return NextResponse.json(
        { success: false, message: 'Type, title, and content are required' },
        { status: 400 }
      );
    }

    const contentItem = await prisma.contentItem.create({
      data: {
        type,
        title,
        content,
        status: status || 'draft',
        imageUrl: imageUrl || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        updatedBy: updatedBy || 'System',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Content created successfully',
      data: {
        ...contentItem,
        metadata: contentItem.metadata ? JSON.parse(contentItem.metadata) : {},
        lastUpdated: contentItem.updatedAt.toISOString().split('T')[0],
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Content API] POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create content item' },
      { status: 500 }
    );
  }
}
