import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Users,
  DollarSign,
  FileText,
  Calendar,
  CreditCard,
  RotateCcw,
  FileSpreadsheet,
  Search,
  Menu,
  Wallet,
  X,
  ChevronDown,
  Package,
  ShoppingCart,
  Truck,
  LogOut,
  Newspaper,
  Info,
  ClipboardList,
  ClipboardCheck,
  PackageCheck,
  BarChart3,
  FileSignature,
  FileX,
  PackageOpen,
  AlertCircle,
} from "lucide-react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import { Toaster } from "./components/ui/sonner";

// Auth Components
import { UnifiedLogin } from "./components/auth/UnifiedLogin";
import { RegistrationSelector } from "./components/auth/RegistrationSelector";
import { InternalRegistration } from "./components/auth/InternalRegistration";
import { CustomerRegistration } from "./components/auth/CustomerRegistration";
import { VendorRegistration } from "./components/auth/VendorRegistration";
import { ForgotPasswordEmailEntry } from "./components/auth/ForgotPasswordEmailEntry";
import { ForgotPasswordCodeEntry } from "./components/auth/ForgotPasswordCodeEntry";
import { ForgotPasswordNewPassword } from "./components/auth/ForgotPasswordNewPassword";
import { ForgotPasswordSuccess } from "./components/auth/ForgotPasswordSuccess";
import { SessionExpiredPage } from "./components/auth/SessionExpiredPage";

// Page Components
import { UserManagement } from "./components/UserManagement";
import { BillingDashboard } from "./components/BillingDashboard";
import { MonthlyRentalBilling } from "./components/monthly-rental/MonthlyRentalBilling";
import { CreditNotes } from "./components/CreditNotes";
import { RefundManagementMain } from "./components/refunds/RefundManagementMain";
import { ScaffoldingManagement } from "./components/ScaffoldingManagement";
import { CustomerPortal } from "./components/CustomerPortal";
import { ContentManagement } from "./components/ContentManagement";
import { CustomerContentView } from "./components/CustomerContentView";
import { RFQManagement } from "./components/rfq/RFQManagement";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { InspectionMaintenanceModule } from "./components/inspection/InspectionMaintenanceModule";
import { DeliveryManagement } from "./components/delivery/DeliveryManagement";
import { ReturnManagement } from "./components/ReturnManagement";
import { ReportGenerationEnhanced } from "./components/reports/ReportGenerationEnhanced";
import { RentalAgreement } from "./components/RentalAgreement";
import { ManageDepositFlow } from "./components/deposits/ManageDepositFlow";
import { ReportFinancial } from "./components/reports/ReportFinancial";
import { ProfilePage } from "./components/ProfilePage";
import { ProjectClosureManagement } from "./components/ProjectClosureManagement";
import DeliveryReturnManagement from "./components/DeliveryReturnManagement";
import { AdditionalCharges } from "./components/AdditionalCharges";
import { StatementOfAccount } from "./components/soa/StatementOfAccount";

type Page =
  | "billing-dashboard"
  | "user-management"
  | "manage-deposits"
  | "monthly-rental"
  | "credit-notes"
  | "refund-management"
  | "additional-charges"
  | "statement-of-account"
  | "scaffolding-management"
  | "delivery-management"
  | "return-management"
  | "delivery-return-requests"
  | "rental-agreement"
  | "project-closure"
  | "report-generation"
  | "report-financial"
  | "customer-portal"
  | "content-management"
  | "customer-content-view"
  | "rfq-management"
  | "inspection-maintenance"
  | "profile";

type AuthScreen =
  | "portal-selector"
  | "register-select"
  | "register-internal"
  | "register-customer"
  | "register-vendor"
  | "dashboard"
  | "forgot-password-email"
  | "forgot-password-code"
  | "forgot-password-new"
  | "forgot-password-success";

type SystemMode = "ERP" | "CRM";

export type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

export type SOANavigation = {
  page: Page;
  entityId: string;
  action: SOANavigationAction;
} | null;

