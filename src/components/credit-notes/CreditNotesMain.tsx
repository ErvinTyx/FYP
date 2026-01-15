import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { CreditNotesList } from "./CreditNotesList";
import { CreditNoteForm } from "./CreditNoteForm";
import { CreditNoteDetails } from "./CreditNoteDetails";
import { CreditNote } from "../../types/creditNote";
import { toast } from "sonner@2.0.3";

type View = "list" | "create" | "edit" | "details";

// Mock data - in a real app, this would come from an API
const initialCreditNotes: CreditNote[] = [
  {
    id: "1",
    creditNoteNumber: "CN-2024-001",
    customer: "Acme Construction Ltd.",
    customerId: "CUST-001",
    originalInvoice: "INV-2024-045",
    amount: 750,
    reason: "Returned Items",
    reasonDescription: "Customer returned 5 units of steel bars due to excess inventory",
    date: "2024-11-03",
    status: "Approved",
    createdBy: "John Smith",
    createdAt: "2024-11-03T09:00:00Z",
    updatedAt: "2024-11-03T14:30:00Z",
    approvedBy: "Jane Doe (Finance Manager)",
    approvedAt: "2024-11-03T14:30:00Z",
    attachments: [
      {
        id: "att-1",
        fileName: "return_receipt.pdf",
        fileUrl: "#",
        fileSize: 245600,
        uploadedAt: "2024-11-03T09:00:00Z",
      },
    ],
    items: [
      {
        id: "item-1",
        description: "Steel Bar - 12mm x 6m",
        quantity: 5,
        unitPrice: 150,
        amount: 750,
      },
    ],
  },
  {
    id: "2",
    creditNoteNumber: "CN-2024-002",
    customer: "BuildRight Inc.",
    customerId: "CUST-002",
    originalInvoice: "INV-2024-043",
    amount: 1200,
    reason: "Price Adjustment",
    reasonDescription: "Volume discount applied retroactively for bulk order",
    date: "2024-11-02",
    status: "Pending Approval",
    createdBy: "Sarah Johnson",
    createdAt: "2024-11-02T10:15:00Z",
    updatedAt: "2024-11-02T10:15:00Z",
    attachments: [],
    items: [
      {
        id: "item-1",
        description: "Price adjustment for scaffolding rental",
        quantity: 1,
        unitPrice: 1200,
        amount: 1200,
      },
    ],
  },
  {
    id: "3",
    creditNoteNumber: "CN-2024-003",
    customer: "Metro Builders",
    customerId: "CUST-003",
    originalInvoice: "INV-2024-038",
    amount: 450,
    reason: "Service Issue",
    reasonDescription: "Late delivery compensation",
    date: "2024-10-30",
    status: "Approved",
    createdBy: "Mike Chen",
    createdAt: "2024-10-30T11:20:00Z",
    updatedAt: "2024-10-30T16:45:00Z",
    approvedBy: "Robert Lee (Admin)",
    approvedAt: "2024-10-30T16:45:00Z",
    attachments: [],
    items: [
      {
        id: "item-1",
        description: "Service credit for late delivery",
        quantity: 1,
        unitPrice: 450,
        amount: 450,
      },
    ],
  },
  {
    id: "4",
    creditNoteNumber: "CN-2024-004",
    customer: "Premium Projects",
    customerId: "CUST-004",
    originalInvoice: "INV-2024-047",
    amount: 2100,
    reason: "Returned Items",
    date: "2024-11-01",
    status: "Draft",
    createdBy: "Emily Wong",
    createdAt: "2024-11-01T08:30:00Z",
    updatedAt: "2024-11-01T08:30:00Z",
    attachments: [],
    items: [
      {
        id: "item-1",
        description: "Scaffolding Tubes - 6m",
        quantity: 10,
        unitPrice: 180,
        amount: 1800,
      },
      {
        id: "item-2",
        description: "Couplers - Standard",
        quantity: 20,
        unitPrice: 15,
        amount: 300,
      },
    ],
  },
  {
    id: "5",
    creditNoteNumber: "CN-2024-005",
    customer: "Steel Masters Co.",
    customerId: "CUST-005",
    originalInvoice: "INV-2024-049",
    amount: 850,
    reason: "Damaged Goods",
    reasonDescription: "3 units received with minor rust damage",
    date: "2024-11-05",
    status: "Rejected",
    createdBy: "Tom Williams",
    createdAt: "2024-11-05T13:00:00Z",
    updatedAt: "2024-11-05T15:20:00Z",
    rejectedBy: "Jane Doe (Finance Manager)",
    rejectedAt: "2024-11-05T15:20:00Z",
    rejectionReason: "Insufficient documentation. Please provide photos of the damaged goods and inspection report before resubmitting.",
    attachments: [],
    items: [
      {
        id: "item-1",
        description: "Steel Plates - 10mm",
        quantity: 3,
        unitPrice: 283.33,
        amount: 850,
      },
    ],
  },
];

