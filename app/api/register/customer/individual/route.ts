import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { validatePhoneNumber } from '@/lib/phone-validation';

export async function POST(request: NextRequest) {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      tin,
      idType,
      idNumber,
      identityDocumentUrl
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password || !tin || !idType || !idNumber) {
      return NextResponse.json(
        { success: false, message: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(phone, 'MY');
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { success: false, message: phoneValidation.error || 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate idType
    const validIdTypes = ['NRIC', 'PASSPORT', 'ARMY'];
    if (!validIdTypes.includes(idType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid ID type. Must be NRIC, PASSPORT, or ARMY' },
        { status: 400 }
      );
    }

    // Validate TIN format (IG followed by 12 digits)
    const tinRegex = /^IG\d{12}$/;
    if (!tinRegex.test(tin)) {
      return NextResponse.json(
        { success: false, message: 'Invalid TIN format. Must be IG followed by 12 digits (e.g., IG123456789012)' },
        { status: 400 }
      );
    }

    // Validate password requirements (at least 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: 'This email address is already registered' },
        { status: 400 }
      );
    }

    // Check if phone is already registered
    if (phone) {
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
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get or create the 'customer' role
    let customerRole = await prisma.role.findUnique({
      where: { name: 'customer' },
    });

    if (!customerRole) {
      customerRole = await prisma.role.create({
        data: { name: 'customer' },
      });
    }

    // Create the user and customer record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user with pending status
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          password: hashedPassword,
          status: 'pending',
          roles: {
            create: {
              roleId: customerRole!.id,
            },
          },
        },
      });

      // Create the customer record linked to the user
      const customer = await tx.customer.create({
        data: {
          id: user.id, // Use same ID as User (1-to-1 relation)
          customerType: 'individual',
          tin,
          idType,
          idNumber,
          identityDocumentUrl: identityDocumentUrl || null,
        },
      });

      return { user, customer };
    });

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully. Your account is pending admin approval.',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        customerType: result.customer.customerType,
        status: result.user.status,
        createdAt: result.user.createdAt,
      },
    });
  } catch (error) {
    console.error('Individual customer registration error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while processing registration' },
      { status: 500 }
    );
  }
}
