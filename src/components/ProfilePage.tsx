import { useState } from "react";
import { User, Lock, Eye, EyeOff, Check, Mail, Phone, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { validatePhoneNumber } from "@/lib/phone-validation";

interface ProfilePageProps {
  userId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  currentUserEmail?: string;
  currentUserPhone?: string;
}

export function ProfilePage({ 
  userId,
  currentUserName = "John Smith",
  currentUserRole = "Admin",
  currentUserEmail = "john.smith@example.com",
  currentUserPhone = "+60123456789"
}: ProfilePageProps) {
  // Parse first and last name from full name
  const nameParts = currentUserName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Email fields
  const [email, setEmail] = useState(currentUserEmail);
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailCodeError, setEmailCodeError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isVerifyEmailLoading, setIsVerifyEmailLoading] = useState(false);

  // Phone fields
  const [phone, setPhone] = useState(currentUserPhone);
  const [phoneError, setPhoneError] = useState("");
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  // Modal state
  const [showPasswordConfirmModal, setShowPasswordConfirmModal] = useState(false);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError("Email cannot be empty.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePhone = (phone: string): boolean => {
    const validation = validatePhoneNumber(phone, 'MY');
    if (!validation.isValid) {
      setPhoneError(validation.error || "Please enter a valid phone number.");
      return false;
    }
    setPhoneError("");
    return true;
  };

  /**
   * Password requirements (stricter):
   * - Minimum 12 characters
   * - At least 1 uppercase letter (A-Z)
   * - At least 1 lowercase letter (a-z)
   * - At least 1 special character (!@#$%^&* etc.)
   * - At least 1 number (0-9)
   */
  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (!password) {
      return { valid: true, message: "" }; // Empty is OK if user doesn't want to change password
    }

    if (password.length < 12) {
      return { valid: false, message: "Password must be at least 12 characters." };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least 1 uppercase letter." };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: "Password must contain at least 1 lowercase letter." };
    }
    if (!/\d/.test(password)) {
      return { valid: false, message: "Password must contain at least 1 number." };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: "Password must contain at least 1 special character." };
    }
    return { valid: true, message: "" };
  };

  const validatePasswordMatch = (): boolean => {
    if (newPassword && newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return false;
    }
    return true;
  };

  // Email update handlers
  const handleUpdateEmail = async () => {
    if (!validateEmail(email)) return;
    if (email === currentUserEmail) {
      setEmailError("New email must be different from current email.");
      return;
    }

    setIsEmailLoading(true);
    setEmailError("");

    try {
      const response = await fetch("/api/profile/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setEmailError(data.message || "Failed to send verification code.");
        return;
      }

      // Store pending email and show verification modal
      setPendingEmail(email);
      setShowEmailVerification(true);
      setEmailVerificationCode("");
      setEmailCodeError("");
      
      toast.info("Verification code sent to your new email address.", {
        duration: 3000,
      });
    } catch (error) {
      console.error("Update email error:", error);
      setEmailError("An error occurred. Please try again.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailVerificationCode.trim()) {
      setEmailCodeError("Please enter the verification code.");
      return;
    }

    setIsVerifyEmailLoading(true);
    setEmailCodeError("");

    try {
      const response = await fetch("/api/profile/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          newEmail: pendingEmail, 
          code: emailVerificationCode 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setEmailCodeError(data.message || "Invalid verification code.");
        return;
      }

      setShowEmailVerification(false);
      toast.success("Email updated successfully.", {
        duration: 2500,
      });
      setEmailVerificationCode("");
      setEmailCodeError("");
      // Update the displayed email
      setEmail(pendingEmail);
    } catch (error) {
      console.error("Verify email error:", error);
      setEmailCodeError("An error occurred. Please try again.");
    } finally {
      setIsVerifyEmailLoading(false);
    }
  };

  // Phone update handlers
  const handleUpdatePhone = async () => {
    if (!validatePhone(phone)) return;
    if (phone === currentUserPhone) {
      setPhoneError("New phone must be different from current phone.");
      return;
    }

    setIsPhoneLoading(true);
    setPhoneError("");

    try {
      const response = await fetch("/api/profile/update-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPhone: phone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPhoneError(data.message || "Failed to update phone number.");
        return;
      }

      toast.success("Phone number updated successfully.", {
        duration: 2500,
      });
    } catch (error) {
      console.error("Update phone error:", error);
      setPhoneError("An error occurred. Please try again.");
    } finally {
      setIsPhoneLoading(false);
    }
  };

  // Password update handlers
  const handleSavePassword = () => {
    setPasswordError("");

    // Validate that user entered password fields
    if (!currentPassword && !newPassword && !confirmPassword) {
      setPasswordError("Please enter your passwords to make changes.");
      return;
    }

    // Validate current password is provided
    if (!currentPassword) {
      setPasswordError("Current password is required to change password.");
      return;
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.message);
      return;
    }

    // Validate password match
    if (!validatePasswordMatch()) return;

    // All validation passed, show confirmation modal
    setShowPasswordConfirmModal(true);
  };

  const handleConfirmPasswordUpdate = async () => {
    setShowPasswordConfirmModal(false);
    setIsPasswordLoading(true);
    setPasswordError("");

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPasswordError(data.message || "Failed to update password.");
        return;
      }

      toast.success("Password updated successfully.", {
        duration: 2500,
      });

      // Clear password fields after successful update
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsForgotPasswordLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUserEmail }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Password reset link sent to your email.", {
          duration: 3000,
        });
      } else {
        toast.error(data.message || "Failed to send password reset link.", {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("An error occurred. Please try again.", {
        duration: 3000,
      });
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (!password) return { strength: "", color: "" };
    
    const validation = validatePassword(password);
    if (!validation.valid) return { strength: "Weak", color: "text-[#DC2626]" };
    
    // Strong if meets all requirements and has length >= 16
    if (password.length >= 16) {
      return { strength: "Strong", color: "text-[#059669]" };
    }
    
    return { strength: "Medium", color: "text-[#F59E0B]" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Check individual password requirements
  const passwordChecks = {
    length: newPassword.length >= 12,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <h1>My Profile</h1>
        <p className="text-[#374151]">Update your contact information and password settings.</p>
      </div>

      {/* Basic Information */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F15929] flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-[18px]">Basic Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <div className="h-10 px-3 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center text-[#6B7280]">
                {firstName}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <div className="h-10 px-3 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center text-[#6B7280]">
                {lastName}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="h-10 px-3 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center text-[#6B7280]">
              {currentUserRole}
            </div>
            <p className="text-[12px] text-[#6B7280]">Your role is managed by system administrators.</p>
          </div>
        </CardContent>
      </Card>

      {/* Email Update */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F15929] flex items-center justify-center">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-[18px]">Email Address</CardTitle>
              <CardDescription className="text-[14px] text-[#6B7280] mt-1">
                Update your email address (verification required)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              onBlur={() => validateEmail(email)}
              className={`h-10 ${emailError ? "border-[#DC2626] focus-visible:ring-[#DC2626]" : ""}`}
              placeholder="Enter your email address"
              disabled={isEmailLoading}
            />
            {emailError && (
              <p className="text-[#DC2626] text-[14px]">{emailError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdateEmail}
              disabled={isEmailLoading}
              className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
            >
              {isEmailLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Update Email"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phone Number Update */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F15929] flex items-center justify-center">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-[18px]">Phone Number</CardTitle>
              <CardDescription className="text-[14px] text-[#6B7280] mt-1">
                Update your phone number
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError("");
              }}
              onBlur={() => validatePhone(phone)}
              className={`h-10 ${phoneError ? "border-[#DC2626] focus-visible:ring-[#DC2626]" : ""}`}
              placeholder="Enter your phone number"
              disabled={isPhoneLoading}
            />
            {phoneError && (
              <p className="text-[#DC2626] text-[14px]">{phoneError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdatePhone}
              disabled={isPhoneLoading}
              className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
            >
              {isPhoneLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Phone"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F15929] flex items-center justify-center">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-[18px]">Account Security</CardTitle>
              <CardDescription className="text-[14px] text-[#6B7280] mt-1">
                Change your password to keep your account secure
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-10 pr-10"
                placeholder="Enter current password"
                disabled={isPasswordLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isForgotPasswordLoading}
              className="text-[14px] text-[#F15929] hover:text-[#D14821] hover:underline disabled:opacity-50"
            >
              {isForgotPasswordLoading ? "Sending..." : "Forgot Password?"}
            </button>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                className={`h-10 pr-10 ${passwordError ? "border-[#DC2626] focus-visible:ring-[#DC2626]" : ""}`}
                placeholder="Enter new password"
                disabled={isPasswordLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && passwordStrength.strength && (
              <p className={`text-[14px] ${passwordStrength.color}`}>
                Password strength: {passwordStrength.strength}
              </p>
            )}
            <div className="space-y-1">
              <p className="text-[12px] text-[#6B7280]">Password must meet the following requirements:</p>
              <div className="space-y-1 pl-4">
                <div className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 ${passwordChecks.length ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={passwordChecks.length ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 12 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 ${passwordChecks.uppercase ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={passwordChecks.uppercase ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 1 uppercase letter (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 ${passwordChecks.lowercase ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={passwordChecks.lowercase ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 1 lowercase letter (a-z)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 ${passwordChecks.number ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={passwordChecks.number ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 1 number (0-9)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 ${passwordChecks.special ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={passwordChecks.special ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 1 special character (!@#$%^&* etc.)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                onBlur={validatePasswordMatch}
                className={`h-10 pr-10 ${passwordError ? "border-[#DC2626] focus-visible:ring-[#DC2626]" : ""}`}
                placeholder="Re-enter new password"
                disabled={isPasswordLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-[#DC2626] text-[14px]">{passwordError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSavePassword}
              disabled={isPasswordLoading}
              className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
            >
              {isPasswordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Verification Modal */}
      <AlertDialog open={showEmailVerification} onOpenChange={setShowEmailVerification}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Email Address</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the 6-digit verification code sent to {pendingEmail}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="emailCode">Verification Code</Label>
              <Input
                id="emailCode"
                type="text"
                value={emailVerificationCode}
                onChange={(e) => {
                  setEmailVerificationCode(e.target.value);
                  if (emailCodeError) setEmailCodeError("");
                }}
                className={`h-10 ${emailCodeError ? "border-[#DC2626] focus-visible:ring-[#DC2626]" : ""}`}
                placeholder="Enter 6-digit code"
                maxLength={6}
                disabled={isVerifyEmailLoading}
              />
              {emailCodeError && (
                <p className="text-[#DC2626] text-[14px]">{emailCodeError}</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isVerifyEmailLoading}
              onClick={() => {
                setShowEmailVerification(false);
                setEmailVerificationCode("");
                setEmailCodeError("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyEmail}
              disabled={isVerifyEmailLoading}
              className="bg-[#F15929] hover:bg-[#D14821]"
            >
              {isVerifyEmailLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Confirmation Modal */}
      <AlertDialog open={showPasswordConfirmModal} onOpenChange={setShowPasswordConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Password Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your password?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPasswordUpdate}
              className="bg-[#F15929] hover:bg-[#D14821]"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
