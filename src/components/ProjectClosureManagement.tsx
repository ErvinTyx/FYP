import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FileX,
  Filter,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Package,
  RotateCcw,
  Clock,
  User,
  Building2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "./ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { toast } from "sonner";

type ClosureStatus = "active" | "pending" | "approved";

interface ValidationCheck {
  rentalPeriodMet: boolean;
  returnProcessComplete: boolean;
  noShortageDetected: boolean;
}

interface ClosureRequest {
  id: string; // row key (agreementId)
  agreementId: string;
  closureRequestId?: string;
  closureRequestNumber?: string;
  projectId: string;
  projectName: string;
  customerName: string;
  companyName: string;
  requestDate: string;
  termOfHire?: string;
  rentalStartDate: string;
  minimumRentalPeriodDays: number; // fixed 30
  actualRentalPeriodDays: number | null; // parsed from termOfHire for validation
  returnStatus: "completed" | "pending" | "in-progress";
  returnRequestStatus?: string | null; // ReturnRequest.status (Requested, Quoted, Completed, etc.)
  additionalChargeStatus?: string | null; // AdditionalCharge.status for shortage/payment badge
  monthlyRentalPaymentStatus?: string | null; // MonthlyRentalInvoice summary: Paid | Pending Payment
  depositStatus?: string | null; // Deposit.status: Paid | Pending Payment
  shortageItems: number;
  status: ClosureStatus;
  approvedBy?: string;
  approvedDate?: string;
  validationChecks: ValidationCheck;
}

/** Parse number of days from termOfHire string (e.g. "180 days (...)" or "6 months (...)"). */
function parseDaysFromTermOfHire(termOfHire: string | null | undefined): number | null {
  if (!termOfHire?.trim()) return null;
  const daysMatch = termOfHire.match(/(\d+)\s*days?/i);
  if (daysMatch) return parseInt(daysMatch[1], 10);
  const monthsMatch = termOfHire.match(/(\d+)\s*months?/i);
  if (monthsMatch) return parseInt(monthsMatch[1], 10) * 30;
  return null;
}

// Row from GET /api/project-closure-requests
interface ProjectClosureRow {
  agreement: {
    id: string;
    agreementNumber: string;
    projectName: string;
    hirer: string;
    hirerSignatoryName?: string | null;
    termOfHire?: string | null;
    rentalStartDate?: string | null;
    additionalChargeStatus?: string | null;
    monthlyRentalPaymentStatus?: string | null;
    depositStatus?: string | null;
  };
  closureRequest: {
    id: string;
    closureRequestNumber: string;
    agreementId: string;
    requestDate: string;
    status: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
  } | null;
  returnRequestStatus: string | null; // from ReturnRequest.status (e.g. Requested, Quoted, Completed)
  additionalChargeStatus?: string | null; // from AdditionalCharge.status (pending_payment, pending_approval, approved)
}

const MINIMUM_RENTAL_PERIOD_DAYS = 30;

function rowToClosureRequest(row: ProjectClosureRow): ClosureRequest {
  const { agreement, closureRequest, returnRequestStatus } = row;
  const requestDate = closureRequest
    ? format(new Date(closureRequest.requestDate), "yyyy-MM-dd")
    : "";
  const status = (closureRequest?.status ?? "active") as ClosureStatus;
  const returnProcessComplete = returnRequestStatus === "Completed";
  const actualRentalPeriodDays = parseDaysFromTermOfHire(agreement.termOfHire);
  const rentalPeriodMet = actualRentalPeriodDays !== null && actualRentalPeriodDays >= MINIMUM_RENTAL_PERIOD_DAYS;
  return {
    id: agreement.id,
    agreementId: agreement.id,
    closureRequestId: closureRequest?.id,
    closureRequestNumber: closureRequest?.closureRequestNumber,
    projectId: agreement.agreementNumber,
    projectName: agreement.projectName,
    customerName: agreement.hirerSignatoryName ?? agreement.hirer,
    companyName: agreement.hirer,
    requestDate,
    termOfHire: agreement.termOfHire ?? undefined,
    rentalStartDate: agreement.rentalStartDate ?? "",
    minimumRentalPeriodDays: MINIMUM_RENTAL_PERIOD_DAYS,
    actualRentalPeriodDays,
    returnStatus: returnProcessComplete ? "completed" : "pending",
    returnRequestStatus: returnRequestStatus ?? undefined,
    additionalChargeStatus: agreement.additionalChargeStatus ?? undefined,
    monthlyRentalPaymentStatus: agreement.monthlyRentalPaymentStatus ?? undefined,
    depositStatus: agreement.depositStatus ?? undefined,
    shortageItems: 0,
    status,
    approvedBy: closureRequest?.approvedBy ?? undefined,
    approvedDate: closureRequest?.approvedAt
      ? format(new Date(closureRequest.approvedAt), "yyyy-MM-dd")
      : undefined,
    validationChecks: {
      rentalPeriodMet,
      returnProcessComplete,
      noShortageDetected: true,
    },
  };
}

