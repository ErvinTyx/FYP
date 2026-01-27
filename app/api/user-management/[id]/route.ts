import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logUserUpdated, logUserStatusChanged } from '@/lib/audit-log';

// Roles allowed to manage users (full admin access)
const ADMIN_ROLES = ['super_user', 'admin'];

// All internal staff roles
const INTERNAL_STAFF_ROLES = ['super_user', 'admin', 'sales', 'finance', 'support', 'operations', 'production'];

/**
 * GET /api/user-management/[id]
 * Get single user details with access control:
 * - Admin/SuperAdmin: Can view any user
 * - Other staff: Can only view customers (403 for internal staff)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = session.user.roles || [];
    const hasAdminRole = userRoles.some(role => ADMIN_ROLES.includes(role));
    const hasInternalRole = userRoles.some(role => INTERNAL_STAFF_ROLES.includes(role));

    // Only internal staff can access user management
    if (!hasInternalRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Internal staff access required' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: true,
          },
        },
        customer: {
          select: {
            customerType: true,
            tin: true,
            idType: true,
            idNumber: true,
            identityDocumentUrl: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const roles = user.roles.map(ur => ur.role.name);
    const isCustomer = roles.includes('customer');
    const hasCustomerRecord = !!user.customer;
    
    // Determine if this is internal staff:
    // - Has internal staff role, OR
    // - Has no roles AND no customer record (pending internal staff registration)
    const isInternalStaff = roles.some(role => INTERNAL_STAFF_ROLES.includes(role)) || 
                           (!isCustomer && !hasCustomerRecord);

    // Non-admin users can only view customers
    if (!hasAdminRole && isInternalStaff) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Cannot view internal staff details' },
        { status: 403 }
      );
    }

    // Determine user type:
    // - Has 'customer' role or has customer record = Customer
    // - Otherwise = Internal Staff (including pending staff with no role)
    let userType: 'Internal Staff' | 'Individual Customer' | 'Business Customer';
    if (isCustomer || hasCustomerRecord) {
      userType = user.customer?.customerType === 'business' ? 'Business Customer' : 'Individual Customer';
    } else {
      userType = 'Internal Staff';
    }

    // Determine primary role for internal staff
    const primaryRole = roles.find(role => INTERNAL_STAFF_ROLES.includes(role) && role !== 'customer');

    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      roles: roles,
      userType,
      role: primaryRole, // Primary role for internal staff
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      // Customer-specific fields (only visible to Admin/SuperAdmin)
      ...(user.customer && hasAdminRole && {
        tin: user.customer.tin,
        idType: user.customer.idType,
        idNumber: user.customer.idNumber,
        identityDocumentUrl: user.customer.identityDocumentUrl,
      }),
    };

    return NextResponse.json({
      success: true,
      user: transformedUser,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-management/[id]
 * Update user details (Admin/SuperAdmin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin/super_user can edit users
    const hasAdminRole = session.user.roles?.some(role => ADMIN_ROLES.includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin and super_user can edit users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, role, status } = body;

    // Get current user data for comparison
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        roles: {
          include: { role: true },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and is unique
    if (email && email !== currentUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'A user with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Check if phone is being changed and is unique
    if (phone && phone !== currentUser.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone, id: { not: id } },
        select: { id: true },
      });
      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: 'A user with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (firstName !== undefined && firstName !== currentUser.firstName) {
      updateData.firstName = firstName;
      changes.firstName = { from: currentUser.firstName, to: firstName };
    }
    if (lastName !== undefined && lastName !== currentUser.lastName) {
      updateData.lastName = lastName;
      changes.lastName = { from: currentUser.lastName, to: lastName };
    }
    if (email !== undefined && email !== currentUser.email) {
      updateData.email = email;
      changes.email = { from: currentUser.email, to: email };
    }
    if (phone !== undefined && phone !== currentUser.phone) {
      updateData.phone = phone || null;
      changes.phone = { from: currentUser.phone, to: phone };
    }
    if (status !== undefined && status !== currentUser.status) {
      updateData.status = status;
      changes.status = { from: currentUser.status, to: status };
    }

    // Update user in a transaction (includes role update if needed)
    const currentRoles = currentUser.roles.map(ur => ur.role.name);
    const isInternalStaff = currentRoles.some(r => INTERNAL_STAFF_ROLES.includes(r) && r !== 'customer');

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user fields
      const user = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          roles: {
            include: { role: true },
          },
        },
      });

      // Update role for internal staff if provided
      if (role && isInternalStaff) {
        const currentStaffRole = currentRoles.find(r => INTERNAL_STAFF_ROLES.includes(r) && r !== 'customer');
        
        if (role.toLowerCase() !== currentStaffRole) {
          // Find the new role
          const newRole = await tx.role.findUnique({
            where: { name: role.toLowerCase() },
          });

          if (!newRole) {
            throw new Error(`Invalid role: ${role}`);
          }

          // Remove current staff role
          if (currentStaffRole) {
            const oldRole = await tx.role.findUnique({
              where: { name: currentStaffRole },
            });
            if (oldRole) {
              await tx.userRole.delete({
                where: {
                  userId_roleId: {
                    userId: id,
                    roleId: oldRole.id,
                  },
                },
              });
            }
          }

          // Add new role
          await tx.userRole.create({
            data: {
              userId: id,
              roleId: newRole.id,
            },
          });

          changes.role = { from: currentStaffRole, to: role.toLowerCase() };
        }
      }

      return user;
    });

    // Get client IP for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    // Write audit log if there were changes
    if (Object.keys(changes).length > 0) {
      // Log status change specifically if status changed
      if (changes.status) {
        await logUserStatusChanged(
          {
            userId: session.user.id,
            email: session.user.email,
            roles: session.user.roles || [],
          },
          {
            userId: id,
            email: currentUser.email,
          },
          changes.status.from as string,
          changes.status.to as string,
          undefined,
          ipAddress
        );
      }

      // Log general update
      await logUserUpdated(
        {
          userId: session.user.id,
          email: session.user.email,
          roles: session.user.roles || [],
        },
        {
          userId: id,
          email: currentUser.email,
        },
        changes,
        ipAddress
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        status: updatedUser.status,
        roles: updatedUser.roles.map(ur => ur.role.name),
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while updating the user' },
      { status: 500 }
    );
  }
}
