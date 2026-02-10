import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Check, X, FileText, AlertCircle, Calendar, Info, ExternalLink, Loader2, Printer, Download } from 'lucide-react';
import { formatRfqDate } from '../../lib/rfqDate';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useCreditNotesForSource } from '../../hooks/useCreditNotesForSource';

interface MonthlyRentalInvoiceDetailsProps {
  invoice: MonthlyRentalInvoice;
  onBack: () => void;
  onSubmitPayment: (invoiceId: string, file: File) => void;
  onApprove: (invoiceId: string, referenceNumber: string) => void;
  onReject: (invoiceId: string, reason: string) => void;
  onMarkAsReturned: (invoiceId: string) => void;
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
  userRole,
  isProcessing = false,
}: MonthlyRentalInvoiceDetailsProps) {
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [referenceNumberError, setReferenceNumberError] = useState('');
  const [rejectionReasonError, setRejectionReasonError] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPrintModal && autoPrint) {
      const t = setTimeout(() => {
        window.print();
        setAutoPrint(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [showPrintModal, autoPrint]);

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

  const handleApprove = () => {
    if (!referenceNumber.trim()) {
      setReferenceNumberError('Bank reference number is required');
      return;
    }

    setReferenceNumberError('');
    setIsApprovalModalOpen(false);
    onApprove(invoice.id, referenceNumber);
    setReferenceNumber('');
  };

  const handleApprovalModalClose = (open: boolean) => {
    setIsApprovalModalOpen(open);
    if (!open) {
      setReferenceNumberError('');
      setReferenceNumber('');
    }
  };

  const handleRejectionModalClose = (open: boolean) => {
    setIsRejectionModalOpen(open);
    if (!open) {
      setRejectionReasonError('');
      setRejectionReason('');
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setRejectionReasonError('Rejection reason is required');
      return;
    }

    setRejectionReasonError('');
    setIsRejectionModalOpen(false);
    onReject(invoice.id, rejectionReason);
    setRejectionReason('');
  };

  const handleMarkAsReturned = () => {
    setIsReturnModalOpen(false);
    onMarkAsReturned(invoice.id);
  };

  const getStatusBadge = (status: MonthlyRentalInvoice['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white text-base px-4 py-1">Paid</Badge>;
      case 'Pending Payment':
        return <Badge className="bg-[#EEF5FF] hover:bg-[#E6F0FF] text-[#2F6AE0] text-base px-4 py-1">Pending Payment</Badge>;
      case 'Pending Approval':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-base px-4 py-1">Pending Approval</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white text-base px-4 py-1">Rejected</Badge>;
      case 'Overdue':
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-base px-4 py-1">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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

  // Calculate months late - show if overdue OR if there are overdue charges (even after payment uploaded)
  const calculateMonthsLate = () => {
    // If there are overdue charges, calculate the months based on the charges
    if (invoice.overdueCharges > 0 && invoice.baseAmount > 0) {
      // Reverse calculate: overdueCharges = baseAmount * (rate/100) * months
      // months = overdueCharges / (baseAmount * rate/100)
      const rate = defaultInterestRate / 100;
      const months = Math.round(invoice.overdueCharges / (invoice.baseAmount * rate));
      return Math.max(1, months); // At least 1 month if there are charges
    }
    // If currently overdue, calculate from current date
    if (invoice.status === 'Overdue') {
      const now = new Date();
      const dueDate = new Date(invoice.dueDate);
      const msPerMonth = 30 * 24 * 60 * 60 * 1000;
      return Math.max(1, Math.ceil((now.getTime() - dueDate.getTime()) / msPerMonth));
    }
    return 0;
  };
  const monthsLate = calculateMonthsLate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="h-10"
            disabled={isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-[#231F20]">Invoice Details</h1>
            <p className="text-sm text-gray-600 mt-1">{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => { setShowPrintModal(true); setAutoPrint(false); }}
            className="h-10 px-4"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Document
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowPrintModal(true); setAutoPrint(true); }}
            className="h-10 px-4"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
          {getStatusBadge(invoice.status)}
        </div>
      </div>

      {/* Overdue Warning */}
      {invoice.status === 'Overdue' && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-orange-900 font-semibold">Payment Overdue - {monthsLate} {monthsLate === 1 ? 'Month' : 'Months'} Late</p>
                <p className="text-sm text-orange-700 mt-2">
                  This invoice was due on <span className="font-medium">{formatRfqDate(invoice.dueDate)}</span> and is now <span className="font-semibold">{monthsLate} {monthsLate === 1 ? 'month' : 'months'}</span> overdue.
                </p>
                
                {/* Overdue Calculation Breakdown */}
                <div className="mt-3 bg-white/60 rounded-md p-3 border border-orange-200">
                  <p className="text-xs text-orange-800 font-medium mb-2">Overdue Charges Calculation:</p>
                  <div className="text-sm text-orange-700 space-y-1">
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
                      <span className="font-medium">Overdue Charges:</span>
                      <span className="font-semibold">RM {invoice.overdueCharges.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-xs text-orange-600 italic mt-1">
                      Formula: RM {invoice.baseAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })} × {defaultInterestRate.toFixed(1)}% × {monthsLate} = RM {invoice.overdueCharges.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-orange-800 mt-3 font-semibold">
                  Total Amount Due: <span className="text-orange-900">RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
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


      {/* Rejection Card */}
      {invoice.status === 'Rejected' && invoice.rejectionReason && (
        <Card className="border-[#DC2626] bg-[#FEF2F2]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[#991B1B]">Payment Rejected</p>
                <p className="text-sm text-gray-600 mt-1">
                  Reason: {invoice.rejectionReason}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Please upload new payment proof below to resubmit for approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[16px]">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Customer Name</p>
              <p className="text-[#231F20]">{invoice.customerName}</p>
            </div>
            {invoice.customerEmail && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-[#231F20]">{invoice.customerEmail}</p>
              </div>
            )}
            {invoice.customerPhone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-[#231F20]">{invoice.customerPhone}</p>
              </div>
            )}
            {invoice.deliveryRequest?.deliveryAddress && (
              <div>
                <p className="text-sm text-gray-600">Delivery Address</p>
                <p className="text-[#231F20]">{invoice.deliveryRequest.deliveryAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[16px]">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Delivery Request</p>
              <p className="text-[#231F20]">{invoice.deliveryRequest?.requestId || '-'}</p>
            </div>
            {invoice.agreement && (
              <div>
                <p className="text-sm text-gray-600">Agreement</p>
                <p className="text-[#231F20]">{invoice.agreement.agreementNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Billing Period</p>
              <p className="text-[#231F20]">
                {invoice.billingMonth}/{invoice.billingYear} ({invoice.daysInPeriod} days)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Period Dates</p>
              <p className="text-[#231F20]">
                {formatRfqDate(invoice.billingStartDate)} - {formatRfqDate(invoice.billingEndDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="text-[#231F20] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatRfqDate(invoice.dueDate)}
                {!isBeforeDueDate && invoice.status !== 'Paid' && (
                  <Badge variant="destructive" className="ml-2">Past Due</Badge>
                )}
              </p>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <p className="text-sm text-[#444444] font-medium">Default Interest Rate</p>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Interest rate applied for late payments as specified in the rental agreement.
                  </div>
                </div>
              </div>
              <p className="text-[#444444] font-semibold mt-1">
                {defaultInterestRate.toFixed(1)}% per month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rental Items Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[16px]">Billed Items</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
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
                <TableHead className="text-center">Days</TableHead>
                <TableHead className="text-right">Line Total (RM)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#231F20]">{item.scaffoldingItemName}</TableCell>
                  <TableCell className="text-right">{item.quantityBilled}</TableCell>
                  <TableCell className="text-right">{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{item.daysCharged}</TableCell>
                  <TableCell className="text-right">{item.lineTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-6 border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Amount:</span>
              <span className="text-[#231F20]">RM {invoice.baseAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            </div>
            
            {invoice.overdueCharges > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Overdue Charges ({monthsLate} {monthsLate === 1 ? 'month' : 'months'} @ {defaultInterestRate.toFixed(1)}%):</span>
                <span>+ RM {invoice.overdueCharges.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            
            <div className="flex justify-between border-t pt-2">
              <span className="text-[#231F20] font-semibold">Total Amount:</span>
              <span className="text-[#F15929] font-semibold">RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Proof Upload */}
      {canUploadProof && (
        <Card className={invoice.status === 'Rejected' ? "border-red-500" : invoice.status === 'Overdue' ? "border-orange-500" : "border-[#F15929]"}>
          <CardHeader>
            <CardTitle className="text-[16px]">
              {invoice.status === 'Rejected' 
                ? 'Re-upload Payment Proof' 
                : invoice.status === 'Overdue' 
                  ? 'Submit Payment Proof (Overdue)' 
                  : 'Submit Payment Proof'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.status === 'Overdue' && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700">
                <p className="font-medium">This invoice is overdue.</p>
                <p className="mt-1">You can still submit payment. Overdue charges of <span className="font-semibold">RM {invoice.overdueCharges.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span> have been applied.</p>
                <p className="mt-1">Total amount due: <span className="font-semibold">RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></p>
              </div>
            )}
            {invoice.status === 'Rejected' && invoice.paymentProofUrl && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
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
                <p className="text-sm text-green-600 mt-2">
                  Selected: {paymentFile.name}
                </p>
              )}
            </div>
            <Button
              onClick={handleSubmitPayment}
              disabled={!paymentFile || isProcessing}
              className="bg-[#F15929] hover:bg-[#D14620] text-white"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {invoice.status === 'Rejected' ? 'Re-submit Payment Proof' : 'Submit Payment Proof'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof Review */}
      {invoice.paymentProofUrl && (
        <Card className={invoice.status === 'Rejected' ? "border-red-200 bg-red-50/30" : "border-[#E5E7EB]"}>
          <CardHeader>
            <CardTitle className="text-[16px]">
              {invoice.status === 'Rejected' ? 'Previous Payment Proof (Rejected)' : 'Payment Proof'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">File Name</p>
                <p className="text-[#231F20]">{invoice.paymentProofFileName || 'Payment Proof'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Uploaded At</p>
                <p className="text-[#231F20]">
                  {invoice.paymentProofUploadedAt 
                    ? new Date(invoice.paymentProofUploadedAt).toLocaleString() 
                    : '-'}
                </p>
              </div>
              {invoice.paymentProofUploadedBy && (
                <div>
                  <p className="text-sm text-gray-600">Uploaded By</p>
                  <p className="text-[#231F20]">{invoice.paymentProofUploadedBy}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => window.open(invoice.paymentProofUrl!, '_blank')}
                className="mr-2"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Payment Proof
              </Button>
            </div>

            {/* Approve/Reject Actions for Admin/Finance */}
            {canApproveReject && (
              <div className="pt-4 border-t flex gap-3">
                <Button
                  onClick={() => setIsRejectionModalOpen(true)}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Payment
                </Button>
                <Button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isProcessing}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval Information (for Paid invoices) */}
      {invoice.status === 'Paid' && invoice.approvedAt && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="text-[16px] text-green-800">Payment Approved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Approved By</p>
                <p className="text-[#231F20]">{invoice.approvedBy || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved At</p>
                <p className="text-[#231F20]">{new Date(invoice.approvedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bank Reference Number</p>
                <p className="text-[#231F20] font-mono">{invoice.referenceNumber || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Modal */}
      <AlertDialog open={isApprovalModalOpen} onOpenChange={handleApprovalModalClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the bank reference number to approve this payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="referenceNumber">
              Bank Reference Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => {
                setReferenceNumber(e.target.value);
                if (referenceNumberError) setReferenceNumberError('');
              }}
              placeholder="Enter bank reference number"
              className={`mt-2 ${referenceNumberError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {referenceNumberError && (
              <p className="text-sm text-red-500 mt-1">{referenceNumberError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isProcessing}
            >
              Approve
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Modal */}
      <AlertDialog open={isRejectionModalOpen} onOpenChange={handleRejectionModalClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this payment. The customer will be notified via email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (rejectionReasonError) setRejectionReasonError('');
              }}
              placeholder="Enter the reason for rejection"
              className={`mt-2 ${rejectionReasonError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              rows={4}
            />
            {rejectionReasonError && (
              <p className="text-sm text-red-500 mt-1">{rejectionReasonError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isProcessing}
            >
              Reject
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Print / Document Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none">
          <div className="flex justify-between items-center print:hidden mb-4">
            <DialogHeader>
              <DialogTitle>Monthly Rental Invoice - Print Preview</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setShowPrintModal(false)}>Close</Button>
            </div>
          </div>
          <div ref={printRef} className="space-y-4 p-4 border rounded-lg">
            <div className="border-b-2 border-[#F15929] pb-4">
              <h2 className="text-xl font-semibold text-[#231F20]">Power Metal & Steel</h2>
              <p className="text-sm text-[#6B7280]">Monthly Rental Invoice</p>
              <p className="text-lg font-medium mt-2">{invoice.invoiceNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-[#6B7280]">Customer:</span> {invoice.customerName}</p>
              <p><span className="text-[#6B7280]">Due Date:</span> {formatRfqDate(invoice.dueDate)}</p>
              <p><span className="text-[#6B7280]">Status:</span> {invoice.status}</p>
              <p><span className="text-[#6B7280]">Total:</span> RM {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            </div>
            {invoice.items && invoice.items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Rate</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.scaffoldingItemName}</TableCell>
                      <TableCell className="text-right">{item.quantityBilled}</TableCell>
                      <TableCell className="text-right">RM {Number(item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.daysCharged}</TableCell>
                      <TableCell className="text-right">RM {Number(item.lineTotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
