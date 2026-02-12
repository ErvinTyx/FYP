import nodemailer from 'nodemailer';

// Create reusable transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send a verification email with a 6-digit code
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  firstName?: string
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: email,
    subject: 'Email Verification - Power Metal & Steel',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                ${firstName ? `Hello ${firstName},` : 'Hello,'}
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0;">
                Please use the verification code below to complete your registration. This code is valid for 10 minutes.
              </p>
              <div style="background: #F3F4F6; border-radius: 8px; padding: 25px; text-align: center; margin: 0 0 25px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1E40AF;">${code}</span>
              </div>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 10px 0; font-size: 14px;">
                If you didn't request this verification code, please ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Email Verification

${firstName ? `Hello ${firstName},` : 'Hello,'}

Your verification code is: ${code}

This code is valid for 10 minutes.

If you didn't request this verification code, please ignore this email.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Generate a secure random token for password setup
 */
export function generatePasswordSetupToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Send a password setup email to a new user
 */
export async function sendPasswordSetupEmail(
  email: string,
  token: string,
  firstName?: string,
  lastName?: string
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const setupUrl = `${baseUrl}/set-password?token=${token}`;
  
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: email,
    subject: 'Set Up Your Password - Power Metal & Steel',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Set Up Your Password</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                Welcome, ${fullName}!
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0;">
                Your account has been created by an administrator. Please click the button below to set up your password and activate your account.
              </p>
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${setupUrl}" style="display: inline-block; background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Set Up Password
                </a>
              </div>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 15px 0; font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #1E40AF; word-break: break-all; font-size: 13px; background: #F3F4F6; padding: 12px; border-radius: 6px; margin: 0 0 25px 0;">
                ${setupUrl}
              </p>
              <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 0 0 25px 0;">
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                  <strong>⏰ This link expires in 15 minutes.</strong><br>
                  If you don't set up your password within this time, please contact your administrator.
                </p>
              </div>
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. If you didn't expect this email, please contact your administrator.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Set Up Your Password

Welcome, ${fullName}!

Your account has been created by an administrator. Please visit the link below to set up your password and activate your account:

${setupUrl}

This link expires in 15 minutes. If you don't set up your password within this time, please contact your administrator.

If you didn't expect this email, please contact your administrator.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send password setup email:', error);
    return false;
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName?: string,
  lastName?: string
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: email,
    subject: 'Reset Your Password - Power Metal & Steel',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                Hello, ${fullName}!
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 15px 0; font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #1E40AF; word-break: break-all; font-size: 13px; background: #F3F4F6; padding: 12px; border-radius: 6px; margin: 0 0 25px 0;">
                ${resetUrl}
              </p>
              <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 0 0 25px 0;">
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                  <strong>⏰ This link expires in 15 minutes.</strong><br>
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. If you didn't request this, please ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Reset Your Password

Hello, ${fullName}!

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link expires in 15 minutes.

If you didn't request a password reset, you can safely ignore this email.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Send an approval email to notify user their account is now active
 */
