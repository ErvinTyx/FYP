import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
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

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'This email address is already registered' },
        { status: 400 }
      );
    }

    // Check if phone is already registered
    const existingPhone = await prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });

    if (existingPhone) {
      return NextResponse.json(
        { success: false, message: 'This phone number is already registered' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user with pending status
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        status: 'pending',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully. Your account is pending approval.',
      user,
    });
  } catch (error) {
    console.error('Complete registration error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while completing registration' },
      { status: 500 }
    );
  }
}
