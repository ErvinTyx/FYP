import { Building2, Users, Handshake, UserCircle } from "lucide-react";
import { Button } from "../ui/button";

interface RegistrationSelectorProps {
  onSelectType: (type: 'internal' | 'customer' | 'vendor') => void;
  onBackToLogin: () => void;
}

export function RegistrationSelector({ onSelectType, onBackToLogin }: RegistrationSelectorProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center p-4">
      <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-2xl p-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 bg-[rgb(235,86,40)] rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-[#111827]">Power Metal & Steel</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[#111827] mb-2">Get Started</h1>
          <p className="text-[#374151]">Choose your account type</p>
        </div>

        {/* Account Type Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => onSelectType('internal')}
            className="p-6 border-2 border-[#E5E7EB] rounded-xl hover:border-[#059669] hover:bg-[#F0FDF4] transition-all group"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center group-hover:bg-[#059669] transition-colors">
                <Building2 className="h-8 w-8 text-[#059669] group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-[#111827] mb-1">Internal Team</h3>
                <p className="text-[12px] text-[#6B7280]">Company employees</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectType('customer')}
            className="p-6 border-2 border-[#E5E7EB] rounded-xl hover:border-[#1E40AF] hover:bg-[#EFF6FF] transition-all group"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center group-hover:bg-[#1E40AF] transition-colors">
                <Users className="h-8 w-8 text-[#1E40AF] group-hover:text-white" />
              </div>
              <div>
                <h3 className="text-[#111827] mb-1">Customer</h3>
                <p className="text-[12px] text-[#6B7280]">Business or individual</p>
              </div>
            </div>
          </button>
        </div>

        {/* Back to Login */}
        <div className="text-center mt-8">
          <p className="text-[14px] text-[#374151]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-[#059669] hover:text-[#047857]"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}