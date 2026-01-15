import { useState } from "react";
import { Search, Eye, FileText, Calendar, DollarSign, AlertCircle, MoreVertical, Upload } from "lucide-react";
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
import { DepositStatusBadge } from "./DepositStatusBadge";
import { UploadProofModal } from "./UploadProofModal";
import { Deposit } from "../../types/deposit";

interface DepositListProps {
  deposits: Deposit[];
  onView: (id: string) => void;
  onUploadProof?: (depositId: string, file: File) => void;
  userRole: "Admin" | "Finance" | "Staff" | "Customer";
}

export function DepositList({ deposits, onView, onUploadProof, userRole }: DepositListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDepositForUpload, setSelectedDepositForUpload] = useState<Deposit | null>(null);

  const filteredDeposits = deposits.filter((deposit) => {
    const matchesSearch =
      deposit.depositId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || deposit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingPaymentCount = deposits.filter((d) => d.status === "Pending Payment").length;
  const pendingApprovalCount = deposits.filter((d) => d.status === "Pending Approval").length;
  const paidCount = deposits.filter((d) => d.status === "Paid").length;
  const paidAmount = deposits
    .filter((d) => d.status === "Paid")
    .reduce((sum, d) => sum + d.depositAmount, 0);

  // Count overdue deposits
  const overdueCount = deposits.filter((d) => d.status === "Overdue").length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-[#111827]">{pendingPaymentCount}</p>
                <p className="text-[12px] text-[#6B7280]">Awaiting payment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-[#111827]">{pendingApprovalCount}</p>
                <p className="text-[12px] text-[#6B7280]">Need review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Paid Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[#059669]" />
              </div>
              <div>
                <p className="text-[#111827]">{paidCount}</p>
                <p className="text-[12px] text-[#059669]">RM{paidAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#FFEDD5] flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-[#EA580C]" />
              </div>
              <div>
                <p className="text-[#111827]">{overdueCount}</p>
                <p className="text-[12px] text-[#EA580C]">Payment expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search by deposit ID, invoice, or customer..."
            className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending Payment">Pending Payment</SelectItem>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Deposit List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Invoice No.</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Deposit Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">
                    No deposits found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeposits.map((deposit) => {
                  return (
                    <TableRow key={deposit.id} className="h-14 hover:bg-[#F3F4F6]">
                      <TableCell className="text-[#374151]">
                        {deposit.invoiceNo}
                      </TableCell>
                      <TableCell className="text-[#374151]">
                        {deposit.customerName}
                      </TableCell>
                      <TableCell className="text-[#111827]">
                        RM{deposit.depositAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DepositStatusBadge status={deposit.status} />
                      </TableCell>
                      <TableCell>
                        <div className={deposit.status === "Overdue" ? "text-[#EA580C]" : "text-[#374151]"}>
                          {new Date(deposit.dueDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#374151]">
                        {new Date(deposit.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]">
                              <MoreVertical className="h-4 w-4 text-[#6B7280]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem onClick={() => onView(deposit.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {onUploadProof && (deposit.status === "Pending Payment" || deposit.status === "Rejected") && (() => {
                              const isBeforeDueDate = new Date() < new Date(deposit.dueDate);
                              const canUpload = isBeforeDueDate;
                              
                              return (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (canUpload) {
                                      setSelectedDepositForUpload(deposit);
                                      setUploadModalOpen(true);
                                    }
                                  }}
                                  disabled={!canUpload}
                                  className={!canUpload ? "opacity-50 cursor-not-allowed" : ""}
                                  title={!canUpload ? "Cannot upload new proof after due date" : ""}
                                >
                                  <Upload className="mr-2 h-4 w-4" />
                                  {deposit.status === "Rejected" ? "Re-Upload Proof" : "Upload Proof"}
                                </DropdownMenuItem>
                              );
                            })()}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Proof Modal */}
      {uploadModalOpen && selectedDepositForUpload && onUploadProof && (
        <UploadProofModal
          open={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedDepositForUpload(null);
          }}
          onSubmit={(file) => {
            onUploadProof(selectedDepositForUpload.id, file);
            setUploadModalOpen(false);
            setSelectedDepositForUpload(null);
          }}
          depositInvoiceNo={selectedDepositForUpload.invoiceNo}
          isReupload={selectedDepositForUpload.status === "Rejected"}
        />
      )}
    </div>
  );
}