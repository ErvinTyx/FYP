"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

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

export type RecentActivityEntityType = "monthlyRental" | "deposit" | "additionalCharge" | "creditNote" | "refund";

export interface RecentActivityItem {
  id: string;
  date: string;
  type: RecentActivityEntityType;
  amount: number;
  status: string;
  reference: string;
  entityId: string;
  entityType: RecentActivityEntityType;
}

function pageForEntityType(entityType: RecentActivityEntityType): string {
  switch (entityType) {
    case "monthlyRental": return "monthly-rental";
    case "deposit": return "manage-deposits";
    case "additionalCharge": return "additional-charges";
    case "creditNote": return "credit-notes";
    case "refund": return "refund-management";
    default: return "billing-dashboard";
  }
}

function typeLabel(type: RecentActivityEntityType): string {
  switch (type) {
    case "monthlyRental": return "Monthly Rental";
    case "deposit": return "Deposit";
    case "additionalCharge": return "Additional Charge";
    case "creditNote": return "Credit Note";
    case "refund": return "Refund";
    default: return type;
  }
}

function formatAmount(amount: number, type: RecentActivityEntityType): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  if (type === "creditNote" || type === "refund") {
    return `-RM ${formatted}`;
  }
  return `RM ${formatted}`;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.includes("paid")) return <Badge className="bg-[#059669] hover:bg-[#047857]">Paid</Badge>;
  if (s.includes("pending") && s.includes("approval")) return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Pending Approval</Badge>;
  if (s.includes("pending")) return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Pending</Badge>;
  if (s.includes("overdue")) return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Overdue</Badge>;
  if (s.includes("approved")) return <Badge className="bg-[#059669] hover:bg-[#047857]">Approved</Badge>;
  if (s.includes("rejected")) return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Rejected</Badge>;
  if (s.includes("expired")) return <Badge variant="secondary" className="bg-[#6B7280] text-white">Expired</Badge>;
  if (s.includes("draft")) return <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">Draft</Badge>;
  return <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">{status}</Badge>;
}

interface BillingDashboardProps {
  onNavigateToCreditNotes?: () => void;
  onNavigateToFinancialReports?: () => void;
  onNavigateToMonthlyRental?: () => void;
  onNavigateToManageDeposits?: () => void;
  onNavigateToRefunds?: () => void;
  onNavigateToPage?: (page: string, entityId: string, action: "view" | "viewDocument" | "downloadReceipt") => void;
}

export function BillingDashboard({ onNavigateToCreditNotes, onNavigateToFinancialReports, onNavigateToMonthlyRental, onNavigateToManageDeposits, onNavigateToRefunds, onNavigateToPage }: BillingDashboardProps = {}) {
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/billing/recent-activity?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && Array.isArray(body.data)) {
          setRecentActivity(body.data);
          setTotal(typeof body.total === "number" ? body.total : 0);
        } else {
          setError(body.message ?? "Failed to load recent activity");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load recent activity");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[18px]">Recent Activity</CardTitle>
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const n = parseInt(v, 10);
                if ([10, 25, 50].includes(n)) {
                  setPageSize(n);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}
          {loading ? (
            <p className="text-sm text-[#6B7280] py-8">Loading recent activity…</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-8">No recent activity.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((row) => (
                    <TableRow key={row.id} className="h-14 hover:bg-[#F3F4F6]">
                      <TableCell className="text-[#374151]">
                        {new Date(row.date).toLocaleDateString(undefined, { dateStyle: "short" })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                          {typeLabel(row.entityType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#111827]">
                        {formatAmount(row.amount, row.entityType)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-[#F3F4F6]"
                          onClick={() => onNavigateToPage?.(pageForEntityType(row.entityType), row.entityId, "view")}
                          disabled={!onNavigateToPage}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (canPrev) setPage((p) => p - 1);
                        }}
                        className={!canPrev ? "pointer-events-none opacity-50" : undefined}
                        aria-disabled={!canPrev}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-2 text-sm text-[#6B7280]">
                        Page {page} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (canNext) setPage((p) => p + 1);
                        }}
                        className={!canNext ? "pointer-events-none opacity-50" : undefined}
                        aria-disabled={!canNext}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}