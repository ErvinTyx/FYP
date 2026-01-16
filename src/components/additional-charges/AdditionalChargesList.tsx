import { useState } from "react";
import { Search, Eye, Upload, CheckCircle, XCircle, MoreVertical } from "lucide-react";
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
import { AdditionalChargeStatusBadge } from "./AdditionalChargeStatusBadge";
import { UploadPopModal } from "./UploadPopModal";
import { ApproveModal } from "./ApproveModal";
import { RejectModal } from "./RejectModal";
import { AdditionalCharge } from "../../types/additionalCharge";
import { toast } from "sonner";

interface AdditionalChargesListProps {
  onViewDetails: (charge: AdditionalCharge) => void;
}

// Mock data
const mockCharges: AdditionalCharge[] = [
  {
    id: "AC-2024-001",
    invoiceNo: "INV-2024-045",
    doId: "DO-2024-001",
    customerName: "Acme Construction Ltd.",
    customerId: "CUST-001",
    returnedDate: "2024-12-01",
    inspectionReportId: "IR-2024-001",
    totalCharges: 315.75,
    status: "Pending Payment",
    dueDate: "2024-12-20",
    lastUpdated: "2024-12-10 09:30 AM",
    items: [
      {
        id: "1",
        itemName: "Steel Pipe Scaffolding - Standard (6m)",
        itemType: "Damaged",
        quantity: 3,
        unitPrice: 10.50,
        amount: 31.50,
        remark: "Major dents on horizontal members",
      },
      {
        id: "2",
        itemName: "Scaffold Board - Wooden (3.9m)",
        itemType: "Missing",
        quantity: 2,
        unitPrice: 50.00,
        amount: 100.00,
        remark: "Not returned",
      },
      {
        id: "3",
        itemName: "Swivel Coupler",
        itemType: "Cleaning",
        quantity: 15,
        unitPrice: 2.10,
        amount: 31.50,
        remark: "Concrete residue cleaning required",
      },
      {
        id: "4",
        itemName: "Steel Tube - Heavy Duty (4m)",
        itemType: "Repair",
        quantity: 4,
        unitPrice: 5.25,
        amount: 21.00,
        remark: "Repairable bend",
      },
    ],
  },
  {
    id: "AC-2024-002",
    invoiceNo: "INV-2024-046",
    doId: "DO-2024-002",
    customerName: "BuildRight Inc.",
    customerId: "CUST-002",
    returnedDate: "2024-12-03",
    inspectionReportId: "IR-2024-002",
    totalCharges: 168.00,
    status: "Pending Approval",
    dueDate: "2024-12-22",
    lastUpdated: "2024-12-10 10:15 AM",
    proofOfPayment: "pop-ac-2024-002.pdf",
    items: [
      {
        id: "1",
        itemName: "H-Frame Scaffolding (1.7m x 1.2m)",
        itemType: "Damaged",
        quantity: 2,
        unitPrice: 10.50,
        amount: 21.00,
        remark: "Welding points broken",
      },
      {
        id: "2",
        itemName: "Ringlock System - Vertical (3m)",
        itemType: "Cleaning",
        quantity: 70,
        unitPrice: 2.10,
        amount: 147.00,
      },
    ],
  },
  {
    id: "AC-2024-003",
    invoiceNo: "INV-2024-047",
    doId: "DO-2024-003",
    customerName: "Metro Builders",
    customerId: "CUST-003",
    returnedDate: "2024-12-05",
    inspectionReportId: "IR-2024-003",
    totalCharges: 525.50,
    status: "Approved",
    dueDate: "2024-12-24",
    lastUpdated: "2024-12-08 02:45 PM",
    proofOfPayment: "pop-ac-2024-003.pdf",
    referenceId: "TXN-20241208-001",
    approvalDate: "2024-12-08",
    items: [
      {
        id: "1",
        itemName: "Aluminum Mobile Tower (5m)",
        itemType: "Missing",
        quantity: 1,
        unitPrice: 480.00,
        amount: 480.00,
        remark: "Complete unit not returned",
      },
      {
        id: "2",
        itemName: "Steel Pipe Scaffolding - Standard (6m)",
        itemType: "Repair",
        quantity: 5,
        unitPrice: 5.25,
        amount: 26.25,
      },
      {
        id: "3",
        itemName: "Swivel Coupler",
        itemType: "Cleaning",
        quantity: 9,
        unitPrice: 2.10,
        amount: 18.90,
      },
    ],
  },
  {
    id: "AC-2024-004",
    invoiceNo: "INV-2024-048",
    doId: "DO-2024-004",
    customerName: "Premium Projects",
    customerId: "CUST-004",
    returnedDate: "2024-12-07",
    totalCharges: 94.50,
    status: "Rejected",
    dueDate: "2024-12-26",
    lastUpdated: "2024-12-09 11:20 AM",
    proofOfPayment: "pop-ac-2024-004.pdf",
    rejectionReason: "Payment reference number is not visible in the uploaded document. Please upload a clearer image showing the complete transaction details.",
    rejectionDate: "2024-12-09",
    items: [
      {
        id: "1",
        itemName: "Steel Tube - Heavy Duty (4m)",
        itemType: "Damaged",
        quantity: 6,
        unitPrice: 10.50,
        amount: 63.00,
        remark: "Severe rust damage",
      },
      {
        id: "2",
        itemName: "Scaffold Board - Wooden (3.9m)",
        itemType: "Cleaning",
        quantity: 15,
        unitPrice: 2.10,
        amount: 31.50,
        remark: "Paint removal required",
      },
    ],
  },
];

