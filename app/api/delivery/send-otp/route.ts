import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendDeliveryOTPEmail, generateVerificationCode } from '@/lib/email';

// Roles allowed to send delivery OTP
const ALLOWED_ROLES = ['super_user', 'admin', 'sales', 'operations'];

/**
 * POST /api/delivery/send-otp
 * Send delivery OTP verification email to customer
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    const hasPermission = session.user.roles?.some(role => ALLOWED_ROLES.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to send delivery OTP' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, customerName, doNumber } = body;

    // Validate required fields
    if (!email || !customerName || !doNumber) {
      return NextResponse.json(
        { success: false, message: 'Email, customer name, and DO number are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = generateVerificationCode();

    // Send OTP email
    const emailSent = await sendDeliveryOTPEmail(email, customerName, otp, doNumber);

    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otp, // Return OTP for verification (in production, store this securely with expiry)
    });
  } catch (error) {
    console.error('Send delivery OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while sending the OTP' },
      { status: 500 }
    );
  }
}