export function CreditNotesMain() {
  const [currentView, setCurrentView] = useState<View>("list");
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(initialCreditNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [userRole] = useState<"Admin" | "Finance" | "Staff" | "Viewer">("Admin");

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("creditNotes");
    if (stored) {
      try {
        setCreditNotes(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load credit notes from storage");
      }
    }
  }, []);

  // Save to localStorage when creditNotes change
  useEffect(() => {
    localStorage.setItem("creditNotes", JSON.stringify(creditNotes));
  }, [creditNotes]);

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
      toast.success("Credit note deleted successfully");
    }
  };

  const handleSave = (creditNote: Partial<CreditNote>, isDraft: boolean) => {
    const now = new Date().toISOString();

    if (creditNote.id) {
      // Update existing
      setCreditNotes(
        creditNotes.map((note) =>
          note.id === creditNote.id
            ? {
                ...note,
                ...creditNote,
                updatedAt: now,
              }
            : note
        )
      );
      toast.success(
        isDraft ? "Draft saved successfully" : "Credit note submitted for approval"
      );
    } else {
      // Create new
      const newNote: CreditNote = {
        id: Date.now().toString(),
        creditNoteNumber: `CN-2024-${String(creditNotes.length + 1).padStart(3, "0")}`,
        customer: creditNote.customer || "",
        customerId: creditNote.customerId || "",
        originalInvoice: creditNote.originalInvoice || "",
        amount: creditNote.amount || 0,
        reason: creditNote.reason || "Other",
        reasonDescription: creditNote.reasonDescription,
        date: creditNote.date || new Date().toISOString().split("T")[0],
        status: creditNote.status || "Draft",
        createdBy: "Current User",
        createdAt: now,
        updatedAt: now,
        attachments: [],
        items: creditNote.items || [],
      };
      setCreditNotes([newNote, ...creditNotes]);
      toast.success(
        isDraft ? "Draft created successfully" : "Credit note submitted for approval"
      );
    }

    setCurrentView("list");
  };

  const handleApprove = (id: string) => {
    const now = new Date().toISOString();
    setCreditNotes(
      creditNotes.map((note) =>
        note.id === id
          ? {
              ...note,
              status: "Approved",
              approvedBy: "Current User (Admin)",
              approvedAt: now,
              updatedAt: now,
            }
          : note
      )
    );
    toast.success("Credit note approved successfully");
    setCurrentView("list");
  };

  const handleReject = (id: string, reason: string) => {
    const now = new Date().toISOString();
    setCreditNotes(
      creditNotes.map((note) =>
        note.id === id
          ? {
              ...note,
              status: "Rejected",
              rejectedBy: "Current User (Admin)",
              rejectedAt: now,
              rejectionReason: reason,
              updatedAt: now,
            }
          : note
      )
    );
    toast.error("Credit note rejected");
    setCurrentView("list");
  };

  const handleBack = () => {
    setCurrentView("list");
    setSelectedNoteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header - only show on list view */}
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

      {/* Content */}
      {currentView === "list" && (
        <CreditNotesList
          creditNotes={creditNotes}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {(currentView === "create" || currentView === "edit") && (
        <CreditNoteForm
          onBack={handleBack}
          onSave={handleSave}
          editingNote={currentView === "edit" ? selectedNote : null}
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
