import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, FileText, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import type { Refund, RefundStatus } from "../../types/refund";
import type { RelatedCreditNote } from "../../types/refund";

interface RefundDetailsData extends Refund {
  relatedCreditNotes?: RelatedCreditNote[];
}

interface RefundDetailsProps {
  refundId: string;
  userRole: "Admin" | "Finance" | "Staff" | "Customer" | "super_user";
  onBack: () => void;
  onRefetchList: () => void;
}

export function RefundDetails({
  refundId,
  userRole,
  onBack,
  onRefetchList,
}: RefundDetailsProps) {
  const [refund, setRefund] = useState<RefundDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actioning, setActioning] = useState(false);

  const fetchRefund = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/refunds/${refundId}?includeCreditNotes=true`);
      const json = await res.json();
      if (json.success && json.data) {
        setRefund(json.data);
      } else {
        setRefund(null);
      }
    } catch {
      setRefund(null);
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    fetchRefund();
  }, [fetchRefund]);

  const approvalRoles = ["admin", "finance", "super_user"];
  const canApprove =
    approvalRoles.includes(String(userRole).toLowerCase()) && refund?.status === "Pending Approval";

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case "Draft":
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">Draft</Badge>;
      case "Pending Approval":
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Pending Approval</Badge>;
      case "Approved":
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Approved</Badge>;
      case "Rejected":
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Rejected</Badge>;
    }
  };

  const handleApprove = async () => {
    setActioning(true);
    try {
      const res = await fetch(`/api/refunds/${refundId}/approve`, { method: "PUT" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to approve");
        return;
      }
      toast.success("Refund approved successfully");
      setShowApproveDialog(false);
      await fetchRefund();
      onRefetchList();
    } catch {
      toast.error("Failed to approve");
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActioning(true);
    try {
      const res = await fetch(`/api/refunds/${refundId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to reject");
        return;
      }
      toast.success("Refund rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      await fetchRefund();
      onRefetchList();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-[#6B7280]">
        Loading refund details...
      </div>
    );
  }

  if (!refund) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-[#F3F4F6]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="text-[#6B7280]">Refund not found.</p>
      </div>
    );
  }

  const invoiceTypeLabel =
    refund.invoiceType === "deposit"
      ? "Deposit"
      : refund.invoiceType === "monthlyRental"
        ? "Monthly Rental"
        : refund.invoiceType === "additionalCharge"
          ? "Additional Charge"
          : refund.invoiceType;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-[#F3F4F6]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1>{refund.refundNumber}</h1>
            <p className="text-[#374151]">Refund request details and approval workflow</p>
          </div>
        </div>
        {getStatusBadge(refund.status)}
      </div>

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Refund Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[14px] text-[#6B7280]">Refund ID</p>
              <p className="text-[#111827]">{refund.refundNumber}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Created Date</p>
              <p className="text-[#111827]">{refund.createdAt.split("T")[0]}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Refund Amount</p>
              <p className="text-[#111827] font-medium">
                RM{refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Refund Method</p>
              <p className="text-[#111827]">{refund.refundMethod || "Not specified"}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Invoice No</p>
              <p className="text-[#111827]">{refund.originalInvoice}</p>
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Invoice Type</p>
              <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                {invoiceTypeLabel}
              </Badge>
            </div>
            <div className="col-span-2">
              <p className="text-[14px] text-[#6B7280]">Reason for Refund</p>
              <p className="text-[#111827] mt-1">{refund.reason || "—"}</p>
              {refund.reasonDescription && (
                <p className="text-[#6B7280] text-sm mt-1">{refund.reasonDescription}</p>
              )}
            </div>
            <div className="col-span-2">
              <p className="text-[14px] text-[#6B7280]">Customer</p>
              <p className="text-[#111827]">{refund.customerName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[14px] text-[#6B7280]">Original Invoice</span>
            <span className="text-[14px] text-[#111827]">{refund.originalInvoice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[14px] text-[#6B7280]">Customer</span>
            <span className="text-[14px] text-[#111827]">{refund.customerName}</span>
          </div>
          <div className="border-t border-[#E5E7EB] pt-3 flex justify-between">
            <span className="text-[#111827]">Refund Amount</span>
            <span className="text-[#059669]">
              RM{refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {refund.relatedCreditNotes && refund.relatedCreditNotes.length > 0 && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Related Approved Credit Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB]">
                  <TableHead>Credit Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refund.relatedCreditNotes.map((cn) => (
                  <TableRow key={cn.id}>
                    <TableCell className="text-[#111827]">{cn.creditNoteNumber}</TableCell>
                    <TableCell className="text-right">
                      RM{cn.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{cn.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Reason for Refund</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#374151]">{refund.reason || "No reason provided"}</p>
          {refund.reasonDescription && (
            <p className="text-[#6B7280] text-sm mt-2">{refund.reasonDescription}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Supporting Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {refund.attachments && refund.attachments.length > 0 ? (
            <div className="space-y-3">
              {refund.attachments.map((att) => {
                const viewUrl =
                  att.fileUrl.startsWith("http") || att.fileUrl.startsWith("//")
                    ? att.fileUrl
                    : att.fileUrl.startsWith("/uploads/")
                      ? `/api/uploads/${att.fileUrl.slice("/uploads/".length)}`
                      : att.fileUrl;
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-[#6B7280] shrink-0" />
                      <span className="text-[14px] text-[#374151] truncate" title={att.fileName}>
                        {att.fileName}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      asChild
                    >
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[#6B7280] text-sm">No documents uploaded</p>
          )}
        </CardContent>
      </Card>

      {refund.status === "Rejected" && (refund.rejectionReason || refund.rejectedBy) && (
        <Card className="border-[#DC2626] bg-[#FEE2E2]">
          <CardHeader>
            <CardTitle className="text-[18px] text-[#DC2626]">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {refund.rejectionReason && (
              <p className="text-[#991B1B]">{refund.rejectionReason}</p>
            )}
            {refund.rejectedBy && (
              <p className="text-[12px] text-[#991B1B]">
                Rejected by {refund.rejectedBy}
                {refund.rejectedAt && ` on ${refund.rejectedAt.split("T")[0]}`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {refund.status === "Approved" && (refund.approvedBy || refund.approvedAt) && (
        <Card className="border-[#059669] bg-[#D1FAE5]">
          <CardHeader>
            <CardTitle className="text-[18px] text-[#059669]">Approval Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {refund.approvedBy && (
              <div className="flex justify-between">
                <span className="text-[14px] text-[#065F46]">Approved By</span>
                <span className="text-[14px] text-[#065F46]">{refund.approvedBy}</span>
              </div>
            )}
            {refund.approvedAt && (
              <div className="flex justify-between">
                <span className="text-[14px] text-[#065F46]">Approved Date</span>
                <span className="text-[14px] text-[#065F46]">{refund.approvedAt.split("T")[0]}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canApprove && (
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Approval Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-[#059669] hover:bg-[#047857] h-10"
                onClick={() => setShowApproveDialog(true)}
                disabled={actioning}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Refund
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C]"
                onClick={() => setShowRejectDialog(true)}
                disabled={actioning}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Refund
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this refund of RM
              {refund.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              for {refund.customerName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-[#059669] hover:bg-[#047857]"
              disabled={actioning}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this refund request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2 min-h-[100px]"
              placeholder="Explain why this refund is being rejected..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              disabled={actioning || !rejectionReason.trim()}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
