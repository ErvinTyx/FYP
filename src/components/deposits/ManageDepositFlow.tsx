import { useState, useEffect } from "react";
import { DepositList } from "./DepositList";
import { DepositDetails } from "./DepositDetails";
import { DepositReceiptPrint } from "./DepositReceiptPrint";
import { Deposit, DepositDocument, DepositReceipt, RentalItem } from "../../types/deposit";
import { toast } from "sonner@2.0.3";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { FileText } from "lucide-react";
import { RotateCcw } from "lucide-react";

type View = "list" | "details" | "receipt";

// Mock data - in a real app, this would come from an API
const initialDeposits: Deposit[] = [
  {
    id: "7",
    depositId: "DEP-2024-007",
    invoiceNo: "INV-2024-051",
    customerName: "Sunrise Holdings",
    customerId: "CUST-007",
    agreementDocument: {
      id: "doc-7",
      fileName: "rental_agreement_sunrise.pdf",
      fileUrl: "#",
      fileSize: 485632,
      fileType: "application/pdf",
      uploadedAt: "2024-12-05T08:20:00Z",
    },
    depositAmount: 10800,
    status: "Pending Payment",
    dueDate: "2025-12-25",
    lastUpdated: "2024-12-09T08:15:00Z",
    createdAt: "2024-12-05T08:20:00Z",
  },
  {
    id: "3",
    depositId: "DEP-2024-003",
    invoiceNo: "INV-2024-047",
    customerName: "Metro Builders",
    customerId: "CUST-003",
    agreementDocument: {
      id: "doc-3",
      fileName: "rental_agreement_metro.pdf",
      fileUrl: "#",
      fileSize: 498688,
      fileType: "application/pdf",
      uploadedAt: "2024-11-08T14:00:00Z",
    },
    depositAmount: 18500,
    status: "Pending Payment",
    dueDate: "2025-12-25",
    lastUpdated: "2024-12-09T10:30:00Z",
    createdAt: "2024-11-08T14:00:00Z",
  },
  {
    id: "1",
    depositId: "DEP-2024-001",
    invoiceNo: "INV-2024-045",
    customerName: "Acme Construction Ltd.",
    customerId: "CUST-001",
    agreementDocument: {
      id: "doc-1",
      fileName: "rental_agreement_acme.pdf",
      fileUrl: "#",
      fileSize: 524288,
      fileType: "application/pdf",
      uploadedAt: "2024-11-01T09:00:00Z",
    },
    depositAmount: 15000,
    status: "Paid",
    dueDate: "2024-11-15",
    lastUpdated: "2024-11-10T14:30:00Z",
    createdAt: "2024-11-01T09:00:00Z",
    paymentProof: {
      id: "proof-1",
      fileName: "payment_receipt_acme.jpg",
      fileUrl: "#",
      fileSize: 245600,
      fileType: "image/jpeg",
      uploadedAt: "2024-11-08T10:15:00Z",
    },
    paymentSubmittedAt: "2024-11-08T10:15:00Z",
    approvedBy: "Jane Doe (Finance Manager)",
    approvedAt: "2024-11-10T14:30:00Z",
    referenceId: "TXN-2024-ACM-15000",
    rentalItems: [
      {
        id: 'dep-item-1',
        itemName: 'Standard Frame 1.8m x 1.2m',
        quantity: 50,
        unitPrice: 15.00,
        totalPrice: 750.00,
      },
      {
        id: 'dep-item-2',
        itemName: 'Cross Brace 1.8m',
        quantity: 100,
        unitPrice: 8.00,
        totalPrice: 800.00,
      },
      {
        id: 'dep-item-3',
        itemName: 'Base Jack (Adjustable)',
        quantity: 60,
        unitPrice: 12.00,
        totalPrice: 720.00,
      },
    ],
    depositReceipt: {
      id: 'rcpt-1',
      receiptNumber: 'RCP-DEP-2024-001',
      receiptDate: '2024-11-10T14:30:00Z',
      generatedAt: '2024-11-10T14:30:00Z',
    },
  },
  {
    id: "2",
    depositId: "DEP-2024-002",
    invoiceNo: "INV-2024-046",
    customerName: "BuildRight Inc.",
    customerId: "CUST-002",
    agreementDocument: {
      id: "doc-2",
      fileName: "rental_agreement_buildright.pdf",
      fileUrl: "#",
      fileSize: 612352,
      fileType: "application/pdf",
      uploadedAt: "2024-11-05T11:20:00Z",
    },
    depositAmount: 22000,
    status: "Pending Approval",
    dueDate: "2024-11-20",
    lastUpdated: "2024-11-12T09:45:00Z",
    createdAt: "2024-11-05T11:20:00Z",
    paymentProof: {
      id: "proof-2",
      fileName: "bank_transfer_proof.pdf",
      fileUrl: "#",
      fileSize: 189440,
      fileType: "application/pdf",
      uploadedAt: "2024-11-12T09:45:00Z",
    },
    paymentSubmittedAt: "2024-11-12T09:45:00Z",
  },
  {
    id: "4",
    depositId: "DEP-2024-004",
    invoiceNo: "INV-2024-048",
    customerName: "Premium Projects",
    customerId: "CUST-004",
    agreementDocument: {
      id: "doc-4",
      fileName: "rental_agreement_premium.pdf",
      fileUrl: "#",
      fileSize: 551936,
      fileType: "application/pdf",
      uploadedAt: "2024-11-10T16:30:00Z",
    },
    depositAmount: 12750,
    status: "Rejected",
    dueDate: "2024-11-18",
    lastUpdated: "2024-11-15T11:20:00Z",
    createdAt: "2024-11-10T16:30:00Z",
    paymentProof: {
      id: "proof-4",
      fileName: "payment_screenshot.jpg",
      fileUrl: "#",
      fileSize: 152600,
      fileType: "image/jpeg",
      uploadedAt: "2024-11-14T08:30:00Z",
    },
    paymentSubmittedAt: "2024-11-14T08:30:00Z",
    rejectedBy: "Robert Lee (Admin)",
    rejectedAt: "2024-11-15T11:20:00Z",
    rejectionReason: "The payment proof image is unclear and the transaction details are not visible. Please upload a clearer image showing the full transaction details including date, amount, and reference number.",
  },
  {
    id: "5",
    depositId: "DEP-2024-005",
    invoiceNo: "INV-2024-049",
    customerName: "Steel Masters Co.",
    customerId: "CUST-005",
    agreementDocument: {
      id: "doc-5",
      fileName: "rental_agreement_steelmasters.pdf",
      fileUrl: "#",
      fileSize: 478208,
      fileType: "application/pdf",
      uploadedAt: "2024-11-02T10:00:00Z",
    },
    depositAmount: 31200,
    status: "Pending Payment",
    dueDate: "2024-11-27",
    lastUpdated: "2024-11-02T10:00:00Z",
    createdAt: "2024-11-02T10:00:00Z",
  },
  {
    id: "6",
    depositId: "DEP-2024-006",
    invoiceNo: "INV-2024-050",
    customerName: "Urban Construction",
    customerId: "CUST-006",
    agreementDocument: {
      id: "doc-6",
      fileName: "rental_agreement_urban.pdf",
      fileUrl: "#",
      fileSize: 522240,
      fileType: "application/pdf",
      uploadedAt: "2024-10-28T13:15:00Z",
    },
    depositAmount: 9500,
    status: "Pending Payment",
    dueDate: "2024-11-10",
    lastUpdated: "2024-10-28T13:15:00Z",
    createdAt: "2024-10-28T13:15:00Z",
  },
];

