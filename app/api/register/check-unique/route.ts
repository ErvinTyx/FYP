import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePhoneNumber } from '@/lib/phone-validation';

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();

    const errors: { email?: string; phone?: string } = {};

    // Validate phone number format (does not reveal existence)
    if (phone) {
      const phoneValidation = validatePhoneNumber(phone, 'MY');
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error || 'Please enter a valid phone number';
      }
    }

    // Only check uniqueness if no format errors
    if (!errors.phone) {
      let emailExists = false;
      let phoneExists = false;

      if (email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        emailExists = !!existingEmail;
      }
      if (phone) {
        const existingPhone = await prisma.user.findFirst({
          where: { phone },
          select: { id: true },
        });
        phoneExists = !!existingPhone;
      }

      if (emailExists || phoneExists) {
        // Generic message to prevent user enumeration (don't reveal which field exists)
        return NextResponse.json(
          { success: false, message: 'One or more values are already in use. Please use a different email or phone number.' },
          { status: 400 }
        );
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
