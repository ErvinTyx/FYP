import { useState } from "react";
import { DollarSign, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

interface RefundRequest {
  id: string;
  requestId: string;
  customer: string;
  project: string;
  refundAmount: string;
  requestDate: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Processing' | 'Completed';
}

const refundRequests: RefundRequest[] = [
  {
    id: '1',
    requestId: 'REF-2024-001',
    customer: 'Acme Construction Ltd.',
    project: 'Downtown Plaza',
    refundAmount: 'RM3,500.00',
    requestDate: '2024-11-02',
    status: 'Under Review'
  },
  {
    id: '2',
    requestId: 'REF-2024-002',
    customer: 'BuildRight Inc.',
    project: 'Riverside Complex',
    refundAmount: 'RM5,200.00',
    requestDate: '2024-11-01',
    status: 'Approved'
  },
  {
    id: '3',
    requestId: 'REF-2024-003',
    customer: 'Metro Builders',
    project: 'City Center Tower',
    refundAmount: 'RM2,100.00',
    requestDate: '2024-10-30',
    status: 'Completed'
  },
  {
    id: '4',
    requestId: 'REF-2024-004',
    customer: 'Premium Projects',
    project: 'Harbor View',
    refundAmount: 'RM4,800.00',
    requestDate: '2024-11-03',
    status: 'Submitted'
  },
];

function ApprovalDialog({ request }: { request: RefundRequest }) {
  const [refundMethod, setRefundMethod] = useState("original");
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-[#F3F4F6]">
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Refund Approval - {request.requestId}</DialogTitle>
          <DialogDescription>
            Review the project closure checklist and approve refund
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4 max-h-[500px] overflow-y-auto pr-2">
          {/* Project Closure Checklist */}
          <div className="space-y-3">
            <h4 className="text-[#111827]">Project Closure Checklist</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="rentals" defaultChecked />
                <label htmlFor="rentals" className="text-[14px] text-[#374151]">
                  All rentals returned
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="invoices" defaultChecked />
                <label htmlFor="invoices" className="text-[14px] text-[#374151]">
                  No outstanding invoices
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="agreements" defaultChecked />
                <label htmlFor="agreements" className="text-[14px] text-[#374151]">
                  No active agreements
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="survey" />
                <label htmlFor="survey" className="text-[14px] text-[#374151]">
                  Customer satisfaction survey completed
                </label>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-[14px] text-[#374151]">Total Outstanding</span>
                <span className="text-[14px] text-[#111827]">RM0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[14px] text-[#374151]">Deposit Amount</span>
                <span className="text-[14px] text-[#111827]">{request.refundAmount}</span>
              </div>
              <div className="border-t border-[#E5E7EB] pt-2 flex justify-between">
                <span className="text-[14px] text-[#111827]">Net Refundable</span>
                <span className="text-[14px] text-[#059669]">{request.refundAmount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Refund Method */}
          <div className="space-y-3">
            <h4 className="text-[#111827]">Refund Method</h4>
            <RadioGroup value={refundMethod} onValueChange={setRefundMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="original" id="original" />
                <Label htmlFor="original" className="text-[14px]">Original Payment Method</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank" id="bank" />
                <Label htmlFor="bank" className="text-[14px]">Bank Transfer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="check" id="check" />
                <Label htmlFor="check" className="text-[14px]">Check</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit" className="text-[14px]">Credit to Account</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button className="flex-1 bg-[#059669] hover:bg-[#047857] h-10">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Refund
            </Button>
            <Button variant="outline" className="flex-1 h-10">
              <AlertCircle className="mr-2 h-4 w-4" />
              Request More Info
            </Button>
            <Button variant="destructive" className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C]">
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RefundManagement() {
  const getStatusBadge = (status: RefundRequest['status']) => {
    switch (status) {
      case 'Submitted':
        return <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]"><Clock className="mr-1 h-3 w-3" />Submitted</Badge>;
      case 'Under Review':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]"><AlertCircle className="mr-1 h-3 w-3" />Under Review</Badge>;
      case 'Approved':
        return <Badge className="bg-[#059669] hover:bg-[#047857]"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      case 'Processing':
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]"><Clock className="mr-1 h-3 w-3" />Processing</Badge>;
      case 'Completed':
        return <Badge className="bg-[#059669] hover:bg-[#047857]"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
    }
  };

  const totalRequested = refundRequests.reduce((acc, req) => 
    acc + parseFloat(req.refundAmount.replace('RM', '').replace(',', '')), 0
  );
  
  const pendingReview = refundRequests.filter(req => 
    req.status === 'Submitted' || req.status === 'Under Review'
  ).length;

  const approved = refundRequests.filter(req => 
    req.status === 'Approved' || req.status === 'Completed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Refund Management</h1>
        <p className="text-[#374151]">Process and track deposit refund requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#6B7280]" />
              <p className="text-[#111827]">{refundRequests.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#F59E0B]" />
              <p className="text-[#111827]">{pendingReview}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#059669]" />
              <p className="text-[#111827]">{approved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">RM{totalRequested.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Refund Requests Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Refund Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Request ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refundRequests.map((request) => (
                <TableRow key={request.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{request.requestId}</TableCell>
                  <TableCell className="text-[#374151]">{request.customer}</TableCell>
                  <TableCell className="text-[#374151]">{request.project}</TableCell>
                  <TableCell className="text-[#111827]">{request.refundAmount}</TableCell>
                  <TableCell className="text-[#374151]">{request.requestDate}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right">
                    <ApprovalDialog request={request} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}