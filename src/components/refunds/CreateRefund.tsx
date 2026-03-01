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
import type { Refund } from "../../types/refund";

interface CreateRefundProps {
  onBack: () => void;
  onSave: (refund: Refund) => void;
}

const REFUND_METHODS = ["Bank Transfer", "eWallet", "Cash", "Cheque"];

interface CustomerOption {
  customerName: string;
  customerEmail: string | null;
  customerId: string;
}

interface AgreementOption {
  id: string;
  agreementNumber: string;
  projectName: string;
  hirer?: string;
}

interface CreditNoteFromAgreement {
  id: string;
  creditNoteNumber: string;
  amount: number;
  applied: number;
  refunded: number;
  remaining: number;
}

export function CreateRefund({ onBack, onSave }: CreateRefundProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [agreementSearch, setAgreementSearch] = useState("");
  const [agreementResults, setAgreementResults] = useState<AgreementOption[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementOption | null>(null);
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [creditNotesData, setCreditNotesData] = useState<{
    creditNotes: CreditNoteFromAgreement[];
    totalApprovedCredit: number;
    remainingBalance: number;
  } | null>(null);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);
  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [reason, setReason] = useState("");
  const [reasonDescription, setReasonDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/credit-notes/customers?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.customers)) {
        setCustomerResults(json.customers);
      } else {
        setCustomerResults([]);
      }
    } catch {
      setCustomerResults([]);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomer && customerSearch === selectedCustomer.customerName) {
      setCustomerResults([]);
      return;
    }
    if (selectedCustomer && customerSearch !== selectedCustomer.customerName && customerSearch.length >= 2) {
      setSelectedCustomer(null);
      setSelectedAgreement(null);
      setCreditNotesData(null);
      setSelectedCreditNoteId("");
      setRefundAmount("");
    }
    const t = setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch, fetchCustomers, selectedCustomer]);

  const fetchAgreements = useCallback(async (customerName: string, searchQ?: string) => {
    if (!customerName.trim()) {
      setAgreementResults([]);
      return;
    }
    setLoadingAgreements(true);
    try {
      let url = `/api/refunds/agreements?customerName=${encodeURIComponent(customerName)}`;
      if (searchQ?.trim()) {
        url += `&q=${encodeURIComponent(searchQ.trim())}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.agreements)) {
        setAgreementResults(json.agreements);
      } else {
        setAgreementResults([]);
      }
    } catch {
      setAgreementResults([]);
    } finally {
      setLoadingAgreements(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCustomer) {
      setAgreementResults([]);
      setSelectedAgreement(null);
      setCreditNotesData(null);
      setSelectedCreditNoteId("");
      setRefundAmount("");
      return;
    }
    const t = setTimeout(
      () => fetchAgreements(selectedCustomer.customerName, agreementSearch),
      200
    );
    return () => clearTimeout(t);
  }, [selectedCustomer, agreementSearch, fetchAgreements]);

  useEffect(() => {
    if (!selectedAgreement) {
      setCreditNotesData(null);
      setSelectedCreditNoteId("");
      setRefundAmount("");
      return;
    }
    setLoadingCreditNotes(true);
    fetch(`/api/credit-notes/agreement-balance?agreementId=${encodeURIComponent(selectedAgreement.id)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setCreditNotesData(json.data);
          setSelectedCreditNoteId("");
          setRefundAmount("");
        } else {
          setCreditNotesData(null);
        }
      })
      .catch(() => setCreditNotesData(null))
      .finally(() => setLoadingCreditNotes(false));
  }, [selectedAgreement]);

  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.customerName);
    setCustomerResults([]);
  };

  const eligibleCreditNotes = (creditNotesData?.creditNotes ?? []).filter((cn) => cn.remaining > 0);
  const selectedCN = (creditNotesData?.creditNotes ?? []).find((cn) => cn.id === selectedCreditNoteId);
  const maxAmount = selectedCN?.remaining ?? 0;

  const validate = (forSubmit: boolean): boolean => {
    const e: Record<string, string> = {};
    if (!selectedCustomer) e.customer = "Please select a customer";
    if (!selectedAgreement) e.agreement = "Please select an agreement";
    if (!selectedCreditNoteId) e.creditNote = "Please select a credit note";
    const amount = parseFloat(refundAmount);
    if (!refundAmount || isNaN(amount) || amount <= 0) e.refundAmount = "Enter a valid refund amount";
    else if (amount > maxAmount) e.refundAmount = `Amount cannot exceed credit note remaining balance (RM${maxAmount.toFixed(2)})`;
    if (forSubmit) {
      if (!refundMethod) e.refundMethod = "Select a refund method";
      if (!reason.trim()) e.reason = "Reason is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
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

  const handleSubmit = async () => {
    if (!selectedCreditNoteId) {
      toast.error("Please select a credit note");
      return;
    }
    const amount = parseFloat(refundAmount);
    if (!(amount > 0) || amount > maxAmount) {
      toast.error("Enter a valid refund amount (max RM" + maxAmount.toFixed(2) + ")");
      return;
    }
    if (!validate(true)) {
      toast.error("Please fix the errors below");
      return;
    }
    setSaving(true);
    try {
      const attachmentList = await uploadAttachments();
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditNoteId: selectedCreditNoteId,
          amount,
          refundMethod: refundMethod || null,
          reason: reason.trim() || null,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-[#F3F4F6]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1>Issue New Refund</h1>
          <p className="text-[#374151]">
            Search customer, select agreement, then select an approved credit note. Refund amount is limited by the credit note remaining balance.
          </p>
        </div>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F15929] flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-[18px]">Customer & Agreement</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search customer (name or email) <span className="text-[#DC2626]">*</span></Label>
            <div className="relative">
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Type to search..."
                className={`h-10 ${errors.customer ? "border-[#DC2626]" : ""}`}
                autoComplete="off"
              />
              {customerResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-md shadow-lg max-h-48 overflow-auto">
                  {customerResults.map((c) => (
                    <li
                      key={c.customerId}
                      className="px-4 py-2 hover:bg-[#F3F4F6] cursor-pointer text-sm"
                      onClick={() => handleSelectCustomer(c)}
                    >
                      {c.customerName}
                      {c.customerEmail ? ` (${c.customerEmail})` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedCustomer && (
              <p className="text-sm text-[#059669]">
                Selected: {selectedCustomer.customerName}
                {selectedCustomer.customerEmail ? ` — ${selectedCustomer.customerEmail}` : ""}
              </p>
            )}
            {errors.customer && <p className="text-[#DC2626] text-sm">{errors.customer}</p>}
          </div>

          {selectedCustomer && (
            <div className="space-y-2">
              <Label>Search agreement <span className="text-[#DC2626]">*</span></Label>
              <div className="relative">
                <Input
                  value={agreementSearch}
                  onChange={(e) => setAgreementSearch(e.target.value)}
                  placeholder="Search by agreement number..."
                  className={`h-10 ${errors.agreement ? "border-[#DC2626]" : ""}`}
                  autoComplete="off"
                />
              </div>
              {loadingAgreements && <p className="text-[#6B7280] text-sm">Loading agreements...</p>}
              {!loadingAgreements && agreementResults.length > 0 && (
                <div className="border border-[#E5E7EB] rounded-md max-h-48 overflow-auto">
                  {agreementResults.map((ag) => (
                    <div
                      key={ag.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-[#F3F4F6] border-b border-[#E5E7EB] last:border-b-0 ${
                        selectedAgreement?.id === ag.id ? "bg-[#F0FDF4] border-l-4 border-l-[#059669]" : ""
                      }`}
                      onClick={() => {
                        setSelectedAgreement(ag);
                        if (errors.agreement) setErrors((prev) => ({ ...prev, agreement: "" }));
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-[#111827] font-medium">{ag.agreementNumber}</span>
                        {ag.projectName && (
                          <span className="text-xs text-[#6B7280] mt-0.5">{ag.projectName}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loadingAgreements && selectedCustomer && agreementResults.length === 0 && (
                <p className="text-sm text-[#6B7280]">
                  {agreementSearch.trim() ? "No agreements found. Try a different search." : "No agreements found for this customer."}
                </p>
              )}
              {selectedAgreement && (
                <p className="text-sm text-[#059669]">
                  Selected: {selectedAgreement.agreementNumber} — {selectedAgreement.projectName}
                </p>
              )}
              {errors.agreement && <p className="text-[#DC2626] text-sm">{errors.agreement}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAgreement && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Credit Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCreditNotes && (
              <p className="text-[#6B7280] text-sm">Loading credit notes...</p>
            )}
            {!loadingCreditNotes && creditNotesData && (
              <>
                <div>
                  <h4 className="text-[14px] font-medium text-[#374151] mb-2">Approved Credit Notes</h4>
                  {creditNotesData.creditNotes.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No approved credit notes for this agreement. Refund is not available.</p>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F9FAFB]">
                            <TableHead>Credit Note</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creditNotesData.creditNotes.map((cn) => (
                            <TableRow key={cn.id} className={cn.remaining <= 0 ? "opacity-50" : ""}>
                              <TableCell className="text-[#111827]">{cn.creditNoteNumber}</TableCell>
                              <TableCell className="text-right">RM{cn.amount.toLocaleString()}</TableCell>
                              <TableCell className={`text-right font-medium ${cn.remaining > 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                RM{cn.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-2 flex justify-between font-medium text-sm">
                        <span className="text-[#374151]">Total remaining refundable</span>
                        <span className="text-[#059669]">RM{creditNotesData.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      {eligibleCreditNotes.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <Label>Select Credit Note to Refund From <span className="text-[#DC2626]">*</span></Label>
                          <Select
                            value={selectedCreditNoteId}
                            onValueChange={(v) => {
                              setSelectedCreditNoteId(v);
                              setRefundAmount("");
                              if (errors.creditNote) setErrors((prev) => ({ ...prev, creditNote: "" }));
                            }}
                          >
                            <SelectTrigger className={`h-10 ${errors.creditNote ? "border-[#DC2626]" : ""}`}>
                              <SelectValue placeholder="Select credit note..." />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleCreditNotes.map((cn) => (
                                <SelectItem key={cn.id} value={cn.id}>
                                  {cn.creditNoteNumber} — Remaining: RM{cn.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.creditNote && <p className="text-[#DC2626] text-sm">{errors.creditNote}</p>}
                          {selectedCN && (
                            <p className="text-xs text-[#6B7280]">
                              Max refundable from {selectedCN.creditNoteNumber}: RM{selectedCN.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selectedCreditNoteId && selectedCN && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#F15929]" />
              <CardTitle className="text-[18px]">Refund Details</CardTitle>
            </div>
            {maxAmount <= 0 && (
              <p className="text-sm text-[#DC2626] mt-2">
                No refundable balance remains for this credit note.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">
                Refund Amount (RM){" "}
                {maxAmount > 0 && (
                  <span className="text-[#6B7280] text-xs">(Max: RM{maxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">RM</span>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount > 0 ? maxAmount : undefined}
                  value={refundAmount}
                  onChange={(e) => {
                    setRefundAmount(e.target.value);
                    if (errors.refundAmount) setErrors((prev) => ({ ...prev, refundAmount: "" }));
                  }}
                  disabled={maxAmount <= 0}
                  className={`h-10 pl-12 ${errors.refundAmount ? "border-[#DC2626]" : ""}`}
                  placeholder="0.00"
                />
              </div>
              {errors.refundAmount && <p className="text-[#DC2626] text-sm">{errors.refundAmount}</p>}
            </div>
            <div className="space-y-2">
              <Label>Refund Method</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod} disabled={maxAmount <= 0}>
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
                disabled={maxAmount <= 0}
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
                disabled={maxAmount <= 0}
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
                    disabled={maxAmount <= 0}
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

      {selectedCreditNoteId && maxAmount > 0 && (
        <Card className="border-[#E5E7EB]">
          <CardContent className="pt-6">
            <Button
              className="w-full bg-[#F15929] hover:bg-[#D14821] h-10"
              onClick={handleSubmit}
              disabled={saving}
            >
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