export async function sendApprovalEmail(
  email: string,
  firstName?: string,
  lastName?: string,
  accountType?: 'staff' | 'individual' | 'business'
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}`;
  
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
  const typeLabel = accountType === 'staff' ? 'Staff' : 
                   accountType === 'business' ? 'Business Customer' : 'Individual Customer';
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: email,
    subject: 'Account Approved - Power Metal & Steel',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 25px;">
                <div style="background: #D1FAE5; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">✓</span>
                </div>
              </div>
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                Congratulations, ${fullName}!
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
                Your ${typeLabel} account has been approved. You can now log in and start using our platform.
              </p>
              
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${loginUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Log In Now
                </a>
              </div>
              
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin: 0 0 25px 0;">
                <p style="color: #166534; margin: 0; font-size: 14px;">
                  <strong>🎉 What's next?</strong><br>
                  Log in with your email and password to explore our scaffolding rental services.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Account Approved

Congratulations, ${fullName}!

Your ${typeLabel} account has been approved. You can now log in and start using our platform.

Log in at: ${loginUrl}

If you have any questions, please contact our support team.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send approval email:', error);
    return false;
  }
}

/**
 * Send a registration rejection email with reason and link to re-register
 */
export async function sendRegistrationRejectionEmail(
  email: string,
  rejectionReason: string,
  firstName?: string,
  lastName?: string,
  customerType?: 'individual' | 'business'
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const registerUrl = `${baseUrl}`;
  
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
  const accountType = customerType === 'business' ? 'Business' : 'Individual';
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: email,
    subject: 'Registration Update - Power Metal & Steel',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Update</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                Hello, ${fullName}
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in registering with Power Metal & Steel. Unfortunately, we were unable to approve your ${accountType} Customer registration at this time.
              </p>
              
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin: 0 0 25px 0;">
                <p style="color: #991B1B; margin: 0 0 10px 0; font-weight: 600; font-size: 14px;">
                  Reason for rejection:
                </p>
                <p style="color: #7F1D1D; margin: 0; font-size: 14px; line-height: 1.5;">
                  ${rejectionReason}
                </p>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0;">
                You are welcome to register again with corrected information. Please click the button below to start a new registration.
              </p>
              
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${registerUrl}" style="display: inline-block; background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Register Again
                </a>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 15px 0; font-size: 14px;">
                If you have any questions, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Registration Update

Hello, ${fullName}

Thank you for your interest in registering with Power Metal & Steel. Unfortunately, we were unable to approve your ${accountType} Customer registration at this time.

Reason for rejection:
${rejectionReason}

You are welcome to register again with corrected information. Please visit:
${registerUrl}

If you have any questions, please contact our support team.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send registration rejection email:', error);
    return false;
  }
}

/**
 * Send a deposit rejection email to notify customer their payment proof was rejected
 */
export async function sendDepositRejectionEmail(
  customerEmail: string,
  customerName: string,
  depositNumber: string,
  rejectionReason: string,
  depositAmount: number
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const depositUrl = `${baseUrl}/deposits`;
  
  // Format the deposit amount with currency
  const formattedAmount = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(depositAmount);
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: customerEmail,
    subject: `Deposit Payment Rejected - ${depositNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Deposit Payment Rejected</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Deposit Payment Update</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                Hello, ${customerName}
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 20px 0;">
                We regret to inform you that your payment proof for the security deposit has been reviewed and was not approved at this time.
              </p>
              
              <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6B7280; padding: 8px 0; font-size: 14px;">Deposit Number:</td>
                    <td style="color: #111827; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${depositNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #6B7280; padding: 8px 0; font-size: 14px;">Amount:</td>
                    <td style="color: #111827; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${formattedAmount}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin: 0 0 25px 0;">
                <p style="color: #991B1B; margin: 0 0 10px 0; font-weight: 600; font-size: 14px;">
                  Reason for rejection:
                </p>
                <p style="color: #7F1D1D; margin: 0; font-size: 14px; line-height: 1.5;">
                  ${rejectionReason}
                </p>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0;">
                Please review the reason above and submit a new payment proof with the correct information. You can do this by logging into your account.
              </p>
              
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${depositUrl}" style="display: inline-block; background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Upload New Payment Proof
                </a>
              </div>
              
              <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 0 0 25px 0;">
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                  <strong>Important:</strong> Please ensure your payment proof clearly shows the transaction details including the reference number, amount, and date.
                </p>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 15px 0; font-size: 14px;">
                If you have any questions or need assistance, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Deposit Payment Rejected

Hello, ${customerName}

We regret to inform you that your payment proof for the security deposit has been reviewed and was not approved at this time.

Deposit Number: ${depositNumber}
Amount: ${formattedAmount}

Reason for rejection:
${rejectionReason}

Please review the reason above and submit a new payment proof with the correct information. You can do this by logging into your account at:
${depositUrl}

Important: Please ensure your payment proof clearly shows the transaction details including the reference number, amount, and date.

If you have any questions or need assistance, please contact our support team.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send deposit rejection email:', error);
    return false;
  }
}

/**
 * Send a monthly rental invoice rejection email to notify customer their payment proof was rejected
 */
