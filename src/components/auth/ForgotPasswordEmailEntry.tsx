import { useState } from "react";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface ForgotPasswordEmailEntryProps {
  onBack: () => void;
  onContinue: (email: string) => void;
}

export function ForgotPasswordEmailEntry({
  onBack,
  onContinue,
}: ForgotPasswordEmailEntryProps) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    // Malaysian phone format: +60 XX-XXX-XXXX or similar
    const phoneRegex = /^(\+?60)?[0-9\s\-]{9,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (method === "email") {
      if (!email) {
        setError("Please enter your email address.");
        return;
      }

      if (!validateEmail(email)) {
        setError("Please enter a valid email address.");
        return;
      }
    } else {
      if (!phone) {
        setError("Please enter your phone number.");
        return;
      }

      if (!validatePhone(phone)) {
        setError("Please enter a valid phone number.");
        return;
      }
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Simulate checking if email/phone exists
      // In production, this would call your backend API
      const validEmails = [
        "customer@demo.com",
        "admin@company.com",
        "sales@company.com",
        "finance@company.com",
        "operations@company.com",
        "production@company.com",
      ];

      const validPhones = [
        "+60123456789",
        "+60198765432",
        "0123456789",
      ];

      if (method === "email" && !validEmails.includes(email)) {
        setError("No account found for this email.");
        setIsLoading(false);
        return;
      }

      if (method === "phone" && !validPhones.includes(phone.replace(/\s/g, ""))) {
        setError("No account found for this phone number.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onContinue(method === "email" ? email : phone);
    }, 800);
  };

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
              Back to Login
            </button>
            <h2 className="text-[#231F20] mb-2">Reset Password</h2>
            <p className="text-[#6B7280]">
              {method === "email" 
                ? "Enter the email associated with your account. We'll send a verification code."
                : "Enter the phone number associated with your account. We'll send a verification code via SMS."}
            </p>
          </div>

          {/* Demo Credentials Info */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Demo Credentials:</strong>
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <p>📧 Email: customer@demo.com</p>
              <p>📱 Phone: +60123456789</p>
            </div>
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

            {/* Method Selection */}
            <div className="space-y-2">
              <Label htmlFor="method">Select Method</Label>
              <RadioGroup
                value={method}
                onValueChange={(value) => setMethod(value as "email" | "phone")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" />
                  <Label htmlFor="email">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phone" />
                  <Label htmlFor="phone">Phone</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Email Input */}
            {method === "email" && (
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
            )}

            {/* Phone Input */}
            {method === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+60 XX-XXX-XXXX"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError("");
                    }}
                    className="h-12 border-[#D1D5DB] pl-12"
                    disabled={isLoading}
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#F15929] hover:bg-[#D14820]"
              disabled={isLoading || (!email && !phone)}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                "Send Verification Code"
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