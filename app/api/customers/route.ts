import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CUSTOMER_ROLES = ['super_user', 'admin', 'sales', 'finance', 'operations'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    const hasPermission = session.user.roles?.some((role: string) => CUSTOMER_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to view customers' },
        { status: 403 }
      );
    }

    // Fetch all customers with their user information
    const customers = await prisma.customer.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter only approved customers
    const approvedCustomers = customers.filter(customer => 
      customer.user.status === 'approved' && customer.customerType
    );

    return NextResponse.json({
      success: true,
      data: approvedCustomers,
      message: `Found ${approvedCustomers.length} approved customers`
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
