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
      idNumber, // BRN (Business Registration Number)
      idType,
      identityDocumentUrl
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password || !tin || !idNumber) {
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

    // Validate Company TIN format (valid prefix + 12 digits)
    const validPrefixes = ['C', 'CS', 'D', 'E', 'F', 'FA', 'PT', 'TA', 'TC', 'TN', 'TR', 'TP', 'J', 'LE'];
    const tinUpper = tin.toUpperCase();
    const matchedPrefix = validPrefixes.find(prefix => tinUpper.startsWith(prefix));
    
    if (!matchedPrefix) {
      return NextResponse.json(
        { success: false, message: 'Invalid TIN format. Must start with a valid prefix (C, CS, D, E, F, FA, PT, TA, TC, TN, TR, TP, J, LE)' },
        { status: 400 }
      );
    }

    const numericPart = tinUpper.substring(matchedPrefix.length);
    if (!/^\d{12}$/.test(numericPart)) {
      return NextResponse.json(
        { success: false, message: 'Invalid TIN format. Must have 12 digits after the prefix' },
        { status: 400 }
      );
    }

    // Validate BRN format (12 digits: YYYY-TT-NNNNNN)
    const cleanBRN = idNumber.replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(cleanBRN)) {
      return NextResponse.json(
        { success: false, message: 'Invalid BRN format. Must be 12 digits (YYYY-TT-NNNNNN)' },
        { status: 400 }
      );
    }

    // Validate BRN components
    const year = parseInt(cleanBRN.substring(0, 4));
    const entityType = cleanBRN.substring(4, 6);
    const validEntityTypes = ['01', '02', '03', '04', '05', '06'];

    if (year < 1900 || year > new Date().getFullYear()) {
      return NextResponse.json(
        { success: false, message: 'Invalid BRN format. Year must be between 1900 and current year' },
        { status: 400 }
      );
    }

    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid BRN format. Entity type must be between 01 and 06' },
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
          customerType: 'business',
          tin: tinUpper,
          idType: idType || 'BRN',
          idNumber: cleanBRN, // Store BRN in idNumber field
          identityDocumentUrl: identityDocumentUrl || null,
        },
      });

      return { user, customer };
    });

    return NextResponse.json({
      success: true,
      message: 'Business registration submitted successfully. Your account is pending admin approval.',
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
    console.error('Business customer registration error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while processing registration' },
      { status: 500 }
    );
  }
}
