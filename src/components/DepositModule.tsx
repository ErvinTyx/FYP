import { useState } from "react";
import { 
  FileText, 
  Edit, 
  Download,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
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
import { Separator } from "./ui/separator";

interface RentalItem {
  id: string;
  name: string;
  quantity: number;
  pricePerItem: number;
  total: number;
  status: string;
}

const rentalItems: RentalItem[] = [
  { id: '1', name: 'Excavator - CAT 320', quantity: 2, pricePerItem: 5000, total: 10000, status: 'Active' },
  { id: '2', name: 'Concrete Mixer', quantity: 3, pricePerItem: 1500, total: 4500, status: 'Active' },
  { id: '3', name: 'Scaffolding Set', quantity: 5, pricePerItem: 800, total: 4000, status: 'Active' },
  { id: '4', name: 'Generator - 50kW', quantity: 1, pricePerItem: 2000, total: 2000, status: 'Active' },
];

const subtotal = rentalItems.reduce((acc, item) => acc + item.total, 0);
const taxRate = 0.1;
const tax = subtotal * taxRate;
const totalDeposit = subtotal + tax;

export function DepositModule() {
  const [agreementStatus] = useState<'Draft' | 'Active' | 'Completed'>('Active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1>Deposit Agreement - Acme Construction Ltd.</h1>
          <div className="flex items-center gap-3">
            {agreementStatus === 'Active' && (
              <Badge className="bg-[#059669] hover:bg-[#047857]">
                <CheckCircle className="mr-1 h-3 w-3" />
                Active
              </Badge>
            )}
            {agreementStatus === 'Draft' && (
              <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]">
                <FileText className="mr-1 h-3 w-3" />
                Draft
              </Badge>
            )}
            {agreementStatus === 'Completed' && (
              <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">
                <CheckCircle className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 px-6 rounded-lg">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button className="bg-[#F15929] hover:bg-[#D94E23] h-10 px-6 rounded-lg">
            <FileText className="mr-2 h-4 w-4" />
            Generate Proforma
          </Button>
        </div>
      </div>

      {/* Agreement Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[12px] text-[#6B7280]">Customer Name</p>
              <p className="text-[#231F20]">Acme Construction Ltd.</p>
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Project</p>
              <p className="text-[#231F20]">Downtown Plaza Development</p>
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Agreement Date</p>
              <p className="text-[#111827]">October 15, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[18px]">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[12px] text-[#6B7280]">Deposit Amount</p>
              <p className="text-[#111827]">RM{totalDeposit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Due Date</p>
              <p className="text-[#111827]">November 15, 2024</p>
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Terms</p>
              <p className="text-[#111827]">50% deposit on signing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rental Items */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Rental Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price/Item</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentalItems.map((item) => (
                <TableRow key={item.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{item.name}</TableCell>
                  <TableCell className="text-[#374151]">{item.quantity}</TableCell>
                  <TableCell className="text-[#374151]">RM{item.pricePerItem.toLocaleString()}</TableCell>
                  <TableCell className="text-[#111827]">RM{item.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className="bg-[#059669] hover:bg-[#047857]">
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableCell colSpan={3} className="text-right">Subtotal</TableCell>
                <TableCell className="text-[#111827]">RM{subtotal.toLocaleString()}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow className="hover:bg-[#F3F4F6]">
                <TableCell colSpan={3} className="text-right">Tax (10%)</TableCell>
                <TableCell className="text-[#111827]">RM{tax.toLocaleString()}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableCell colSpan={3} className="text-right">Total Deposit</TableCell>
                <TableCell className="text-[#111827]">RM{totalDeposit.toLocaleString()}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Status Timeline */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Payment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <CheckCircle className="h-6 w-6 text-[#059669]" />
              </div>
              <div className="flex-1">
                <h4 className="text-[#111827]">Agreement Created</h4>
                <p className="text-[12px] text-[#6B7280]">October 15, 2024 at 10:30 AM</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <CheckCircle className="h-6 w-6 text-[#059669]" />
              </div>
              <div className="flex-1">
                <h4 className="text-[#111827]">Proforma Sent</h4>
                <p className="text-[12px] text-[#6B7280]">October 16, 2024 at 2:15 PM</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <CheckCircle className="h-6 w-6 text-[#059669]" />
              </div>
              <div className="flex-1">
                <h4 className="text-[#111827]">Payment Received</h4>
                <p className="text-[12px] text-[#6B7280]">October 18, 2024 at 9:45 AM</p>
                <p className="text-[12px] text-[#6B7280]">Amount: RM{totalDeposit.toLocaleString()}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <Clock className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <h4 className="text-[#111827]">Receipt Pending</h4>
                <p className="text-[12px] text-[#6B7280]">To be issued</p>
                <Button className="mt-2 bg-[#1E40AF] hover:bg-[#1E3A8A] h-9">
                  <Download className="mr-2 h-4 w-4" />
                  Generate Receipt
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}