export async function sendMonthlyRentalRejectionEmail(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  rejectionReason: string,
  invoiceAmount: number
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const invoiceUrl = `${baseUrl}/monthly-rental`;
  
  // Format the invoice amount with currency
  const formattedAmount = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(invoiceAmount);
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: customerEmail,
    subject: `Monthly Rental Payment Rejected - ${invoiceNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Monthly Rental Payment Rejected</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Monthly Rental Payment Update</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                Hello, ${customerName}
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 20px 0;">
                We regret to inform you that your payment proof for the monthly rental invoice has been reviewed and was not approved at this time.
              </p>
              
              <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6B7280; padding: 8px 0; font-size: 14px;">Invoice Number:</td>
                    <td style="color: #111827; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #6B7280; padding: 8px 0; font-size: 14px;">Amount Due:</td>
                    <td style="color: #111827; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${formattedAmount}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin: 0 0 25px 0;">
                <p style="color: #991B1B; margin: 0 0 10px 0; font-weight: 600; font-size: 14px;">
                  Reason for rejection:
                </p>
                <p style="color: #7F1D1D; margin: 0; font-size: 14px; line-height: 1.5;">
                  ${rejectionReason}
                </p>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0;">
                Please review the reason above and submit a new payment proof with the correct information. You can do this by logging into your account.
              </p>
              
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${invoiceUrl}" style="display: inline-block; background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Upload New Payment Proof
                </a>
              </div>
              
              <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 0 0 25px 0;">
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                  <strong>Important:</strong> Please ensure your payment proof clearly shows the transaction details including the reference number, amount, and date. Late payments may incur additional interest charges as per your rental agreement.
                </p>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 15px 0; font-size: 14px;">
                If you have any questions or need assistance, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Monthly Rental Payment Rejected

Hello, ${customerName}

We regret to inform you that your payment proof for the monthly rental invoice has been reviewed and was not approved at this time.

Invoice Number: ${invoiceNumber}
Amount Due: ${formattedAmount}

Reason for rejection:
${rejectionReason}

Please review the reason above and submit a new payment proof with the correct information. You can do this by logging into your account at:
${invoiceUrl}

Important: Please ensure your payment proof clearly shows the transaction details including the reference number, amount, and date. Late payments may incur additional interest charges as per your rental agreement.

If you have any questions or need assistance, please contact our support team.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send monthly rental rejection email:', error);
    return false;
  }
}

/**
 * Send a delivery OTP verification email to customer
 */
export async function sendDeliveryOTPEmail(
  email: string,
  customerName: string,
  otp: string,
  doNumber: string
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  
  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: email,
    subject: `Delivery Verification Code - ${doNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Delivery Verification</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #F15929 0%, #d94d1f 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Delivery Verification</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                Hello, ${customerName}!
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 20px 0;">
                Your scaffolding equipment delivery is ready for handover. Please provide the verification code below to the delivery personnel to confirm receipt of goods.
              </p>
              
              <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
                <p style="color: #9A3412; margin: 0; font-size: 14px;">
                  <strong>Delivery Order:</strong> ${doNumber}
                </p>
              </div>
              
              <div style="background: #F3F4F6; border-radius: 8px; padding: 25px; text-align: center; margin: 0 0 25px 0;">
                <p style="color: #6B7280; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
                <span style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #F15929;">${otp}</span>
              </div>
              
              <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 0 0 25px 0;">
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                  <strong>Important:</strong> This code is valid for 10 minutes. Do not share this code with anyone other than the delivery personnel.
                </p>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 15px 0; font-size: 14px;">
                By providing this code, you confirm that you have received the items in the delivery order and agree to the terms of the rental agreement.
              </p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. If you did not request this delivery, please contact us immediately.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Delivery Verification

Hello, ${customerName}!

Your scaffolding equipment delivery is ready for handover.

Delivery Order: ${doNumber}

Your Verification Code: ${otp}

Please provide this code to the delivery personnel to confirm receipt of goods.

Important: This code is valid for 10 minutes. Do not share this code with anyone other than the delivery personnel.

By providing this code, you confirm that you have received the items in the delivery order and agree to the terms of the rental agreement.

If you did not request this delivery, please contact us immediately.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send delivery OTP email:', error);
    return false;
  }
}

/**
 * Send additional charge (payment proof) rejection email to the person who uploaded the proof
 */
export async function sendAdditionalChargeRejectionEmail(
  toEmail: string,
  invoiceNo: string,
  reason: string,
  chargeId?: string,
  customerName?: string
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || 'noreply@powermetalsteel.com';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const chargesUrl = `${baseUrl}/additional-charges`;

  const mailOptions = {
    from: `"Power Metal & Steel" <${fromAddress}>`,
    to: toEmail,
    subject: `Additional Charge Payment Rejected - ${invoiceNo}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Additional Charge Payment Rejected</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Power Metal & Steel</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Additional Charge Payment Update</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">
                Payment proof not approved
              </h2>
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 20px 0;">
                Your proof of payment for the additional charge invoice has been reviewed and was not approved at this time.
              </p>
              
              <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6B7280; padding: 8px 0; font-size: 14px;">Invoice No.:</td>
                    <td style="color: #111827; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${invoiceNo}</td>
                  </tr>
                  ${customerName ? `
                  <tr>
                    <td style="color: #6B7280; padding: 8px 0; font-size: 14px;">Customer:</td>
                    <td style="color: #111827; padding: 8px 0; font-size: 14px; text-align: right;">${customerName}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin: 0 0 25px 0;">
                <p style="color: #991B1B; margin: 0 0 10px 0; font-weight: 600; font-size: 14px;">
                  Reason for rejection:
                </p>
                <p style="color: #7F1D1D; margin: 0; font-size: 14px; line-height: 1.5;">
                  ${reason}
                </p>
              </div>
              
              <p style="color: #6B7280; line-height: 1.6; margin: 0 0 25px 0;">
                Please submit a new proof of payment with the correct information. You can do this by logging into your account.
              </p>
              
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${chargesUrl}" style="display: inline-block; background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View Additional Charges
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from Power Metal & Steel. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Power Metal & Steel - Additional Charge Payment Rejected

Your proof of payment for the additional charge has been reviewed and was not approved.

Invoice No.: ${invoiceNo}
${customerName ? `Customer: ${customerName}\n` : ''}

Reason for rejection:
${reason}

Please submit a new proof of payment. Log in at: ${chargesUrl}

This is an automated message from Power Metal & Steel.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send additional charge rejection email:', error);
    return false;
  }
}
