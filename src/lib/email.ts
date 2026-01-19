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
