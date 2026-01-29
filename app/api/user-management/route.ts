import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logUserCreated } from '@/lib/audit-log';
import { generatePasswordSetupToken, sendPasswordSetupEmail } from '@/lib/email';
import bcrypt from 'bcrypt';

// Roles allowed to manage users (full admin access)
const ADMIN_ROLES = ['super_user', 'admin'];

// All internal staff roles
const INTERNAL_STAFF_ROLES = ['super_user', 'admin', 'sales', 'finance', 'support', 'operations', 'production'];

/**
 * Determine user type based on roles
 */
function getUserType(roles: string[]): 'Internal Staff' | 'Individual Customer' | 'Business Customer' {
  // Check if user has any internal staff role
  if (roles.some(role => INTERNAL_STAFF_ROLES.includes(role))) {
    return 'Internal Staff';
  }
  // Default to customer - will be determined by customer record
  return 'Individual Customer';
}

/**
 * GET /api/user-management
 * List users with role-based filtering:
 * - Admin/SuperAdmin: See ALL users (internal staff + customers)
 * - Other internal staff: See ONLY customers
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
    const hasAdminRole = userRoles.some(role => ADMIN_ROLES.includes(role));
    const hasInternalRole = userRoles.some(role => INTERNAL_STAFF_ROLES.includes(role));

    // Only internal staff can access user management
    if (!hasInternalRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Internal staff access required' },
        { status: 403 }
      );
    }

    // Build the where clause based on role
    // Admin/SuperAdmin see all users, other staff see only customers
    const whereClause = hasAdminRole ? {} : {
      roles: {
        some: {
          role: {
            name: 'customer'
          }
        }
      }
    };

    const users = await prisma.user.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data for the frontend
    const transformedUsers = users.map(user => {
      const roles = user.roles.map(ur => ur.role.name);
      const isCustomer = roles.includes('customer');
      const hasCustomerRecord = !!user.customer;
      
      // Determine user type:
      // - Has 'customer' role or has customer record = Customer (Individual/Business)
      // - Has internal staff role = Internal Staff
      // - No roles AND no customer record = Pending Internal Staff (registered via internal registration)
      let userType: 'Internal Staff' | 'Individual Customer' | 'Business Customer';
      if (isCustomer || hasCustomerRecord) {
        // Customer - determine individual or business
        userType = user.customer?.customerType === 'business' ? 'Business Customer' : 'Individual Customer';
      } else {
        // Internal Staff (either has staff role, or is pending staff with no role yet)
        userType = 'Internal Staff';
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        status: user.status,
        roles: roles,
        userType,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        // Customer-specific fields (only for customers)
        ...(user.customer && {
          tin: user.customer.tin,
          idType: user.customer.idType,
          idNumber: user.customer.idNumber,
          identityDocumentUrl: user.customer.identityDocumentUrl,
        }),
      };
    });

    return NextResponse.json({
      success: true,
      users: transformedUsers,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-management
 * Create a new user (admin/super_user only)
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

    // Check if user has admin privileges
    const hasAdminRole = session.user.roles?.some(role => ADMIN_ROLES.includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin and super_user can create users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, role, status } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json(
        { success: false, message: 'First name, last name, email, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'active', 'inactive'];
    const userStatus = status || 'pending';
    if (!validStatuses.includes(userStatus)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status. Must be pending, active, or inactive' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone },
        select: { id: true },
      });

      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: 'A user with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    // Find the role in database
    const roleRecord = await prisma.role.findUnique({
      where: { name: role.toLowerCase() },
    });

    if (!roleRecord) {
      return NextResponse.json(
        { success: false, message: `Invalid role: ${role}` },
        { status: 400 }
      );
    }

    // Generate a placeholder password (will be replaced when user sets their password)
    const placeholderPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(placeholderPassword, 12);

    // Create the user with pending status
    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone: phone || null,
        password: hashedPassword,
        status: 'pending', // Always pending until password is set
        roles: {
          create: {
            roleId: roleRecord.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Generate password setup token (expires in 24 hours)
    const setupToken = generatePasswordSetupToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.passwordSetupToken.create({
      data: {
        userId: newUser.id,
        token: setupToken,
        expiresAt,
      },
    });

    // Send password setup email
    const emailSent = await sendPasswordSetupEmail(
      newUser.email,
      setupToken,
      newUser.firstName || undefined,
      newUser.lastName || undefined
    );

    // Get client IP for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    // Write audit log
    await logUserCreated(
      {
        userId: session.user.id,
        email: session.user.email,
        roles: session.user.roles || [],
      },
      {
        email: newUser.email,
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        role: role,
        status: 'pending',
      },
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'User created successfully. A password setup email has been sent.'
        : 'User created but failed to send email. Please contact support.',
      emailSent,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        status: newUser.status,
        roles: newUser.roles.map(ur => ur.role.name),
        createdAt: newUser.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating the user' },
      { status: 500 }
    );
  }
}

/**
 * Generate a temporary password
 */
function generateTempPassword(): string {
  const length = 16;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = lowercase + uppercase + numbers + special;
  
  let password = '';
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
