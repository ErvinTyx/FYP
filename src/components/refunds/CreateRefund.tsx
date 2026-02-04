import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Upload, FileText, DollarSign } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import type { Refund, RefundInvoiceType } from "../../types/refund";
import type { RefundInvoiceDetailsResponse } from "../../types/refund";

interface CreateRefundProps {
  onBack: () => void;
  onSave: (refund: Refund) => void;
}

const REFUND_METHODS = ["Bank Transfer", "eWallet", "Cash", "Cheque"];

interface InvoiceListItem {
  id: string;
  label: string;
  customerName?: string;
}

export function CreateRefund({ onBack, onSave }: CreateRefundProps) {
  const [invoiceType, setInvoiceType] = useState<RefundInvoiceType | "">("");
  const [invoiceList, setInvoiceList] = useState<InvoiceListItem[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [originalInvoice, setOriginalInvoice] = useState("");
  const [invoiceDetails, setInvoiceDetails] = useState<RefundInvoiceDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [reason, setReason] = useState("");
  const [reasonDescription, setReasonDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchInvoices = useCallback(async (type: RefundInvoiceType) => {
    if (!type) {
      setInvoiceList([]);
      return;
    }
    try {
      if (type === "deposit") {
        const res = await fetch("/api/deposit");
        const json = await res.json();
        if (json.success && json.deposits) {
          setInvoiceList(
            json.deposits.map((d: { id: string; depositNumber: string; agreement?: { hirer?: string } }) => ({
              id: d.id,
              label: d.depositNumber,
              customerName: d.agreement?.hirer,
            }))
          );
        } else setInvoiceList([]);
      } else if (type === "monthlyRental") {
        const res = await fetch("/api/monthly-rental");
        const json = await res.json();
        if (json.success && json.invoices) {
          setInvoiceList(
            json.invoices.map((inv: { id: string; invoiceNumber: string; customerName?: string }) => ({
              id: inv.id,
              label: inv.invoiceNumber,
              customerName: inv.customerName,
            }))
          );
        } else setInvoiceList([]);
      } else {
        const res = await fetch("/api/additional-charges");
        const json = await res.json();
        if (json.success && json.data) {
          setInvoiceList(
            json.data.map((c: { id: string; invoiceNo: string; customerName?: string }) => ({
              id: c.id,
              label: c.invoiceNo,
              customerName: c.customerName,
            }))
          );
        } else setInvoiceList([]);
      }
    } catch {
      setInvoiceList([]);
    }
    setSourceId("");
    setOriginalInvoice("");
    setInvoiceDetails(null);
  }, []);

  useEffect(() => {
    if (invoiceType) fetchInvoices(invoiceType);
    else setInvoiceList([]);
  }, [invoiceType, fetchInvoices]);

  useEffect(() => {
    if (!sourceId || !invoiceType) {
      setInvoiceDetails(null);
      return;
    }
    setLoadingDetails(true);
    fetch(
      `/api/refunds/invoice-details?invoiceType=${encodeURIComponent(invoiceType)}&sourceId=${encodeURIComponent(sourceId)}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.invoice) {
          setInvoiceDetails(json as RefundInvoiceDetailsResponse);
          setRefundAmount("");
        } else setInvoiceDetails(null);
      })
      .catch(() => setInvoiceDetails(null))
      .finally(() => setLoadingDetails(false));
  }, [sourceId, invoiceType]);

  const handleSelectInvoice = (id: string) => {
    const inv = invoiceList.find((i) => i.id === id);
    setSourceId(id);
    setOriginalInvoice(inv?.label ?? id);
  };

  const uploadAttachments = async (): Promise<Array<{ fileName: string; fileUrl: string; fileSize: number }>> => {
    const results: Array<{ fileName: string; fileUrl: string; fileSize: number }> = [];
    for (const file of attachments) {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "refunds");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (json.success && json.url) {
        results.push({ fileName: file.name, fileUrl: json.url, fileSize: file.size });
      }
    }
    return results;
  };

  const totalCredited = invoiceDetails?.totalCredited ?? 0;
  const amountToReturn = invoiceDetails?.amountToReturn ?? totalCredited;
  const maxAmount = amountToReturn;

  const validate = (forSubmit: boolean): boolean => {
    const e: Record<string, string> = {};
    if (!sourceId || !invoiceDetails) e.invoice = "Please select an invoice";
    const amount = parseFloat(refundAmount);
    if (!refundAmount || isNaN(amount) || amount <= 0) e.refundAmount = "Enter a valid refund amount";
    else if (amount > maxAmount) e.refundAmount = `Amount cannot exceed remaining refundable (RM${maxAmount.toFixed(2)})`;
    if (forSubmit) {
      if (!refundMethod) e.refundMethod = "Select a refund method";
      if (!reason.trim()) e.reason = "Reason is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!invoiceDetails?.invoice || !sourceId || !originalInvoice) {
      toast.error("Please select an invoice");
      return;
    }
    const amount = parseFloat(refundAmount);
    if (!(amount > 0) || amount > maxAmount) {
      toast.error("Enter a valid refund amount (max RM" + maxAmount.toFixed(2) + ")");
      return;
    }
    setSaving(true);
    try {
      const attachmentList = await uploadAttachments();
      const customerName = invoiceDetails.invoice.customerName ?? "";
      const customerId = `${customerName}|${invoiceDetails.invoice.customerEmail ?? ""}`;
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceType,
          sourceId,
          originalInvoice,
          customerName,
          customerId,
          amount,
          refundMethod: refundMethod || null,
          reason: reason.trim() || null,
          reasonDescription: reasonDescription.trim() || null,
          status: "Draft",
          attachments: attachmentList,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to save draft");
        return;
      }
      toast.success("Refund saved as draft");
      onSave(json.data);
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!validate(true)) {
      toast.error("Please fix the errors below");
      return;
    }
    setSaving(true);
    try {
      const attachmentList = await uploadAttachments();
      const amount = parseFloat(refundAmount);
      const customerName = invoiceDetails!.invoice.customerName ?? "";
      const customerId = `${customerName}|${invoiceDetails!.invoice.customerEmail ?? ""}`;
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceType,
          sourceId,
          originalInvoice,
          customerName,
          customerId,
          amount,
          refundMethod: refundMethod || null,
          reason: reason.trim(),
          reasonDescription: reasonDescription.trim() || null,
          status: "Pending Approval",
          attachments: attachmentList,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to submit");
        return;
      }
      toast.success("Refund submitted for approval");
      onSave(json.data);
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  const invoiceTypeLabel =
    invoiceType === "deposit" ? "Deposit" : invoiceType === "monthlyRental" ? "Monthly Rental" : invoiceType === "additionalCharge" ? "Additional Charge" : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-[#F3F4F6]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1>Issue New Refund</h1>
          <p className="text-[#374151]">Select invoice (Deposit, Monthly Rental, or Additional Charge). Refund amount is limited by approved credit notes.</p>
        </div>
      </div>

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
            <Label>Invoice Type</Label>
            <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as RefundInvoiceType)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="monthlyRental">Monthly Rental</SelectItem>
                <SelectItem value="additionalCharge">Additional Charge</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Original Invoice</Label>
            <Select value={sourceId} onValueChange={handleSelectInvoice} disabled={!invoiceType || invoiceList.length === 0}>
              <SelectTrigger className={`h-10 ${errors.invoice ? "border-[#DC2626]" : ""}`}>
                <SelectValue placeholder="Select invoice..." />
              </SelectTrigger>
              <SelectContent>
                {invoiceList.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.label}
                    {inv.customerName ? ` — ${inv.customerName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.invoice && <p className="text-[#DC2626] text-sm">{errors.invoice}</p>}
          </div>

          {loadingDetails && (
            <p className="text-[#6B7280] text-sm">Loading invoice details and credit notes...</p>
          )}

          {invoiceDetails && !loadingDetails && (
            <>
              <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
                <CardHeader>
                  <CardTitle className="text-[16px]">Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Number</span>
                    <span className="text-[#111827]">{invoiceDetails.invoice.number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Customer</span>
                    <span className="text-[#111827]">{invoiceDetails.invoice.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Invoice Amount</span>
                    <span className="text-[#111827]">RM{invoiceDetails.invoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Status</span>
                    <span className="text-[#111827]">{invoiceDetails.invoice.status}</span>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h4 className="text-[14px] font-medium text-[#374151] mb-2">Related Approved Credit Notes</h4>
                {invoiceDetails.relatedCreditNotes.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No approved credit notes for this invoice. Refund is not available.</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F9FAFB]">
                          <TableHead>Credit Note</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetails.relatedCreditNotes.map((cn) => (
                          <TableRow key={cn.id}>
                            <TableCell className="text-[#111827]">{cn.creditNoteNumber}</TableCell>
                            <TableCell className="text-right">RM{cn.amount.toLocaleString()}</TableCell>
                            <TableCell>{cn.date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-2 flex flex-col gap-1 text-sm">
                      <div className="flex justify-between font-medium">
                        <span className="text-[#374151]">Remaining refundable</span>
                        <span className="text-[#059669]">RM{amountToReturn.toLocaleString()}</span>
                      </div>
                      {amountToReturn < totalCredited && (
                        <p className="text-xs text-[#6B7280]">
                          Total credited to date: RM{totalCredited.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {invoiceDetails && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#F15929]" />
              <CardTitle className="text-[18px]">Refund Details</CardTitle>
            </div>
            {amountToReturn <= 0 && (
              <p className="text-sm text-[#DC2626] mt-2">
                No refundable balance remains for this invoice. Ensure credit notes are approved before you can request a refund.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">
                Refund Amount (RM){" "}
                {amountToReturn > 0 && (
                  <span className="text-[#6B7280] text-xs">(Max: RM{maxAmount.toLocaleString()})</span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">RM</span>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={amountToReturn > 0 ? maxAmount : undefined}
                  value={refundAmount}
                  onChange={(e) => {
                    setRefundAmount(e.target.value);
                    if (errors.refundAmount) setErrors((prev) => ({ ...prev, refundAmount: "" }));
                  }}
                  disabled={amountToReturn <= 0}
                  className={`h-10 pl-12 ${errors.refundAmount ? "border-[#DC2626]" : ""}`}
                  placeholder="0.00"
                />
              </div>
              {errors.refundAmount && <p className="text-[#DC2626] text-sm">{errors.refundAmount}</p>}
            </div>
            <div className="space-y-2">
              <Label>Refund Method</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod} disabled={amountToReturn <= 0}>
                <SelectTrigger className={`h-10 ${errors.refundMethod ? "border-[#DC2626]" : ""}`}>
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.refundMethod && <p className="text-[#DC2626] text-sm">{errors.refundMethod}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">
                Reason for Refund <span className="text-[#DC2626]">*</span>
              </Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) setErrors((prev) => ({ ...prev, reason: "" }));
                }}
                disabled={amountToReturn <= 0}
                className={`min-h-[80px] ${errors.reason ? "border-[#DC2626]" : ""}`}
                placeholder="Provide a detailed reason for this refund (required when submitting for approval)"
              />
              {errors.reason && <p className="text-[#DC2626] text-sm">{errors.reason}</p>}
            </div>
            <div className="space-y-2">
              <Label>Additional Details</Label>
              <Textarea
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                disabled={amountToReturn <= 0}
                className="min-h-[60px]"
                placeholder="Optional..."
              />
            </div>
            <div className="space-y-2">
              <Label>Upload Supporting Documents</Label>
              <p className="text-[12px] text-[#6B7280]">PDF, JPG, PNG. Files are uploaded when you Save as Draft or Submit for Approval.</p>
              <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  id="refund-docs"
                  onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                />
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("refund-docs")?.click()}
                disabled={amountToReturn <= 0}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Files
                  </Button>
                  {attachments.length > 0 && (
                    <div className="w-full mt-2 text-left">
                      <p className="text-sm text-[#6B7280] mb-1">{attachments.length} file(s) selected:</p>
                      <ul className="text-sm text-[#374151] list-disc list-inside space-y-0.5">
                        {attachments.map((f, i) => (
                          <li key={i}>{f.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {invoiceDetails && amountToReturn > 0 && (
        <Card className="border-[#E5E7EB]">
          <CardContent className="pt-6 flex gap-3">
            <Button variant="outline" className="flex-1 h-10" onClick={handleSaveDraft} disabled={saving}>
              Save as Draft
            </Button>
            <Button className="flex-1 bg-[#F15929] hover:bg-[#D14821] h-10" onClick={handleSubmitForApproval} disabled={saving}>
              Submit for Approval
            </Button>
          </CardContent>
          <p className="text-[12px] text-[#6B7280] px-6 pb-4 text-center">
            Once submitted, the refund cannot be edited unless rejected by Finance/Admin
          </p>
        </Card>
      )}
    </div>
  );
}
