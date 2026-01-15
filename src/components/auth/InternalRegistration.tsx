import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Shield, CheckCircle2, Mail } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";
import { Card, CardContent } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface InternalRegistrationProps {
  onBack: () => void;
  onComplete: () => void;
}

const VALID_VERIFICATION_CODE = "123456";

export function InternalRegistration({ onBack, onComplete }: InternalRegistrationProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [isLoadingSendCode, setIsLoadingSendCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    enable2FA: false,
    twoFAMethod: "authenticator",
    agreeTerms: false,
    agreePolicy: false,
    agreeAccess: false,
  });

  const [passwordStrength, setPasswordStrength] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Calculate password strength
    if (field === "password") {
      let strength = 0;
      if (value.length >= 12) strength += 25;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength += 25;
      if (/[0-9]/.test(value)) strength += 25;
      if (/[^a-zA-Z0-9]/.test(value)) strength += 25;
      setPasswordStrength(strength);
    }
  };

  const handleSendVerificationCode = () => {
    setIsLoadingSendCode(true);
    // Simulate API call to send verification code
    setTimeout(() => {
      setIsLoadingSendCode(false);
      setCountdown(60);
      setCanResend(false);
      setVerificationError("");
    }, 1000);
  };

  const handleVerifyCode = () => {
    if (verificationCode === VALID_VERIFICATION_CODE) {
      setVerificationError("");
      setStep(3);
    } else {
      setVerificationError("Invalid verification code. Please try again.");
    }
  };

  const handleResendCode = () => {
    if (canResend) {
      handleSendVerificationCode();
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 34) return "bg-[#DC2626]";
    if (passwordStrength < 67) return "bg-[#F59E0B]";
    if (passwordStrength < 90) return "bg-[#059669]";
    return "bg-[#047857]";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 34) return "Weak";
    if (passwordStrength < 67) return "Fair";
    if (passwordStrength < 90) return "Good";
    return "Excellent";
  };

  const progressPercentage = (step / 3) * 100;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2 className="text-[#111827] mb-2">Internal Team Registration</h2>
          <Progress value={progressPercentage} className="h-2 [&>div]:bg-[#1E3FA6]" />
          <p className="text-[12px] text-[#6B7280] mt-2">Step {step} of 3</p>
        </div>

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[#111827] mb-4">Personal Information</h3>
              <div className="border-b border-[#E5E7EB] mb-4"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData("firstName", e.target.value)}
                  className="h-10 border-[#D1D5DB]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData("lastName", e.target.value)}
                  className="h-10 border-[#D1D5DB]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                className="h-10 border-[#D1D5DB]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+60 12-345-6789"
                value={formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
                className="h-10 border-[#D1D5DB]"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  handleSendVerificationCode();
                  setStep(2);
                }}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                disabled={!formData.email}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Email Verification */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[#111827] mb-4">Email Verification</h3>
              <div className="border-b border-[#E5E7EB] mb-4"></div>
            </div>

            {/* Demo Code Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Demo Verification Code:</strong>
              </p>
              <p className="text-2xl text-blue-900 tracking-wider">123456</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-[#6B7280]">
                We've sent a verification code to <strong>{formData.email}</strong>
              </p>
            </div>

            {/* Error Message */}
            {verificationError && (
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
                <span className="text-sm">{verificationError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verificationCode">
                Verification Code <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value);
                    setVerificationError("");
                  }}
                  maxLength={6}
                  className="h-12 border-[#D1D5DB] pl-12 text-center text-2xl tracking-widest"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              </div>
            </div>

            {/* Resend Code */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#6B7280]">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={!canResend || isLoadingSendCode}
                className="text-[#1E40AF] hover:text-[#1E3A8A] h-auto p-0"
              >
                {isLoadingSendCode ? (
                  "Sending..."
                ) : canResend ? (
                  "Resend Code"
                ) : (
                  `Resend in ${countdown}s`
                )}
              </Button>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="h-10 px-6"
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyCode}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                disabled={verificationCode.length !== 6}
              >
                Verify & Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Security Setup */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[#111827] mb-4">Security Settings</h3>
              <div className="border-b border-[#E5E7EB] mb-4"></div>
            </div>

            <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
              <CardContent className="pt-4">
                <p className="text-[12px] text-[#374151] mb-2">Password Requirements:</p>
                <ul className="text-[12px] text-[#6B7280] space-y-1">
                  <li>• Minimum 12 characters</li>
                  <li>• Upper & lowercase letters</li>
                  <li>• Numbers & special characters</li>
                  <li>• Not similar to personal info</li>
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  className="h-10 pr-10 border-[#D1D5DB]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPasswordStrengthColor()} transition-all`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                    <span className="text-[12px] text-[#6B7280]">
                      Strength: {getPasswordStrengthText()} {passwordStrength}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  className="h-10 pr-10 border-[#D1D5DB]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-[12px] text-[#059669] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeTerms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => updateFormData("agreeTerms", checked)}
                />
                <Label htmlFor="agreeTerms" className="cursor-pointer">
                  I agree to the terms and conditions
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreePolicy"
                  checked={formData.agreePolicy}
                  onCheckedChange={(checked) => updateFormData("agreePolicy", checked)}
                />
                <Label htmlFor="agreePolicy" className="cursor-pointer">
                  I accept the data privacy policy
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeAccess"
                  checked={formData.agreeAccess}
                  onCheckedChange={(checked) => updateFormData("agreeAccess", checked)}
                />
                <Label htmlFor="agreeAccess" className="cursor-pointer">
                  I understand the access rules
                </Label>
              </div>
            </div>

            <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
              <CardContent className="pt-4">
                <h4 className="text-[#111827] mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Approval Workflow
                </h4>
                <ol className="text-[14px] text-[#6B7280] space-y-1 ml-6">
                  <li>1. Manager approval required</li>
                  <li>2. IT department review</li>
                  <li>3. Account activation in 24-48h</li>
                </ol>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="h-10 px-6"
              >
                Back
              </Button>
              <Button
                onClick={onComplete}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                disabled={!formData.agreeTerms || !formData.agreePolicy || !formData.agreeAccess}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}