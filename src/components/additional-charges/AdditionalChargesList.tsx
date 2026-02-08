import { useState, useEffect, useCallback } from "react";
import { Search, Eye, Upload, CheckCircle, XCircle, MoreVertical } from "lucide-react";
import { formatRfqDate } from "../../lib/rfqDate";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { AdditionalChargeStatusBadge } from "./AdditionalChargeStatusBadge";
import { UploadPopModal } from "./UploadPopModal";
import { ApproveModal } from "./ApproveModal";
import { RejectModal } from "./RejectModal";
import { AdditionalCharge } from "../../types/additionalCharge";
import { toast } from "sonner";

const PAGE_SIZES = [5, 10, 25, 50] as const;
type OrderBy = "latest" | "earliest";

const API_STATUS_TO_DISPLAY: Record<string, AdditionalCharge["status"]> = {
  pending_payment: "Pending Payment",
  pending_approval: "Pending Approval",
  paid: "Paid",
  rejected: "Rejected",
};

function mapApiChargeToDisplay(api: {
  id: string;
  invoiceNo: string;
  doId: string;
  customerName: string;
  returnedDate?: string | null;
  dueDate: string;
  status: string;
  totalCharges: number;
  proofOfPaymentUrl?: string | null;
  referenceId?: string | null;
  rejectionReason?: string | null;
  approvalDate?: string | null;
  rejectionDate?: string | null;
  uploadedByEmail?: string | null;
  items: Array<{ id: string; itemName: string; itemType: string; repairDescription?: string | null; quantity: number; unitPrice: number; amount: number }>;
}): AdditionalCharge {
  return {
    id: api.id,
    invoiceNo: api.invoiceNo,
    doId: api.doId,
    customerName: api.customerName,
    returnedDate: api.returnedDate ?? undefined,
    totalCharges: api.totalCharges,
    status: API_STATUS_TO_DISPLAY[api.status] ?? ("Pending Payment" as AdditionalCharge["status"]),
    dueDate: api.dueDate,
    lastUpdated: api.approvalDate ?? api.rejectionDate ?? api.dueDate,
    items: api.items.map((i) => ({
      id: i.id,
      itemName: i.itemName,
      itemType: i.itemType,
      repairDescription: i.repairDescription ?? undefined,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: i.amount,
    })),
    proofOfPayment: api.proofOfPaymentUrl ?? undefined,
    proofOfPaymentUrl: api.proofOfPaymentUrl ?? undefined,
    referenceId: api.referenceId ?? undefined,
    rejectionReason: api.rejectionReason ?? undefined,
    approvalDate: api.approvalDate ?? undefined,
    rejectionDate: api.rejectionDate ?? undefined,
    uploadedByEmail: api.uploadedByEmail ?? undefined,
  };
}

interface AdditionalChargesListProps {
  onViewDetails: (charge: AdditionalCharge) => void;
}

