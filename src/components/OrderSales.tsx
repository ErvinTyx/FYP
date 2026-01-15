import { useState } from "react";
import { FileText, Plus, Send, Download, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

interface RFQ {
  id: string;
  customer: string;
  date: string;
  items: number;
  totalValue: string;
  status: 'New' | 'Quoted' | 'Accepted' | 'Rejected';
}

const mockRFQs: RFQ[] = [
  {
    id: 'RFQ-2024-001',
    customer: 'Acme Construction',
    date: '2024-11-01',
    items: 5,
    totalValue: 'RM12,500',
    status: 'New'
  },
  {
    id: 'RFQ-2024-002',
    customer: 'BuildRight Inc.',
    date: '2024-11-02',
    items: 3,
    totalValue: 'RM8,200',
    status: 'Quoted'
  },
  {
    id: 'RFQ-2024-003',
    customer: 'Metro Builders',
    date: '2024-11-03',
    items: 7,
    totalValue: 'RM18,900',
    status: 'Accepted'
  },
];

interface QuotationItem {
  id: string;
  name: string;
  quantity: number;
  pricePerDay: number;
  days: number;
  total: number;
}

export function OrderSales() {
  const [rfqs] = useState<RFQ[]>(mockRFQs);
  const [isCreateRFQOpen, setIsCreateRFQOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([
    {
      id: '1',
      name: 'Aluminum Scaffolding Frame',
      quantity: 10,
      pricePerDay: 85,
      days: 30,
      total: 25500
    },
    {
      id: '2',
      name: 'Steel Platform Board',
      quantity: 20,
      pricePerDay: 45,
      days: 30,
      total: 27000
    }
  ]);

  const getStatusBadge = (status: RFQ['status']) => {
    switch (status) {
      case 'New':
        return <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]">New</Badge>;
      case 'Quoted':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Quoted</Badge>;
      case 'Accepted':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Accepted</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Rejected</Badge>;
    }
  };

  const handleCreateRFQ = () => {
    toast.success("RFQ created successfully!");
    setIsCreateRFQOpen(false);
  };

  const handleSendQuotation = () => {
    toast.success("Quotation sent to customer!");
    setIsQuotationOpen(false);
  };

  const addQuotationItem = () => {
    const newItem: QuotationItem = {
      id: String(quotationItems.length + 1),
      name: '',
      quantity: 1,
      pricePerDay: 0,
      days: 1,
      total: 0
    };
    setQuotationItems([...quotationItems, newItem]);
  };

  const removeQuotationItem = (id: string) => {
    setQuotationItems(quotationItems.filter(item => item.id !== id));
  };

  const subtotal = quotationItems.reduce((acc, item) => acc + item.total, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Order & Sales Management</h1>
        <p className="text-[#374151]">Manage RFQs, quotations, and sales orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Active RFQs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">{rfqs.filter(r => r.status === 'New').length}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#F59E0B]">{rfqs.filter(r => r.status === 'Quoted').length}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#059669]">{rfqs.filter(r => r.status === 'Accepted').length}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">RM39,600</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Dialog open={isCreateRFQOpen} onOpenChange={setIsCreateRFQOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6 rounded-lg">
              <Plus className="mr-2 h-4 w-4" />
              New RFQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Request for Quotation</DialogTitle>
              <DialogDescription>
                Enter customer requirements to generate an RFQ
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Search customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acme">Acme Construction Ltd.</SelectItem>
                    <SelectItem value="buildright">BuildRight Inc.</SelectItem>
                    <SelectItem value="metro">Metro Builders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" className="h-10" placeholder="e.g., Downtown Plaza Development" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (Days)</Label>
                  <Input id="duration" type="number" className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea 
                  id="requirements" 
                  placeholder="Describe the scaffolding requirements..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreateRFQOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1 bg-[#1E40AF] hover:bg-[#1E3A8A]" onClick={handleCreateRFQ}>
                  Create RFQ
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* RFQ List */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Request for Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>RFQ ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => (
                <TableRow key={rfq.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{rfq.id}</TableCell>
                  <TableCell className="text-[#374151]">{rfq.customer}</TableCell>
                  <TableCell className="text-[#374151]">{rfq.date}</TableCell>
                  <TableCell className="text-[#374151]">{rfq.items} items</TableCell>
                  <TableCell className="text-[#111827]">{rfq.totalValue}</TableCell>
                  <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsQuotationOpen(true)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quotation Dialog */}
      <Dialog open={isQuotationOpen} onOpenChange={setIsQuotationOpen}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Quotation - RFQ-2024-001</DialogTitle>
            <DialogDescription>
              Create a detailed quotation for the customer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-[14px]">
                  <div>
                    <p className="text-[#6B7280]">Customer</p>
                    <p className="text-[#111827]">Acme Construction Ltd.</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Project</p>
                    <p className="text-[#111827]">Downtown Plaza Development</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Duration</p>
                    <p className="text-[#111827]">30 days</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Quotation Date</p>
                    <p className="text-[#111827]">2024-11-04</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuotationItem}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price/Day</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotationItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>RM{item.pricePerDay}</TableCell>
                      <TableCell>{item.days}</TableCell>
                      <TableCell className="text-[#111827]">RM{item.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuotationItem(item.id)}
                        >
                          <span className="text-[#DC2626]">×</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#F9FAFB]">
                    <TableCell colSpan={4} className="text-right">Subtotal</TableCell>
                    <TableCell className="text-[#111827]">RM{subtotal.toLocaleString()}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right">Tax (10%)</TableCell>
                    <TableCell className="text-[#111827]">RM{tax.toLocaleString()}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableCell colSpan={4} className="text-right">Total</TableCell>
                    <TableCell className="text-[#111827]">RM{total.toLocaleString()}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Terms & Conditions</Label>
              <Textarea 
                id="notes" 
                placeholder="Enter terms and conditions..."
                className="min-h-[80px]"
                defaultValue="Payment: 50% deposit, 50% on completion&#10;Delivery: Within 3 business days&#10;Validity: 30 days from quotation date"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsQuotationOpen(false)}>
                Save Draft
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button className="flex-1 bg-[#1E40AF] hover:bg-[#1E3A8A]" onClick={handleSendQuotation}>
                <Send className="mr-2 h-4 w-4" />
                Send to Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}