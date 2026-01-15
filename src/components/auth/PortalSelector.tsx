import { Building2, Users, ShoppingCart } from "lucide-react";
import { Button } from "../ui/button";

interface PortalSelectorProps {
  onSelectPortal: (portal: 'customer' | 'staff') => void;
}

export function PortalSelector({ onSelectPortal }: PortalSelectorProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F15929] to-[#D94E23] flex items-center justify-center p-4">
      <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl p-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 bg-[#F15929] rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-[#231F20]">Power Metal & Steel</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[#231F20] mb-2">Welcome</h1>
          <p className="text-[#374151]">Select your portal to continue</p>
        </div>

        {/* Portal Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => onSelectPortal('customer')}
            className="w-full h-16 bg-[#059669] hover:bg-[#047857] text-white rounded-lg flex items-center justify-center gap-3 text-[18px]"
          >
            <ShoppingCart className="h-6 w-6" />
            Customer Portal
          </Button>

          <Button
            onClick={() => onSelectPortal('staff')}
            className="w-full h-16 bg-[#F15929] hover:bg-[#D94E23] text-white rounded-lg flex items-center justify-center gap-3 text-[18px]"
          >
            <Users className="h-6 w-6" />
            Staff Portal
          </Button>
        </div>
      </div>
    </div>
  );
}