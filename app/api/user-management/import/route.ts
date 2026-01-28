import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generatePasswordSetupToken, sendPasswordSetupEmail } from '@/lib/email';
import bcrypt from 'bcrypt';

// Roles allowed to import users
const ADMIN_ROLES = ['super_user', 'admin'];

// Valid internal staff roles
const VALID_ROLES = ['admin', 'sales', 'finance', 'support', 'operations', 'production'];

/**
 * Generate a random temporary password
 */
function generateTempPassword(): string {
  const length = 16;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = lowercase + uppercase + numbers + special;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * POST /api/user-management/import
 * Bulk import users from CSV (Admin/SuperAdmin only)
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

    // Only admin/super_user can import users
    const hasAdminRole = session.user.roles?.some(role => ADMIN_ROLES.includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin and super_user can import users' },
        { status: 403 }
      );
    }

    const { users } = await request.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No users provided for import' },
        { status: 400 }
      );
    }

    // Validate all users first
    const errors: string[] = [];
    const validUsers: any[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed

      // Check required fields
      if (!user.firstName || !user.lastName || !user.email || !user.role) {
        errors.push(`Row ${rowNum}: Missing required fields`);
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email)) {
        errors.push(`Row ${rowNum}: Invalid email format (${user.email})`);
        continue;
      }

      // Validate role
      const normalizedRole = user.role.toLowerCase();
      if (!VALID_ROLES.includes(normalizedRole)) {
        errors.push(`Row ${rowNum}: Invalid role "${user.role}". Valid roles: ${VALID_ROLES.join(', ')}`);
        continue;
      }

      validUsers.push({
        ...user,
        role: normalizedRole,
      });
    }

    if (validUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid users to import', errors },
        { status: 400 }
      );
    }

    // Check for existing emails
    const emails = validUsers.map(u => u.email.toLowerCase());
    const existingUsers = await prisma.user.findMany({
      where: {
        email: { in: emails },
      },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

    // Filter out existing users
    const newUsers = validUsers.filter(u => !existingEmails.has(u.email.toLowerCase()));
    const skippedCount = validUsers.length - newUsers.length;

    if (newUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users already exist',
        imported: 0,
        skipped: skippedCount,
      });
    }

    // Get all role records
    const roleRecords = await prisma.role.findMany({
      where: {
        name: { in: VALID_ROLES },
      },
    });
    const roleMap = new Map(roleRecords.map(r => [r.name, r.id]));

    // Import users in a transaction
    let importedCount = 0;
    const importedUsers: any[] = [];

    for (const userData of newUsers) {
      try {
        // Generate placeholder password
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Find role
        const roleId = roleMap.get(userData.role);
        if (!roleId) {
          errors.push(`Skipped ${userData.email}: Role "${userData.role}" not found in database`);
          continue;
        }

        // Create user with role
        const newUser = await prisma.user.create({
          data: {
            email: userData.email.toLowerCase(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone || null,
            password: hashedPassword,
            status: 'pending',
            roles: {
              create: {
                roleId: roleId,
              },
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        // Generate password setup token
        const setupToken = generatePasswordSetupToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.passwordSetupToken.create({
          data: {
            userId: newUser.id,
            token: setupToken,
            expiresAt,
          },
        });

        // Send password setup email (don't wait, continue importing)
        sendPasswordSetupEmail(
          newUser.email,
          setupToken,
          newUser.firstName || undefined,
          newUser.lastName || undefined
        ).catch(err => {
          console.error(`Failed to send email to ${newUser.email}:`, err);
        });

        importedCount++;
        importedUsers.push(newUser);
      } catch (err: any) {
        console.error(`Error importing user ${userData.email}:`, err);
        if (err.code === 'P2002') {
          errors.push(`Skipped ${userData.email}: Email or phone already exists`);
        } else {
          errors.push(`Error importing ${userData.email}: ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} users`,
      imported: importedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      users: importedUsers,
    });
  } catch (error) {
    console.error('Import users error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while importing users' },
      { status: 500 }
    );
  }
}
