import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Plus, Trash2, Send, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ImageUpload } from "./ImageUpload";
import { CreditNote, CreditNoteItem, CreditNoteInvoiceType } from "../../types/creditNote";
import { toast } from "sonner";

const REASONS: CreditNote['reason'][] = [
  "Returned Items",
  "Price Adjustment",
  "Service Issue",
  "Damaged Goods",
  "Billing Error",
  "Other",
];

interface CustomerOption {
  customerName: string;
  customerEmail: string | null;
  customerId: string;
}

interface CreditNoteFormProps {
  onBack: () => void;
  onSave: (creditNote: Partial<CreditNote>, isDraft: boolean) => void;
  editingNote?: CreditNote | null;
}

export function CreditNoteForm({ onBack, onSave, editingNote }: CreditNoteFormProps) {
  const [customerSearch, setCustomerSearch] = useState(editingNote ? (editingNote.customerName ?? editingNote.customer) : "");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(
    editingNote
      ? {
          customerName: editingNote.customerName ?? editingNote.customer,
          customerEmail: editingNote.customerEmail ?? null,
          customerId: editingNote.customerId,
        }
      : null
  );
  const [invoiceType, setInvoiceType] = useState<CreditNoteInvoiceType>(
    (editingNote?.invoiceType as CreditNoteInvoiceType) || "monthlyRental"
  );
  const [invoicesList, setInvoicesList] = useState<Array<{ id: string; label: string; amount?: number }>>([]);
  const [sourceId, setSourceId] = useState(editingNote?.sourceId ?? "");
  const [originalInvoice, setOriginalInvoice] = useState(editingNote?.originalInvoice ?? "");
  const [reason, setReason] = useState<CreditNote["reason"]>(editingNote?.reason ?? "Returned Items");
  const [reasonDescription, setReasonDescription] = useState(editingNote?.reasonDescription ?? "");
  const [date] = useState(editingNote?.date ?? new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<CreditNoteItem[]>(
    editingNote?.items?.length
      ? editingNote.items.map((i) => ({ ...i }))
      : [{ id: "1", description: "Reduction of deposit price", quantity: 1, previousPrice: 0, currentPrice: 0, unitPrice: 0, amount: 0 }]
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const [depositAmount, setDepositAmount] = useState(0);
  const [originalInvoiceAmount, setOriginalInvoiceAmount] = useState<number | null>(null);
  const [monthlyInvoiceItems, setMonthlyInvoiceItems] = useState<Array<{ id: string; scaffoldingItemName: string; quantityBilled: number; unitPrice: number; lineTotal: number }>>([]);
  const [additionalChargeItems, setAdditionalChargeItems] = useState<Array<{ id: string; itemName: string; itemType: string; quantity: number; unitPrice: number; amount: number }>>([]);

  // Return items state (for reason === "Returned Items")
  const [returnItemsData, setReturnItemsData] = useState<Array<{
    scaffoldingItemId: string; name: string; quantity: number; unitPrice: number;
    rentalMonths: number; actualDays: number; actualMonths: number; chargedMonths: number;
    minimumMonths: number; previousPrice: number; currentPrice: number; lineTotal: number;
    returnRequestId: string; returnRequestNumber: string; setName: string;
    startDate: string | null; endDate: string | null; agreementNo: string;
  }>>([]);
  const [returnItemsLoading, setReturnItemsLoading] = useState(false);
  const [returnItemsAgreementId, setReturnItemsAgreementId] = useState<string | null>(
    editingNote?.reason === "Returned Items" && editingNote?.sourceId ? editingNote.sourceId : null
  );
  const [returnItemsAgreements, setReturnItemsAgreements] = useState<Array<{ id: string; agreementNumber: string }>>([]);

  // Track if we're in initial edit loading mode - when true, skip overwriting items and source from API
  const isInitialEditLoadRef = useRef(!!editingNote && editingNote.items && editingNote.items.length > 0);
  const skipSourceResetRef = useRef(!!editingNote && !!editingNote.sourceId);

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
    // Don't search if a customer is already selected and search matches the selected customer
    if (selectedCustomer && customerSearch === selectedCustomer.customerName) {
      setCustomerResults([]);
      return;
    }
    // Clear selected customer if user types something different (and it's not just whitespace/editing)
    if (selectedCustomer && customerSearch !== selectedCustomer.customerName && customerSearch.length >= 2) {
      setSelectedCustomer(null);
    }
    const t = setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch, fetchCustomers, selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer) {
      setInvoicesList([]);
      // Only reset sourceId/originalInvoice if not in initial edit load
      if (!skipSourceResetRef.current) {
        setSourceId("");
        setOriginalInvoice("");
      }
      setMonthlyInvoiceItems([]);
      setAdditionalChargeItems([]);
      setDepositAmount(0);
      setOriginalInvoiceAmount(null);
      if (invoiceType === "deposit") {
        setItems([{ id: "1", description: "Reduction of deposit price", quantity: 1, previousPrice: 0, currentPrice: 0, unitPrice: 0, amount: 0 }]);
      }
      return;
    }
    const name = selectedCustomer.customerName;
    const email = selectedCustomer.customerEmail ?? "";
    // Capture existing values before they might get reset
    const existingSourceId = sourceId;
    const existingOriginalInvoice = originalInvoice;
    
    if (invoiceType === "deposit") {
      fetch(`/api/deposit?customerName=${encodeURIComponent(name)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.deposits) {
            const list = json.deposits.map((d: { id: string; depositNumber: string; depositAmount: number }) => ({
              id: d.id,
              label: d.depositNumber,
              amount: d.depositAmount,
            }));
            // If editing and existing sourceId is not in the list, add it
            if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice && !list.find((inv: { id: string }) => inv.id === existingSourceId)) {
              list.unshift({ id: existingSourceId, label: existingOriginalInvoice, amount: 0 });
            }
            setInvoicesList(list);
          } else {
            // If editing and we have existing values, add them to empty list
            if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice) {
              setInvoicesList([{ id: existingSourceId, label: existingOriginalInvoice, amount: 0 }]);
            } else {
              setInvoicesList([]);
            }
          }
        })
        .catch(() => {
          if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice) {
            setInvoicesList([{ id: existingSourceId, label: existingOriginalInvoice, amount: 0 }]);
          } else {
            setInvoicesList([]);
          }
        });
    } else if (invoiceType === "monthlyRental") {
      let url = `/api/monthly-rental?customerName=${encodeURIComponent(name)}`;
      if (email) url += `&customerEmail=${encodeURIComponent(email)}`;
      fetch(url)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.invoices) {
            const list = json.invoices.map((inv: { id: string; invoiceNumber: string; totalAmount: number }) => ({
              id: inv.id,
              label: inv.invoiceNumber,
              amount: inv.totalAmount,
            }));
            // If editing and existing sourceId is not in the list, add it
            if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice && !list.find((inv: { id: string }) => inv.id === existingSourceId)) {
              list.unshift({ id: existingSourceId, label: existingOriginalInvoice, amount: 0 });
            }
            setInvoicesList(list);
          } else {
            // If editing and we have existing values, add them to empty list
            if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice) {
              setInvoicesList([{ id: existingSourceId, label: existingOriginalInvoice, amount: 0 }]);
            } else {
              setInvoicesList([]);
            }
          }
        })
        .catch(() => {
          if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice) {
            setInvoicesList([{ id: existingSourceId, label: existingOriginalInvoice, amount: 0 }]);
          } else {
            setInvoicesList([]);
          }
        });
    } else {
      fetch(`/api/additional-charges?customerName=${encodeURIComponent(name)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            const list = json.data.map((c: { id: string; invoiceNo: string; totalCharges: number }) => ({
              id: c.id,
              label: c.invoiceNo,
              amount: c.totalCharges,
            }));
            // If editing and existing sourceId is not in the list, add it
            if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice && !list.find((inv: { id: string }) => inv.id === existingSourceId)) {
              list.unshift({ id: existingSourceId, label: existingOriginalInvoice, amount: 0 });
            }
            setInvoicesList(list);
          } else {
            // If editing and we have existing values, add them to empty list
            if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice) {
              setInvoicesList([{ id: existingSourceId, label: existingOriginalInvoice, amount: 0 }]);
            } else {
              setInvoicesList([]);
            }
          }
        })
        .catch(() => {
          if (skipSourceResetRef.current && existingSourceId && existingOriginalInvoice) {
            setInvoicesList([{ id: existingSourceId, label: existingOriginalInvoice, amount: 0 }]);
          } else {
            setInvoicesList([]);
          }
        });
    }
    // Skip resetting source when loading a saved draft for the first time
    if (skipSourceResetRef.current) {
      skipSourceResetRef.current = false;
    } else {
      setSourceId("");
      setOriginalInvoice("");
    }
  }, [selectedCustomer, invoiceType]);

  useEffect(() => {
    if (!sourceId || !invoiceType) return;
    
    // Check if we're in initial edit loading mode (editing a saved draft)
    // If so, skip overwriting items but still fetch metadata, then clear the flag
    const skipItemsOverwrite = isInitialEditLoadRef.current;
    if (skipItemsOverwrite) {
      isInitialEditLoadRef.current = false;
    }
    
    if (invoiceType === "deposit") {
      fetch(`/api/deposit?id=${encodeURIComponent(sourceId)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.deposit) {
            const depositAmt = Number(json.deposit.depositAmount) || 0;
            setDepositAmount(depositAmt);
            setOriginalInvoiceAmount(depositAmt); // Store original invoice amount
            // Only set items if not editing a saved draft
            if (!skipItemsOverwrite) {
              setItems([
                {
                  id: "1",
                  description: "Reduction of deposit price",
                  quantity: 1,
                  previousPrice: depositAmt,
                  currentPrice: 0,
                  unitPrice: 0,
                  amount: 0,
                },
              ]);
            }
          }
        })
        .catch(() => {});
    } else if (invoiceType === "monthlyRental") {
      fetch(`/api/monthly-rental?id=${encodeURIComponent(sourceId)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.invoice && json.invoice.items) {
            const invItems = json.invoice.items.map(
              (i: { id: string; scaffoldingItemName: string; quantityBilled: number; unitPrice: number; lineTotal: number }) => ({
                id: i.id,
                scaffoldingItemName: i.scaffoldingItemName,
                quantityBilled: i.quantityBilled,
                unitPrice: Number(i.unitPrice),
                lineTotal: Number(i.lineTotal),
              })
            );
            setMonthlyInvoiceItems(invItems);
            // Store original invoice total amount for validation
            if (json.invoice.totalAmount != null) {
              setOriginalInvoiceAmount(Number(json.invoice.totalAmount) || 0);
            }
            // Only set items if not editing a saved draft
            if (!skipItemsOverwrite) {
              setItems(
                invItems.map((invItem: { id: string; scaffoldingItemName: string; quantityBilled: number; unitPrice: number; lineTotal: number }) => ({
                  id: invItem.id,
                  description: invItem.scaffoldingItemName,
                  quantity: invItem.quantityBilled,
                  previousPrice: invItem.lineTotal, // Use lineTotal as previousPrice
                  currentPrice: invItem.lineTotal, // Start with same value
                  unitPrice: invItem.unitPrice,
                  amount: 0, // Will be calculated as difference
                }))
              );
            }
          }
        })
        .catch(() => {});
    } else {
      fetch(`/api/additional-charges/${encodeURIComponent(sourceId)}`)
        .then((r) => r.json())
        .then((json) => {
          const charge = json.data;
          if (charge && charge.items) {
            const chargeItems = charge.items.map(
              (i: { id: string; itemName: string; itemType: string; quantity: number; unitPrice: number; amount: number }) => ({
                id: i.id,
                itemName: i.itemName,
                itemType: i.itemType,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                amount: Number(i.amount),
              })
            );
            setAdditionalChargeItems(chargeItems);
            // Store original invoice total amount for validation
            if (charge.totalCharges != null) {
              setOriginalInvoiceAmount(Number(charge.totalCharges) || 0);
            }
            // Only set items if not editing a saved draft
            if (!skipItemsOverwrite) {
              setItems(
                chargeItems.map((ci: { id: string; itemName: string; quantity: number; unitPrice: number; amount: number }) => ({
                  id: ci.id,
                  description: ci.itemName,
                  quantity: ci.quantity,
                  previousPrice: ci.amount, // Use amount as previousPrice (like lineTotal for monthly rental)
                  currentPrice: ci.amount, // Start with same value
                  unitPrice: ci.unitPrice,
                  amount: 0, // Will be calculated as difference
                }))
              );
            }
          }
        })
        .catch(() => {});
    }
  }, [sourceId, invoiceType]);

  // Fetch return items when reason is "Returned Items"
  useEffect(() => {
    if (reason !== "Returned Items" || !selectedCustomer) {
      setReturnItemsData([]);
      setReturnItemsAgreementId(null);
      setReturnItemsAgreements([]);
      return;
    }

    // Skip initial edit load for return items if editing
    if (isInitialEditLoadRef.current) return;

    const name = selectedCustomer.customerName;
    setReturnItemsLoading(true);

    let url = `/api/credit-notes/return-items?customerName=${encodeURIComponent(name)}&invoiceType=${encodeURIComponent(invoiceType)}`;
    if (returnItemsAgreementId) {
      url += `&agreementId=${encodeURIComponent(returnItemsAgreementId)}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const agreementsList = Array.isArray(json.agreements) ? json.agreements : [];
          setReturnItemsAgreements(agreementsList);

          if (Array.isArray(json.items)) {
            setReturnItemsData(json.items);
            // Auto-select when single agreement only (avoid re-fetch by not including in deps)
            if (agreementsList.length === 1) {
              setReturnItemsAgreementId((prev) => prev || agreementsList[0].id);
            }

            // Auto-populate credit note line items from return items
            if (json.items.length > 0) {
              const newItems: CreditNoteItem[] = json.items.map((ri: (typeof returnItemsData)[0], idx: number) => ({
                id: `ret-${idx}`,
                description: ri.name,
                quantity: ri.quantity,
                previousPrice: ri.previousPrice,
                currentPrice: ri.currentPrice,
                unitPrice: ri.unitPrice,
                amount: ri.previousPrice - ri.currentPrice, // credit = original - charged
              }));
              setItems(newItems);
              setOriginalInvoice("Auto - Returned Items");
            } else {
              setItems([]);
            }
          } else {
            setReturnItemsData([]);
            setItems([]);
          }
        } else {
          setReturnItemsData([]);
          setReturnItemsAgreements([]);
          setItems([]);
        }
      })
      .catch(() => {
        setReturnItemsData([]);
        setReturnItemsAgreements([]);
        setItems([]);
      })
      .finally(() => setReturnItemsLoading(false));
  }, [reason, selectedCustomer, invoiceType, returnItemsAgreementId]);

  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.customerName);
    setCustomerResults([]);
  };

  const handleOriginalInvoiceSelect = (id: string) => {
    const inv = invoicesList.find((i) => i.id === id);
    setSourceId(id);
    setOriginalInvoice(inv?.label ?? id);
    // Store the original invoice amount for validation
    if (inv?.amount != null) {
      setOriginalInvoiceAmount(inv.amount);
    } else {
      setOriginalInvoiceAmount(null);
    }
  };

  const handleItemChange = (id: string, field: keyof CreditNoteItem, value: number | string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "currentPrice") {
          // For monthly rental, additional charges, and return items: amount = previousPrice - currentPrice (difference)
          if (invoiceType === "monthlyRental" || invoiceType === "additionalCharge" || reason === "Returned Items") {
            const prev = Number(updated.previousPrice) || 0;
            let curr = Number(updated.currentPrice) ?? 0;
            // Validation: currentPrice cannot exceed previousPrice
            if (curr > prev) {
              curr = prev; // Cap it at previousPrice
              updated.currentPrice = prev;
              toast.error("Charged amount cannot exceed original amount");
            }
            updated.amount = prev - curr; // Credit amount is the difference
          } else {
            const qty = Number(updated.quantity) || 0;
            const curr = Number(updated.currentPrice) ?? 0;
            updated.amount = qty * curr;
          }
        } else if (field === "quantity" && invoiceType !== "monthlyRental" && invoiceType !== "additionalCharge") {
          const qty = Number(updated.quantity) || 0;
          const curr = Number(updated.currentPrice) ?? 0;
          updated.amount = qty * curr;
        }
        return updated;
      })
    );
  };

  const handleDepositAmountChange = (value: number) => {
    setItems([
      {
        id: "1",
        description: "Reduction of deposit price",
        quantity: 1,
        previousPrice: depositAmount,
        currentPrice: depositAmount - value,
        unitPrice: depositAmount - value,
        amount: value,
      },
    ]);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalCurrentPrice = items.reduce((sum, item) => sum + (item.currentPrice || 0), 0);



  const uploadAttachments = async (): Promise<Array<{ fileName: string; fileUrl: string; fileSize: number }>> => {
    const results: Array<{ fileName: string; fileUrl: string; fileSize: number }> = [];
    for (const file of attachments) {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "credit-notes");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (json.success && json.url) {
        results.push({ fileName: file.name, fileUrl: json.url, fileSize: file.size });
      }
    }
    return results;
  };

  const buildPayload = () => {
    const effectiveAgreementId = reason === "Returned Items"
      ? (returnItemsAgreementId ?? (returnItemsAgreements.length === 1 ? returnItemsAgreements[0]?.id : undefined))
      : undefined;
    return {
    customerName: selectedCustomer?.customerName ?? "",
    customerId: selectedCustomer?.customerId ?? "",
    invoiceType,
    sourceId: reason === "Returned Items" ? effectiveAgreementId : (sourceId || undefined),
    originalInvoice: reason === "Returned Items" ? "Auto - Returned Items" : originalInvoice,
    reason,
    reasonDescription: reasonDescription || undefined,
    date,
    status: "Pending Approval",
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      previousPrice: i.previousPrice,
      currentPrice: i.currentPrice,
      amount: i.amount,
    })),
  };
  };

  const validate = (forSubmit: boolean) => {
    if (!selectedCustomer) {
      toast.error("Please search and select a customer");
      return false;
    }
    // Skip invoice check for "Returned Items" — items come from returns, not an invoice
    if (reason !== "Returned Items" && (!sourceId || !originalInvoice)) {
      toast.error("Please select the original invoice");
      return false;
    }
    if (reason === "Returned Items") {
      if (returnItemsAgreements.length > 1 && !returnItemsAgreementId) {
        toast.error("Please select an agreement");
        return false;
      }
      if (items.length === 0) {
        toast.error("No return items found for this customer");
        return false;
      }
    }
    if (forSubmit) {
      if (invoiceType === "monthlyRental" || invoiceType === "additionalCharge") {
        // For monthly rental and additional charges: check description, amount, and validate currentPrice <= previousPrice
        if (items.some((i) => !i.description || i.amount <= 0)) {
          toast.error("Please complete all line items with valid adjusted amounts");
          return false;
        }
        // Validate that adjusted amount doesn't exceed original amount
        if (items.some((i) => (i.currentPrice || 0) > (i.previousPrice || 0))) {
          const fieldName = invoiceType === "monthlyRental" ? "Adjusted line total" : "Adjusted amount";
          toast.error(`${fieldName} cannot exceed original amount for any item`);
          return false;
        }
      } else {
        // For deposit: check description, quantity, and amount
        if (items.some((i) => !i.description || i.quantity <= 0 || i.amount < 0)) {
          toast.error("Please complete all line items with valid quantity and amount");
          return false;
        }
      }
      if (totalAmount <= 0) {
        toast.error("Total amount must be greater than zero");
        return false;
      }
      // Validate that credit note amount doesn't exceed original invoice amount
      if (originalInvoiceAmount != null && totalAmount > originalInvoiceAmount) {
        toast.error(`Credit note amount (RM${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) cannot exceed original invoice amount (RM${originalInvoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate(true)) return;
    setSaving(true);
    try {
      const attachmentList = await uploadAttachments();
      const payload = { ...buildPayload(), attachments: attachmentList };
      const url = editingNote?.id ? `/api/credit-notes/${editingNote.id}` : "/api/credit-notes";
      const method = editingNote?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to submit");
        return;
      }
      const data = json.data;
      const note: Partial<CreditNote> = {
        ...data,
        customer: data.customerName ?? data.customer,
      };
      toast.success("Submitted for approval");
      onSave(note, false);
    } catch (e) {
      toast.error("Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  const canAddItem = (invoiceType === "monthlyRental" && monthlyInvoiceItems.length > 0) || (invoiceType === "additionalCharge" && additionalChargeItems.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="hover:bg-[#F3F4F6]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1>{editingNote ? "Edit Credit Note" : "Create Credit Note"}</h1>
          <p className="text-[#374151]">
            {editingNote ? "Update credit note details" : "Search customer, select invoice type and original invoice, then add line items."}
          </p>
        </div>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Customer & Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">
              Search customer (name or email) <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Type to search..."
                className="h-10 bg-white border-[#D1D5DB] rounded-md"
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
          </div>

          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">Reason <span className="text-[#DC2626]">*</span></label>
            <Select value={reason} onValueChange={(v) => setReason(v as CreditNote["reason"])}>
              <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">Invoice type</label>
              <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as CreditNoteInvoiceType)}>
                <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="monthlyRental">Monthly Rental</SelectItem>
                  <SelectItem value="additionalCharge">Additional Charge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">Date</label>
              <Input type="date" value={date} disabled className="h-10 bg-[#F3F4F6] rounded-md" />
            </div>
          </div>

          {/* Hide invoice selection when reason is "Returned Items" — items are auto-fetched from returns */}
          {reason !== "Returned Items" && (
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">
                Original invoice <span className="text-[#DC2626]">*</span>
              </label>
              <Select
                value={sourceId}
                onValueChange={handleOriginalInvoiceSelect}
                disabled={!selectedCustomer || invoicesList.length === 0}
              >
                <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                  <SelectValue placeholder="Select original invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {invoicesList.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.label}
                      {inv.amount != null ? ` — RM${Number(inv.amount).toLocaleString()}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {reason === "Returned Items" && selectedCustomer && (
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">
                Agreement <span className="text-[#DC2626]">*</span>
              </label>
              <Select
                value={returnItemsAgreementId ?? ""}
                onValueChange={(v) => {
                  setReturnItemsAgreementId(v || null);
                }}
                disabled={!selectedCustomer || returnItemsLoading || returnItemsAgreements.length === 0}
              >
                <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                  <SelectValue placeholder={returnItemsAgreements.length === 0 ? "No agreements with returns" : "Select agreement..."} />
                </SelectTrigger>
                <SelectContent>
                  {returnItemsAgreements.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.agreementNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-[#6B7280]">
                <CalendarDays className="inline h-4 w-4 mr-1 -mt-0.5" />
                Charges are calculated from completed return requests for the selected agreement.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">Additional details</label>
            <Textarea
              placeholder="Provide additional details..."
              value={reasonDescription}
              onChange={(e) => setReasonDescription(e.target.value)}
              className="min-h-[100px] border-[#D1D5DB] rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[18px]">Line Items</CardTitle>
          
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Return Items: loading state */}
          {reason === "Returned Items" && returnItemsLoading && (
            <div className="flex items-center justify-center py-8 text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading return items...
            </div>
          )}

          {/* Return Items: no items found */}
          {reason === "Returned Items" && !returnItemsLoading && selectedCustomer && returnItemsData.length === 0 && (
            <div className="text-center py-8 text-[#6B7280]">
              No completed return requests found for this customer.
            </div>
          )}

          {/* Return Items: show items with duration breakdown */}
          {reason === "Returned Items" && !returnItemsLoading && returnItemsData.length > 0 &&
            items.map((item, idx) => {
              const retData = returnItemsData[idx];
              return (
                <Card key={item.id} className="border-[#E5E7EB] bg-[#F9FAFB]">
                  <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[14px] text-[#374151]">Description</label>
                        <div className="h-10 px-3 bg-[#F9FAFB] border rounded-md flex items-center text-sm">{item.description}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[14px] text-[#374151]">Qty returned</label>
                        <div className="h-10 px-3 bg-[#F9FAFB] border rounded-md flex items-center text-sm">{item.quantity}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[14px] text-[#374151]">Original line total (RM)</label>
                        <div className="h-10 px-3 bg-[#F9FAFB] border rounded-md flex items-center">RM{item.previousPrice.toFixed(2)}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[14px] text-[#374151]">Charged amount (RM)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.previousPrice}
                          value={item.currentPrice || ""}
                          onChange={(e) => handleItemChange(item.id, "currentPrice", parseFloat(e.target.value) || 0)}
                          className="h-10 bg-white border-[#D1D5DB] rounded-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[14px] text-[#374151]">Credit amount (RM)</label>
                        <div className="h-10 px-3 bg-[#F3F4F6] border rounded-md flex items-center">RM{(item.amount || 0).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Duration breakdown info */}
                    {retData && (
                      <div className="mt-3 p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#374151]">
                          <div>
                            <span className="font-medium text-[#1E40AF]">Delivery date:</span>{" "}
                            {retData.startDate || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium text-[#1E40AF]">Return date:</span>{" "}
                            {retData.endDate || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium text-[#1E40AF]">Actual Usage:</span>{" "}
                            {retData.actualDays} days ({retData.actualMonths} month)
                          </div>
                          <div>
                            <span className="font-medium text-[#1E40AF]">Charged:</span>{" "}
                            {retData.chargedMonths} month
                            {retData.chargedMonths > retData.actualMonths && (
                              <span className="text-[#D97706]"> (min {retData.minimumMonths} month)</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-[#6B7280]">
                          Agreement: {retData.agreementNo} &middot; Set: {retData.setName} &middot; Return: {retData.returnRequestNumber}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

          {invoiceType === "deposit" && sourceId && (
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">Reduction amount (RM) <span className="text-[#DC2626]">*</span></label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={depositAmount}
                value={items[0]?.amount ?? 0}
                onChange={(e) => handleDepositAmountChange(parseFloat(e.target.value) || 0)}
                className="h-10 bg-white border-[#D1D5DB] rounded-md"
              />
              <p className="text-xs text-gray-500">Deposit amount: RM{depositAmount.toFixed(2)}</p>
            </div>
          )}

          {reason !== "Returned Items" && (invoiceType === "monthlyRental" || invoiceType === "additionalCharge") &&
            items.map((item) => (
              <Card key={item.id} className="border-[#E5E7EB] bg-[#F9FAFB]">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">Description</label>
                      <div className="h-10 px-3 bg-[#F9FAFB] border rounded-md flex items-center text-sm">{item.description}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">
                        {invoiceType === "monthlyRental" ? "Original line total (RM)" : invoiceType === "additionalCharge" ? "Original amount (RM)" : "Previous price (RM)"}
                      </label>
                      <div className="h-10 px-3 bg-[#F9FAFB] border rounded-md flex items-center">RM{item.previousPrice.toFixed(2)}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">
                        {invoiceType === "monthlyRental" ? "Adjusted line total (RM)" : invoiceType === "additionalCharge" ? "Adjusted amount (RM)" : "Current price (RM)"}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={invoiceType === "monthlyRental" || invoiceType === "additionalCharge" ? item.previousPrice : undefined}
                        value={item.currentPrice || ""}
                        onChange={(e) => handleItemChange(item.id, "currentPrice", parseFloat(e.target.value) || 0)}
                        className="h-10 bg-white border-[#D1D5DB] rounded-md"
                      />
                      {(invoiceType === "monthlyRental" || invoiceType === "additionalCharge") && item.currentPrice > item.previousPrice && (
                        <p className="text-xs text-red-500">Cannot exceed original amount of RM{item.previousPrice.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">Credit amount (RM)</label>
                      <div className="h-10 px-3 bg-[#F3F4F6] border rounded-md flex items-center">RM{(item.amount || 0).toFixed(2)}</div>
                    </div>
                    
                  </div>
                </CardContent>
              </Card>
            ))}

          {invoiceType === "deposit" && items.length === 1 && (
            <div className="flex justify-end">
              <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between items-center p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                  <span className="text-[#374151]">Total adjusted deposit amount (RM)</span>
                  <span className="text-[#374151] font-medium">RM{(depositAmount - totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#F15929] bg-opacity-10 border border-[#F15929] rounded-lg">
                  <span className="text-[#231F20]">Total credit amount (RM)</span>
                  <span className="text-[#231F20] font-medium">RM{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Totals for return items */}
          {reason === "Returned Items" && !returnItemsLoading && items.length > 0 && (
            <div className="flex justify-end">
              <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between items-center p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                  <span className="text-[#374151]">Total charged amount (RM)</span>
                  <span className="text-[#374151] font-medium">RM{totalCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#F15929] bg-opacity-10 border border-[#F15929] rounded-lg">
                  <span className="text-[#231F20]">Total credit amount (RM)</span>
                  <span className="text-[#231F20] font-medium">RM{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {reason !== "Returned Items" && (invoiceType === "monthlyRental" || invoiceType === "additionalCharge") && items.length > 0 && (
            <div className="flex justify-end">
              <div className="w-full md:w-1/3 space-y-2">
                {(invoiceType === "monthlyRental" || invoiceType === "additionalCharge") && (
                  <div className="flex justify-between items-center p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                    <span className="text-[#374151]">
                      {invoiceType === "monthlyRental" ? "Total adjusted line total (RM)" : "Total adjusted amount (RM)"}
                    </span>
                    <span className="text-[#374151] font-medium">RM{totalCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-4 bg-[#F15929] bg-opacity-10 border border-[#F15929] rounded-lg">
                  <span className="text-[#231F20]">Total credit amount (RM)</span>
                  <span className="text-[#231F20] font-medium">RM{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Supporting documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload onFilesChange={setAttachments} maxFiles={5} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button onClick={handleSubmit} className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg" disabled={saving}>
          <Send className="mr-2 h-4 w-4" />
          Submit for approval
        </Button>
      </div>
    </div>
  );
}
