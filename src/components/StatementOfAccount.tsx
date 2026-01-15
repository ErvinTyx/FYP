import { useState } from "react";
import { Download, Printer, FileSpreadsheet, Calendar } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Transaction {
  id: string;
  date: string;
  type: 'Invoice' | 'Payment' | 'Credit Note';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const transactions: Transaction[] = [
  { id: '1', date: '2024-10-01', type: 'Invoice', description: 'Monthly rental - September 2024', debit: 5200, credit: 0, balance: 5200 },
  { id: '2', date: '2024-10-05', type: 'Payment', description: 'Payment received - Bank transfer', debit: 0, credit: 5200, balance: 0 },
  { id: '3', date: '2024-10-15', type: 'Invoice', description: 'Equipment deposit', debit: 10000, credit: 0, balance: 10000 },
  { id: '4', date: '2024-10-18', type: 'Payment', description: 'Partial payment - Check', debit: 0, credit: 5000, balance: 5000 },
  { id: '5', date: '2024-10-25', type: 'Credit Note', description: 'Item return credit - CN-2024-003', debit: 0, credit: 750, balance: 4250 },
  { id: '6', date: '2024-11-01', type: 'Invoice', description: 'Monthly rental - October 2024', debit: 5450, credit: 0, balance: 9700 },
  { id: '7', date: '2024-11-03', type: 'Payment', description: 'Payment received - Bank transfer', debit: 0, credit: 4250, balance: 5450 },
];

export function StatementOfAccount() {
  const [selectedPeriod, setSelectedPeriod] = useState("october-2024");
  const [selectedCustomer, setSelectedCustomer] = useState("acme");

  const currentBalance = transactions[transactions.length - 1].balance;
  const totalDebit = transactions.reduce((acc, t) => acc + t.debit, 0);
  const totalCredit = transactions.reduce((acc, t) => acc + t.credit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Statement of Account</h1>
        <p className="text-[#374151]">View detailed transaction history and account balances</p>
      </div>

      {/* Filters & Export */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4 items-center">
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger className="w-[250px] h-10 bg-white border-[#D1D5DB] rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acme">Acme Construction Ltd.</SelectItem>
              <SelectItem value="buildright">BuildRight Inc.</SelectItem>
              <SelectItem value="metro">Metro Builders</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#6B7280]" />
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px] h-10 bg-white border-[#D1D5DB] rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="october-2024">October 2024</SelectItem>
                <SelectItem value="september-2024">September 2024</SelectItem>
                <SelectItem value="q3-2024">Q3 2024</SelectItem>
                <SelectItem value="ytd-2024">Year to Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 px-6 rounded-lg">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" className="h-10 px-6 rounded-lg">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" className="h-10 px-6 rounded-lg">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Customer Summary Card */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Account Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-[12px] text-[#6B7280]">Customer Name</p>
              <p className="text-[#111827]">Acme Construction Ltd.</p>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] text-[#6B7280]">Current Balance</p>
              <p className="text-[#DC2626]">RM{currentBalance.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] text-[#6B7280]">Credit Limit</p>
              <p className="text-[#111827]">RM50,000.00</p>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] text-[#6B7280]">Available Credit</p>
              <p className="text-[#059669]">RM{(50000 - currentBalance).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Timeline */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#374151]">{transaction.date}</TableCell>
                  <TableCell>
                    {transaction.type === 'Invoice' && (
                      <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]">Invoice</Badge>
                    )}
                    {transaction.type === 'Payment' && (
                      <Badge className="bg-[#059669] hover:bg-[#047857]">Payment</Badge>
                    )}
                    {transaction.type === 'Credit Note' && (
                      <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Credit Note</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-[#374151]">{transaction.description}</TableCell>
                  <TableCell className="text-right text-[#DC2626]">
                    {transaction.debit > 0 ? `RM${transaction.debit.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-[#059669]">
                    {transaction.credit > 0 ? `RM${transaction.credit.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-[#111827]">
                    RM{transaction.balance.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableCell colSpan={3} className="text-right">Totals</TableCell>
                <TableCell className="text-right text-[#DC2626]">
                  RM{totalDebit.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-[#059669]">
                  RM{totalCredit.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-[#111827]">
                  RM{currentBalance.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Aging Summary */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Aging Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-6">
                <p className="text-[12px] text-[#6B7280]">Current</p>
                <p className="text-[#111827]">RM5,450.00</p>
              </CardContent>
            </Card>
            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-6">
                <p className="text-[12px] text-[#6B7280]">1-30 Days</p>
                <p className="text-[#111827]">RM0.00</p>
              </CardContent>
            </Card>
            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-6">
                <p className="text-[12px] text-[#6B7280]">31-60 Days</p>
                <p className="text-[#111827]">RM0.00</p>
              </CardContent>
            </Card>
            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-6">
                <p className="text-[12px] text-[#6B7280]">61-90 Days</p>
                <p className="text-[#111827]">RM0.00</p>
              </CardContent>
            </Card>
            <Card className="border-[#E5E7EB] bg-[#F8FAFC]">
              <CardContent className="pt-6">
                <p className="text-[12px] text-[#6B7280]">Over 90 Days</p>
                <p className="text-[#DC2626]">RM0.00</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}