import { useState } from "react";
import { ArrowLeft, Upload, FileText, DollarSign, CreditCard } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner@2.0.3";
import { RefundRecord } from "./RefundManagementMain";

interface CreateRefundProps {
  onBack: () => void;
  onSave: (refund: RefundRecord) => void;
}

interface InvoiceOption {
  invoiceNo: string;
  type: "Deposit" | "Monthly Billing" | "Credit Note";
  customer: string;
  items: string;
  paidAmount: string;
}

const mockInvoices: InvoiceOption[] = [
  {
    invoiceNo: "DEP-2024-0345",
    type: "Deposit",
    customer: "Sunrise Construction Ltd.",
    items: "Scaffolding Equipment Deposit - 100 units",
    paidAmount: "RM10,000.00",
  },
  {
    invoiceNo: "MR-2024-0234",
    type: "Monthly Billing",
    customer: "BuildMaster Inc.",
    items: "Monthly Rental - November 2024",
    paidAmount: "RM4,500.00",
  },
  {
    invoiceNo: "CN-2024-0067",
    type: "Credit Note",
    customer: "Metro Construction Group",
    items: "Credit Note for returned items",
    paidAmount: "RM1,200.00",
  },
  {
    invoiceNo: "DEP-2024-0389",
    type: "Deposit",
    customer: "Premium Builders Sdn Bhd",
    items: "Equipment Deposit - Phase 2",
    paidAmount: "RM8,500.00",
  },
];

