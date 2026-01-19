"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface UnifiedLoginProps {
  onLogin?: (role: string) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword?: () => void;
  callbackUrl?: string;
}

export function UnifiedLogin({ 
  onLogin, 
  onNavigateToRegister, 
  onNavigateToForgotPassword,
  callbackUrl = "/" 
}: UnifiedLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // First, check credentials and get specific error message
      const checkResponse = await fetch('/api/auth/check-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const checkResult = await checkResponse.json();

      if (!checkResult.success) {
        setErrorMessage(checkResult.message);
        setIsLoading(false);
        return;
      }

      // Credentials are valid, proceed with NextAuth signIn
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      console.log("[Login] SignIn result:", result);

      if (result?.error) {
        console.error("[Login] SignIn error:", result.error);
        // This shouldn't happen if check-credentials passed, but handle it just in case
        setErrorMessage("An error occurred during sign in. Please try again.");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        toast.success("Welcome!");
        // If onLogin callback is provided, call it (for legacy compatibility)
        if (onLogin) {
          onLogin("authenticated");
        }
        // Redirect to callback URL
        window.location.href = callbackUrl;
      } else {
        // If result exists but neither ok nor error, something unexpected happened
        console.warn("[Login] Unexpected result:", result);
        setErrorMessage("An unexpected error occurred. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Login] Exception during signIn:", error);
      setErrorMessage("An error occurred. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F15929] via-[#F15929] to-[#D14820] flex items-center justify-center p-4">
      {/* Login Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-[#F15929] rounded-xl flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[#231F20] mb-2">Power Metal & Steel</h1>
            <p className="text-[#6B7280]">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Flash Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}
            
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#374151]">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage("");
                }}
                className="h-12 border-[#D1D5DB] focus:border-[#F15929] focus:ring-[#F15929]"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#374151]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  className="h-12 border-[#D1D5DB] focus:border-[#F15929] focus:ring-[#F15929] pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-[#F15929] hover:text-[#D14820] hover:underline"
                onClick={onNavigateToForgotPassword ? onNavigateToForgotPassword : () => toast.info("Please contact administrator to reset your password")}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#F15929] hover:bg-[#D14820] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Super Admin Credentials Info */}
          <div className="mt-8 p-4 bg-[#F3F4F6] rounded-lg">
            <p className="text-xs text-[#6B7280] mb-2">Super Admin Credentials:</p>
            <div className="text-xs text-[#374151] space-y-1">
              <p>• superadmin@powermetalsteel.com</p>
              <p className="mt-2 text-[#6B7280]">Password: SuperAdmin@2024!</p>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B7280]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-[#F15929] hover:text-[#D14820] hover:underline"
              >
                Sign up
              </button>
            </p>
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
