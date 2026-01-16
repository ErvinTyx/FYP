import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";
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
import { CreditNote, CreditNoteItem } from "../../types/creditNote";
import { toast } from "sonner";

interface CreditNoteFormProps {
  onBack: () => void;
  onSave: (creditNote: Partial<CreditNote>, isDraft: boolean) => void;
  editingNote?: CreditNote | null;
}

// Mock data for customers and invoices
const customers = [
  { id: "CUST-001", name: "Acme Construction Ltd." },
  { id: "CUST-002", name: "BuildRight Inc." },
  { id: "CUST-003", name: "Metro Builders" },
  { id: "CUST-004", name: "Premium Projects" },
  { id: "CUST-005", name: "Steel Masters Co." },
];

const invoices = [
  { id: "INV-2024-045", customerId: "CUST-001", amount: 15500 },
  { id: "INV-2024-046", customerId: "CUST-002", amount: 22300 },
  { id: "INV-2024-047", customerId: "CUST-003", amount: 18900 },
  { id: "INV-2024-048", customerId: "CUST-004", amount: 12750 },
  { id: "INV-2024-049", customerId: "CUST-005", amount: 31200 },
];

// Mock data for Delivery Orders
const deliveryOrders = [
  { id: "DO-2024-001", customerId: "CUST-001", invoiceId: "INV-2024-045", doNumber: "DO-2024-001" },
  { id: "DO-2024-002", customerId: "CUST-002", invoiceId: "INV-2024-046", doNumber: "DO-2024-002" },
  { id: "DO-2024-003", customerId: "CUST-003", invoiceId: "INV-2024-047", doNumber: "DO-2024-003" },
  { id: "DO-2024-004", customerId: "CUST-004", invoiceId: "INV-2024-048", doNumber: "DO-2024-004" },
  { id: "DO-2024-005", customerId: "CUST-005", invoiceId: "INV-2024-049", doNumber: "DO-2024-005" },
];

// Mock DO Items with pricing
const doItems = [
  { id: "ITEM-001", doId: "DO-2024-001", name: "Steel Pipe Scaffolding - Standard (6m)", previousPrice: 85.00, currentPrice: 95.00, maxQty: 50 },
  { id: "ITEM-002", doId: "DO-2024-001", name: "Scaffold Board - Wooden (3.9m)", previousPrice: 45.00, currentPrice: 50.00, maxQty: 30 },
  { id: "ITEM-003", doId: "DO-2024-002", name: "H-Frame Scaffolding (1.7m x 1.2m)", previousPrice: 120.00, currentPrice: 135.00, maxQty: 20 },
  { id: "ITEM-004", doId: "DO-2024-003", name: "Ringlock System - Vertical (3m)", previousPrice: 95.00, currentPrice: 105.00, maxQty: 60 },
  { id: "ITEM-005", doId: "DO-2024-004", name: "Steel Tube - Heavy Duty (4m)", previousPrice: 75.00, currentPrice: 80.00, maxQty: 100 },
  { id: "ITEM-006", doId: "DO-2024-004", name: "Swivel Coupler", previousPrice: 12.00, currentPrice: 15.00, maxQty: 150 },
  { id: "ITEM-007", doId: "DO-2024-005", name: "Aluminum Mobile Tower (5m)", previousPrice: 450.00, currentPrice: 480.00, maxQty: 3 },
];

