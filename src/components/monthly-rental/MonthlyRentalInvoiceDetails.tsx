import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Check, CheckCircle, X, XCircle, FileText, AlertCircle, Calendar, Info, ExternalLink, Loader2, Download, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { formatRfqDate } from '../../lib/rfqDate';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MonthlyRentalStatusBadge } from './MonthlyRentalStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { MonthlyRentalInvoice } from '../../types/monthly-rental';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useCreditNotesForSource } from '../../hooks/useCreditNotesForSource';
import { ApprovalModal } from './ApprovalModal';
import { RejectionModal } from './RejectionModal';

interface MonthlyRentalInvoiceDetailsProps {
  invoice: MonthlyRentalInvoice;
  onBack: () => void;
  onSubmitPayment: (invoiceId: string, file: File) => void;
  onApprove: (invoiceId: string, referenceNumber: string) => void;
  onReject: (invoiceId: string, reason: string) => void;
  onMarkAsReturned: (invoiceId: string) => void;
  onPrintReceipt?: (invoiceId: string) => void;
  userRole: 'super_user' | 'Admin' | 'Finance' | 'Staff' | 'Customer';
  isProcessing?: boolean;
}

export function MonthlyRentalInvoiceDetails({
  invoice,
  onBack,
  onSubmitPayment,
  onApprove,
  onReject,
  onMarkAsReturned,
  onPrintReceipt,
  userRole,
  isProcessing = false,
}: MonthlyRentalInvoiceDetailsProps) {
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);

  const {
    creditNotes: appliedCreditNotes,
    totalCredited,
    amountToReturn,
    loading: creditNotesLoading,
    error: creditNotesError,
    hasData: hasCreditNoteData,
  } = useCreditNotesForSource('monthlyRental', invoice.id);

  const shouldShowPaymentBreakdown =
    ['Pending Payment', 'Pending Approval', 'Rejected', 'Overdue'].includes(invoice.status) &&
    (creditNotesLoading || hasCreditNoteData);
  const payableAmount = Math.max(0, invoice.totalAmount - totalCredited);
  const showRefundSummary = invoice.status === 'Paid' && amountToReturn > 0;

  // Credit note applications (credits applied TO this invoice)
  const [creditApplications, setCreditApplications] = useState<Array<{
    id: string;
    creditNoteId: string;
    creditNoteNumber: string;
    amountApplied: number;
    appliedBy: string;
    appliedAt: string;
    notes?: string;
  }>>([]);
  const [totalCreditsApplied, setTotalCreditsApplied] = useState(0);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await fetch(`/api/credit-notes/invoice-applications?invoiceId=${invoice.id}`);
        const json = await res.json();
        if (json.success) {
          setCreditApplications(json.data || []);
          setTotalCreditsApplied(json.totalApplied || 0);
        }
      } catch {
        // ignore
      }
    };
    fetchApps();
  }, [invoice.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentFile(e.target.files[0]);
    }
  };

  const handleSubmitPayment = () => {
    if (!paymentFile) {
      toast.error('Please select a payment proof file');
      return;
    }

    onSubmitPayment(invoice.id, paymentFile);
  };

  const handleApprove = (referenceId: string) => {
    onApprove(invoice.id, referenceId);
  };

  const handleReject = (reason: string) => {
    onReject(invoice.id, reason);
  };

  const handleMarkAsReturned = () => {
    setIsReturnModalOpen(false);
    onMarkAsReturned(invoice.id);
  };

  const isBeforeDueDate = new Date() < new Date(invoice.dueDate);
  
  // Can upload proof for Pending Payment, Rejected, or Overdue
  // For Rejected/Overdue, allow re-uploading even if previous proof exists
  const canUploadProof = invoice.status === 'Pending Payment' || 
                          invoice.status === 'Rejected' || 
                          invoice.status === 'Overdue';
  
  const canApproveReject = (userRole === 'super_user' || userRole === 'Admin' || userRole === 'Finance') && 
    invoice.status === 'Pending Approval';

  // Get default interest rate from agreement or use default
  const defaultInterestRate = invoice.agreement?.defaultInterest || 1.5;

  // Calculate months late - always calculate from actual due date to ensure accuracy
  // This ensures correct calculation even if due date is changed but charges aren't recalculated yet
  const calculateMonthsLate = () => {
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    // Only calculate if invoice is overdue (past due date)
    if (now <= dueDate) {
      return 0;
    }
    
    // Calculate months late from actual due date
    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
    const monthsLate = Math.ceil((now.getTime() - dueDate.getTime()) / msPerMonth);
    return Math.max(1, monthsLate); // At least 1 month if overdue
  };
  const monthsLate = calculateMonthsLate();

  // Calculate raw overdue charges (before rounding) and rounded charges (after rounding)
  const calculateOverdueChargesBreakdown = () => {
    if (monthsLate === 0) {
      return { raw: 0, rounded: 0 };
    }
    const rate = defaultInterestRate / 100;
    const rawCharges = invoice.baseAmount * rate * monthsLate;
    const roundedCharges = Math.ceil(rawCharges * 100) / 100; // Round up to 2 decimal places
    return { raw: rawCharges, rounded: roundedCharges };
  };
  const { raw: rawOverdueCharges, rounded: roundedOverdueCharges } = calculateOverdueChargesBreakdown();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="hover:bg-[#F3F4F6]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1>{invoice.invoiceNumber}</h1>
              <MonthlyRentalStatusBadge status={invoice.status} />
            </div>
            <p className="text-[#374151]">
              Last updated: {new Date(invoice.updatedAt || invoice.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Overdue Warning */}
      {invoice.status === 'Overdue' && (
        <Card className="border-[#EA580C] bg-[#FFF7ED]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-[#EA580C] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[#EA580C] font-semibold">Payment Overdue - {monthsLate} {monthsLate === 1 ? 'Month' : 'Months'} Late</p>
                <p className="text-[14px] text-[#9A3412] mt-2">
                  This invoice was due on <span className="font-medium">{formatRfqDate(invoice.dueDate)}</span> and is now <span className="font-semibold">{monthsLate} {monthsLate === 1 ? 'month' : 'months'}</span> overdue.
                </p>
                
                {/* Overdue Calculation Breakdown */}
                <div className="mt-3 bg-white/60 rounded-md p-3 border border-[#FDE68A]">
                  <p className="text-xs text-[#92400E] font-medium mb-2">Overdue Charges Calculation:</p>
                  <div className="text-sm text-[#9A3412] space-y-1">
                    <div className="flex justify-between">
                      <span>Base Amount:</span>
                      <span>RM {invoice.baseAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest Rate:</span>
                      <span>{defaultInterestRate.toFixed(1)}% per month</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Months Late:</span>
                      <span>{monthsLate} {monthsLate === 1 ? 'month' : 'months'}</span>
                    </div>
                    <div className="flex justify-between border-t border-orange-300 pt-1 mt-1">
                      <span className="font-medium">Overdue Charges (Calculated):</span>
                      <span className="font-semibold">RM {rawOverdueCharges.toFixed(3)}</span>
                    </div>
                    {rawOverdueCharges !== roundedOverdueCharges && (
                      <div className="flex justify-between text-xs text-[#EA580C]">
                        <span>Rounded Up (3dp → 2dp):</span>
                        <span>RM {rawOverdueCharges.toFixed(3)} → RM {roundedOverdueCharges.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#FDE68A] pt-1 mt-1">
                      <span className="font-medium">Overdue Charges (Final):</span>
                      <span className="font-semibold">RM {invoice.overdueCharges.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-xs text-[#EA580C] italic mt-1">
                      Formula: RM {invoice.baseAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })} × {defaultInterestRate.toFixed(1)}% × {monthsLate} = RM {rawOverdueCharges.toFixed(3)}
                      {rawOverdueCharges !== roundedOverdueCharges && ` → RM ${roundedOverdueCharges.toFixed(2)} (rounded up)`}
                    </p>
                  </div>
                </div>
                
                <p className="text-[14px] text-[#9A3412] mt-3 font-semibold">
                  Total Amount Due: <span className="text-[#EA580C]">RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {shouldShowPaymentBreakdown && (
        <Card className="border-[#BFDBFE] bg-[#EFF6FF]">
          <CardHeader>
            <CardTitle className="text-[18px]">Credit Note Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {creditNotesLoading ? (
              <p className="text-sm text-[#6B7280]">Loading credit note adjustments...</p>
            ) : creditNotesError ? (
              <p className="text-sm text-[#DC2626]">{creditNotesError}</p>
            ) : (
              <>
                {appliedCreditNotes.length > 0 && (
                  <div className="rounded-md border border-[#DBEAFE] bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#DBEAFE] hover:bg-[#DBEAFE]">
                          <TableHead className="text-[#1E3A8A]">Description</TableHead>
                          <TableHead className="text-[#1E3A8A] text-right">Amount (RM)</TableHead>
                          <TableHead className="text-[#1E3A8A]">Credit Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appliedCreditNotes.map((note) => (
                          <TableRow key={note.id} className="hover:bg-[#F8FAFC]">
                            <TableCell className="text-[#1F2937]">Reduction of monthly rental</TableCell>
                            <TableCell className="text-[#DC2626] text-right">
                              -RM{note.amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-[#4B5563]">{note.creditNoteNumber}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Original amount</span>
                    <span className="text-[#111827]">
                      RM{invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Total credit notes applied</span>
                    <span className="text-[#DC2626]">
                      -RM{totalCredited.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#2563EB] bg-white px-4 py-3">
                  <p className="text-sm text-[#1F2937] font-medium">Amount to collect</p>
                  <p className="text-lg font-semibold text-[#1D4ED8]">
                    RM{payableAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <p className="text-xs text-[#1D4ED8]">
                  Share the reduced amount above with the customer when requesting payment.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}


      {/* Credits Applied to this Invoice */}
      {creditApplications.length > 0 && (
        <Card className="border-[#D1FAE5] bg-[#F0FDF4]">
          <CardHeader>
            <CardTitle className="text-[18px] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#059669]" />
              Credits Applied to This Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-[#D1FAE5] bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#D1FAE5] hover:bg-[#D1FAE5]">
                    <TableHead className="text-[#065F46]">Credit Note</TableHead>
                    <TableHead className="text-[#065F46] text-right">Amount Applied (RM)</TableHead>
                    <TableHead className="text-[#065F46]">Applied By</TableHead>
                    <TableHead className="text-[#065F46]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditApplications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-[#F8FAF8]">
                      <TableCell className="text-[#1F2937] font-medium">{app.creditNoteNumber}</TableCell>
                      <TableCell className="text-[#059669] text-right font-medium">
                        RM{app.amountApplied.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-[#4B5563]">{app.appliedBy}</TableCell>
                      <TableCell className="text-[#4B5563]">{new Date(app.appliedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#059669] bg-white px-4 py-3">
              <p className="text-sm text-[#1F2937] font-medium">Total credits applied</p>
              <p className="text-lg font-semibold text-[#059669]">
                RM{totalCreditsApplied.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#6B7280] bg-white px-4 py-3">
              <p className="text-sm text-[#1F2937] font-medium">Effective outstanding</p>
              <p className="text-lg font-semibold text-[#111827]">
                RM{Math.max(0, invoice.totalAmount - totalCreditsApplied).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Approval Actions */}
      {canApproveReject && (
        <Card className="border-[#F15929] bg-[#FFF7F5]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#231F20]">
                  Payment Review Required
                </p>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  Customer has submitted payment proof. Please review and approve or reject.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsRejectionModalOpen(true)}
                  className="h-10 px-6 rounded-lg border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2]"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="bg-[#059669] hover:bg-[#047857] text-white h-10 px-6 rounded-lg"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Card */}
      {invoice.status === 'Rejected' && invoice.rejectionReason && (
        <Card className="border-[#DC2626] bg-[#FEF2F2]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-[#DC2626] mt-0.5" />
              <div className="flex-1">
                <p className="text-[#991B1B]">
                  Payment Rejected
                </p>
                <p className="text-[14px] text-[#6B7280] mt-1">
                  Rejected by {invoice.rejectedBy || "Admin"} {invoice.rejectedAt && `on ${formatRfqDate(invoice.rejectedAt)}`}
                </p>
                <div className="mt-3 p-3 bg-white rounded-lg border border-[#FEE2E2]">
                  <p className="text-[14px] text-[#111827]">
                    <span className="text-[#991B1B]">Reason:</span> {invoice.rejectionReason}
                  </p>
                </div>
                {userRole === 'Customer' && (
                  <p className="text-[14px] text-[#6B7280] mt-3">
                    Please review the reason above and re-upload the correct payment proof below.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Customer Name</p>
              <p className="text-[#111827]">{invoice.customerName}</p>
            </div>
            {invoice.customerEmail && (
              <div>
                <p className="text-[14px] text-[#6B7280]">Email</p>
                <p className="text-[#111827]">{invoice.customerEmail}</p>
              </div>
            )}
            {invoice.customerPhone && (
              <div>
                <p className="text-[14px] text-[#6B7280]">Phone</p>
                <p className="text-[#111827]">{invoice.customerPhone}</p>
              </div>
            )}
            {invoice.deliveryRequest?.deliveryAddress && (
              <div>
                <p className="text-[14px] text-[#6B7280]">Delivery Address</p>
                <p className="text-[#111827]">{invoice.deliveryRequest.deliveryAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Delivery Request</p>
              <p className="text-[#111827]">{invoice.deliveryRequest?.requestId || '-'}</p>
            </div>
            {invoice.agreement && (
              <div>
                <p className="text-[14px] text-[#6B7280]">Agreement</p>
                <p className="text-[#111827]">{invoice.agreement.agreementNumber}</p>
              </div>
            )}
            <div>
              <p className="text-[14px] text-[#6B7280]">Billing Period</p>
              <p className="text-[#111827]">
                {invoice.billingMonth}/{invoice.billingYear} ({invoice.daysInPeriod} days)
              </p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Period Dates</p>
              <p className="text-[#111827]">
                {formatRfqDate(invoice.billingStartDate)} - {formatRfqDate(invoice.billingEndDate)}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Due Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#6B7280]" />
                <p className={invoice.status === 'Overdue' ? "text-[#DC2626]" : "text-[#111827]"}>
                  {formatRfqDate(invoice.dueDate)}
                  {invoice.status === 'Overdue' && " (Overdue)"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Current Status</p>
              <div className="mt-2">
                <MonthlyRentalStatusBadge status={invoice.status} />
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <p className="text-[14px] text-[#6B7280] font-medium">Default Interest Rate</p>
                <div className="group relative">
                  <Info className="h-4 w-4 text-[#6B7280] cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Interest rate applied for late payments as specified in the rental agreement.
                  </div>
                </div>
              </div>
              <p className="text-[#111827] font-semibold mt-1">
                {defaultInterestRate.toFixed(1)}% per month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rental Items Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Billed Items</CardTitle>
          <p className="text-[14px] text-[#6B7280] mt-1">
            Billing is based on the flat Monthly Rental from Agreement
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Rate (RM)</TableHead>
                <TableHead className="text-right">Line Total (RM)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.scaffoldingItemName}</TableCell>
                  <TableCell className="text-right text-[#111827]">{item.quantityBilled}</TableCell>
                  <TableCell className="text-right text-[#111827]">{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-[#111827]">{item.lineTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Calculation Breakdown */}
          <Collapsible open={showCalculation} onOpenChange={setShowCalculation}>
            <CollapsibleTrigger className="mt-4 w-full">
              <div className="flex items-center justify-between w-full p-3 bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#111827]">Show Calculation Details</span>
                </div>
                {showCalculation ? (
                  <ChevronUp className="h-4 w-4 text-[#6B7280]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#6B7280]" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-xs text-[#6B7280] font-medium mb-3">Monthly Rental Calculation:</p>
                
                {/* Calculate total rate from items */}
                {(() => {
                  const totalRate = invoice.items.reduce((sum, item) => sum + Number(item.unitPrice), 0);
                  const monthlyRental = Number(invoice.baseAmount);
                  const isLastItem = (index: number) => index === invoice.items.length - 1;
                  
                  return (
                    <div className="space-y-3">
                      {/* Monthly Rental Formula Explanation */}
                      <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                        <p className="text-xs font-semibold text-[#1E40AF] mb-2">How Monthly Rental Amount Was Calculated:</p>
                        <div className="text-xs text-[#374151] space-y-2">
                          <p className="font-semibold mt-2">Formula for each item:</p>
                          <p className="font-mono bg-white px-2 py-1 rounded border border-[#BFDBFE]">
                            Item contribution = quantity × unitPrice × 30 × months in that set ÷ total months across all sets
                          </p>
                          <p className="font-semibold mt-3">Monthly Rental:</p>
                          <p className="font-mono bg-white px-2 py-1 rounded border border-[#BFDBFE]">
                            Monthly Rental = Sum of all item contributions
                          </p>

                          <div className="mt-3 p-2 bg-white rounded border border-[#BFDBFE]">
                            <p className="font-medium text-[#1E40AF] mb-2">Example: Set 1 (6 months), Set 2 (3 months) → Total months = 9</p>
                            <div className="space-y-2 text-[#6B7280]">
                              <p className="font-medium text-[#374151]">Set 1 items (6 months):</p>
                              <ul className="ml-4 list-disc space-y-1">
                                <li>Item A: 5 × RM 0.50 × 30 × 6 ÷ 9 = RM 50.00</li>
                                <li>Item B: 3 × RM 1.00 × 30 × 6 ÷ 9 = RM 60.00</li>
                              </ul>
                              <p className="font-medium text-[#374151] mt-2">Set 2 items (3 months):</p>
                              <ul className="ml-4 list-disc space-y-1">
                                <li>Item A: 4 × RM 0.50 × 30 × 3 ÷ 9 = RM 20.00</li>
                                <li>Item C: 2 × RM 2.00 × 30 × 3 ÷ 9 = RM 40.00</li>
                              </ul>
                              <p className="mt-2 text-[#374151] italic text-[11px]">
                                Note: Item A appears in both sets but is calculated separately per set — not combined.
                              </p>
                              <p className="font-medium text-[#1E40AF] mt-2">
                                Monthly Rental = 50.00 + 60.00 + 20.00 + 40.00 = RM 170.00
                              </p>
                            </div>
                          </div>

                          <p className="ml-4 mt-2 text-[#1E40AF] italic">
                            This Monthly Rental (RM {monthlyRental.toFixed(2)}) is the fixed amount charged every month regardless of delivery status.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Totals */}
          <div className="mt-6 border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Base Amount:</span>
              <span className="text-[#111827]">RM {invoice.baseAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            </div>
            
            {invoice.overdueCharges > 0 && (
              <div className="flex justify-between text-[#EA580C]">
                <span>Overdue Charges ({monthsLate} {monthsLate === 1 ? 'month' : 'months'} @ {defaultInterestRate.toFixed(1)}%):</span>
                <span>+ RM {invoice.overdueCharges.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            
            <div className="flex justify-between border-t pt-2">
              <span className="text-[#111827] font-semibold">Total Amount:</span>
              <span className="text-[#F15929] font-semibold">RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Proof Upload */}
      {canUploadProof && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">
              {invoice.status === 'Rejected' 
                ? 'Re-upload Payment Proof' 
                : invoice.status === 'Overdue' 
                  ? 'Submit Payment Proof (Overdue)' 
                  : 'Upload Payment Proof'}
            </CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              {invoice.status === 'Rejected' 
                ? 'Please upload the correct payment proof based on the rejection reason above'
                : 'Upload your payment receipt or bank transfer proof to complete this invoice payment'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.status === 'Overdue' && (
              <div className="bg-[#FFF7ED] border border-[#FDE68A] rounded-lg p-3 text-[14px] text-[#9A3412]">
                <p className="font-medium">This invoice is overdue.</p>
                <p className="mt-1">You can still submit payment. Overdue charges of <span className="font-semibold">RM {invoice.overdueCharges.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span> have been applied.</p>
                <p className="mt-1">Total amount due: <span className="font-semibold">RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></p>
              </div>
            )}
            {invoice.status === 'Rejected' && invoice.paymentProofUrl && (
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-3 text-[14px] text-[#991B1B]">
                <p className="font-medium">Your previous payment proof was rejected.</p>
                <p className="mt-1">Please upload a new payment proof that clearly shows the transaction details.</p>
              </div>
            )}
            <div>
              <Label htmlFor="paymentProof">
                {invoice.status === 'Rejected' ? 'Upload New Payment Receipt/Screenshot' : 'Upload Payment Receipt/Screenshot'}
              </Label>
              <Input
                id="paymentProof"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="mt-2"
                disabled={isProcessing}
              />
              {paymentFile && (
                <p className="text-[14px] text-[#059669] mt-2">
                  Selected: {paymentFile.name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSubmitPayment}
                disabled={!paymentFile || isProcessing}
                className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {invoice.status === 'Rejected' ? 'Re-submit Payment Proof' : 'Submit Payment Proof'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof Review */}
      {invoice.paymentProofUrl && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Payment Proof</CardTitle>
            <p className="text-[14px] text-[#6B7280] mt-2">
              {invoice.paymentProofUploadedAt 
                ? `Submitted on ${new Date(invoice.paymentProofUploadedAt).toLocaleString()}`
                : 'Payment proof submitted'}
            </p>
          </CardHeader>
          <CardContent>
            <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-10 w-10 text-[#3B82F6]" />
                    <div>
                      <p className="text-[14px] text-[#111827]">
                        {invoice.paymentProofFileName || 'Payment Proof'}
                      </p>
                      {invoice.paymentProofUploadedBy && (
                        <p className="text-[12px] text-[#6B7280]">
                          Uploaded by {invoice.paymentProofUploadedBy}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.paymentProofUrl!, '_blank')}
                      className="h-9 px-4 rounded-lg"
                    >
                      View
                    </Button>
                    {invoice.status === 'Paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 rounded-lg"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = invoice.paymentProofUrl!;
                          link.download = invoice.paymentProofFileName || 'payment-proof';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Paid Status Info */}
      {invoice.status === 'Paid' && invoice.approvedAt && (
        <Card className="border-[#059669] bg-[#F0FDF4]">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-[#059669]" />
                  <div>
                    <p className="text-[#047857]">
                      Payment Approved
                    </p>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                      Approved by {invoice.approvedBy || "Admin"} on {formatRfqDate(invoice.approvedAt)}
                    </p>
                  </div>
                </div>
                {onPrintReceipt && (
                  <Button
                    onClick={() => onPrintReceipt(invoice.id)}
                    className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Receipt
                  </Button>
                )}
              </div>
              {invoice.referenceNumber && (
                <div className="bg-white rounded-lg border border-[#BBF7D0] p-4">
                  <p className="text-[14px] text-[#6B7280]">Bank Reference Number</p>
                  <p className="text-[#111827] mt-1 font-mono">
                    {invoice.referenceNumber}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onApprove={handleApprove}
        invoiceNumber={invoice.invoiceNumber}
        customerName={invoice.customerName}
        amount={invoice.totalAmount}
      />

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onReject={handleReject}
        invoiceNumber={invoice.invoiceNumber}
      />

      {/* Return Modal */}
      <AlertDialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Items as Returned</AlertDialogTitle>
            <AlertDialogDescription>
              Items return is managed through the Return Request module. Please create a return request for this delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
