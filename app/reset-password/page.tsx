'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface UserInfo {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Validate token on page load
  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setError('No token provided. Please use the link from your email.');
      return;
    }

    async function validateToken() {
      try {
        const response = await fetch(`/api/set-password?token=${token}`);
        const data = await response.json();

        if (data.success) {
          setIsValid(true);
          setUserInfo(data.user);
        } else {
          setError(data.message || 'Invalid or expired link');
        }
      } catch {
        setError('Failed to validate link. Please try again.');
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  }, [password]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 34) return 'bg-[#DC2626]';
    if (passwordStrength < 67) return 'bg-[#F59E0B]';
    if (passwordStrength < 90) return 'bg-[#059669]';
    return 'bg-[#047857]';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 34) return 'Weak';
    if (passwordStrength < 67) return 'Fair';
    if (passwordStrength < 90) return 'Good';
    return 'Excellent';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }

    if (passwordStrength < 100) {
      setSubmitError('Please meet all password requirements');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setSubmitError(data.message || 'Failed to reset password');
      }
    } catch {
      setSubmitError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center px-6 py-4 sm:px-8 md:px-12">
        <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-8 text-center mx-4">
          <h1 className=" text-2xl font-bold mb-4">Power Metal & Steel</h1>
          <Loader2 className="h-12 w-12 animate-spin text-[#1E40AF] mx-auto mb-4" />
          <p className="text-[#6B7280]">Validating your link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isValid) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center px-6 py-4 sm:px-8 md:px-12">
        <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-8 text-center mx-4">
          <h1 className=" text-2xl font-bold mb-4">Power Metal & Steel</h1>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-[#DC2626]" />
          </div>
          <h2 className="text-[#111827] text-xl font-semibold mb-2">Link Invalid or Expired</h2>
          <p className="text-[#6B7280] mb-6">{error}</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-[#1E40AF] hover:bg-[#1E3A8A]"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center px-6 py-4 sm:px-8 md:px-12">
        <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-8 text-center mx-4">
          <h1 className=" text-2xl font-bold mb-4">Power Metal & Steel</h1>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#059669]" />
          </div>
          <h2 className="text-[#111827] text-xl font-semibold mb-2">Password Reset Successfully!</h2>
          <p className="text-[#6B7280] mb-6">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-[#1E40AF] hover:bg-[#1E3A8A]"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center px-6 py-4 sm:px-8 md:px-12">
      <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-8 mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="h-8 w-8 text-[#1E40AF]" />
          </div>
          <h1 className="text-[#1E40AF] text-2xl font-bold mb-1">Power Metal & Steel</h1>
          <h2 className="text-[#111827] text-xl font-semibold mb-2">Reset Your Password</h2>
          <p className="text-[#6B7280]">
            Hi, {userInfo?.firstName || 'User'}! Enter your new password below.
          </p>
        </div>

        {/* Error message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{submitError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
            <CardContent className="pt-4">
              <p className="text-[12px] text-[#374151] mb-2">Password Requirements:</p>
              <ul className="text-[12px] text-[#6B7280] space-y-1">
                <li className={password.length >= 12 ? 'text-[#059669]' : ''}>
                  • Minimum 12 characters {password.length >= 12 && '✓'}
                </li>
                <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-[#059669]' : ''}>
                  • Upper & lowercase letters {/[a-z]/.test(password) && /[A-Z]/.test(password) && '✓'}
                </li>
                <li className={/[0-9]/.test(password) ? 'text-[#059669]' : ''}>
                  • At least one number {/[0-9]/.test(password) && '✓'}
                </li>
                <li className={/[^a-zA-Z0-9]/.test(password) ? 'text-[#059669]' : ''}>
                  • At least one special character {/[^a-zA-Z0-9]/.test(password) && '✓'}
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10 border-[#D1D5DB]"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPasswordStrengthColor()} transition-all`}
                      style={{ width: `${passwordStrength}%` }}
                    ></div>
                  </div>
                  <span className="text-[12px] text-[#6B7280]">
                    {getPasswordStrengthText()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 pr-10 border-[#D1D5DB]"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password === confirmPassword && (
              <p className="text-[12px] text-[#059669] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Passwords match
              </p>
            )}
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[12px] text-[#DC2626]">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] h-11"
            disabled={isSubmitting || passwordStrength < 100 || password !== confirmPassword}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>

          <p className="text-center text-sm text-[#6B7280]">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-[#1E40AF] hover:text-[#1E3A8A]"
            >
              Back to Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