export function CreditNoteForm({ onBack, onSave, editingNote }: CreditNoteFormProps) {
  const [customerId, setCustomerId] = useState(editingNote?.customerId || "");
  const [originalInvoice, setOriginalInvoice] = useState(editingNote?.originalInvoice || "");
  const [deliveryOrderId, setDeliveryOrderId] = useState(editingNote?.deliveryOrderId || "");
  const [reason, setReason] = useState<CreditNote['reason']>(editingNote?.reason || "Returned Items");
  const [reasonDescription, setReasonDescription] = useState(editingNote?.reasonDescription || "");
  const [date, setDate] = useState(editingNote?.date || new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<CreditNoteItem[]>(
    editingNote?.items || [
      {
        id: "1",
        description: "",
        quantity: 1,
        previousPrice: 0,
        currentPrice: 0,
        unitPrice: 0,
        amount: 0,
      },
    ]
  );
  const [attachments, setAttachments] = useState<File[]>([]);

  const availableInvoices = invoices.filter((inv) => inv.customerId === customerId);
  const availableDOs = deliveryOrders.filter((d) => d.invoiceId === originalInvoice);
  const availableItems = doItems.filter((item) => item.doId === deliveryOrderId);

  // Check if all available items have been selected
  const selectedItemNames = items.map((item) => item.description).filter(Boolean);
  const allItemsSelected = availableItems.length > 0 && selectedItemNames.length >= availableItems.length;

  const handleAddItem = () => {
    const newItem: CreditNoteItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      previousPrice: 0,
      currentPrice: 0,
      unitPrice: 0,
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof CreditNoteItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // If selecting from DO items dropdown
          if (field === "description" && value) {
            const selectedItem = availableItems.find(i => i.name === value);
            if (selectedItem) {
              updatedItem.previousPrice = selectedItem.previousPrice;
              updatedItem.currentPrice = selectedItem.previousPrice; // Set current price to same as previous price
              updatedItem.unitPrice = selectedItem.previousPrice; // Use previous price for calculation
              updatedItem.amount = updatedItem.quantity * selectedItem.previousPrice; // Calculate amount with previous price
            }
          }
          
          // Calculate amount using currentPrice (or unitPrice if currentPrice not set)
          if (field === "quantity" || field === "currentPrice") {
            const priceToUse = updatedItem.currentPrice || updatedItem.unitPrice;
            updatedItem.amount = updatedItem.quantity * priceToUse;
            updatedItem.unitPrice = priceToUse; // Keep unitPrice in sync
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const validateForm = () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return false;
    }
    if (!originalInvoice) {
      toast.error("Please select an original invoice");
      return false;
    }
    if (!date) {
      toast.error("Please select a date");
      return false;
    }
    if (items.some((item) => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error("Please complete all item details");
      return false;
    }
    if (totalAmount <= 0) {
      toast.error("Total amount must be greater than zero");
      return false;
    }
    return true;
  };

  const handleSaveDraft = () => {
    const customer = customers.find((c) => c.id === customerId);
    const creditNote: Partial<CreditNote> = {
      id: editingNote?.id,
      customer: customer?.name || "",
      customerId,
      originalInvoice,
      amount: totalAmount,
      reason,
      reasonDescription,
      date,
      status: "Draft",
      items,
    };
    onSave(creditNote, true);
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const customer = customers.find((c) => c.id === customerId);
    const creditNote: Partial<CreditNote> = {
      id: editingNote?.id,
      customer: customer?.name || "",
      customerId,
      originalInvoice,
      amount: totalAmount,
      reason,
      reasonDescription,
      date,
      status: "Pending Approval",
      items,
    };
    onSave(creditNote, false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="hover:bg-[#F3F4F6]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1>{editingNote ? "Edit Credit Note" : "Create Credit Note"}</h1>
          <p className="text-[#374151]">
            {editingNote ? "Update credit note details" : "Fill in the details to create a new credit note"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Credit Note Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer & Invoice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">
                Customer <span className="text-[#DC2626]">*</span>
              </label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">
                Original Invoice <span className="text-[#DC2626]">*</span>
              </label>
              <Select
                value={originalInvoice}
                onValueChange={setOriginalInvoice}
                disabled={!customerId}
              >
                <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                  <SelectValue placeholder="Select invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {availableInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.id} - RM{invoice.amount.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery Order Selection */}
          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">
              Delivery Order (DO) <span className="text-[#DC2626]">*</span>
            </label>
            <Select
              value={deliveryOrderId}
              onValueChange={setDeliveryOrderId}
              disabled={!originalInvoice}
            >
              <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                <SelectValue placeholder="Select delivery order..." />
              </SelectTrigger>
              <SelectContent>
                {availableDOs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.doNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Select the DO to load items with price comparison (Previous Price from DO vs Current Price from Invoice)
            </p>
          </div>

          {/* Reason & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">
                Reason <span className="text-[#DC2626]">*</span>
              </label>
              <Select value={reason} onValueChange={(value) => setReason(value as CreditNote['reason'])}>
                <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Returned Items">Returned Items</SelectItem>
                  <SelectItem value="Price Adjustment">Price Adjustment</SelectItem>
                  <SelectItem value="Service Issue">Service Issue</SelectItem>
                  <SelectItem value="Damaged Goods">Damaged Goods</SelectItem>
                  <SelectItem value="Billing Error">Billing Error</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[14px] text-[#374151]">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled
                className="h-10 bg-[#F3F4F6] border-[#D1D5DB] rounded-md"
              />
            </div>
          </div>

          {/* Reason Description */}
          <div className="space-y-2">
            <label className="text-[14px] text-[#374151]">Additional Details</label>
            <Textarea
              placeholder="Provide additional details about the credit note..."
              value={reasonDescription}
              onChange={(e) => setReasonDescription(e.target.value)}
              className="min-h-[100px] border-[#D1D5DB] rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[18px]">Line Items</CardTitle>
          <Button
            onClick={handleAddItem}
            variant="outline"
            className="h-9 px-4 rounded-lg"
            disabled={allItemsSelected}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!deliveryOrderId && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Please select a Delivery Order (DO) above to load items with price comparison
            </div>
          )}
          
          {items.map((item, index) => (
            <Card key={item.id} className="border-[#E5E7EB] bg-[#F9FAFB]">
              <CardContent className="pt-6 pb-6">
                {/* Two-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Item Dropdown */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">
                        Select Item from DO <span className="text-[#DC2626]">*</span>
                      </label>
                      <Select
                        value={item.description}
                        onValueChange={(value) => handleItemChange(item.id, "description", value)}
                        disabled={!deliveryOrderId}
                      >
                        <SelectTrigger className="h-10 bg-white border-[#D1D5DB] rounded-md">
                          <SelectValue placeholder="Select item from DO..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableItems
                            .filter((doItem) => {
                              // Show the item if it's the current item's selection, or if it's not selected by any other item
                              const isCurrentSelection = doItem.name === item.description;
                              const isSelectedElsewhere = items.some(
                                (i) => i.id !== item.id && i.description === doItem.name
                              );
                              return isCurrentSelection || !isSelectedElsewhere;
                            })
                            .map((doItem) => (
                              <SelectItem key={doItem.id} value={doItem.name}>
                                {doItem.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Previous Price (from Invoice) */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#6B7280]">
                        Previous Price (from Invoice)
                      </label>
                      <div className="h-10 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md flex items-center">
                        <span className="text-[#6B7280]">
                          {item.previousPrice > 0 ? `RM${item.previousPrice.toFixed(2)}` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Current Price (from Invoice) */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#231F20]">
                        Current Price <span className="text-[#DC2626]">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.previousPrice || undefined}
                        value={item.currentPrice || ''}
                        onChange={(e) =>
                          handleItemChange(item.id, "currentPrice", parseFloat(e.target.value) || 0)
                        }
                        placeholder="Enter current price"
                        className="h-10 bg-white border-[#D1D5DB] rounded-md"
                        disabled={!item.description}
                      />
                      {item.currentPrice > item.previousPrice && item.previousPrice > 0 && (
                        <p className="text-xs text-[#DC2626] flex items-center gap-1">
                          <span className="font-semibold">⚠</span> Current price cannot exceed previous price (RM{item.previousPrice.toFixed(2)})
                        </p>
                      )}
                    </div>

                    {/* Price Reduction */}
                    {item.previousPrice > 0 && item.currentPrice > 0 && (
                      <div className="space-y-2">
                        <label className="text-[14px] text-[#6B7280]">
                          Price Reduction
                        </label>
                        <div className="h-10 px-3 bg-[#FEF2F2] border border-[#DC2626] rounded-md flex items-center">
                          <span className={item.previousPrice - item.currentPrice > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}>
                            {item.previousPrice - item.currentPrice > 0 ? '-' : '+'}RM{Math.abs(item.previousPrice - item.currentPrice).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Quantity to Credit */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">
                        Quantity to Credit <span className="text-[#DC2626]">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max={availableItems.find(i => i.name === item.description)?.maxQty || 999}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                        placeholder="Enter quantity"
                        className="h-10 bg-white border-[#D1D5DB] rounded-md"
                        disabled={!item.description}
                      />
                      {item.description && (
                        <p className="text-xs text-gray-500">
                          Max quantity: {availableItems.find(i => i.name === item.description)?.maxQty || 0}
                        </p>
                      )}
                    </div>

                    {/* Amount (auto-calculated) */}
                    <div className="space-y-2">
                      <label className="text-[14px] text-[#374151]">
                        Amount (RM)
                      </label>
                      <div className="h-10 px-3 bg-[#F3F4F6] border border-[#D1D5DB] rounded-md flex items-center">
                        <span className="text-[#231F20]">
                          RM{(item.amount || 0).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Calculated: {item.quantity} × RM{(item.currentPrice || 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Delete Button */}
                    {items.length > 1 && (
                      <div className="flex items-end h-10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="hover:bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Item
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-full md:w-1/3 space-y-2">
              <div className="flex justify-between items-center p-4 bg-[#FEF2F2] border border-[#DC2626] rounded-lg">
                <span className="text-[#231F20]">Total Amount Reduce (RM)</span>
                <span className="text-[#DC2626]">
                  -RM{items.reduce((sum, item) => sum + ((item.previousPrice - item.currentPrice) * item.quantity), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#F15929] bg-opacity-10 border border-[#F15929] rounded-lg">
                <span className="text-[#231F20]">Total Amount Charge:</span>
                <span className="text-[#231F20]">
                  RM{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Supporting Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload onFilesChange={setAttachments} maxFiles={5} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          className="h-10 px-6 rounded-lg"
        >
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>
        <Button
          onClick={handleSubmit}
          className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
        >
          <Send className="mr-2 h-4 w-4" />
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}