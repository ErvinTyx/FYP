import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  FileText,
  TrendingUp,
  Plus,
  CreditCard,
  FileOutput,
  RotateCcw
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";

interface StatsCardProps {
  title: string;
  amount: string;
  trend?: string;
  icon: React.ReactNode;
  subtitle?: string;
}

function StatsCard({ title, amount, trend, icon, subtitle }: StatsCardProps) {
  return (
    <Card className="border-[#E5E7EB]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[14px] text-[#6B7280]">{title}</CardTitle>
        <div className="text-[#6B7280]">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[#111827]">{amount}</span>
            {trend && (
              <span className="text-[12px] text-[#059669] flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[12px] text-[#6B7280]">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

const recentTransactions: Transaction[] = [
  { id: 'INV-2024-001', date: '2024-11-01', type: 'Invoice', description: 'Monthly rental - October 2024', amount: 'RM2,450.00', status: 'Paid' },
  { id: 'INV-2024-002', date: '2024-11-02', type: 'Invoice', description: 'Equipment deposit', amount: 'RM5,000.00', status: 'Pending' },
  { id: 'CN-2024-001', date: '2024-11-03', type: 'Credit Note', description: 'Item return credit', amount: '-RM750.00', status: 'Paid' },
  { id: 'INV-2024-003', date: '2024-10-28', type: 'Invoice', description: 'Monthly rental - September 2024', amount: 'RM2,450.00', status: 'Overdue' },
  { id: 'INV-2024-004', date: '2024-11-04', type: 'Invoice', description: 'Additional equipment', amount: 'RM1,200.00', status: 'Pending' },
];

interface BillingDashboardProps {
  onNavigateToCreditNotes?: () => void;
  onNavigateToFinancialReports?: () => void;
  onNavigateToMonthlyRental?: () => void;
  onNavigateToManageDeposits?: () => void;
  onNavigateToRefunds?: () => void;
}

export function BillingDashboard({ onNavigateToCreditNotes, onNavigateToFinancialReports, onNavigateToMonthlyRental, onNavigateToManageDeposits, onNavigateToRefunds }: BillingDashboardProps = {}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Billing & Payments</h1>
        <p className="text-[#374151]">Manage invoices, payments, and financial records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Outstanding"
          amount="RM45,230.00"
          trend="+12%"
          icon={<DollarSign className="h-5 w-5" />}
          subtitle="from last month"
        />
        <StatsCard
          title="Payments Due"
          amount="23 invoices"
          icon={<Calendar className="h-5 w-5" />}
          subtitle="RM12,450.00"
        />
        <StatsCard
          title="Recent Payments"
          amount="15 payments"
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle="RM8,720.00"
        />
        <StatsCard
          title="Credit Notes"
          amount="3 notes"
          icon={<FileText className="h-5 w-5" />}
          subtitle="RM1,230.00"
        />
      </div>

      {/* Quick Actions */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6 rounded-lg"
              onClick={onNavigateToMonthlyRental}
            >
              <Plus className="mr-2 h-4 w-4" />
              Monthly Rental
            </Button>
            <Button 
              variant="outline" 
              className="h-10 px-6 rounded-lg"
              onClick={onNavigateToManageDeposits}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Deposits
            </Button>
            <Button 
              variant="outline" 
              className="h-10 px-6 rounded-lg"
              onClick={onNavigateToCreditNotes}
            >
              <FileText className="mr-2 h-4 w-4" />
              Issue Credit Note
            </Button>
            <Button 
              variant="outline" 
              className="h-10 px-6 rounded-lg"
              onClick={onNavigateToRefunds}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Issue Refund
            </Button>
            <Button 
              variant="outline" 
              className="h-10 px-6 rounded-lg"
              onClick={onNavigateToFinancialReports}
            >
              <FileOutput className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#374151]">{transaction.date}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#374151]">{transaction.description}</TableCell>
                  <TableCell className="text-[#111827]">{transaction.amount}</TableCell>
                  <TableCell>
                    {transaction.status === 'Paid' && (
                      <Badge className="bg-[#059669] hover:bg-[#047857]">Paid</Badge>
                    )}
                    {transaction.status === 'Pending' && (
                      <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Pending</Badge>
                    )}
                    {transaction.status === 'Overdue' && (
                      <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Overdue</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="hover:bg-[#F3F4F6]">
                      View
                    </Button>
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