export function CreateRefund({ onBack, onSave }: CreateRefundProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceOption | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [reason, setReason] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInvoiceSelect = (invoiceNo: string) => {
    const invoice = mockInvoices.find(inv => inv.invoiceNo === invoiceNo);
    setSelectedInvoice(invoice || null);
    setErrors({});
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => file.name);
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedInvoice) {
      newErrors.invoice = "Please select an invoice";
    }

    if (!refundAmount) {
      newErrors.refundAmount = "Refund amount is required";
    } else {
      const amount = parseFloat(refundAmount);
      const maxAmount = selectedInvoice 
        ? parseFloat(selectedInvoice.paidAmount.replace("RM", "").replace(",", ""))
        : 0;
      
      if (amount <= 0) {
        newErrors.refundAmount = "Refund amount must be greater than 0";
      } else if (amount > maxAmount) {
        newErrors.refundAmount = `Refund amount cannot exceed paid amount (${selectedInvoice?.paidAmount})`;
      }
    }

    if (!refundMethod) {
      newErrors.refundMethod = "Please select a refund method";
    }

    if (!reason.trim()) {
      newErrors.reason = "Reason for refund is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = () => {
    if (!selectedInvoice) {
      toast.error("Please select an invoice before saving");
      return;
    }

    const newRefund: RefundRecord = {
      id: Date.now().toString(),
      refundId: `REF-2024-${String(Date.now()).slice(-3)}`,
      invoiceNo: selectedInvoice.invoiceNo,
      invoiceType: selectedInvoice.type,
      customer: selectedInvoice.customer,
      refundAmount: refundAmount ? `RM${parseFloat(refundAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "RM0.00",
      status: "Draft",
      createdDate: new Date().toISOString().split('T')[0],
      refundMethod: refundMethod || undefined,
      reason: reason || undefined,
      supportingDocs: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      paidAmount: selectedInvoice.paidAmount,
      invoiceItems: selectedInvoice.items,
    };

    onSave(newRefund);
    toast.success("Refund saved as draft");
  };

  const handleSubmitForApproval = () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    const newRefund: RefundRecord = {
      id: Date.now().toString(),
      refundId: `REF-2024-${String(Date.now()).slice(-3)}`,
      invoiceNo: selectedInvoice!.invoiceNo,
      invoiceType: selectedInvoice!.type,
      customer: selectedInvoice!.customer,
      refundAmount: `RM${parseFloat(refundAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      status: "Pending Approval",
      createdDate: new Date().toISOString().split('T')[0],
      refundMethod,
      reason,
      supportingDocs: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      paidAmount: selectedInvoice!.paidAmount,
      invoiceItems: selectedInvoice!.items,
    };

    onSave(newRefund);
    toast.success("Refund submitted for approval");
  };

  const maxAmount = selectedInvoice 
    ? parseFloat(selectedInvoice.paidAmount.replace("RM", "").replace(",", ""))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hover:bg-[#F3F4F6]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1>Issue New Refund</h1>
          <p className="text-[#374151]">Create a refund request for an existing invoice</p>
        </div>
      </div>

      {/* Section A: Select Invoice */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F15929] flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-[18px]">Select Invoice</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice">Search and Select Invoice</Label>
            <Select onValueChange={handleInvoiceSelect}>
              <SelectTrigger className={`h-10 ${errors.invoice ? "border-[#DC2626]" : ""}`}>
                <SelectValue placeholder="Select an invoice..." />
              </SelectTrigger>
              <SelectContent>
                {mockInvoices.map((invoice) => (
                  <SelectItem key={invoice.invoiceNo} value={invoice.invoiceNo}>
                    {invoice.invoiceNo} - {invoice.customer} ({invoice.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.invoice && (
              <p className="text-[#DC2626] text-[14px]">{errors.invoice}</p>
            )}
          </div>

          {/* Invoice Summary Card */}
          {selectedInvoice && (
            <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#6B7280]">Invoice No:</span>
                  <span className="text-[14px] text-[#111827]">{selectedInvoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#6B7280]">Type:</span>
                  <span className="text-[14px] text-[#111827]">{selectedInvoice.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#6B7280]">Customer:</span>
                  <span className="text-[14px] text-[#111827]">{selectedInvoice.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#6B7280]">Items:</span>
                  <span className="text-[14px] text-[#111827]">{selectedInvoice.items}</span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-3 flex justify-between">
                  <span className="text-[14px] text-[#111827]">Paid Amount:</span>
                  <span className="text-[#059669]">{selectedInvoice.paidAmount}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Section B: Refund Details */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F15929] flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-[18px]">Refund Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Refund Amount */}
          <div className="space-y-2">
            <Label htmlFor="refundAmount">
              Refund Amount {selectedInvoice && <span className="text-[#6B7280] text-[12px]">(Max: {selectedInvoice.paidAmount})</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">RM</span>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => {
                  setRefundAmount(e.target.value);
                  if (errors.refundAmount) {
                    setErrors({ ...errors, refundAmount: "" });
                  }
                }}
                className={`h-10 pl-12 ${errors.refundAmount ? "border-[#DC2626]" : ""}`}
                placeholder="0.00"
                disabled={!selectedInvoice}
              />
            </div>
            {errors.refundAmount && (
              <p className="text-[#DC2626] text-[14px]">{errors.refundAmount}</p>
            )}
          </div>

          {/* Refund Method */}
          <div className="space-y-2">
            <Label htmlFor="refundMethod">Refund Method</Label>
            <Select value={refundMethod} onValueChange={(value) => {
              setRefundMethod(value);
              if (errors.refundMethod) {
                setErrors({ ...errors, refundMethod: "" });
              }
            }} disabled={!selectedInvoice}>
              <SelectTrigger className={`h-10 ${errors.refundMethod ? "border-[#DC2626]" : ""}`}>
                <SelectValue placeholder="Select refund method..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="eWallet">eWallet</SelectItem>
              </SelectContent>
            </Select>
            {errors.refundMethod && (
              <p className="text-[#DC2626] text-[14px]">{errors.refundMethod}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason) {
                  setErrors({ ...errors, reason: "" });
                }
              }}
              className={`min-h-[100px] ${errors.reason ? "border-[#DC2626]" : ""}`}
              placeholder="Provide a detailed reason for the refund..."
              disabled={!selectedInvoice}
            />
            {errors.reason && (
              <p className="text-[#DC2626] text-[14px]">{errors.reason}</p>
            )}
          </div>

          {/* Upload Supporting Documents */}
          <div className="space-y-2">
            <Label htmlFor="documents">Upload Supporting Documents</Label>
            <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center hover:border-[#F15929] transition-colors">
              <Upload className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
              <p className="text-[14px] text-[#374151] mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-[12px] text-[#6B7280] mb-4">
                PDF, JPG, PNG up to 10MB
              </p>
              <input
                id="documents"
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={!selectedInvoice}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('documents')?.click()}
                disabled={!selectedInvoice}
              >
                Select Files
              </Button>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-[14px] text-[#374151]">Uploaded Files:</p>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-[14px] text-[#6B7280] bg-[#F9FAFB] p-2 rounded">
                    <FileText className="h-4 w-4" />
                    {file}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section C: Action Buttons */}
      <Card className="border-[#E5E7EB]">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={handleSaveDraft}
              disabled={!selectedInvoice}
            >
              Save as Draft
            </Button>
            <Button
              className="flex-1 bg-[#F15929] hover:bg-[#D14821] h-10"
              onClick={handleSubmitForApproval}
              disabled={!selectedInvoice}
            >
              Submit for Approval
            </Button>
          </div>
          <p className="text-[12px] text-[#6B7280] mt-3 text-center">
            Once submitted, the refund cannot be edited unless rejected by Finance/Admin
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
