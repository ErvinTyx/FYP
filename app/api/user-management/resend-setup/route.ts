import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generatePasswordSetupToken, sendPasswordSetupEmail } from '@/lib/email';

// Roles allowed to manage users (full admin access)
const ADMIN_ROLES = ['super_user', 'admin'];

/**
 * POST /api/user-management/resend-setup
 * Resend password setup email for a user in pending_verification status (Admin/SuperAdmin only)
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

    // Only admin/super_user can resend setup emails
    const hasAdminRole = session.user.roles?.some(role => ADMIN_ROLES.includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin and super_user can resend setup emails' },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

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
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Only allow resending for users with pending_verification status
    if (user.status !== 'pending_verification') {
      return NextResponse.json(
        { success: false, message: 'Can only resend setup email for users with pending verification status' },
        { status: 400 }
      );
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordSetupToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate new password setup token (expires in 24 hours)
    const setupToken = generatePasswordSetupToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.passwordSetupToken.create({
      data: {
        userId: user.id,
        token: setupToken,
        expiresAt,
      },
    });

    // Send password setup email
    const emailSent = await sendPasswordSetupEmail(
      user.email,
      setupToken,
      user.firstName || undefined,
      user.lastName || undefined
    );

    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: 'Failed to send password setup email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password setup email has been resent successfully.',
    });
  } catch (error) {
    console.error('Resend setup email error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while resending the setup email' },
      { status: 500 }
    );
  }
}
