import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Find the most recent valid verification code for this email
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Mark the code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Code verified successfully' 
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while verifying the code' },
      { status: 500 }
    );
  }
}
