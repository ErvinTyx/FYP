import { CheckCircle2, Users, Settings, BarChart3, FileText, Package, Truck } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

interface WelcomeScreenProps {
  role: string;
  onContinue: () => void;
}

export function WelcomeScreen({ role, onContinue }: WelcomeScreenProps) {
  const getRoleContent = () => {
    switch (role) {
      case 'admin':
        return {
          title: "Welcome, System Administrator!",
          emoji: "🎉",
          checklist: [
            { text: "User account created", completed: true },
            { text: "Configure system settings", completed: false },
            { text: "Set up user permissions", completed: false },
            { text: "Review security policies", completed: false },
            { text: "Import initial data", completed: false },
          ],
          quickActions: [
            { icon: Users, title: "User Management", desc: "Manage system users & roles" },
            { icon: Settings, title: "System Settings", desc: "Configure company preferences" },
            { icon: BarChart3, title: "Dashboard Setup", desc: "Customize reporting views" },
          ],
        };
      case 'sales':
        return {
          title: "Welcome to Sales Team!",
          emoji: "🎉",
          access: [
            "Customer database",
            "Quotation management",
            "Agreement tracking",
            "Sales pipeline",
            "Commission tracking",
          ],
          quickActions: [
            { icon: FileText, title: "Create Quotation", desc: "Start new customer proposal" },
            { icon: Users, title: "View Customers", desc: "Access customer database" },
            { icon: BarChart3, title: "Sales Pipeline", desc: "Track active opportunities" },
          ],
        };
      case 'finance':
        return {
          title: "Welcome to Finance Team!",
          emoji: "💰",
          access: [
            "Billing & invoicing",
            "Payment processing",
            "Credit notes & refunds",
            "Financial reporting",
            "Account reconciliation",
          ],
          quickActions: [
            { icon: FileText, title: "Create Invoice", desc: "Generate new invoice" },
            { icon: BarChart3, title: "Financial Reports", desc: "View financial analytics" },
            { icon: Settings, title: "Payment Processing", desc: "Manage payments" },
          ],
        };
      case 'production':
        return {
          title: "Welcome to Production Team!",
          emoji: "🏭",
          access: [
            "Inventory management",
            "Rental item tracking",
            "Quality control",
            "Repair status",
            "Equipment maintenance",
          ],
          quickActions: [
            { icon: Package, title: "Inventory", desc: "Manage stock levels" },
            { icon: Settings, title: "Quality Control", desc: "Track item condition" },
            { icon: BarChart3, title: "Production Reports", desc: "View production metrics" },
          ],
        };
      case 'operations':
        return {
          title: "Welcome to Operations Team!",
          emoji: "🚚",
          access: [
            "Delivery coordination",
            "Project management",
            "Customer support",
            "Field operations",
            "Logistics tracking",
          ],
          quickActions: [
            { icon: Truck, title: "Delivery Schedule", desc: "Manage deliveries" },
            { icon: FileText, title: "Project Tracking", desc: "Monitor active projects" },
            { icon: Users, title: "Customer Support", desc: "Handle support tickets" },
          ],
        };
      default:
        return {
          title: "Welcome!",
          emoji: "👋",
          access: ["Account access"],
          quickActions: [],
        };
    }
  };

  const content = getRoleContent();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center p-4">
      <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-2xl p-10">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{content.emoji}</div>
          <h1 className="text-[#111827] mb-2">{content.title}</h1>
        </div>

        {content.checklist && (
          <Card className="border-[#E5E7EB] mb-6">
            <CardContent className="pt-6">
              <h3 className="text-[#111827] mb-4">Quick Setup Checklist:</h3>
              <div className="space-y-3">
                {content.checklist.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-[#059669] flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-[#D1D5DB] rounded flex-shrink-0"></div>
                    )}
                    <span className={`text-[14px] ${item.completed ? 'text-[#059669]' : 'text-[#374151]'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {content.access && (
          <Card className="border-[#E5E7EB] mb-6">
            <CardContent className="pt-6">
              <h3 className="text-[#111827] mb-4">Your Access Includes:</h3>
              <div className="space-y-2">
                {content.access.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#059669] flex-shrink-0" />
                    <span className="text-[14px] text-[#374151]">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <h3 className="text-[#111827] mb-4">Quick Actions:</h3>
          <div className="space-y-3">
            {content.quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  className="w-full p-4 border border-[#E5E7EB] rounded-lg hover:border-[#1E40AF] hover:bg-[#EFF6FF] transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-[#1E40AF]" />
                    </div>
                    <div>
                      <h4 className="text-[#111827] mb-1">{action.title}</h4>
                      <p className="text-[14px] text-[#6B7280]">{action.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={onContinue}
          >
            Skip Tour
          </Button>
          <Button
            className="flex-1 h-12 bg-[#1E40AF] hover:bg-[#1E3A8A]"
            onClick={onContinue}
          >
            Start Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
