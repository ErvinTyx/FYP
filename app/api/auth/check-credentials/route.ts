import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

/**
 * POST /api/auth/check-credentials
 * Pre-check credentials and return specific error messages
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        errorCode: 'MISSING_CREDENTIALS',
        message: 'Please enter both email and password.',
      }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        status: true,
        firstName: true,
      },
    });

    // User not found - return generic error for security
    if (!user) {
      return NextResponse.json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      }, { status: 401 });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      }, { status: 401 });
    }

    // Password is correct, now check account status
    if (user.status === 'pending') {
      return NextResponse.json({
        success: false,
        errorCode: 'ACCOUNT_PENDING',
        message: 'Please set up your password using the link sent to your email.',
      }, { status: 401 });
    }

    if (user.status === 'inactive') {
      return NextResponse.json({
        success: false,
        errorCode: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive. Please contact support to reactivate your account.',
      }, { status: 401 });
    }

    if (user.status === 'rejected') {
      return NextResponse.json({
        success: false,
        errorCode: 'ACCOUNT_REJECTED',
        message: 'Your account registration was not approved. Please contact support for assistance.',
      }, { status: 401 });
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      message: 'Credentials valid',
    }, { status: 200 });
  } catch (error) {
    console.error('Check credentials error:', error);
    return NextResponse.json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'An error occurred. Please try again later.',
    }, { status: 500 });
  }
}
