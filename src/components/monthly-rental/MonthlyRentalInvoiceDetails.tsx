import { useState } from 'react';
import { ArrowLeft, Upload, Check, X, FileText, AlertCircle, Calendar, User, Package, PackageCheck, Info } from 'lucide-react';
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { MonthlyRentalInvoice } from '../../types/monthly-rental';
import { toast } from 'sonner';

interface MonthlyRentalInvoiceDetailsProps {
  invoice: MonthlyRentalInvoice;
  onBack: () => void;
  onSubmitPayment: (invoiceId: string, file: File) => void;
  onApprove: (invoiceId: string, transactionReferenceId: string) => void;
  onReject: (invoiceId: string, reason: string) => void;
  onMarkAsReturned: (invoiceId: string) => void;
  userRole: 'Admin' | 'Finance' | 'Staff' | 'Customer';
}

export function MonthlyRentalInvoiceDetails({
  invoice,
  onBack,
  onSubmitPayment,
  onApprove,
  onReject,
  onMarkAsReturned,
  userRole,
}: MonthlyRentalInvoiceDetailsProps) {
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [transactionReferenceId, setTransactionReferenceId] = useState('');

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
    if (!transactionReferenceId.trim()) {
      toast.error('Please provide a transaction reference ID');
      return;
    }

    setIsApprovalModalOpen(false);
    onApprove(invoice.id, transactionReferenceId);
    setTransactionReferenceId('');
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

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
      case 'Completed':
        return <Badge className="bg-gray-600 hover:bg-gray-700 text-white text-base px-4 py-1">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isBeforeDueDate = new Date() < new Date(invoice.dueDate);
  
  // Consolidated upload permission - allow upload for Pending Payment, Rejected, or Overdue
  const canUploadProof = (invoice.status === 'Pending Payment' || 
                          invoice.status === 'Rejected' || 
                          invoice.status === 'Overdue') &&
                         !invoice.paymentProof; // Only show if no proof uploaded yet
  
  const canApproveReject = (userRole === 'Admin' || userRole === 'Finance') && 
    invoice.status === 'Pending Approval';

  // Calculate overdue charges
  const calculateOverdueCharges = () => {
    // Check if invoice was overdue when payment was submitted
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    // Calculate months late based on current date or payment submission date
    const referenceDate = invoice.paymentSubmittedAt ? new Date(invoice.paymentSubmittedAt) : now;
    const monthsDiff = (referenceDate.getFullYear() - dueDate.getFullYear()) * 12 + (referenceDate.getMonth() - dueDate.getMonth());
    const monthsLate = Math.max(0, monthsDiff);
    
    // Only apply charges if payment was late
    if (monthsLate === 0) {
      return { monthsLate: 0, overdueCharge: 0, totalWithOverdue: invoice.grandTotal };
    }
    
    // Formula: Interest = Outstanding Balance × Monthly Rate × Number of Months Late
    const overdueCharge = invoice.grandTotal * invoice.defaultInterestRate * monthsLate;
    const totalWithOverdue = invoice.grandTotal + overdueCharge;
    
    return { monthsLate, overdueCharge, totalWithOverdue };
  };

  const { monthsLate, overdueCharge, totalWithOverdue } = calculateOverdueCharges();
  const hasOverdueCharges = overdueCharge > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="h-10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-[#231F20]">Invoice Details</h1>
            <p className="text-sm text-gray-600 mt-1">{invoice.invoiceNumber}</p>
          </div>
        </div>
        {getStatusBadge(invoice.status)}
      </div>

      {/* Overdue Warning */}
      {invoice.status === 'Overdue' && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              <div className="flex-1">
                <p className="text-orange-900">Payment Overdue</p>
                <p className="text-sm text-orange-700 mt-1">
                  This invoice is past its due date. Overdue charges of <span className="font-semibold">RM {overdueCharge.toFixed(2)}</span> ({monthsLate} {monthsLate === 1 ? 'month' : 'months'} late) have been applied.
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Total amount due: <span className="font-semibold">RM {totalWithOverdue.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Generated Notice */}
      {invoice.isAutoGenerated && (
        <Card className="border-blue-500 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-blue-900">
                  {invoice.notes}
                </p>
                {invoice.itemsReturned && (
                  <p className="text-sm text-green-700 mt-2 flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" />
                    Rental items returned. No further billing will occur.
                  </p>
                )}
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
            <div>
              <p className="text-sm text-gray-600">Customer ID</p>
              <p className="text-[#231F20]">{invoice.customerId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="text-[#231F20]">{invoice.customerAddress}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact</p>
              <p className="text-[#231F20]">{invoice.customerContact}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[16px]">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Delivery Order (DO)</p>
              <p className="text-[#231F20]">{invoice.deliveryOrderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Agreement ID</p>
              <p className="text-[#231F20]">{invoice.agreementId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billing Month</p>
              <p className="text-[#231F20]">Month {invoice.billingMonth} of rental contract</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billing Period</p>
              <p className="text-[#231F20]">
                {new Date(invoice.billingPeriodStart).toLocaleDateString()} - {new Date(invoice.billingPeriodEnd).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="text-[#231F20] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <p className="text-sm text-[#444444] font-medium">Default Interest (Per Month)</p>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Default interest rate specified in the rental agreement. Applied when payments are overdue.
                  </div>
                </div>
              </div>
              <p className="text-[#444444] font-semibold mt-1">
                {(invoice.defaultInterestRate * 100).toFixed(1)}% per month
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Overdue charges will be calculated automatically based on the default interest rate.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rental Items Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[16px]">Rental Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price (RM)</TableHead>
                <TableHead className="text-center">Rental Duration</TableHead>
                <TableHead className="text-right">Monthly Rate (RM)</TableHead>
                <TableHead className="text-right">Total (RM)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.rentalItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#231F20]">{item.itemName}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{item.rentalDuration}</TableCell>
                  <TableCell className="text-right">{item.monthlyRate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.totalPrice.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-6 border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-[#231F20]">RM {invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({(invoice.taxRate * 100).toFixed(0)}%):</span>
                <span className="text-[#231F20]">RM {invoice.taxAmount.toFixed(2)}</span>
              </div>
            )}
            
            {/* Overdue Charges Section */}
            {hasOverdueCharges && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 space-y-2 my-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Overdue Charges</span>
                </div>
                <div className="text-sm space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span>Outstanding Balance:</span>
                    <span>RM {invoice.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Interest Rate:</span>
                    <span>{(invoice.defaultInterestRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Months Late:</span>
                    <span>{monthsLate} {monthsLate === 1 ? 'month' : 'months'}</span>
                  </div>
                  <div className="flex justify-between border-t border-orange-300 pt-1 mt-1">
                    <span className="font-medium text-orange-900">Overdue Charge:</span>
                    <span className="font-medium text-orange-900">RM {overdueCharge.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 italic">
                    Calculation: RM {invoice.grandTotal.toFixed(2)} × {(invoice.defaultInterestRate * 100).toFixed(1)}% × {monthsLate} {monthsLate === 1 ? 'month' : 'months'}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex justify-between border-t pt-2">
              <span className="text-[#231F20]">{hasOverdueCharges ? 'Original Amount:' : 'Grand Total:'}</span>
              <span className={hasOverdueCharges ? "text-[#231F20]" : "text-[#F15929]"}>RM {invoice.grandTotal.toFixed(2)}</span>
            </div>
            
            {hasOverdueCharges && (
              <div className="flex justify-between border-t pt-2 bg-red-50 -mx-4 px-4 py-2">
                <span className="text-red-900 font-semibold">Total Amount Due (with overdue charges):</span>
                <span className="text-red-600 font-semibold">RM {totalWithOverdue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Proof Upload (Customer View) */}
      {canUploadProof && (
        <Card className="border-[#F15929]">
          <CardHeader>
            <CardTitle className="text-[16px]">Submit Payment Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="paymentProof">Upload Payment Receipt/Screenshot</Label>
              <Input
                id="paymentProof"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="mt-2"
              />
              {paymentFile && (
                <p className="text-sm text-green-600 mt-2">
                  Selected: {paymentFile.name}
                </p>
              )}
            </div>
            <Button
              onClick={handleSubmitPayment}
              disabled={!paymentFile}
              className="bg-[#F15929] hover:bg-[#D14620] text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Submit Payment Proof
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof Review (Admin/Finance View) */}
      {invoice.paymentProof && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[16px]">Payment Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">File Name</p>
                <p className="text-[#231F20]">{invoice.paymentProof.fileName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Uploaded At</p>
                <p className="text-[#231F20]">
                  {new Date(invoice.paymentProof.uploadedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href={invoice.paymentProof.fileUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                View Document
              </a>
            </Button>

            {canApproveReject && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Payment
                </Button>
                <Button
                  onClick={() => setIsRejectionModalOpen(true)}
                  variant="destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paid Status Info */}
      {invoice.status === 'Paid' && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-green-900">Payment Approved</p>
                  <p className="text-sm text-green-700">
                    Approved by {invoice.approvedBy} on {new Date(invoice.approvedAt || '').toLocaleDateString()}
                  </p>
                  {invoice.transactionReferenceId && (
                    <p className="text-sm text-green-700 mt-1">
                      Transaction Reference: {invoice.transactionReferenceId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark Items as Returned (Admin only) */}
      {(userRole === 'Admin' || userRole === 'Staff') && invoice.status === 'Paid' && !invoice.itemsReturned && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[16px]">Item Return Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              When rental items are returned, mark them as returned to stop automatic monthly billing and set the invoice status to "Completed".
            </p>
            <Button
              onClick={() => setIsReturnModalOpen(true)}
              variant="outline"
              className="border-[#F15929] text-[#F15929] hover:bg-[#FFF7F5]"
            >
              <PackageCheck className="h-4 w-4 mr-2" />
              Mark Items as Returned
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed Status Info */}
      {invoice.status === 'Completed' && (
        <Card className="border-gray-500 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PackageCheck className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-gray-900">Rental Completed</p>
                  <p className="text-sm text-gray-700">
                    Items were returned on {new Date(invoice.returnedAt || '').toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    No further invoices will be generated for this contract.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this payment? The invoice status will be updated to "Paid".
            </AlertDialogDescription>
          </AlertDialogHeader>
          {hasOverdueCharges && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 space-y-1">
              <p className="text-sm font-medium text-orange-900">Note: Overdue Charges Applied</p>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex justify-between">
                  <span>Original Amount:</span>
                  <span>RM {invoice.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overdue Charge ({monthsLate} {monthsLate === 1 ? 'month' : 'months'} × {(invoice.defaultInterestRate * 100).toFixed(1)}%):</span>
                  <span>RM {overdueCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-orange-300 pt-1 font-medium text-orange-900">
                  <span>Total Paid:</span>
                  <span>RM {totalWithOverdue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <div className="py-4">
            <Label htmlFor="transactionReferenceId">Transaction Reference ID</Label>
            <Input
              id="transactionReferenceId"
              type="text"
              value={transactionReferenceId}
              onChange={(e) => setTransactionReferenceId(e.target.value)}
              className="mt-2"
              placeholder="Enter transaction reference ID"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <AlertDialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this payment. The customer will need to resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return Confirmation Dialog */}
      <AlertDialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Items as Returned</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all future automatic billing for this contract. Are you sure the rental items have been returned and verified?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsReturned}
              className="bg-[#F15929] hover:bg-[#D14620] text-white"
            >
              Confirm Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}