import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendRegistrationRejectionEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
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
