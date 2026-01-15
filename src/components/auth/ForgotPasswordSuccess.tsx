import { CheckCircle } from "lucide-react";
import { Button } from "../ui/button";

interface ForgotPasswordSuccessProps {
  onReturnToLogin: () => void;
}

export function ForgotPasswordSuccess({
  onReturnToLogin,
}: ForgotPasswordSuccessProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F15929] via-[#F15929] to-[#D14820] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#059669] rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-[#231F20] mb-3">Password Updated Successfully</h2>
            <p className="text-[#6B7280]">
              Your password has been changed. You can now sign in using your new
              password.
            </p>
          </div>

          {/* Security Notice */}
          <div className="mb-6 p-4 bg-[#F3F4F6] rounded-lg">
            <p className="text-sm text-[#374151]">
              For your security, we've sent a confirmation email to your
              registered email address.
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={onReturnToLogin}
            className="w-full h-12 bg-[#F15929] hover:bg-[#D14820]"
          >
            Return to Login
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          © 2025 Power Metal & Steel. All rights reserved.
        </div>
      </div>
    </div>
  );
}
