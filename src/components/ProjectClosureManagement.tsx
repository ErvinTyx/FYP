import { useState } from "react";
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
  id: string;
  projectId: string;
  projectName: string;
  customerName: string;
  companyName: string;
  requestDate: string;
  rentalStartDate: string;
  minimumRentalPeriod: number; // in months
  actualRentalPeriod: number; // in months
  returnStatus: "completed" | "pending" | "in-progress";
  shortageItems: number;
  status: ClosureStatus;
  approvedBy?: string;
  approvedDate?: string;
  validationChecks: ValidationCheck;
}

// Mock data
const mockClosureRequests: ClosureRequest[] = [
  {
    id: "CR-001",
    projectId: "PRJ-2024-001",
    projectName: "Tower Construction Site A",
    customerName: "John Tan",
    companyName: "ABC Construction Sdn Bhd",
    requestDate: "",
    rentalStartDate: "2024-06-01",
    minimumRentalPeriod: 6,
    actualRentalPeriod: 6,
    returnStatus: "completed",
    shortageItems: 0,
    status: "active",
    validationChecks: {
      rentalPeriodMet: true,
      returnProcessComplete: true,
      noShortageDetected: true,
    },
  },
  {
    id: "CR-002",
    projectId: "PRJ-2024-002",
    projectName: "High-Rise Building Development",
    customerName: "Sarah Lim",
    companyName: "XYZ Builders Sdn Bhd",
    requestDate: "2024-11-28",
    rentalStartDate: "2024-08-15",
    minimumRentalPeriod: 6,
    actualRentalPeriod: 3.5,
    returnStatus: "pending",
    shortageItems: 5,
    status: "pending",
    validationChecks: {
      rentalPeriodMet: false,
      returnProcessComplete: false,
      noShortageDetected: false,
    },
  },
  {
    id: "CR-003",
    projectId: "PRJ-2024-003",
    projectName: "Residential Complex Phase 2",
    customerName: "Michael Wong",
    companyName: "Prime Development Ltd",
    requestDate: "2024-11-25",
    rentalStartDate: "2024-01-10",
    minimumRentalPeriod: 6,
    actualRentalPeriod: 10.7,
    returnStatus: "completed",
    shortageItems: 0,
    status: "approved",
    approvedBy: "Admin User",
    approvedDate: "2024-11-26",
    validationChecks: {
      rentalPeriodMet: true,
      returnProcessComplete: true,
      noShortageDetected: true,
    },
  },
  {
    id: "CR-004",
    projectId: "PRJ-2024-004",
    projectName: "Commercial Plaza",
    customerName: "David Lee",
    companyName: "Mega Build Sdn Bhd",
    requestDate: "",
    rentalStartDate: "2024-05-20",
    minimumRentalPeriod: 6,
    actualRentalPeriod: 6.3,
    returnStatus: "completed",
    shortageItems: 2,
    status: "active",
    validationChecks: {
      rentalPeriodMet: true,
      returnProcessComplete: true,
      noShortageDetected: false,
    },
  },
  {
    id: "CR-005",
    projectId: "PRJ-2024-005",
    projectName: "Bridge Maintenance Project",
    customerName: "Emily Ng",
    companyName: "Infrastructure Solutions Sdn Bhd",
    requestDate: "",
    rentalStartDate: "2024-07-01",
    minimumRentalPeriod: 6,
    actualRentalPeriod: 5,
    returnStatus: "in-progress",
    shortageItems: 0,
    status: "active",
    validationChecks: {
      rentalPeriodMet: false,
      returnProcessComplete: false,
      noShortageDetected: true,
    },
  },
];

