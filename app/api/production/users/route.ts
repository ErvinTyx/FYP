import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Roles allowed to access production user information
const ALLOWED_ROLES = ['super_user', 'admin', 'operations', 'production'];

/**
 * GET /api/production/users
 * Get all production users with their name, email, and phone number
 * Accessible by: super_user, admin, operations, production
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

    const userRoles = session.user.roles || [];
    const hasAllowedRole = userRoles.some(role => ALLOWED_ROLES.includes(role));

    if (!hasAllowedRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Access denied. Only super_user, admin, operations, and production roles can access this endpoint.' },
        { status: 403 }
      );
    }

    // Query users with 'production' role
    const productionUsers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'production'
            }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to include full name
    const transformedUsers = productionUsers.map(user => ({
      id: user.id,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName || user.lastName || 'N/A',
      email: user.email,
      phone: user.phone || null,
      status: user.status,
    }));

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      count: transformedUsers.length,
    });
  } catch (error) {
    console.error('Get production users error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching production users' },
      { status: 500 }
    );
  }
}
