import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Shield, CheckCircle2, Mail, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";
import { Card, CardContent } from "../ui/card";

interface InternalRegistrationProps {
  onBack: () => void;
  onComplete: () => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function InternalRegistration({ onBack, onComplete }: InternalRegistrationProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [isLoadingSendCode, setIsLoadingSendCode] = useState(false);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [isCheckingUnique, setIsCheckingUnique] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
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

  const updateFormData = (field: string, value: unknown) => {
    setFormData({ ...formData, [field]: value });
    // Clear field-specific error when user types
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
    
    // Calculate password strength
    if (field === "password" && typeof value === "string") {
      let strength = 0;
      if (value.length >= 12) strength += 25;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength += 25;
      if (/[0-9]/.test(value)) strength += 25;
      if (/[^a-zA-Z0-9]/.test(value)) strength += 25;
      setPasswordStrength(strength);
    }
  };

  const validateStep1 = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkUniqueAndProceed = async () => {
    if (!validateStep1()) return;

    setIsCheckingUnique(true);
    setFormErrors({});

    try {
      const response = await fetch("/api/register/check-unique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
        }),
      });

      const data = await response.json();

      if (!data.success && data.errors) {
        setFormErrors(data.errors);
        setIsCheckingUnique(false);
        return;
      }

      // If validation passed, send verification code
      await handleSendVerificationCode();
      setStep(2);
    } catch {
      setFormErrors({ general: "An error occurred. Please try again." });
    } finally {
      setIsCheckingUnique(false);
    }
  };

  const handleSendVerificationCode = async () => {
    setIsLoadingSendCode(true);
    setVerificationError("");

    try {
      const response = await fetch("/api/register/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setVerificationError(data.message || "Failed to send verification code");
        return;
      }

      setCountdown(60);
      setCanResend(false);
    } catch {
      setVerificationError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoadingSendCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoadingVerify(true);
    setVerificationError("");

    try {
      const response = await fetch("/api/register/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setVerificationError(data.message || "Invalid verification code");
        return;
      }

      setStep(3);
    } catch {
      setVerificationError("Failed to verify code. Please try again.");
    } finally {
      setIsLoadingVerify(false);
    }
  };

  const handleResendCode = () => {
    if (canResend && !isLoadingSendCode) {
      handleSendVerificationCode();
    }
  };

  const validatePassword = (): boolean => {
    const errors: FormErrors = {};

    if (formData.password.length < 12) {
      errors.password = "Password must be at least 12 characters";
    } else if (!/[a-z]/.test(formData.password)) {
      errors.password = "Password must contain lowercase letters";
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = "Password must contain uppercase letters";
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = "Password must contain numbers";
    } else if (!/[^a-zA-Z0-9]/.test(formData.password)) {
      errors.password = "Password must contain special characters";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCompleteRegistration = async () => {
    if (!validatePassword()) return;

    setIsLoadingSubmit(true);
    setFormErrors({});

    try {
      const response = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setFormErrors({ general: data.message || "Registration failed" });
        return;
      }

      onComplete();
    } catch {
      setFormErrors({ general: "An error occurred. Please try again." });
    } finally {
      setIsLoadingSubmit(false);
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

        {/* General Error */}
        {formErrors.general && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{formErrors.general}</span>
          </div>
        )}

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
                  className={`h-10 border-[#D1D5DB] ${formErrors.firstName ? 'border-red-500' : ''}`}
                />
                {formErrors.firstName && (
                  <p className="text-xs text-red-500">{formErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData("lastName", e.target.value)}
                  className={`h-10 border-[#D1D5DB] ${formErrors.lastName ? 'border-red-500' : ''}`}
                />
                {formErrors.lastName && (
                  <p className="text-xs text-red-500">{formErrors.lastName}</p>
                )}
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
                className={`h-10 border-[#D1D5DB] ${formErrors.email ? 'border-red-500' : ''}`}
              />
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
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
                className={`h-10 border-[#D1D5DB] ${formErrors.phone ? 'border-red-500' : ''}`}
              />
              {formErrors.phone && (
                <p className="text-xs text-red-500">{formErrors.phone}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={checkUniqueAndProceed}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                disabled={isCheckingUnique || isLoadingSendCode}
              >
                {isCheckingUnique || isLoadingSendCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isCheckingUnique ? "Validating..." : "Sending Code..."}
                  </>
                ) : (
                  "Next"
                )}
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

            <div className="space-y-2">
              <p className="text-sm text-[#6B7280]">
                We've sent a verification code to <strong>{formData.email}</strong>
              </p>
            </div>

            {/* Error Message */}
            {verificationError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sending...
                  </>
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
                disabled={verificationCode.length !== 6 || isLoadingVerify}
              >
                {isLoadingVerify ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
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
                  className={`h-10 pr-10 border-[#D1D5DB] ${formErrors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-xs text-red-500">{formErrors.password}</p>
              )}
              {formData.password && !formErrors.password && (
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
                  className={`h-10 pr-10 border-[#D1D5DB] ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-xs text-red-500">{formErrors.confirmPassword}</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && !formErrors.confirmPassword && (
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
                disabled={isLoadingSubmit}
              >
                Back
              </Button>
              <Button
                onClick={handleCompleteRegistration}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                disabled={
                  !formData.agreeTerms || 
                  !formData.agreePolicy || 
                  !formData.agreeAccess ||
                  !formData.password ||
                  !formData.confirmPassword ||
                  isLoadingSubmit
                }
              >
                {isLoadingSubmit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for Approval"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