export function ProjectClosureManagement() {
  const [requests, setRequests] = useState<ClosureRequest[]>(mockClosureRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ClosureRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

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

  const handleRequestDateCheck = (requestId: string, checked: boolean) => {
    if (checked) {
      const currentDate = new Date().toISOString().split('T')[0]; // Get only date part
      setRequests(
        requests.map((req) =>
          req.id === requestId && req.status === "active"
            ? {
                ...req,
                requestDate: currentDate,
                status: "pending" as ClosureStatus,
              }
            : req
        )
      );
      toast.success("Request date recorded", {
        description: "Status changed to Pending Review",
      });
    }
  };

  const handleApproveClick = () => {
    if (selectedRequest) {
      setShowApprovalDialog(true);
    }
  };

  const handleApproveConfirm = () => {
    if (selectedRequest) {
      const approvalDate = new Date().toISOString().split('T')[0];
      
      setRequests(
        requests.map((req) =>
          req.id === selectedRequest.id
            ? {
                ...req,
                status: "approved" as ClosureStatus,
                approvedBy: "Admin User",
                approvedDate: approvalDate,
              }
            : req
        )
      );

      toast.success("Project Closure Approved", {
        description: `Project ${selectedRequest.projectId} closure has been approved successfully.`,
      });

      setShowApprovalDialog(false);
      setShowDetailsDialog(false);
      setSelectedRequest(null);
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
      request.status === "pending" &&
      request.validationChecks.rentalPeriodMet &&
      request.validationChecks.returnProcessComplete &&
      request.validationChecks.noShortageDetected
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
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">
                    No closure requests found
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
                          Rental: {request.actualRentalPeriod} / {request.minimumRentalPeriod} months
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={request.requestDate !== ""}
                          onCheckedChange={(checked) => handleRequestDateCheck(request.id, checked as boolean)}
                          disabled={request.status !== "active"}
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
                              {request.validationChecks.noShortageDetected ? (
                                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-[#F59E0B]" />
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
                    <p className="text-[#231F20]">{selectedRequest.id}</p>
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
                        Rental Start Date: {new Date(selectedRequest.rentalStartDate).toLocaleDateString("en-MY")}
                      </p>
                      <p className="text-[14px] text-[#6B7280]">
                        Actual Rental Period: {selectedRequest.actualRentalPeriod} months
                      </p>
                      <p className="text-[14px] text-[#6B7280]">
                        Minimum Required: {selectedRequest.minimumRentalPeriod} months
                      </p>
                      {selectedRequest.validationChecks.rentalPeriodMet ? (
                        <Badge className="bg-[#10B981] text-white mt-2">
                          Requirement Met
                        </Badge>
                      ) : (
                        <Badge className="bg-[#EF4444] text-white mt-2">
                          Requirement Not Met - {(selectedRequest.minimumRentalPeriod - selectedRequest.actualRentalPeriod).toFixed(1)} months remaining
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
                      <XCircle className="h-5 w-5 text-[#EF4444] mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-[#6B7280]" />
                        <p className="text-[#231F20]">Return Process Status</p>
                      </div>
                      <p className="text-[14px] text-[#6B7280]">
                        Current Status: {getReturnStatusBadge(selectedRequest.returnStatus)}
                      </p>
                      {selectedRequest.validationChecks.returnProcessComplete ? (
                        <Badge className="bg-[#10B981] text-white mt-2">
                          Return Process Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-[#EF4444] text-white mt-2">
                          Return Process Not Complete
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shortage Detection Check */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {selectedRequest.validationChecks.noShortageDetected ? (
                      <CheckCircle2 className="h-5 w-5 text-[#10B981] mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-[#F59E0B] mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#6B7280]" />
                        <p className="text-[#231F20]">Scaffolding Shortage Detection</p>
                      </div>
                      <p className="text-[14px] text-[#6B7280]">
                        Items Shortage Count: {selectedRequest.shortageItems}
                      </p>
                      {selectedRequest.validationChecks.noShortageDetected ? (
                        <Badge className="bg-[#10B981] text-white mt-2">
                          No Shortage Detected
                        </Badge>
                      ) : (
                        <Badge className="bg-[#F59E0B] text-white mt-2">
                          {selectedRequest.shortageItems} Items Missing
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Status */}
              <div className="bg-[#F3F4F6] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#231F20]">Overall Validation Status</span>
                  {canApprove(selectedRequest) ? (
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
            {selectedRequest?.status === "pending" && canApprove(selectedRequest) && (
              <Button
                className="bg-[#10B981] hover:bg-[#059669] text-white"
                onClick={handleApproveClick}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Closure
              </Button>
            )}
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
              <span className="text-[#231F20]">Request ID: {selectedRequest?.id}</span>
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