export function AdditionalChargesList({ onViewDetails }: AdditionalChargesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [charges, setCharges] = useState<AdditionalCharge[]>(mockCharges);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<AdditionalCharge | null>(null);

  const filteredCharges = charges.filter((charge) => {
    const matchesSearch =
      charge.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.doId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || charge.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleUploadPop = (chargeId: string) => {
    const charge = charges.find((c) => c.id === chargeId);
    if (charge) {
      setSelectedCharge(charge);
      setUploadModalOpen(true);
    }
  };

  const handlePopUploaded = (file: File) => {
    if (selectedCharge) {
      setCharges(
        charges.map((charge) =>
          charge.id === selectedCharge.id
            ? {
                ...charge,
                proofOfPayment: file.name,
                status: "Pending Approval",
                lastUpdated: new Date().toLocaleString(),
              }
            : charge
        )
      );
      toast.success("Proof of payment uploaded successfully");
    }
  };

  const handleApprove = (chargeId: string) => {
    const charge = charges.find((c) => c.id === chargeId);
    if (charge) {
      setSelectedCharge(charge);
      setApproveModalOpen(true);
    }
  };

  const handleApproveConfirmed = (referenceId: string) => {
    if (selectedCharge) {
      setCharges(
        charges.map((charge) =>
          charge.id === selectedCharge.id
            ? {
                ...charge,
                status: "Approved",
                referenceId,
                approvalDate: new Date().toISOString().split("T")[0],
                lastUpdated: new Date().toLocaleString(),
              }
            : charge
        )
      );
      toast.success("Payment approved successfully");
    }
  };

  const handleReject = (chargeId: string) => {
    const charge = charges.find((c) => c.id === chargeId);
    if (charge) {
      setSelectedCharge(charge);
      setRejectModalOpen(true);
    }
  };

  const handleRejectConfirmed = (reason: string) => {
    if (selectedCharge) {
      setCharges(
        charges.map((charge) =>
          charge.id === selectedCharge.id
            ? {
                ...charge,
                status: "Rejected",
                rejectionReason: reason,
                rejectionDate: new Date().toISOString().split("T")[0],
                lastUpdated: new Date().toLocaleString(),
              }
            : charge
        )
      );
      toast.error("Payment rejected");
    }
  };

  const canResubmit = (charge: AdditionalCharge): boolean => {
    if (charge.status !== "Rejected") return false;
    const dueDate = new Date(charge.dueDate);
    const today = new Date();
    return today <= dueDate;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Additional Charges</h1>
        <p className="text-[#374151]">
          Manage additional charges for damaged, missing, or items requiring cleaning/repair
        </p>
      </div>

      {/* Filters */}
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
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">
            Additional Charges List ({filteredCharges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    const isOverdue = new Date(charge.dueDate) < new Date() && 
                                     (charge.status === "Pending Payment" || charge.status === "Rejected");
                    
                    return (
                      <TableRow key={charge.id} className="hover:bg-[#F9FAFB]">
                        <TableCell className="text-[#231F20]">{charge.invoiceNo}</TableCell>
                        <TableCell className="text-[#231F20]">{charge.doId}</TableCell>
                        <TableCell className="text-[#374151]">{charge.customerName}</TableCell>
                        <TableCell className="text-[#231F20]">
                          RM{charge.totalCharges.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <AdditionalChargeStatusBadge status={charge.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-[#374151]">
                              {new Date(charge.dueDate).toLocaleDateString()}
                            </span>
                            {isOverdue && (
                              <span className="text-xs text-[#DC2626]">Overdue</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]">
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
                              {charge.status === "Rejected" && canResubmit(charge) && (
                                <DropdownMenuItem onClick={() => handleUploadPop(charge.id)}>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Re-upload POP
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
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedCharge && (
        <>
          <UploadPopModal
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onUpload={handlePopUploaded}
            chargeId={selectedCharge.id}
          />
          <ApproveModal
            isOpen={approveModalOpen}
            onClose={() => setApproveModalOpen(false)}
            onApprove={handleApproveConfirmed}
            chargeId={selectedCharge.id}
          />
          <RejectModal
            isOpen={rejectModalOpen}
            onClose={() => setRejectModalOpen(false)}
            onReject={handleRejectConfirmed}
            chargeId={selectedCharge.id}
          />
        </>
      )}
    </div>
  );
}