export function ProjectClosureManagement() {
  const { status: sessionStatus } = useSession();
  const [requests, setRequests] = useState<ClosureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ClosureRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  const fetchClosureList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/project-closure-requests");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || (res.status === 403 ? "You don't have permission to view project closure." : res.status === 401 ? "Please sign in again." : "Failed to load project closure list.");
        toast.error(msg);
        setRequests([]);
        return;
      }
      if (data.success && Array.isArray(data.data)) {
        setRequests((data.data as ProjectClosureRow[]).map(rowToClosureRequest));
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error("Failed to fetch project closure list:", err);
      toast.error("Failed to load project closure list");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch once session is ready to avoid "Failed to fetch" race with NextAuth
  useEffect(() => {
    if (sessionStatus === "loading") {
      setLoading(true);
      return;
    }
    if (sessionStatus !== "authenticated") {
      setLoading(false);
      setRequests([]);
      return;
    }
    fetchClosureList();
  }, [sessionStatus, fetchClosureList]);

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (request: ClosureRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleRequestDateCheck = async (agreementId: string, checked: boolean) => {
    if (!checked) return;
    try {
      const res = await fetch("/api/project-closure-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreementId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchClosureList();
        toast.success("Request date recorded", {
          description: `Closure request ${data.data?.closureRequestNumber ?? ""} created. Status: Pending Review`,
        });
      } else {
        toast.error(data.message || "Failed to create closure request");
      }
    } catch (err) {
      console.error("Failed to create closure request:", err);
      toast.error("Failed to create closure request");
    }
  };

  const handleApproveClick = () => {
    if (selectedRequest) {
      setShowApprovalDialog(true);
    }
  };

  const handleApproveConfirm = async () => {
    if (!selectedRequest?.closureRequestId) {
      toast.error("No closure request to approve");
      return;
    }
    try {
      const res = await fetch(`/api/project-closure-requests/${selectedRequest.closureRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchClosureList();
        toast.success("Project Closure Approved", {
          description: `Request ${selectedRequest.closureRequestNumber ?? selectedRequest.projectId} has been approved successfully.`,
        });
        setShowApprovalDialog(false);
        setShowDetailsDialog(false);
        setSelectedRequest(null);
      } else {
        toast.error(data.message || "Failed to approve closure");
      }
    } catch (err) {
      console.error("Failed to approve closure:", err);
      toast.error("Failed to approve closure");
    }
  };

  const getStatusBadge = (status: ClosureStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-[#6B7280] text-white">Active</Badge>;
      case "pending":
        return <Badge className="bg-[#F59E0B] text-white">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-[#10B981] text-white">Approved</Badge>;
    }
  };

  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-[#10B981] text-white">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-[#3B82F6] text-white">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-[#F59E0B] text-white">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const canApprove = (request: ClosureRequest) => {
    return (
      !!request.closureRequestId &&
      request.status === "pending" &&
      request.validationChecks.rentalPeriodMet &&
      request.validationChecks.returnProcessComplete
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#231F20]">Project Closure Management</h1>
          <p className="text-[#6B7280] mt-1">
            Review and approve customer project closure requests
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Search by project ID, name, customer, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#6B7280]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closure Requests Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Project Details</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead className="text-center">Validation Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">
                    No closure requests found. Signed agreements will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-[#231F20]">{request.customerName}</div>
                        <div className="text-[12px] text-[#6B7280]">{request.companyName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-[#231F20]">{request.projectName}</div>
                        <div className="text-[12px] text-[#6B7280]">
                          {request.termOfHire ?? (request.actualRentalPeriodDays != null ? `Rental: ${request.actualRentalPeriodDays} days` : "—")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={request.requestDate !== ""}
                          onCheckedChange={(checked) => handleRequestDateCheck(request.agreementId, checked as boolean)}
                          disabled={!!request.closureRequestId}
                        />
                        {request.requestDate && (
                          <span className="text-[14px] text-[#6B7280]">
                            {request.requestDate}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex justify-center gap-2">
                          <Tooltip>
                            <TooltipTrigger>
                              {request.validationChecks.rentalPeriodMet ? (
                                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                              ) : (
                                <XCircle className="h-5 w-5 text-[#EF4444]" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Minimum Rental Period</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              {request.validationChecks.returnProcessComplete ? (
                                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                              ) : (
                                <XCircle className="h-5 w-5 text-[#EF4444]" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Return Process Status</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              {request.monthlyRentalPaymentStatus === "Paid" && request.depositStatus === "Paid" ? (
                                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                              ) : request.monthlyRentalPaymentStatus === "Pending Payment" || request.depositStatus === "Pending Payment" ? (
                                <XCircle className="h-5 w-5 text-[#EF4444]" />
                              ) : request.monthlyRentalPaymentStatus === "Pending Approval" || request.depositStatus === "Pending Approval" ? (
                                <AlertCircle className="h-5 w-5 text-[#F59E0B]" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-[#9CA3AF]" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Scaffolding Shortage Detection</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Closure Request Details</DialogTitle>
            <DialogDescription>
              Review the complete information for this closure request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6 py-4">
              {/* Request Information */}
              <div className="space-y-4">
                <h3 className="text-[#231F20]">Request Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6B7280]">Request ID</p>
                    <p className="text-[#231F20]">{selectedRequest.closureRequestNumber ?? "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6B7280]">Request Date</p>
                    <p className="text-[#231F20]">{selectedRequest.requestDate || "Not set"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6B7280]">Status</p>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  {selectedRequest.approvedDate && (
                    <>
                      <div className="space-y-1">
                        <p className="text-[12px] text-[#6B7280]">Approval Date</p>
                        <p className="text-[#231F20]">{selectedRequest.approvedDate}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[12px] text-[#6B7280]">Approved By</p>
                        <p className="text-[#231F20]">{selectedRequest.approvedBy}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Project Information */}
              <div className="space-y-4">
                <h3 className="text-[#231F20] flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Project Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6B7280]">Project ID</p>
                    <p className="text-[#231F20]">{selectedRequest.projectId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6B7280]">Project Name</p>
                    <p className="text-[#231F20]">{selectedRequest.projectName}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-[#231F20] flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6B7280]">Customer Name</p>
                    <p className="text-[#231F20]">{selectedRequest.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-[#6B7280]">Company Name</p>
                    <p className="text-[#231F20]">{selectedRequest.companyName}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Validation Checks */}
              <div className="space-y-4">
                <h3 className="text-[#231F20] flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Validation Checks
                </h3>

                {/* Rental Period Check */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {selectedRequest.validationChecks.rentalPeriodMet ? (
                      <CheckCircle2 className="h-5 w-5 text-[#10B981] mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-[#EF4444] mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#6B7280]" />
                        <p className="text-[#231F20]">Minimum Rental Period</p>
                      </div>
                      <p className="text-[14px] text-[#6B7280]">
                        Rental Start Date:{" "}
                        {selectedRequest.rentalStartDate
                          ? new Date(selectedRequest.rentalStartDate).toLocaleDateString("en-MY")
                          : "—"}
                      </p>
                      <p className="text-[14px] text-[#6B7280]">
                        Actual Rental Period: {selectedRequest.termOfHire ?? "—"}
                      </p>
                      <p className="text-[14px] text-[#6B7280]">
                        Minimum Required: {selectedRequest.minimumRentalPeriodDays} days
                      </p>
                      {selectedRequest.validationChecks.rentalPeriodMet ? (
                        <Badge className="bg-[#10B981] text-white mt-2">
                          Requirement Met
                        </Badge>
                      ) : (
                        <Badge className="bg-[#EF4444] text-white mt-2">
                          Requirement Not Met
                          {selectedRequest.actualRentalPeriodDays != null
                            ? ` - ${selectedRequest.minimumRentalPeriodDays - selectedRequest.actualRentalPeriodDays} days remaining`
                            : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Return Process Check */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {selectedRequest.validationChecks.returnProcessComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-[#10B981] mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-[#F59E0B] mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-[#6B7280]" />
                        <p className="text-[#231F20]">Return Process Status</p>
                      </div>
                      {selectedRequest.returnRequestStatus === "Completed" ? (
                        <>
                          <p className="text-[14px] text-[#10B981] font-medium">
                            Current Status: Completed
                          </p>
                          <Badge className="bg-[#10B981] text-white mt-2">
                            Return Process Completed
                          </Badge>
                        </>
                      ) : (
                        <>
                          <p className="text-[14px] text-[#F59E0B] font-medium">
                            Current Status: Pending
                          </p>
                          <Badge className="bg-[#F59E0B] text-white mt-2">
                            Return Process Pending
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shortage Detection Check */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-[#6B7280] mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[#231F20]">Scaffolding Shortage Detection</p>
                      </div>
                      {/* Monthly Rental Invoice status */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedRequest.monthlyRentalPaymentStatus === "Paid" && (
                          <Badge className="bg-[#10B981] text-white">
                            Monthly Rental Payment Completed
                          </Badge>
                        )}
                        {selectedRequest.monthlyRentalPaymentStatus === "Pending Approval" && (
                          <Badge className="bg-[#F59E0B] text-white">
                            Pending Monthly Rental Approval
                          </Badge>
                        )}
                        {selectedRequest.monthlyRentalPaymentStatus === "Pending Payment" && (
                          <Badge className="bg-[#EF4444] text-white">
                            Pending Monthly Rental Payment
                          </Badge>
                        )}
                      </div>
                      {/* Deposit status (below monthly rental) */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedRequest.depositStatus === "Paid" && (
                          <Badge className="bg-[#10B981] text-white">
                            Deposit Payment Completed
                          </Badge>
                        )}
                        {selectedRequest.depositStatus === "Pending Approval" && (
                          <Badge className="bg-[#F59E0B] text-white">
                            Pending Deposit Payment Approval
                          </Badge>
                        )}
                        {selectedRequest.depositStatus === "Pending Payment" && (
                          <Badge className="bg-[#EF4444] text-white">
                            Pending Deposit Payment
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Validation Status: Approved (green) when status is approved; else Ready for Approval or Cannot Approve */}
              <div className="bg-[#F3F4F6] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#231F20]">Overall Validation Status</span>
                  {selectedRequest.status === "approved" ? (
                    <Badge className="bg-[#10B981] text-white">
                      Approved
                    </Badge>
                  ) : canApprove(selectedRequest) ? (
                    <Badge className="bg-[#10B981] text-white">
                      All Requirements Met - Ready for Approval
                    </Badge>
                  ) : (
                    <Badge className="bg-[#EF4444] text-white">
                      Requirements Not Met - Cannot Approve
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {/* Approve Closure only when all three validations are green; otherwise only Close */}
            {selectedRequest?.status === "pending" && canApprove(selectedRequest) ? (
              <Button
                className="bg-[#10B981] hover:bg-[#059669] text-white"
                onClick={handleApproveClick}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Closure
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Project Closure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this project closure request?
              <br />
              <br />
              <span className="text-[#231F20]">Project: {selectedRequest?.projectName}</span>
              <br />
              <span className="text-[#231F20]">Request ID: {selectedRequest?.closureRequestNumber ?? "—"}</span>
              <br />
              <br />
              The approval date and time will be automatically recorded in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              className="bg-[#10B981] hover:bg-[#059669] text-white"
            >
              Confirm Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
