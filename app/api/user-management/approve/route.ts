import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logUserApproved } from '@/lib/audit-log';
import { sendApprovalEmail } from '@/lib/email';

// Roles allowed to approve users
const ADMIN_ROLES = ['super_user', 'admin'];

/**
 * POST /api/user-management/approve
 * Approve a pending user registration (Admin/SuperAdmin only)
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

    // Only admin/super_user can approve users
    const hasAdminRole = session.user.roles?.some(role => ADMIN_ROLES.includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin and super_user can approve users' },
        { status: 403 }
      );
    }

    const { userId, role } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        roles: {
          include: { role: true },
        },
        customer: {
          select: { customerType: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Only allow approving pending users
    if (user.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Can only approve users with pending status' },
        { status: 400 }
      );
    }

    const currentRoles = user.roles.map(ur => ur.role.name);
    const isCustomer = currentRoles.includes('customer');
    const hasCustomerRecord = !!user.customer;
    
    // Internal staff = not a customer AND no customer record
    // (This includes pending staff who registered but have no role yet)
    const isInternalStaff = !isCustomer && !hasCustomerRecord;

    // For internal staff, role must be provided for assignment
    if (isInternalStaff && !role) {
      return NextResponse.json(
        { success: false, message: 'Role is required for internal staff approval' },
        { status: 400 }
      );
    }

    // Update user in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update status to active
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status: 'active' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          roles: {
            include: { role: true },
          },
        },
      });

      // For internal staff, assign the selected role
      if (isInternalStaff && role) {
        // Find the new role
        const newRole = await tx.role.findUnique({
          where: { name: role.toLowerCase() },
        });

        if (!newRole) {
          throw new Error(`Invalid role: ${role}`);
        }

        // Check if user already has any staff role (from admin creation)
        const existingStaffRole = currentRoles.find(r => 
          ['admin', 'sales', 'finance', 'support', 'operations', 'production', 'super_user'].includes(r)
        );

        // Remove existing staff role if any and it's different
        if (existingStaffRole && existingStaffRole !== role.toLowerCase()) {
          const oldRole = await tx.role.findUnique({
            where: { name: existingStaffRole },
          });
          if (oldRole) {
            await tx.userRole.delete({
              where: {
                userId_roleId: {
                  userId: userId,
                  roleId: oldRole.id,
                },
              },
            });
          }
        }

        // Add new role if user doesn't already have it
        if (!existingStaffRole || existingStaffRole !== role.toLowerCase()) {
          await tx.userRole.create({
            data: {
              userId: userId,
              roleId: newRole.id,
            },
          });
        }
      }

      return updated;
    });

    // Get client IP for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    // Write audit log
    await logUserApproved(
      {
        userId: session.user.id,
        email: session.user.email,
        roles: session.user.roles || [],
      },
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
      isInternalStaff ? role?.toLowerCase() : 'customer',
      ipAddress
    );

    // Send approval email
    const emailSent = await sendApprovalEmail(
      user.email,
      user.firstName || undefined,
      user.lastName || undefined,
      isInternalStaff ? 'staff' : (user.customer?.customerType as 'individual' | 'business' | undefined)
    );

    return NextResponse.json({
      success: true,
      message: `User approved successfully. ${emailSent ? 'Notification email sent.' : 'Failed to send notification email.'}`,
      emailSent,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        status: updatedUser.status,
        roles: updatedUser.roles.map(ur => ur.role.name),
      },
    });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while approving the user' },
      { status: 500 }
    );
  }
}