export function AdditionalChargesList({ onViewDetails }: AdditionalChargesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [charges, setCharges] = useState<AdditionalCharge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderBy, setOrderBy] = useState<OrderBy>("latest");
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<AdditionalCharge | null>(null);

  const fetchCharges = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), orderBy });
      const res = await fetch(`/api/additional-charges?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setCharges(result.data.map(mapApiChargeToDisplay));
        setTotal(typeof result.total === "number" ? result.total : result.data.length);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load additional charges");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, orderBy]);

  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  const filteredCharges = charges.filter((charge) => {
    const matchesSearch =
      charge.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.doId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.id.toLowerCase().includes(searchTerm.toLowerCase());

    const isOverdue =
      new Date(charge.dueDate) < new Date() &&
      (charge.status === "Pending Payment" || charge.status === "Pending Approval");

    const matchesStatus =
      statusFilter === "all" ||
      charge.status === statusFilter ||
      (statusFilter === "Overdue" && isOverdue);

    return matchesSearch && matchesStatus;
  });

  const handleUploadPop = (chargeId: string) => {
    const charge = charges.find((c) => c.id === chargeId);
    if (charge) {
      setSelectedCharge(charge);
      setUploadModalOpen(true);
    }
  };

  const handlePopUploaded = async (chargeId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/additional-charges/${chargeId}/upload-proof`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }
      const result = await res.json();
      if (result.success && result.data) {
        setCharges((prev) =>
          prev.map((c) => (c.id === chargeId ? mapApiChargeToDisplay(result.data) : c))
        );
        toast.success("Proof of payment uploaded successfully");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadModalOpen(false);
      setSelectedCharge(null);
    }
  };

  const handleApprove = (chargeId: string) => {
    const charge = charges.find((c) => c.id === chargeId);
    if (charge) {
      setSelectedCharge(charge);
      setApproveModalOpen(true);
    }
  };

  const handleApproveConfirmed = async (referenceId: string) => {
    if (!selectedCharge) return;
    try {
      const res = await fetch(`/api/additional-charges/${selectedCharge.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ referenceId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Approve failed");
      }
      const result = await res.json();
      if (result.success && result.data) {
        setCharges((prev) =>
          prev.map((c) =>
            c.id === selectedCharge.id ? mapApiChargeToDisplay(result.data) : c
          )
        );
        toast.success("Payment marked as paid successfully");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproveModalOpen(false);
      setSelectedCharge(null);
    }
  };

  const handleReject = (chargeId: string) => {
    const charge = charges.find((c) => c.id === chargeId);
    if (charge) {
      setSelectedCharge(charge);
      setRejectModalOpen(true);
    }
  };

  const handleRejectConfirmed = async (reason: string) => {
    if (!selectedCharge) return;
    try {
      const res = await fetch(`/api/additional-charges/${selectedCharge.id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Reject failed");
      }
      const result = await res.json();
      if (result.success && result.data) {
        setCharges((prev) =>
          prev.map((c) =>
            c.id === selectedCharge.id ? mapApiChargeToDisplay(result.data) : c
          )
        );
        toast.error("Payment rejected");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setRejectModalOpen(false);
      setSelectedCharge(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Additional Charges</h1>
        <p className="text-[#374151]">
          Manage additional charges for damaged, missing, or items requiring cleaning/repair
        </p>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] h-4 w-4" />
              <Input
                placeholder="Search by Invoice, DO, Customer, or Charge ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-[#D1D5DB] rounded-md"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-10 border-[#D1D5DB] rounded-md">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending Payment">Pending Payment</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[18px]">
            Additional Charges List ({total > 0 ? total : filteredCharges.length})
          </CardTitle>
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <span>Order:</span>
            <Select value={orderBy} onValueChange={(v) => { setOrderBy(v as OrderBy); setPage(1); }}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest first</SelectItem>
                <SelectItem value="earliest">Earliest first</SelectItem>
              </SelectContent>
            </Select>
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v) as 5 | 10 | 25 | 50); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-[#6B7280]">Loading...</div>
          ) : (
            <div className="rounded-md border border-[#E5E7EB]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <TableHead className="text-[#374151]">Invoice No.</TableHead>
                    <TableHead className="text-[#374151]">DO ID</TableHead>
                    <TableHead className="text-[#374151]">Customer Name</TableHead>
                    <TableHead className="text-[#374151]">Total Charges</TableHead>
                    <TableHead className="text-[#374151]">Status</TableHead>
                    <TableHead className="text-[#374151]">Due Date</TableHead>
                    <TableHead className="text-[#374151] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCharges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#9CA3AF]">
                        No additional charges found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCharges.map((charge) => {
                      const isOverdue =
                        new Date(charge.dueDate) < new Date() &&
                        (charge.status === "Pending Payment" ||
                          charge.status === "Pending Approval");

                      return (
                        <TableRow key={charge.id} className="hover:bg-[#F9FAFB]">
                          <TableCell className="text-[#231F20]">{charge.invoiceNo}</TableCell>
                          <TableCell className="text-[#231F20]">{charge.doId}</TableCell>
                          <TableCell className="text-[#374151]">{charge.customerName}</TableCell>
                          <TableCell className="text-[#231F20]">
                            RM{charge.totalCharges.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <AdditionalChargeStatusBadge
                              status={charge.status}
                              isOverdue={isOverdue}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-[#374151]">
                                {formatRfqDate(charge.dueDate)}
                              </span>
                              {isOverdue && (
                                <span className="text-xs text-[#DC2626]">Overdue</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 hover:bg-[#F3F4F6]"
                                >
                                  <MoreVertical className="h-4 w-4 text-[#6B7280]" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => onViewDetails(charge)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {charge.status === "Pending Payment" && (
                                  <DropdownMenuItem onClick={() => handleUploadPop(charge.id)}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload POP
                                  </DropdownMenuItem>
                                )}
                                {charge.status === "Pending Approval" && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleApprove(charge.id)}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-[#10B981]" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReject(charge.id)}>
                                      <XCircle className="mr-2 h-4 w-4 text-[#DC2626]" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {charge.status === "Rejected" && (
                                  <DropdownMenuItem onClick={() => handleUploadPop(charge.id)}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Re-upload POP
                                  </DropdownMenuItem>
                                )}
                                {isOverdue && charge.status === "Pending Approval" && (
                                  <DropdownMenuItem onClick={() => handleUploadPop(charge.id)}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload POP
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {total > 0 && (() => {
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            if (totalPages <= 1) return null;
            return (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                      className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                      aria-disabled={page <= 1}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-2 text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                      aria-disabled={page >= totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            );
          })()}
        </CardContent>
      </Card>

      {selectedCharge && (
        <>
          <UploadPopModal
            isOpen={uploadModalOpen}
            onClose={() => {
              setUploadModalOpen(false);
              setSelectedCharge(null);
            }}
            onUpload={(file) => handlePopUploaded(selectedCharge.id, file)}
            chargeId={selectedCharge.id}
          />
          <ApproveModal
            isOpen={approveModalOpen}
            onClose={() => {
              setApproveModalOpen(false);
              setSelectedCharge(null);
            }}
            onApprove={handleApproveConfirmed}
            chargeId={selectedCharge.id}
          />
          <RejectModal
            isOpen={rejectModalOpen}
            onClose={() => {
              setRejectModalOpen(false);
              setSelectedCharge(null);
            }}
            onReject={handleRejectConfirmed}
            chargeId={selectedCharge.id}
          />
        </>
      )}
    </div>
  );
}
