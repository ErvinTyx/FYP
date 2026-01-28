import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePasswordSetupToken, sendPasswordResetEmail } from '@/lib/email';

/**
 * POST /api/forgot-password
 * Request a password reset link
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });
    
    if (user){
      if (user.status !== 'active') {
        return NextResponse.json(
          { success: false, message: 'Your account is inactive. Please contact support.' },
          { status: 400 }
        );
      }
    }else{
      return NextResponse.json(
        { success: false, message: 'No account found with this email.' },
        { status: 400 }
      );
    }
    // Always return success to prevent email enumeration attacks
    // But only send email if user exists and is active
    if (user && user.status === 'active') {
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

      // Generate new reset token (expires in 1 hour for security)
      const resetToken = generatePasswordSetupToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordSetupToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });

      // Send password reset email
      await sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName || undefined,
        user.lastName || undefined
      );
    }

    // Always return success message (security best practice)
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