export default function App() {
  const { data: session, status } = useSession();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("portal-selector");
  const [userRole, setUserRole] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<Page>("billing-dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [systemMode, setSystemMode] = useState<SystemMode>("ERP");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [soaNavigation, setSOANavigation] = useState<SOANavigation>(null);
  
  // Track previous auth status to detect session expiry
  const prevStatusRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef(false);
  const hasInitializedPageRef = useRef(false); // Track if we've set the initial page
  const hasEverBeenAuthenticatedRef = useRef(false); // Track if user has ever been authenticated (for loading screen)

  // Detect session expiry (transition from authenticated to unauthenticated)
  useEffect(() => {
    // If currently authenticated, remember this
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
      hasEverBeenAuthenticatedRef.current = true;
    }
    
    // Detect session expiry: was authenticated before, now unauthenticated
    if (
      status === "unauthenticated" && 
      wasAuthenticatedRef.current && 
      prevStatusRef.current === "authenticated"
    ) {
      setSessionExpired(true);
      wasAuthenticatedRef.current = false;
    }
    
    // Update previous status
    prevStatusRef.current = status;
  }, [status]);

  // Store expiresAt in a ref to avoid re-running effect on every session update
  const sessionExpiresAtRef = useRef<number | null>(null);
  
  // Update the ref when session changes, but only if we get a new expiresAt
  useEffect(() => {
    const expiresAt = (session as any)?.expiresAt as number | undefined;
    if (expiresAt && sessionExpiresAtRef.current !== expiresAt) {
      sessionExpiresAtRef.current = expiresAt;
    }
  }, [session]);

  // Check session expiration based on expiresAt timestamp from server
  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    // Get expiresAt from ref or session
    const expiresAt = sessionExpiresAtRef.current || (session as any)?.expiresAt as number | undefined;
    
    if (!expiresAt) {
      return;
    }

    const checkExpiration = () => {
      const now = Date.now();
      
      if (now >= expiresAt) {
        // Session has expired - sign out and show expired page
        wasAuthenticatedRef.current = true;
        signOut({ redirect: false }).then(() => {
          setSessionExpired(true);
        });
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkExpiration, 10 * 1000);

    // Also set a timeout for exact expiration time
    const timeUntilExpiry = expiresAt - Date.now();
    let timeout: NodeJS.Timeout | null = null;
    
    if (timeUntilExpiry > 0) {
      timeout = setTimeout(checkExpiration, timeUntilExpiry + 100);
    } else {
      // Already expired
      checkExpiration();
    }

    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [status]);

  // Sync session with local state - only set initial page once per login
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Reset session expired flag on successful login
      setSessionExpired(false);
      
      const roles = session.user.roles || [];
      // Get primary role (first role or default)
      const primaryRole = roles[0] || "admin";
      setUserRole(primaryRole);
      
      // Only set the initial page on first authentication, not on session refresh
      if (!hasInitializedPageRef.current) {
        hasInitializedPageRef.current = true;
        
        // Customer goes to CRM portal
        if (primaryRole === "customer") {
          setSystemMode("CRM");
          setCurrentPage("customer-portal");
        } else {
          // All other roles go to ERP portal
          setSystemMode("ERP");
          setCurrentPage("billing-dashboard");
        }
        
        // Go directly to dashboard
        setAuthScreen("dashboard");
      }
    }
    
    // Reset the flag when user logs out
    if (status === "unauthenticated") {
      hasInitializedPageRef.current = false;
    }
  }, [status, session]);

  // BUG FIX: Removed duplicate useEffect that was resetting page state on every session refresh.
  // The first useEffect (lines 240-273) already handles session sync with hasInitializedPageRef guard.

  // Unified login handler - determines portal based on role
  const handleUnifiedLogin = (role: string) => {
    setUserRole(role);
    
    // Customer goes to CRM portal
    if (role === "customer") {
      setSystemMode("CRM");
      setCurrentPage("customer-portal");
    } else {
      // All other roles go to ERP portal
      setSystemMode("ERP");
      setCurrentPage("billing-dashboard");
    }
    
    // Go directly to dashboard
    setAuthScreen("dashboard");
  };

  const handleRegistrationTypeSelect = (
    type: "internal" | "customer" | "vendor"
  ) => {
    if (type === "internal") {
      setAuthScreen("register-internal");
    } else if (type === "customer") {
      setAuthScreen("register-customer");
    } else {
      setAuthScreen("register-vendor");
    }
  };

  const handleRegistrationComplete = () => {
    setAuthScreen("portal-selector");
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    await signOut({ callbackUrl: "/", redirect: true });
  };

  const handleSessionExpiredReturn = () => {
    setSessionExpired(false);
    setAuthScreen("portal-selector");
  };

  // Show loading state while checking session - but ONLY on initial page load
  // During session refreshes (when user has been authenticated before), keep the dashboard mounted
  // to prevent losing detail view state
  if (status === "loading" && !hasEverBeenAuthenticatedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F15929] via-[#F15929] to-[#D14820]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show session expired page if session has expired
  if (sessionExpired && status === "unauthenticated") {
    return <SessionExpiredPage onReturnToLogin={handleSessionExpiredReturn} />;
  }

  // Show loading while transitioning from login to dashboard
  // This prevents the glitch where dashboard shows briefly before state is fully updated
  if (status === "authenticated" && authScreen !== "dashboard") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F15929] via-[#F15929] to-[#D14820]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Preparing dashboard...</p>
        </div>
      </div>
    );
  }

  // Show authentication screens if not authenticated
  if (status === "unauthenticated" && authScreen === "portal-selector") {
    return <UnifiedLogin onLogin={handleUnifiedLogin} onNavigateToRegister={() => setAuthScreen("register-select")} onNavigateToForgotPassword={() => setAuthScreen("forgot-password-email")} />;
  }

  if (authScreen === "register-select") {
    return (
      <RegistrationSelector
        onSelectType={handleRegistrationTypeSelect}
        onBackToLogin={() => setAuthScreen("portal-selector")}
      />
    );
  }

  if (authScreen === "register-internal") {
    return (
      <InternalRegistration
        onBack={() => setAuthScreen("register-select")}
        onComplete={handleRegistrationComplete}
      />
    );
  }

  if (authScreen === "register-customer") {
    return (
      <CustomerRegistration
        onBack={() => setAuthScreen("portal-selector")}
        onComplete={handleRegistrationComplete}
      />
    );
  }

  if (authScreen === "register-vendor") {
    return (
      <VendorRegistration
        onBack={() => setAuthScreen("register-select")}
        onComplete={handleRegistrationComplete}
      />
    );
  }


  if (authScreen === "forgot-password-email") {
    return (
      <ForgotPasswordEmailEntry
        onBack={() => setAuthScreen("portal-selector")}
        onContinue={(email) => {
          setForgotPasswordEmail(email);
          setAuthScreen("forgot-password-code");
        }}
      />
    );
  }

  if (authScreen === "forgot-password-code") {
    return (
      <ForgotPasswordCodeEntry
        email={forgotPasswordEmail}
        onBack={() => setAuthScreen("forgot-password-email")}
        onContinue={() => setAuthScreen("forgot-password-new")}
        onChangEmail={() => setAuthScreen("forgot-password-email")}
      />
    );
  }

  if (authScreen === "forgot-password-new") {
    return (
      <ForgotPasswordNewPassword
        onBack={() => setAuthScreen("forgot-password-code")}
        onSuccess={() => setAuthScreen("forgot-password-success")}
      />
    );
  }

  if (authScreen === "forgot-password-success") {
    return (
      <ForgotPasswordSuccess
        onReturnToLogin={() => setAuthScreen("portal-selector")}
      />
    );
  }

  // Dashboard menu items based on role and system mode
  const getMenuItems = () => {
    // CRM Mode - Customer Portal
    if (systemMode === "CRM" || userRole === "customer") {
      return [
        {
          section: "Shopping",
          items: [
            { id: "customer-portal" as Page, label: "Marketplace", icon: ShoppingCart },
          ],
        },
        {
          section: "My Orders",
          items: [
            { id: "billing-dashboard" as Page, label: "Order History", icon: FileText },
          ],
        },
        {
          section: "Information",
          items: [
            { id: "customer-content-view" as Page, label: "Information Center", icon: Info },
          ],
        },
      ];
    }

    // ERP Mode - Internal Staff
    const erpItems = [
      {
        section: "Inventory Management",
        items: [
          { id: "scaffolding-management" as Page, label: "Scaffolding Items", icon: Package },
          { id: "inspection-maintenance" as Page, label: "Inspection & Maintenance", icon: ClipboardCheck },
        ],
      },
      {
        section: "Sales & Orders",
        items: [
          { id: "rfq-management" as Page, label: "RFQ & Quotations", icon: ClipboardList },
          { id: "rental-agreement" as Page, label: "Rental Agreement", icon: FileSignature },
          { id: "delivery-return-requests" as Page, label: "Delivery & Return Requests", icon: PackageOpen },
          { id: "delivery-management" as Page, label: "Delivery Management", icon: Truck },
          { id: "return-management" as Page, label: "Return Management", icon: PackageCheck },
          { id: "project-closure" as Page, label: "Project Closure", icon: FileX },
        ],
      },
      {
        section: "Billing & Payments",
        items: [
          { id: "billing-dashboard" as Page, label: "Dashboard", icon: DollarSign },
          { id: "manage-deposits" as Page, label: "Manage Deposits", icon: Wallet },
          { id: "monthly-rental" as Page, label: "Monthly Rental", icon: Calendar },
          { id: "credit-notes" as Page, label: "Credit Notes", icon: CreditCard },
          { id: "refund-management" as Page, label: "Refunds", icon: RotateCcw },
          { id: "additional-charges" as Page, label: "Additional Charges", icon: AlertCircle },
          { id: "statement-of-account" as Page, label: "Statement of Account", icon: FileText },
        ],
      },
      {
        section: "Reports",
        items: [
          { id: "report-generation" as Page, label: "Report Generation", icon: BarChart3 },
          { id: "report-financial" as Page, label: "Financial Reports", icon: FileSpreadsheet },
        ],
      },
    ];

    // Add user management and content management for admin and super_user
    if (userRole === "admin" || userRole === "super_user") {
      return [
        {
          section: "User Management",
          items: [
            { id: "user-management" as Page, label: "Users List", icon: Users },
          ],
        },
        {
          section: "Content Management",
          items: [
            { id: "content-management" as Page, label: "Manage Content", icon: Newspaper },
          ],
        },
        ...erpItems,
      ];
    }

    return erpItems;
  };

  const menuItems = getMenuItems();

  const renderPage = () => {
    switch (currentPage) {
      case "user-management":
        return <UserManagement userRole={userRole} />;
      case "billing-dashboard":
        return <BillingDashboard 
          onNavigateToCreditNotes={() => setCurrentPage("credit-notes")}
          onNavigateToFinancialReports={() => setCurrentPage("report-financial")}
          onNavigateToMonthlyRental={() => setCurrentPage("monthly-rental")}
          onNavigateToManageDeposits={() => setCurrentPage("manage-deposits")}
          onNavigateToRefunds={() => setCurrentPage("refund-management")}
          onNavigateToPage={(page, entityId, action) => {
            setSOANavigation({ page: page as Page, entityId, action });
            setCurrentPage(page as Page);
          }}
        />; 
      case "manage-deposits":
        return (
          <ManageDepositFlow
            userRole={userRole === "super_user" ? "super_user" : userRole === "admin" ? "Admin" : userRole === "finance" ? "Finance" : "Staff"}
            initialOpenFromSOA={soaNavigation?.page === "manage-deposits" ? { entityId: soaNavigation.entityId, action: soaNavigation.action } : null}
            onConsumedSOANavigation={() => setSOANavigation(null)}
          />
        );
      case "monthly-rental":
        return (
          <MonthlyRentalBilling
            initialOpenFromSOA={soaNavigation?.page === "monthly-rental" ? { entityId: soaNavigation.entityId, action: soaNavigation.action } : null}
            onConsumedSOANavigation={() => setSOANavigation(null)}
          />
        );
      case "credit-notes":
        return (
          <CreditNotes
            initialOpenFromSOA={soaNavigation?.page === "credit-notes" ? { entityId: soaNavigation.entityId, action: soaNavigation.action } : null}
            onConsumedSOANavigation={() => setSOANavigation(null)}
          />
        );
      case "refund-management":
        return (
          <RefundManagementMain
            userRole={userRole === "super_user" || userRole === "admin" ? "Admin" : userRole === "finance" ? "Finance" : "Staff"}
            initialOpenFromSOA={soaNavigation?.page === "refund-management" ? { entityId: soaNavigation.entityId, action: soaNavigation.action } : null}
            onConsumedSOANavigation={() => setSOANavigation(null)}
          />
        );
      case "additional-charges":
        return (
          <AdditionalCharges
            initialOpenFromSOA={soaNavigation?.page === "additional-charges" ? { entityId: soaNavigation.entityId, action: soaNavigation.action } : null}
            onConsumedSOANavigation={() => setSOANavigation(null)}
          />
        );
      case "statement-of-account":
        return (
          <StatementOfAccount
            onNavigateToPage={(page, entityId, action) => {
              setSOANavigation({ page: page as Page, entityId, action });
              setCurrentPage(page as Page);
            }}
          />
        );
      case "scaffolding-management":
        return <ScaffoldingManagement />;
      case "delivery-management":
        return <DeliveryManagement />;
      case "return-management":
        return <ReturnManagement />;
      case "report-generation":
        return <ReportGenerationEnhanced />;
      case "report-financial":
        return <ReportFinancial />;
      case "customer-portal":
        return <CustomerPortal />;
      case "content-management":
        return <ContentManagement />;
      case "customer-content-view":
        return <CustomerContentView />;
      case "rfq-management":
        return <RFQManagement />;
      case "inspection-maintenance":
        return <InspectionMaintenanceModule />;
      case "rental-agreement":
        return <RentalAgreement />;
      case "project-closure":
        return <ProjectClosureManagement />;
      case "profile":
        return (
          <ProfilePage 
            userId={session?.user?.id}
            currentUserName={session?.user?.name || getRoleName()}
            currentUserRole={getRoleName()}
            currentUserEmail={session?.user?.email || ""}
            currentUserPhone={(session?.user as any)?.phone || ""}
          />
        );
      case "delivery-return-requests":
        return <DeliveryReturnManagement 
          onNavigateToDeliveryManagement={() => setCurrentPage("delivery-management")} 
        />;
      default:
        return <BillingDashboard />;
    }
  };

  const getRoleName = () => {
    switch (userRole) {
      case "super_user":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "sales":
        return "Sales";
      case "finance":
        return "Finance";
      case "production":
        return "Production";
      case "operations":
        return "Operations";
      case "vendor":
        return "Vendor";
      case "customer":
        return "Customer";
      default:
        return "User";
    }
  };

  const getSystemLabel = () => {
    return systemMode === "ERP" ? "Staff Portal" : "Customer Portal";
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Toaster />
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E7EB] z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ 
                systemMode === 'CRM' ? 'bg-[#059669]' : 'bg-[#F15929]'
              }`}>
                {systemMode === "CRM" ? (
                  <ShoppingCart className="h-5 w-5 text-white" />
                ) : (
                  <DollarSign className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <span className="text-[#231F20]">Power Metal & Steel</span>
                <p className="text-[10px] text-[#6B7280]">{getSystemLabel()}</p>
              </div>
            </div>
          </div>

          {/* Center: Search Bar */}
          <div className="hidden md:block flex-1 max-w-[400px] mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Search..."
                className="pl-10 h-10 bg-[#F3F4F6] border-[#E5E7EB] rounded-lg"
              />
            </div>
          </div>

          {/* Right: Notifications & User */}
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={systemMode === "CRM" ? "bg-[#059669] text-white" : "bg-[#F15929] text-white"}>
                      {getRoleName().substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-[#374151]">{getRoleName()}</span>
                  <ChevronDown className="h-4 w-4 text-[#6B7280]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setCurrentPage("profile")}>
                  <Users className="h-4 w-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-[#DC2626] focus:text-[#DC2626] focus:bg-[#FEE2E2]" 
                  onClick={handleLogoutClick}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-60 bg-[#F8FAFC] border-r border-[#E5E7EB] z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4 space-y-6 overflow-y-auto h-full">
          {menuItems.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="text-[12px] text-[#6B7280] uppercase tracking-wider px-3">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? systemMode === "CRM"
                            ? "bg-[#059669] text-white"
                            : "bg-[#F15929] text-white"
                          : "text-[#374151] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[14px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'pl-60' : 'pl-0'
        }`}
      >
        <div className="p-8 min-h-screen">
          {renderPage()}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}