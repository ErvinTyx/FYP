import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { CreditNotesList } from "./CreditNotesList";
import { CreditNoteForm } from "./CreditNoteForm";
import { CreditNoteDetails } from "./CreditNoteDetails";
import { CreditNote } from "../../types/creditNote";
import { toast } from "sonner";

type View = "list" | "create" | "edit" | "details";

function mapApiToCreditNote(data: Record<string, unknown>): CreditNote {
  return {
    id: data.id as string,
    creditNoteNumber: data.creditNoteNumber as string,
    customer: (data.customerName as string) ?? (data.customer as string),
    customerName: data.customerName as string,
    customerId: data.customerId as string,
    customerEmail: data.customerEmail as string | undefined,
    invoiceType: (data.invoiceType as CreditNote["invoiceType"]) ?? "monthlyRental",
    sourceId: data.sourceId as string | undefined,
    originalInvoice: data.originalInvoice as string,
    deliveryOrderId: data.deliveryOrderId as string | undefined,
    amount: Number(data.amount),
    reason: data.reason as CreditNote["reason"],
    reasonDescription: data.reasonDescription as string | undefined,
    date: typeof data.date === "string" ? data.date : (data.date as Date)?.toISOString?.()?.split("T")[0] ?? "",
    status: data.status as CreditNote["status"],
    createdBy: data.createdBy as string,
    createdAt: (data.createdAt as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
    approvedBy: data.approvedBy as string | undefined,
    approvedAt: data.approvedAt as string | undefined,
    rejectedBy: data.rejectedBy as string | undefined,
    rejectedAt: data.rejectedAt as string | undefined,
    rejectionReason: data.rejectionReason as string | undefined,
    attachments: Array.isArray(data.attachments) ? (data.attachments as CreditNote["attachments"]) : [],
    items: Array.isArray(data.items)
      ? (data.items as Array<Record<string, unknown>>).map((i) => ({
          id: (i.id as string) ?? "",
          description: (i.description as string) ?? "",
          quantity: Number(i.quantity) ?? 0,
          previousPrice: Number(i.previousPrice) ?? 0,
          currentPrice: Number(i.currentPrice) ?? 0,
          unitPrice: Number(i.unitPrice) ?? 0,
          amount: Number(i.amount) ?? 0,
          daysCharged: i.daysCharged != null ? Number(i.daysCharged) : undefined,
        }))
      : [],
  };
}

type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

interface CreditNotesMainProps {
  initialOpenFromSOA?: { entityId: string; action: SOANavigationAction } | null;
  onConsumedSOANavigation?: () => void;
}

type OrderBy = "latest" | "earliest";

export function CreditNotesMain({ initialOpenFromSOA, onConsumedSOANavigation }: CreditNotesMainProps = {}) {
  const [currentView, setCurrentView] = useState<View>("list");
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderBy, setOrderBy] = useState<OrderBy>("latest");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole] = useState<"Admin" | "Finance" | "Staff" | "Viewer">("Admin");

  const fetchCreditNotes = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), orderBy });
      const res = await fetch(`/api/credit-notes?${params}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCreditNotes(json.data.map((d: Record<string, unknown>) => mapApiToCreditNote(d)));
        setTotal(typeof json.total === "number" ? json.total : json.data.length);
      } else {
        setCreditNotes([]);
        setTotal(0);
      }
    } catch (e) {
      console.error("Failed to fetch credit notes", e);
      toast.error("Failed to load credit notes");
      setCreditNotes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, orderBy]);

  useEffect(() => {
    fetchCreditNotes();
  }, [fetchCreditNotes]);

  // Open entity from SOA navigation
  useEffect(() => {
    if (!initialOpenFromSOA?.entityId || creditNotes.length === 0) return;
    const found = creditNotes.find((n) => n.id === initialOpenFromSOA.entityId);
    if (!found) return;
    setSelectedNoteId(initialOpenFromSOA.entityId);
    setCurrentView("details");
    onConsumedSOANavigation?.();
  }, [creditNotes, initialOpenFromSOA, onConsumedSOANavigation]);

  const selectedNote = selectedNoteId
    ? creditNotes.find((note) => note.id === selectedNoteId)
    : null;

  const handleCreateNew = () => {
    setSelectedNoteId(null);
    setCurrentView("create");
  };

  const handleView = (id: string) => {
    setSelectedNoteId(id);
    setCurrentView("details");
  };

  const handleEdit = (id: string) => {
    setSelectedNoteId(id);
    setCurrentView("edit");
  };

  const handleDelete = (id: string) => {
    const note = creditNotes.find((n) => n.id === id);
    if (note && note.status === "Draft") {
      setCreditNotes(creditNotes.filter((n) => n.id !== id));
      toast.success("Credit note removed from list");
    }
  };

  const handleSave = (creditNote: Partial<CreditNote>) => {
    const full = mapApiToCreditNote(creditNote as Record<string, unknown>);
    setCreditNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === full.id);
      if (idx >= 0) return prev.map((n) => (n.id === full.id ? full : n));
      return [full, ...prev];
    });
    setSelectedNoteId(full.id);
    fetchCreditNotes();
    setCurrentView("list");
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/credit-notes/${id}/approve`, { method: "PUT" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to approve");
        return;
      }
      toast.success("Credit note approved");
      await fetchCreditNotes();
      setCurrentView("list");
      setSelectedNoteId(null);
    } catch (e) {
      toast.error("Failed to approve credit note");
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/credit-notes/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to reject");
        return;
      }
      toast.success("Credit note rejected");
      await fetchCreditNotes();
      setCurrentView("list");
      setSelectedNoteId(null);
    } catch (e) {
      toast.error("Failed to reject credit note");
    }
  };

  const handleBack = () => {
    setCurrentView("list");
    setSelectedNoteId(null);
  };

  if (loading && creditNotes.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[#6B7280]">Loading credit notes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentView === "list" && (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1>Credit Note Management</h1>
              <p className="text-[#374151]">
                Create and manage credit notes for customer refunds and adjustments
              </p>
            </div>
            <Button
              onClick={handleCreateNew}
              className="bg-[#F15929] hover:bg-[#D14620] text-white h-10 px-6 rounded-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Credit Note
            </Button>
          </div>
        </>
      )}

      {currentView === "list" && (
        <CreditNotesList
          creditNotes={creditNotes}
          total={total}
          page={page}
          pageSize={pageSize}
          orderBy={orderBy}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          onOrderByChange={(o) => { setOrderBy(o); setPage(1); }}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {(currentView === "create" || currentView === "edit") && (
        <CreditNoteForm
          onBack={handleBack}
          onSave={handleSave}
          editingNote={currentView === "edit" ? selectedNote ?? null : null}
        />
      )}

      {currentView === "details" && selectedNote && (
        <CreditNoteDetails
          creditNote={selectedNote}
          onBack={handleBack}
          onApprove={handleApprove}
          onReject={handleReject}
          userRole={userRole}
        />
      )}
    </div>
  );
}
