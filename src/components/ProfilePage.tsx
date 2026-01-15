import { useState } from "react";
import { User, Lock, Eye, EyeOff, Check, Mail, Phone } from "lucide-react";
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
import { toast } from "sonner@2.0.3";

interface ProfilePageProps {
  currentUserName?: string;
  currentUserRole?: string;
  currentUserEmail?: string;
  currentUserPhone?: string;
}

export function ProfilePage({ 
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
  const [emailError, setEmailError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailCodeError, setEmailCodeError] = useState("");

  // Phone fields
  const [phone, setPhone] = useState(currentUserPhone);
  const [phoneError, setPhoneError] = useState("");
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [phoneCodeError, setPhoneCodeError] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

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
    if (!phone.trim()) {
      setPhoneError("Phone number cannot be empty.");
      return false;
    }
    // Basic phone validation - can be enhanced based on requirements
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError("Please enter a valid phone number.");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (!password) {
      return { valid: true, message: "" }; // Empty is OK if user doesn't want to change password
    }

    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters." };
    }
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least 1 letter." };
    }
    if (!/\d/.test(password)) {
      return { valid: false, message: "Password must contain at least 1 digit." };
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
  const handleUpdateEmail = () => {
    if (!validateEmail(email)) return;
    
    // Simulate sending verification code
    setShowEmailVerification(true);
    setEmailVerificationCode("");
    setEmailCodeError("");
    
    toast.info("Verification code sent to your new email address.", {
      duration: 3000,
    });
  };

  const handleVerifyEmail = () => {
    if (!emailVerificationCode.trim()) {
      setEmailCodeError("Please enter the verification code.");
      return;
    }

    // Simulate verification (in real app, verify with backend)
    if (emailVerificationCode === "123456") {
      setShowEmailVerification(false);
      toast.success("Email updated successfully.", {
        duration: 2500,
      });
      setEmailVerificationCode("");
      setEmailCodeError("");
    } else {
      setEmailCodeError("Invalid verification code. Please try again.");
    }
  };

  // Phone update handlers
  const handleUpdatePhone = () => {
    if (!validatePhone(phone)) return;
    
    // Simulate sending verification code
    setShowPhoneVerification(true);
    setPhoneVerificationCode("");
    setPhoneCodeError("");
    
    toast.info("Verification code sent to your new phone number.", {
      duration: 3000,
    });
  };

  const handleVerifyPhone = () => {
    if (!phoneVerificationCode.trim()) {
      setPhoneCodeError("Please enter the verification code.");
      return;
    }

    // Simulate verification (in real app, verify with backend)
    if (phoneVerificationCode === "123456") {
      setShowPhoneVerification(false);
      toast.success("Phone number updated successfully.", {
        duration: 2500,
      });
      setPhoneVerificationCode("");
      setPhoneCodeError("");
    } else {
      setPhoneCodeError("Invalid verification code. Please try again.");
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

  const handleConfirmPasswordUpdate = () => {
    setShowPasswordConfirmModal(false);
    
    // Simulate API call
    setTimeout(() => {
      toast.success("Password updated successfully.", {
        duration: 2500,
      });

      // Clear password fields after successful update
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 300);
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (!password) return { strength: "", color: "" };
    
    const validation = validatePassword(password);
    if (!validation.valid) return { strength: "Weak", color: "text-[#DC2626]" };
    
    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return { strength: "Strong", color: "text-[#059669]" };
    }
    
    return { strength: "Medium", color: "text-[#F59E0B]" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

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
            />
            {emailError && (
              <p className="text-[#DC2626] text-[14px]">{emailError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdateEmail}
              className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
            >
              Update Email
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
                Update your phone number (verification required)
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
            />
            {phoneError && (
              <p className="text-[#DC2626] text-[14px]">{phoneError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdatePhone}
              className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
            >
              Update Phone
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
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
                  <Check className={`h-3 w-3 ${newPassword.length >= 8 ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={newPassword.length >= 8 ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 ${/[a-zA-Z]/.test(newPassword) ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={/[a-zA-Z]/.test(newPassword) ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 1 letter
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <Check className={`h-3 w-3 ${/\d/.test(newPassword) ? "text-[#059669]" : "text-[#D1D5DB]"}`} />
                  <span className={/\d/.test(newPassword) ? "text-[#059669]" : "text-[#6B7280]"}>
                    At least 1 digit
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
              className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
            >
              Save Changes
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
              Please enter the 6-digit verification code sent to {email}
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
              />
              {emailCodeError && (
                <p className="text-[#DC2626] text-[14px]">{emailCodeError}</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowEmailVerification(false);
              setEmailVerificationCode("");
              setEmailCodeError("");
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyEmail}
              className="bg-[#F15929] hover:bg-[#D14821]"
            >
              Verify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Phone Verification Modal */}
      <AlertDialog open={showPhoneVerification} onOpenChange={setShowPhoneVerification}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Phone Number</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the 6-digit verification code sent to {phone}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="phoneCode">Verification Code</Label>
              <Input
                id="phoneCode"
                type="text"
                value={phoneVerificationCode}
                onChange={(e) => {
                  setPhoneVerificationCode(e.target.value);
                  if (phoneCodeError) setPhoneCodeError("");
                }}
                className={`h-10 ${phoneCodeError ? "border-[#DC2626] focus-visible:ring-[#DC2626]" : ""}`}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              {phoneCodeError && (
                <p className="text-[#DC2626] text-[14px]">{phoneCodeError}</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowPhoneVerification(false);
              setPhoneVerificationCode("");
              setPhoneCodeError("");
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyPhone}
              className="bg-[#F15929] hover:bg-[#D14821]"
            >
              Verify
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
