import { useState, useEffect, useCallback } from "react";
import { DepositList } from "./DepositList";
import { DepositDetails } from "./DepositDetails";
import { DepositReceiptPrint } from "./DepositReceiptPrint";
import { Deposit, DepositReceipt } from "../../types/deposit";
import { toast } from "sonner";
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
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { FileText } from "lucide-react";
import { RotateCcw } from "lucide-react";
import { uploadPaymentProof } from "@/lib/upload";

type View = "list" | "details" | "receipt";

type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

interface ManageDepositFlowProps {
  userRole?: "super_user" | "Admin" | "Finance" | "Staff" | "Customer";
  initialOpenFromSOA?: { entityId: string; action: SOANavigationAction } | null;
  onConsumedSOANavigation?: () => void;
}

export function ManageDepositFlow({ userRole = "Admin", initialOpenFromSOA, onConsumedSOANavigation }: ManageDepositFlowProps) {
  const [currentView, setCurrentView] = useState<View>("list");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderBy, setOrderBy] = useState<'latest' | 'earliest'>('latest');
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [showGenerateInvoiceDialog, setShowGenerateInvoiceDialog] = useState(false);
  const [depositToGenerateInvoice, setDepositToGenerateInvoice] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [approvedDepositId, setApprovedDepositId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch deposits from API
  const fetchDeposits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), orderBy });
      const response = await fetch(`/api/deposit?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch deposits');
      }
      
      setTotal(typeof data.total === 'number' ? data.total : (data.deposits?.length ?? 0));
      
      // Transform API data to match frontend interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedDeposits: Deposit[] = data.deposits.map((d: any) => ({
        ...d,
        // Map API fields to legacy fields for backwards compatibility
        depositId: d.depositNumber,
        customerName: d.agreement?.hirer || 'Unknown Customer',
        customerId: d.agreement?.id || '',
        invoiceNo: d.agreement?.agreementNumber || '',
        agreementDocument: d.agreement?.signedDocumentUrl ? {
          id: `doc-${d.id}`,
          fileName: 'Signed Agreement',
          fileUrl: d.agreement.signedDocumentUrl,
          fileSize: 0,
          fileType: 'application/pdf',
          uploadedAt: d.createdAt,
        } : undefined,
        paymentProof: d.paymentProofUrl ? {
          id: `proof-${d.id}`,
          fileName: d.paymentProofFileName || 'Payment Proof',
          fileUrl: d.paymentProofUrl,
          fileSize: 0,
          fileType: 'application/pdf',
          uploadedAt: d.paymentProofUploadedAt || d.createdAt,
        } : undefined,
        referenceId: d.referenceNumber,
        lastUpdated: d.updatedAt,
        rentalItems: d.agreement?.rfq?.items?.map((item: { id: string; scaffoldingItemName: string; quantity: number; unitPrice: number; totalPrice: number; }) => ({
          id: item.id,
          itemName: item.scaffoldingItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })) || [],
      }));
      
      setDeposits(transformedDeposits);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch deposits';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, orderBy]);

  // Load deposits when page, pageSize, or orderBy change
  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  // Open entity from SOA navigation
  useEffect(() => {
    if (!initialOpenFromSOA?.entityId || deposits.length === 0) return;
    const found = deposits.find((d) => d.id === initialOpenFromSOA.entityId);
    if (!found) return;
    setSelectedDepositId(initialOpenFromSOA.entityId);
    if (initialOpenFromSOA.action === "viewDocument" || initialOpenFromSOA.action === "downloadReceipt") {
      setCurrentView("receipt");
    } else {
      setCurrentView("details");
    }
    onConsumedSOANavigation?.();
  }, [deposits, initialOpenFromSOA, onConsumedSOANavigation]);

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

  const handleSubmitPayment = async (depositId: string, file: File) => {
    try {
      setIsProcessing(true);
      
      // Upload file to server
      toast.info('Uploading payment proof...');
      const uploadResult = await uploadPaymentProof(file);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload payment proof');
      }

      // Update deposit via API
      const response = await fetch('/api/deposit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: depositId,
          action: 'upload-proof',
          paymentProofUrl: uploadResult.url,
          paymentProofFileName: file.name,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to submit payment proof');
      }

      const deposit = deposits.find(d => d.id === depositId);
      if (deposit?.status === "Rejected") {
        toast.success("Payment proof re-submitted for approval");
      } else {
        toast.success("Payment proof submitted successfully");
      }
      
      // Refresh deposits
      await fetchDeposits();
      setCurrentView("list");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit payment';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (depositId: string, referenceNumber: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/deposit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: depositId,
          action: 'approve',
          referenceNumber,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to approve deposit');
      }

      toast.success("Payment approved successfully");
      setApprovedDepositId(depositId);
      setShowSuccessModal(true);
      
      // Refresh deposits
      await fetchDeposits();
      setCurrentView("list");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve payment';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (depositId: string, reason: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/deposit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: depositId,
          action: 'reject',
          rejectionReason: reason,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to reject deposit');
      }

      toast.error("Payment rejected - notification sent to customer");
      
      // Refresh deposits
      await fetchDeposits();
      setCurrentView("list");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject payment';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDueDate = async (depositId: string, newDueDate: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/deposit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: depositId,
          action: 'reset-due-date',
          newDueDate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to reset due date');
      }

      toast.success("Due date reset successfully");
      
      // Refresh deposits
      await fetchDeposits();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset due date';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkExpired = async (depositId: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/deposit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: depositId,
          action: 'mark-expired',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to mark as expired');
      }

      toast.success("Deposit marked as expired");
      
      // Refresh deposits
      await fetchDeposits();
      setCurrentView("list");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark as expired';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateNewInvoice = (depositId: string) => {
    setDepositToGenerateInvoice(depositId);
    setShowGenerateInvoiceDialog(true);
  };

  const confirmGenerateInvoice = async () => {
    if (!depositToGenerateInvoice) return;

    // In a real implementation, this would call an API to generate a new invoice
    // For now, we just show a success message
    toast.success(`New invoice generation requested - feature coming soon`);
    setShowGenerateInvoiceDialog(false);
    setDepositToGenerateInvoice(null);
    setCurrentView("list");
  };

  const handlePrintReceipt = (depositId: string) => {
    setSelectedDepositId(depositId);
    setCurrentView("receipt");
  };

  const handleRefresh = () => {
    fetchDeposits();
    toast.success("Deposits refreshed");
  };

  // Show loading state
  if (isLoading && deposits.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#F15929]" />
        <span className="ml-2 text-gray-600">Loading deposits...</span>
      </div>
    );
  }

  // Show error state
  if (error && deposits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchDeposits} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

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
        </div>
      )}

      {/* Content */}
      {currentView === "list" && (
        <DepositList
          deposits={deposits}
          total={total}
          page={page}
          pageSize={pageSize}
          orderBy={orderBy}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          onOrderByChange={(o) => { setOrderBy(o); setPage(1); }}
          onView={handleView}
          onUploadProof={handleSubmitPayment}
          onResetDueDate={handleResetDueDate}
          onMarkExpired={handleMarkExpired}
          userRole={userRole}
          isProcessing={isProcessing}
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
          onResetDueDate={handleResetDueDate}
          onMarkExpired={handleMarkExpired}
          userRole={userRole}
          isProcessing={isProcessing}
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
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>A deposit receipt has been automatically generated and attached to this record.</p>
                <p className="text-gray-500">You can now view and print the deposit receipt.</p>
              </div>
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
