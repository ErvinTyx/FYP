import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";
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
      ? editingNote.items.map((i) => ({ ...i, daysCharged: i.daysCharged }))
      : [{ id: "1", description: "Reduction of deposit price", quantity: 1, previousPrice: 0, currentPrice: 0, unitPrice: 0, amount: 0 }]
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const [depositAmount, setDepositAmount] = useState(0);
  const [monthlyInvoiceItems, setMonthlyInvoiceItems] = useState<Array<{ id: string; scaffoldingItemName: string; quantityBilled: number; unitPrice: number; daysCharged: number; lineTotal: number }>>([]);
  const [additionalChargeItems, setAdditionalChargeItems] = useState<Array<{ id: string; itemName: string; itemType: string; quantity: number; unitPrice: number; amount: number }>>([]);
  
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
            setDepositAmount(Number(json.deposit.depositAmount) || 0);
            // Only set items if not editing a saved draft
            if (!skipItemsOverwrite) {
              setItems([
                {
                  id: "1",
                  description: "Reduction of deposit price",
                  quantity: 1,
                  previousPrice: Number(json.deposit.depositAmount) || 0,
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
              (i: { id: string; scaffoldingItemName: string; quantityBilled: number; unitPrice: number; daysCharged: number; lineTotal: number }) => ({
                id: i.id,
                scaffoldingItemName: i.scaffoldingItemName,
                quantityBilled: i.quantityBilled,
                unitPrice: Number(i.unitPrice),
                daysCharged: i.daysCharged,
                lineTotal: Number(i.lineTotal),
              })
            );
            setMonthlyInvoiceItems(invItems);
            // Only set items if not editing a saved draft
            if (!skipItemsOverwrite) {
              setItems(
                invItems.map((invItem: { id: string; scaffoldingItemName: string; quantityBilled: number; unitPrice: number; daysCharged: number; lineTotal: number }) => ({
                  id: invItem.id,
                  description: invItem.scaffoldingItemName,
                  quantity: invItem.quantityBilled,
                  previousPrice: invItem.unitPrice,
                  currentPrice: invItem.unitPrice,
                  unitPrice: invItem.unitPrice,
                  amount: invItem.lineTotal ?? invItem.quantityBilled * invItem.unitPrice * (invItem.daysCharged || 1),
                  daysCharged: invItem.daysCharged,
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
            // Only set items if not editing a saved draft
            if (!skipItemsOverwrite) {
              setItems(
                chargeItems.map((ci: { id: string; itemName: string; quantity: number; unitPrice: number; amount: number }) => ({
                  id: ci.id,
                  description: ci.itemName,
                  quantity: ci.quantity,
                  previousPrice: ci.unitPrice,
                  currentPrice: ci.unitPrice,
                  unitPrice: ci.unitPrice,
                  amount: ci.amount,
                }))
              );
            }
          }
        })
        .catch(() => {});
    }
  }, [sourceId, invoiceType]);

  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.customerName);
    setCustomerResults([]);
  };

  const handleOriginalInvoiceSelect = (id: string) => {
    const inv = invoicesList.find((i) => i.id === id);
    setSourceId(id);
    setOriginalInvoice(inv?.label ?? id);
  };

  const handleItemChange = (id: string, field: keyof CreditNoteItem, value: number | string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "currentPrice" || field === "amount") {
          const qty = Number(updated.quantity) || 0;
          const curr = Number(updated.currentPrice) ?? 0;
          updated.amount = qty * curr;
          if (invoiceType === "monthlyRental" && updated.daysCharged != null) {
            updated.amount = qty * curr * (updated.daysCharged || 0);
          }
        }
        if (field === "daysCharged") {
          const qty = Number(updated.quantity) || 0;
          const curr = Number(updated.currentPrice) ?? 0;
          const days = Number(value) || 0;
          updated.amount = qty * curr * days;
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

  const addMonthlyOrAdditionalItem = () => {
    const sourceItems = invoiceType === "monthlyRental" ? monthlyInvoiceItems : additionalChargeItems;
    const selectedDescriptions = items.map((i) => i.description).filter(Boolean);
    const available = sourceItems.filter((s) => {
      const name = invoiceType === "monthlyRental" ? (s as { scaffoldingItemName: string }).scaffoldingItemName : (s as { itemName: string }).itemName;
      return !selectedDescriptions.includes(name) || selectedDescriptions.filter((d) => d === name).length < 2;
    });
    if (available.length === 0) return;
    const first = available[0];
    const desc = invoiceType === "monthlyRental" ? (first as { scaffoldingItemName: string }).scaffoldingItemName : (first as { itemName: string }).itemName;
    const qty = invoiceType === "monthlyRental" ? (first as { quantityBilled: number }).quantityBilled : (first as { quantity: number }).quantity;
    const price = Number(first.unitPrice) || 0;
    setItems((prev) => [
      ...prev,
      {
        id: first.id + "-" + Date.now(),
        description: desc,
        quantity: qty,
        previousPrice: price,
        currentPrice: price,
        unitPrice: price,
        amount: qty * price,
        daysCharged: invoiceType === "monthlyRental" ? (first as { daysCharged: number }).daysCharged : undefined,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

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

  const buildPayload = () => ({
    customerName: selectedCustomer?.customerName ?? "",
    customerId: selectedCustomer?.customerId ?? "",
    invoiceType,
    sourceId: sourceId || undefined,
    originalInvoice,
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
      daysCharged: i.daysCharged,
    })),
  });

  const validate = (forSubmit: boolean) => {
    if (!selectedCustomer) {
      toast.error("Please search and select a customer");
      return false;
    }
    if (!sourceId || !originalInvoice) {
      toast.error("Please select the original invoice");
      return false;
    }
    if (forSubmit) {
      if (items.some((i) => !i.description || i.quantity <= 0 || i.amount < 0)) {
        toast.error("Please complete all line items with valid quantity and amount");
        return false;
      }
      if (totalAmount <= 0) {
        toast.error("Total amount must be greater than zero");
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">Date</label>
              <Input type="date" value={date} disabled className="h-10 bg-[#F3F4F6] rounded-md" />
            </div>
          </div>

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
          {invoiceType !== "deposit" && canAddItem && (
            <Button type="button" variant="outline" className="h-9 px-4 rounded-lg" onClick={addMonthlyOrAdditionalItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
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

          {(invoiceType === "monthlyRental" || invoiceType === "additionalCharge") &&
            items.map((item) => (
              <Card key={item.id} className="border-[#E5E7EB] bg-[#F9FAFB]">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">Description</label>
                      <div className="h-10 px-3 bg-[#F9FAFB] border rounded-md flex items-center text-sm">{item.description}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value, 10) || 0)}
                        className="h-10 bg-white border-[#D1D5DB] rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">Previous price (RM)</label>
                      <div className="h-10 px-3 bg-[#F9FAFB] border rounded-md flex items-center">RM{item.previousPrice.toFixed(2)}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">Current price (RM)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.currentPrice || ""}
                        onChange={(e) => handleItemChange(item.id, "currentPrice", parseFloat(e.target.value) || 0)}
                        className="h-10 bg-white border-[#D1D5DB] rounded-md"
                      />
                    </div>
                    {invoiceType === "monthlyRental" && (
                      <div className="space-y-2">
                        <label className="text-[14px] text-[#374151]">Days charged</label>
                        <Input
                          type="number"
                          min="0"
                          value={item.daysCharged ?? ""}
                          onChange={(e) => handleItemChange(item.id, "daysCharged", parseInt(e.target.value, 10) || 0)}
                          className="h-10 bg-white border-[#D1D5DB] rounded-md"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">Amount (RM)</label>
                      <div className="h-10 px-3 bg-[#F3F4F6] border rounded-md flex items-center">RM{(item.amount || 0).toFixed(2)}</div>
                    </div>
                    {items.length > 1 && (
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeItem(item.id)} className="text-[#DC2626] border-[#DC2626]">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

          {invoiceType === "deposit" && items.length === 1 && (
            <div className="flex justify-between items-center p-4 bg-[#F3F4F6] rounded-lg">
              <span className="text-[#374151]">Total credit (RM)</span>
              <span className="font-medium">RM{totalAmount.toFixed(2)}</span>
            </div>
          )}

          {(invoiceType === "monthlyRental" || invoiceType === "additionalCharge") && items.length > 0 && (
            <div className="flex justify-end">
              <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between items-center p-4 bg-[#F15929] bg-opacity-10 border border-[#F15929] rounded-lg">
                  <span className="text-[#231F20]">Total (RM)</span>
                  <span className="text-[#231F20]">RM{totalAmount.toLocaleString()}</span>
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
