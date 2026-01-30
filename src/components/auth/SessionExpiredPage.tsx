"use client";

import { useState, useEffect } from "react";
import { Clock, LogIn, Building2 } from "lucide-react";
import { Button } from "../ui/button";

interface SessionExpiredPageProps {
  onReturnToLogin: () => void;
  autoRedirectSeconds?: number;
}

export function SessionExpiredPage({ 
  onReturnToLogin, 
  autoRedirectSeconds = 10 
}: SessionExpiredPageProps) {
  const [countdown, setCountdown] = useState(autoRedirectSeconds);

  useEffect(() => {
    if (countdown <= 0) {
      onReturnToLogin();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onReturnToLogin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F15929] via-[#F15929] to-[#D14820] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#F15929] rounded-xl flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Session Expired Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-[#231F20] mb-2">
              Session Expired
            </h1>
            <p className="text-[#6B7280]">
              Your session has expired due to inactivity. Please log in again to continue.
            </p>
          </div>

          {/* Countdown */}
          <div className="text-center mb-6">
            <p className="text-sm text-[#6B7280]">
              Redirecting to login in{" "}
              <span className="font-semibold text-[#F15929]">{countdown}</span>{" "}
              seconds...
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
            <div
              className="bg-[#F15929] h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${((autoRedirectSeconds - countdown) / autoRedirectSeconds) * 100}%`,
              }}
            />
          </div>

          {/* Login Button */}
          <Button
            onClick={onReturnToLogin}
            className="w-full h-12 bg-[#F15929] hover:bg-[#D14820] text-white"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Return to Login
          </Button>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-[#F3F4F6] rounded-lg">
            <p className="text-xs text-[#6B7280] text-center">
              For your security, sessions automatically expire after 15 minutes of inactivity.
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