interface ManageDepositFlowProps {
  userRole?: "Admin" | "Finance" | "Staff" | "Customer";
}

export function ManageDepositFlow({ userRole = "Admin" }: ManageDepositFlowProps) {
  const [currentView, setCurrentView] = useState<View>("list");
  const [deposits, setDeposits] = useState<Deposit[]>(initialDeposits);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [showGenerateInvoiceDialog, setShowGenerateInvoiceDialog] = useState(false);
  const [depositToGenerateInvoice, setDepositToGenerateInvoice] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [approvedDepositId, setApprovedDepositId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("deposits");
    if (stored) {
      try {
        const parsedDeposits = JSON.parse(stored);
        // Only use stored data if it has the same structure
        if (parsedDeposits && parsedDeposits.length > 0) {
          setDeposits(parsedDeposits);
        } else {
          // Reset to initial if stored data is invalid
          setDeposits(initialDeposits);
        }
      } catch (e) {
        console.error("Failed to load deposits from storage");
        setDeposits(initialDeposits);
      }
    } else {
      // No stored data, use initial
      setDeposits(initialDeposits);
    }
  }, []);

  // Save to localStorage when deposits change
  useEffect(() => {
    localStorage.setItem("deposits", JSON.stringify(deposits));
  }, [deposits]);

  // Check for overdue deposits automatically
  useEffect(() => {
    const checkOverdue = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const updatedDeposits = deposits.map((deposit) => {
        if (deposit.status === "Pending Payment" && !deposit.paymentProof) {
          const dueDate = new Date(deposit.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < now) {
            return {
              ...deposit,
              status: "Overdue" as const,
              isOverdue: true,
              lastUpdated: new Date().toISOString(),
            };
          }
        }
        return deposit;
      });

      // Check if any deposits were updated
      const hasChanges = updatedDeposits.some((d, i) => d.status !== deposits[i].status);
      if (hasChanges) {
        setDeposits(updatedDeposits);
      }
    };

    // Check immediately
    checkOverdue();

    // Check every minute
    const interval = setInterval(checkOverdue, 60000);
    return () => clearInterval(interval);
  }, [deposits]);

  const selectedDeposit = selectedDepositId
    ? deposits.find((d) => d.id === selectedDepositId)
    : null;

  const handleView = (id: string) => {
    setSelectedDepositId(id);
    setCurrentView("details");
  };

  const handleBack = () => {
    setCurrentView("list");
    setSelectedDepositId(null);
  };

  const handleSubmitPayment = (depositId: string, file: File) => {
    const now = new Date().toISOString();

    // Create mock document from file
    const paymentProof: DepositDocument = {
      id: `proof-${Date.now()}`,
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: now,
    };

    setDeposits(
      deposits.map((d) =>
        d.id === depositId
          ? {
              ...d,
              status: "Pending Approval",
              paymentProof,
              paymentSubmittedAt: now,
              lastUpdated: now,
              // Clear rejection info if re-uploading
              rejectedBy: undefined,
              rejectedAt: undefined,
              rejectionReason: undefined,
            }
          : d
      )
    );

    const deposit = deposits.find(d => d.id === depositId);
    if (deposit?.status === "Rejected") {
      toast.success("Payment proof re-submitted for approval");
    } else {
      toast.success("Payment proof submitted successfully");
    }
    setCurrentView("list");
  };

  const handleApprove = (depositId: string, referenceId: string) => {
    const now = new Date().toISOString();
    
    // Generate deposit receipt
    const receiptNumber = `RCP-${deposits.find(d => d.id === depositId)?.depositId || 'DEP-XXXX'}`;
    const depositReceipt: DepositReceipt = {
      id: `rcpt-${Date.now()}`,
      receiptNumber,
      receiptDate: now,
      generatedAt: now,
    };
    
    setDeposits(
      deposits.map((d) =>
        d.id === depositId
          ? {
              ...d,
              status: "Paid",
              approvedBy: "Current User (Admin)",
              approvedAt: now,
              lastUpdated: now,
              referenceId: referenceId,
              depositReceipt,
            }
          : d
      )
    );
    toast.success("Payment approved successfully");
    setApprovedDepositId(depositId);
    setShowSuccessModal(true);
    setCurrentView("list");
  };

  const handleReject = (depositId: string, reason: string) => {
    const now = new Date().toISOString();
    setDeposits(
      deposits.map((d) =>
        d.id === depositId
          ? {
              ...d,
              status: "Rejected",
              rejectedBy: "Current User (Admin)",
              rejectedAt: now,
              rejectionReason: reason,
              lastUpdated: now,
            }
          : d
      )
    );
    toast.error("Payment rejected");
    setCurrentView("list");
  };

  const handleGenerateNewInvoice = (depositId: string) => {
    setDepositToGenerateInvoice(depositId);
    setShowGenerateInvoiceDialog(true);
  };

  const confirmGenerateInvoice = () => {
    if (!depositToGenerateInvoice) return;

    const deposit = deposits.find((d) => d.id === depositToGenerateInvoice);
    if (!deposit) return;

    // Generate new invoice number
    const newInvoiceNo = `INV-2024-${String(Date.now()).slice(-3)}`;

    // Update the old deposit to link to new invoice
    setDeposits(
      deposits.map((d) =>
        d.id === depositToGenerateInvoice
          ? {
              ...d,
              linkedToNewInvoice: newInvoiceNo,
              lastUpdated: new Date().toISOString(),
            }
          : d
      )
    );

    // In a real app, this would create a new invoice and deposit record
    toast.success(`New invoice ${newInvoiceNo} generated successfully`);
    setShowGenerateInvoiceDialog(false);
    setDepositToGenerateInvoice(null);
    setCurrentView("list");
  };

  const handlePrintReceipt = (depositId: string) => {
    setSelectedDepositId(depositId);
    setCurrentView("receipt");
  };

  const handleResetData = () => {
    localStorage.removeItem("deposits");
    setDeposits(initialDeposits);
    toast.success("Data reset to sample deposits");
  };

  return (
    <div className="space-y-6">
      {/* Header - only show on list view */}
      {currentView === "list" && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1>Manage Deposits</h1>
            <p className="text-[#374151]">
              Track and manage deposit payments, rental agreements, and payment approvals
            </p>
          </div>
          <Button
            onClick={handleResetData}
            variant="outline"
            className="border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6]"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Sample Data
          </Button>
        </div>
      )}

      {/* Content */}
      {currentView === "list" && (
        <DepositList
          deposits={deposits}
          onView={handleView}
          onUploadProof={handleSubmitPayment}
          userRole={userRole}
        />
      )}

      {currentView === "details" && selectedDeposit && (
        <DepositDetails
          deposit={selectedDeposit}
          onBack={handleBack}
          onSubmitPayment={handleSubmitPayment}
          onApprove={handleApprove}
          onReject={handleReject}
          onGenerateNewInvoice={handleGenerateNewInvoice}
          onPrintReceipt={handlePrintReceipt}
          userRole={userRole}
        />
      )}

      {currentView === "receipt" && selectedDeposit && (
        <DepositReceiptPrint
          deposit={selectedDeposit}
          onBack={handleBack}
        />
      )}

      {/* Generate New Invoice Dialog */}
      <AlertDialog open={showGenerateInvoiceDialog} onOpenChange={setShowGenerateInvoiceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate New Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new invoice for the overdue deposit. The current deposit record will remain as "Overdue" for historical tracking, and a new deposit record will be created for the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmGenerateInvoice}
              className="bg-[#F15929] hover:bg-[#D14620] text-white"
            >
              Generate Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="size-6 text-green-600" />
              </div>
              <div>
                <AlertDialogTitle>Payment Approved</AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="space-y-2">
              <p>A deposit receipt has been automatically generated and attached to this record.</p>
              <p className="text-sm text-gray-500">You can now view and print the deposit receipt.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowSuccessModal(false);
                if (approvedDepositId) {
                  handlePrintReceipt(approvedDepositId);
                }
              }}
              className="bg-[#F15929] hover:bg-[#D14620] text-white"
            >
              <FileText className="size-4 mr-2" />
              View Receipt
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => setShowSuccessModal(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}