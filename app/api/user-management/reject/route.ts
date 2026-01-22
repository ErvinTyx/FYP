import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendRegistrationRejectionEmail } from '@/lib/email';
import { logUserRejected } from '@/lib/audit-log';

// Roles allowed to reject users
const ADMIN_ROLES = ['super_user', 'admin'];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin/super_user can reject users
    const hasAdminRole = session.user.roles?.some(role => ADMIN_ROLES.includes(role));
    if (!hasAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admin and super_user can reject users' },
        { status: 403 }
      );
    }

    const { userId, rejectionReason } = await request.json();

    // Validate required fields
    if (!userId || !rejectionReason) {
      return NextResponse.json(
        { success: false, message: 'User ID and rejection reason are required' },
        { status: 400 }
      );
    }

    // Find the user with their customer record
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        customer: {
          select: {
            customerType: true,
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

    // Only allow rejecting pending users
    if (user.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Can only reject users with pending status' },
        { status: 400 }
      );
    }

    // Get client IP for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    // Write audit log BEFORE deletion (while user data still exists)
    await logUserRejected(
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
      rejectionReason,
      ipAddress
    );

    // Send rejection email before deleting the user
    const emailSent = await sendRegistrationRejectionEmail(
      user.email,
      rejectionReason,
      user.firstName || undefined,
      user.lastName || undefined,
      user.customer?.customerType as 'individual' | 'business' | undefined
    );

    if (!emailSent) {
      console.error('Failed to send rejection email to:', user.email);
      // Continue with deletion even if email fails, but log the warning
    }

    // Delete in a transaction (order matters due to foreign key constraints)
    await prisma.$transaction(async (tx) => {
      // Delete the user's role associations first
      await tx.userRole.deleteMany({
        where: { userId: user.id },
      });

      // Delete any password setup tokens
      await tx.passwordSetupToken.deleteMany({
        where: { userId: user.id },
      });

      // Delete the customer record
      await tx.customer.deleteMany({
        where: { id: user.id },
      });

      // Delete the user record so they can re-register with the same email
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Registration rejected. ${emailSent ? 'Rejection email sent to ' + user.email : 'Failed to send email, but user has been removed.'}`,
      emailSent,
    });
  } catch (error) {
    console.error('Reject user error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while rejecting the user' },
      { status: 500 }
    );
  }
}
