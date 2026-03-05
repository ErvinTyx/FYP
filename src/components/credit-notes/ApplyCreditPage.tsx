import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { CreditNote, EligibleInvoice } from "../../types/creditNote";
import { toast } from "sonner";

interface ApplyCreditPageProps {
  creditNote: CreditNote;
  onBack: () => void;
  onApplied: () => void;
}

export function ApplyCreditPage({
  creditNote,
  onBack,
  onApplied,
}: ApplyCreditPageProps) {
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<EligibleInvoice | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [remainingBalance, setRemainingBalance] = useState(0);

  const fetchData = useCallback(async () => {
    if (!creditNote.agreementId) return;
    setLoading(true);
    try {
      const [invoicesRes, appsRes] = await Promise.all([
        fetch(`/api/credit-notes/eligible-invoices?agreementId=${creditNote.agreementId}`),
        fetch(`/api/credit-notes/${creditNote.id}/applications`),
      ]);
      const invoicesJson = await invoicesRes.json();
      const appsJson = await appsRes.json();

      if (invoicesJson.success) {
        setEligibleInvoices(invoicesJson.data || []);
      }
      if (appsJson.success) {
        setRemainingBalance(appsJson.remainingBalance || 0);
      }
    } catch {
      toast.error("Failed to load eligible invoices");
    } finally {
      setLoading(false);
    }
  }, [creditNote.agreementId, creditNote.id]);

  useEffect(() => {
    fetchData();
    setSelectedInvoice(null);
    setAmount("");
    setNotes("");
  }, [fetchData]);

  const handleSelectInvoice = (invoice: EligibleInvoice) => {
    setSelectedInvoice(invoice);
    const defaultAmount = Math.min(remainingBalance, invoice.outstanding);
    setAmount(defaultAmount.toFixed(2));
  };

  const handleApply = async () => {
    if (!selectedInvoice) {
      toast.error("Please select an invoice");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (numAmount > remainingBalance) {
      toast.error(`Amount exceeds remaining balance (RM${remainingBalance.toFixed(2)})`);
      return;
    }
    if (numAmount > selectedInvoice.outstanding) {
      toast.error(`Amount exceeds invoice outstanding (RM${selectedInvoice.outstanding.toFixed(2)})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/credit-notes/${creditNote.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetInvoiceType: selectedInvoice.invoiceType,
          targetInvoiceId: selectedInvoice.id,
          amount: numAmount,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Credit applied successfully");
        onApplied();
        onBack();
      } else {
        toast.error(json.message || "Failed to apply credit");
      }
    } catch {
      toast.error("Failed to apply credit");
    } finally {
      setSubmitting(false);
    }
  };

  const invoiceTypeLabel = (type: string) => {
    switch (type) {
      case "deposit": return "Deposit";
      case "monthlyRental": return "Monthly Rental";
      case "additionalCharge": return "Additional Charge";
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} disabled={submitting} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-[#F15929]" />
            <h1 className="text-[20px] font-semibold text-[#111827]">
              Apply Credit - {creditNote.creditNoteNumber}
            </h1>
          </div>
        </div>
      </div>

      {/* Credit Balance Summary */}
      <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-[#6B7280]">Total Credit</p>
              <p className="text-[16px] font-semibold text-[#111827]">
                RM{creditNote.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Remaining Balance</p>
              <p className="text-[16px] font-semibold text-[#059669]">
                RM{remainingBalance.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No agreement warning */}
      {!creditNote.agreementId && (
        <div className="flex items-center gap-2 p-4 bg-[#FEF3C7] rounded-lg">
          <AlertCircle className="h-5 w-5 text-[#D97706]" />
          <p className="text-sm text-[#92400E]">
            This credit note is not linked to an agreement. Cannot find eligible invoices.
          </p>
        </div>
      )}

      {/* Eligible Invoices */}
      {creditNote.agreementId && (
        <>
          <Card className="border-[#E5E7EB]">
            <CardContent className="pt-6">
              <h3 className="text-[16px] font-medium text-[#111827] mb-3">
                Select an Invoice to Apply Credit
              </h3>
              {loading ? (
                <p className="text-[#6B7280] text-sm">Loading invoices...</p>
              ) : eligibleInvoices.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-[#F9FAFB] rounded-lg">
                  <AlertCircle className="h-5 w-5 text-[#6B7280]" />
                  <p className="text-sm text-[#6B7280]">
                    No unpaid invoices found for this agreement.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibleInvoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className={`cursor-pointer ${
                            selectedInvoice?.id === inv.id
                              ? "bg-[#FFF7F5] border-l-2 border-[#F15929]"
                              : "hover:bg-[#F3F4F6]"
                          }`}
                          onClick={() => handleSelectInvoice(inv)}
                        >
                          <TableCell>
                            <input
                              type="radio"
                              name="selectedInvoice"
                              checked={selectedInvoice?.id === inv.id}
                              onChange={() => handleSelectInvoice(inv)}
                              className="accent-[#F15929]"
                            />
                          </TableCell>
                          <TableCell className="font-medium text-[#111827]">
                            {inv.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                              {invoiceTypeLabel(inv.invoiceType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-[#374151]">
                            RM{inv.totalAmount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-[#DC2626] font-medium">
                            RM{inv.outstanding.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-[#6B7280]">{inv.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amount & Notes */}
          {selectedInvoice && (
            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-[16px] font-medium text-[#111827]">Amount and notes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="applyAmount" className="text-[14px] text-[#374151]">
                      Amount to Apply (RM)
                    </Label>
                    <Input
                      id="applyAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Math.min(remainingBalance, selectedInvoice.outstanding)}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1"
                      placeholder="0.00"
                    />
                    <p className="text-[12px] text-[#6B7280] mt-1">
                      Max: RM{Math.min(remainingBalance, selectedInvoice.outstanding).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="applyNotes" className="text-[14px] text-[#374151]">
                      Notes (optional)
                    </Label>
                    <Input
                      id="applyNotes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1"
                      placeholder="e.g. Partial credit for monthly rental"
                    />
                  </div>
                </div>

                {/* Summary */}
                <Card className="border-[#D1FAE5] bg-[#F0FDF4]">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#374151]">
                        Applying <span className="font-semibold text-[#059669]">RM{parseFloat(amount || "0").toFixed(2)}</span> to{" "}
                        <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                      </span>
                      <span className="text-[#6B7280]">
                        New remaining: RM{Math.max(0, remainingBalance - parseFloat(amount || "0")).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={onBack} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={!amount || parseFloat(amount) <= 0 || submitting}
                    className="bg-[#F15929] hover:bg-[#D14E24] text-white"
                  >
                    {submitting ? "Applying..." : "Apply Credit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Actions when no invoice selected yet */}
      {creditNote.agreementId && !selectedInvoice && eligibleInvoices.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            Back to details
          </Button>
        </div>
      )}

      {/* Back when no agreement */}
      {!creditNote.agreementId && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            Back to details
          </Button>
        </div>
      )}
    </div>
  );
}
