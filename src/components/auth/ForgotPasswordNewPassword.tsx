import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ForgotPasswordNewPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (pw) => pw.length >= 8,
  },
  {
    id: "letter",
    label: "At least 1 letter",
    test: (pw) => /[a-zA-Z]/.test(pw),
  },
  {
    id: "digit",
    label: "At least 1 number",
    test: (pw) => /\d/.test(pw),
  },
  {
    id: "special",
    label: "At least 1 special character",
    test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw),
  },
];

export function ForgotPasswordNewPassword({
  onBack,
  onSuccess,
}: ForgotPasswordNewPasswordProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const checkPasswordRules = () => {
    return passwordRules.map((rule) => ({
      ...rule,
      passed: rule.test(newPassword),
    }));
  };

  const allRulesPassed = () => {
    return passwordRules.every((rule) => rule.test(newPassword));
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    setNewPasswordError("");
    
    // Clear confirm password error if passwords now match
    if (confirmPassword && value === confirmPassword) {
      setConfirmPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    
    if (value && newPassword && value !== newPassword) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setNewPasswordError("");
    setConfirmPasswordError("");

    // Validate new password
    if (!newPassword) {
      setNewPasswordError("Please enter a new password.");
      return;
    }

    if (!allRulesPassed()) {
      setNewPasswordError("Password must meet all requirements.");
      return;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    // Simulate checking if new password is same as old password
    const oldPassword = "1234"; // Demo purposes
    if (newPassword === oldPassword) {
      setNewPasswordError("New password cannot be same as previous password.");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 1000);
  };

  const rules = checkPasswordRules();
  const canSubmit = allRulesPassed() && newPassword === confirmPassword && confirmPassword.length > 0;

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
            <h2 className="text-[#231F20] mb-2">Create New Password</h2>
            <p className="text-[#6B7280]">
              Choose a strong password. You'll use it to sign in.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  className={`h-12 border-[#D1D5DB] pr-12 ${
                    newPasswordError ? "border-red-500" : ""
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {newPasswordError && (
                <p className="text-sm text-red-600">{newPasswordError}</p>
              )}

              {/* Password Rules */}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      {rule.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#DC2626]" />
                      )}
                      <span
                        className={
                          rule.passed ? "text-[#059669]" : "text-[#6B7280]"
                        }
                      >
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className={`h-12 border-[#D1D5DB] pr-12 ${
                    confirmPasswordError ? "border-red-500" : ""
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-sm text-red-600">{confirmPasswordError}</p>
              )}
              {!confirmPasswordError &&
                confirmPassword &&
                newPassword === confirmPassword && (
                  <p className="text-sm text-[#059669] flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Passwords match
                  </p>
                )}
            </div>

            {/* Info */}
            <div className="p-4 bg-[#F3F4F6] rounded-lg">
              <p className="text-xs text-[#6B7280]">
                By saving, your password will be updated immediately.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#F15929] hover:bg-[#D14820]"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save New Password"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          © 2025 Power Metal & Steel. All rights reserved.
        </div>
      </div>
    </div>
  );
}
