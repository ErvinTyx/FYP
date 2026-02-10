import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePhoneNumber } from '@/lib/phone-validation';

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();

    const errors: { email?: string; phone?: string } = {};

    // Check email uniqueness
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingEmail) {
        errors.email = 'This email address is already registered';
      }
    }

    // Validate and check phone uniqueness
    if (phone) {
      // Validate phone number format first
      const phoneValidation = validatePhoneNumber(phone, 'MY');
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error || 'Please enter a valid phone number';
      } else {
        // Only check uniqueness if format is valid
        const existingPhone = await prisma.user.findFirst({
          where: { phone },
          select: { id: true },
        });
        if (existingPhone) {
          errors.phone = 'This phone number is already registered';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Check unique error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while checking uniqueness' },
      { status: 500 }
    );
  }
}
