import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";

interface ForgotPasswordCodeEntryProps {
  email: string;
  onBack: () => void;
  onContinue: () => void;
  onChangEmail: () => void;
}

export function ForgotPasswordCodeEntry({
  email,
  onBack,
  onContinue,
  onChangEmail,
}: ForgotPasswordCodeEntryProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newOtp.every((digit) => digit !== "") && index === 5) {
      setTimeout(() => handleVerify(newOtp.join("")), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split("").concat(Array(6).fill("")).slice(0, 6);
      setOtp(newOtp);
      setError("");
      
      // Focus last filled input or verify if complete
      if (pastedData.length === 6) {
        inputRefs.current[5]?.focus();
        setTimeout(() => handleVerify(pastedData), 100);
      } else {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const handleVerify = (code?: string) => {
    const otpCode = code || otp.join("");
    
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setIsLoading(true);

    // Simulate API verification
    setTimeout(() => {
      // Demo: accept "123456" as valid code
      if (otpCode === "123456") {
        setIsLoading(false);
        toast.success("Code verified successfully!");
        onContinue();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setError("Too many failed attempts. Please request a new code.");
          setOtp(["", "", "", "", "", ""]);
          setTimeout(() => {
            onChangEmail();
          }, 2000);
        } else {
          setError(`Invalid or expired code. ${3 - newAttempts} attempts remaining.`);
          setOtp(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
        }
        setIsLoading(false);
      }
    }, 800);
  };

  const handleResend = () => {
    if (countdown > 0) return;

    toast.success(`Verification code resent to ${email}`);
    setCountdown(300);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setAttempts(0);
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every((digit) => digit !== "");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F15929] via-[#F15929] to-[#D14820] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h2 className="text-[#231F20] mb-2">Enter Verification Code</h2>
            <p className="text-[#6B7280] text-sm">
              We sent a 6-digit verification code to{" "}
              <span className="text-[#231F20]">{email}</span>.
              Code expires in{" "}
              <span className="text-[#F15929]">{formatTime(countdown)}</span>.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
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

          {/* OTP Input Boxes */}
          <div className="mb-6">
            <div className="flex gap-2 justify-center">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center border-[#D1D5DB] focus:border-[#F15929] focus:ring-[#F15929]"
                  disabled={isLoading}
                />
              ))}
            </div>
            <p className="text-xs text-[#6B7280] text-center mt-3">
              Check your spam folder if you don't see the email.
            </p>
          </div>

          {/* Demo Code Info */}
          <div className="mb-6 p-3 bg-[#F3F4F6] rounded-lg">
            <p className="text-xs text-[#6B7280]">
              Demo: Use code <span className="text-[#231F20]">123456</span>
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Verify Button */}
            <Button
              onClick={() => handleVerify()}
              className="w-full h-12 bg-[#F15929] hover:bg-[#D14820]"
              disabled={!isComplete || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                "Verify Code"
              )}
            </Button>

            {/* Resend Code */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0}
                className={`text-sm ${
                  countdown > 0
                    ? "text-[#9CA3AF] cursor-not-allowed"
                    : "text-[#F15929] hover:text-[#D14820] hover:underline"
                }`}
              >
                {countdown > 0 ? `Resend in ${formatTime(countdown)}` : "Resend Code"}
              </button>

              <button
                type="button"
                onClick={onChangEmail}
                className="text-sm text-[#6B7280] hover:text-[#374151] hover:underline"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          © 2025 Power Metal & Steel. All rights reserved.
        </div>
      </div>
    </div>
  );
}
