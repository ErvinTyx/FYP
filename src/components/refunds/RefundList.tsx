import { Plus, Eye } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { RefundRecord, RefundStatus } from "./RefundManagementMain";

interface RefundListProps {
  refunds: RefundRecord[];
  onCreateNew: () => void;
  onViewDetails: (refund: RefundRecord) => void;
}

export function RefundList({ refunds, onCreateNew, onViewDetails }: RefundListProps) {
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

  const totalAmount = refunds.reduce((acc, refund) => {
    const amount = parseFloat(refund.refundAmount.replace("RM", "").replace(",", ""));
    return acc + amount;
  }, 0);

  const pendingCount = refunds.filter(r => r.status === "Pending Approval").length;
  const approvedCount = refunds.filter(r => r.status === "Approved").length;
  const draftCount = refunds.filter(r => r.status === "Draft").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1>Refund Management</h1>
          <p className="text-[#374151]">Process and track refund requests across all invoice types</p>
        </div>
        <Button
          onClick={onCreateNew}
          className="bg-[#F15929] hover:bg-[#D14821] h-10 px-6 rounded-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Issue New Refund
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">{refunds.length}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#F59E0B]">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#059669]">{approvedCount}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">RM{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Refunds Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Refund Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Refund ID</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Invoice Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-[#6B7280] h-32">
                    No refund records found. Click "Issue New Refund" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((refund) => (
                  <TableRow key={refund.id} className="h-14 hover:bg-[#F3F4F6]">
                    <TableCell className="text-[#111827]">{refund.refundId}</TableCell>
                    <TableCell className="text-[#374151]">{refund.invoiceNo}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                        {refund.invoiceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#374151]">{refund.customer}</TableCell>
                    <TableCell className="text-[#111827]">{refund.refundAmount}</TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell className="text-[#374151]">{refund.createdDate}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-[#F3F4F6]"
                        onClick={() => onViewDetails(refund)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
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
    </div>
  );
}
