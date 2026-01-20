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
                  <strong>⏰ This link expires in 24 hours.</strong><br>
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

This link expires in 24 hours. If you don't set up your password within this time, please contact your administrator.

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
                  <strong>⏰ This link expires in 1 hour.</strong><br>
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

This link expires in 1 hour.

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
