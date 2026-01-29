import { useState } from "react";
import { Eye, EyeOff, Building2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";

interface LoginPageProps {
  onLogin: (role: string) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onBack: () => void;
}

export function LoginPage({ onLogin, onNavigateToRegister, onNavigateToForgotPassword, onBack }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Mock authentication - check credentials
      if (email && password === "1234") {
        // Simulate role-based login
        if (email.includes("admin")) {
          onLogin("admin");
        } else if (email.includes("sales")) {
          onLogin("sales");
        } else if (email.includes("finance")) {
          onLogin("finance");
        } else if (email.includes("production")) {
          onLogin("production");
        } else if (email.includes("operations")) {
          onLogin("operations");
        } else if (email.includes("vendor")) {
          onLogin("vendor");
        } else {
          onLogin("admin"); // Default
        }
      } else {
        setError("Please check your email and password (use 1234)");
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center p-4 bg-[rgba(0,0,0,0)]">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-10">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 bg-[#F15929] rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-[#231F20]">Staff Portal</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[#231F20] mb-2">Welcome Back!</h1>
          <p className="text-[#374151]">Sign in to your staff account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-[#DC2626] bg-[#FEE2E2]">
            <AlertCircle className="h-4 w-4 text-[#DC2626]" />
            <AlertDescription className="text-[#DC2626]">{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 border-[#D1D5DB] focus:border-[#F15929] focus:ring-2 focus:ring-[#F15929]/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10 border-[#D1D5DB] focus:border-[#F15929] focus:ring-2 focus:ring-[#F15929]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-[14px] cursor-pointer">
                Remember me
              </Label>
            </div>
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-[14px] text-[#F15929] hover:text-[#D94E23]"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-[#F15929] hover:bg-[#D94E23] text-white rounded-lg"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "SIGN IN"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E7EB]"></div>
          </div>
          <div className="relative flex justify-center text-[14px]">
            <span className="px-2 bg-white text-[#6B7280]">or continue with</span>
          </div>
        </div>

        {/* SSO Button */}
        <Button
          variant="outline"
          className="w-full h-12 border-[#D1D5DB] hover:bg-[#F3F4F6] rounded-lg"
        >
          <Building2 className="mr-2 h-5 w-5" />
          SSO - Company Portal
        </Button>

        {/* Register Link */}
        <p className="text-center mt-6 text-[14px] text-[#374151]">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="text-[#1E40AF] hover:text-[#1E3A8A]"
          >
            Sign up
          </button>
        </p>

        {/* Demo Credentials */}
        <div className="mt-8 p-4 bg-[#EFF6FF] rounded-lg border border-[#DBEAFE]">
          <p className="text-[12px] text-[#1E40AF] mb-2">Demo credentials:</p>
          <div className="space-y-1 text-[12px] text-[#1E3A8A]">
            <p>• admin@company.com (Admin)</p>
            <p>• sales@company.com (Sales)</p>
            <p>• finance@company.com (Finance)</p>
            <p>• Password: 1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}