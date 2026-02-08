import { useState } from "react";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ForgotPasswordEmailEntryProps {
  onBack: () => void;
  onContinue: (email: string) => void;
}

export function ForgotPasswordEmailEntry({
  onBack,
}: ForgotPasswordEmailEntryProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.message || "Failed to send reset email. Please try again.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - email sent
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center px-6 py-4 sm:px-8 md:px-12">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-[#059669]" />
            </div>
            <h2 className="text-[#111827] text-xl font-semibold mb-2">Check Your Email</h2>
            <p className="text-[#6B7280] mb-2">
              We've sent a password reset link to:
            </p>
            <p className="text-[#1E40AF] font-medium mb-6">{email}</p>
            <p className="text-[#6B7280] text-sm mb-6">
              Click the link in the email to reset your password. The link will expire in 15 minutes.
            </p>
            <div className="space-y-3">
              <Button
                onClick={onBack}
                className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] h-11"
              >
                Return to Login
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
                className="text-sm text-[#6B7280] hover:text-[#374151]"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-white/80 text-sm">
            © {new Date().getFullYear()} Power Metal & Steel. All rights reserved.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center px-6 py-4 sm:px-8 md:px-12">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </button>
            <h2 className="text-[#111827] text-xl font-semibold mb-2">Forgot Password?</h2>
            <p className="text-[#6B7280]">
              Enter the email address associated with your account. We'll send you a link to reset your password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="h-12 border-[#D1D5DB] pl-12"
                  disabled={isLoading}
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#1E40AF] hover:bg-[#1E3A8A]"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </div>
              ) : (
                "Send Reset Link"
              )}
            </Button>

            {/* Help text */}
            <p className="text-center text-sm text-[#6B7280]">
              Remember your password?{" "}
              <button
                type="button"
                onClick={onBack}
                className="text-[#1E40AF] hover:text-[#1E3A8A]"
              >
                Back to Login
              </button>
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          © {new Date().getFullYear()} Power Metal & Steel. All rights reserved.
        </div>
      </div>
    </div>
  );
}
