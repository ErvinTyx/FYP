import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

/**
 * GET /api/set-password?token=xxx
 * Validate a password setup token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the token
    const setupToken = await prisma.passwordSetupToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    if (!setupToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 400 }
      );
    }

    if (setupToken.used) {
      return NextResponse.json(
        { success: false, message: 'This link has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > setupToken.expiresAt) {
      return NextResponse.json(
        { success: false, message: 'This link has expired. Please contact your administrator.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        email: setupToken.user.email,
        firstName: setupToken.user.firstName,
        lastName: setupToken.user.lastName,
      },
    });
  } catch (error) {
    console.error('Validate token error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while validating the token' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/set-password
 * Set password and activate account
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password requirements
    const passwordErrors: string[] = [];
    if (password.length < 12) {
      passwordErrors.push('Password must be at least 12 characters');
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push('Password must contain lowercase letters');
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push('Password must contain uppercase letters');
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push('Password must contain numbers');
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      passwordErrors.push('Password must contain special characters');
    }

    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { success: false, message: passwordErrors.join('. ') },
        { status: 400 }
      );
    }

    // Find and validate the token
    const setupToken = await prisma.passwordSetupToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!setupToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 400 }
      );
    }

    if (setupToken.used) {
      return NextResponse.json(
        { success: false, message: 'This link has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > setupToken.expiresAt) {
      return NextResponse.json(
        { success: false, message: 'This link has expired. Please contact your administrator.' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and status, mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: setupToken.user.id },
        data: {
          password: hashedPassword,
          status: 'active',
        },
      }),
      prisma.passwordSetupToken.update({
        where: { id: setupToken.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password set successfully. Your account is now active.',
      user: {
        email: setupToken.user.email,
        firstName: setupToken.user.firstName,
        lastName: setupToken.user.lastName,
      },
    });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while setting the password' },
      { status: 500 }
    );
  }
}
