import { useState } from "react";
import { RefundList } from "./RefundList";
import { CreateRefund } from "./CreateRefund";
import { RefundDetails } from "./RefundDetails";

export type RefundStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected";

export interface RefundRecord {
  id: string;
  refundId: string;
  invoiceNo: string;
  invoiceType: "Deposit" | "Monthly Billing" | "Credit Note";
  customer: string;
  refundAmount: string;
  status: RefundStatus;
  createdDate: string;
  refundMethod?: string;
  reason?: string;
  supportingDocs?: string[];
  rejectionReason?: string;
  paidAmount?: string;
  invoiceItems?: string;
  approvedBy?: string;
  approvedDate?: string;
}

interface RefundManagementMainProps {
  userRole?: "Admin" | "Finance" | "Staff" | "Customer";
}

export function RefundManagementMain({ userRole = "Staff" }: RefundManagementMainProps) {
  const [currentView, setCurrentView] = useState<"list" | "create" | "details">("list");
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [refunds, setRefunds] = useState<RefundRecord[]>([
    {
      id: "1",
      refundId: "REF-2024-001",
      invoiceNo: "DEP-2024-0234",
      invoiceType: "Deposit",
      customer: "Acme Construction Ltd.",
      refundAmount: "RM5,000.00",
      status: "Pending Approval",
      createdDate: "2024-11-25",
      refundMethod: "Bank Transfer",
      reason: "Project completed. All equipment returned in good condition.",
      paidAmount: "RM5,000.00",
      invoiceItems: "Scaffolding Equipment Deposit",
    },
    {
      id: "2",
      refundId: "REF-2024-002",
      invoiceNo: "MR-2024-0156",
      invoiceType: "Monthly Billing",
      customer: "BuildRight Inc.",
      refundAmount: "RM1,200.00",
      status: "Approved",
      createdDate: "2024-11-20",
      refundMethod: "eWallet",
      reason: "Overpayment refund",
      paidAmount: "RM3,500.00",
      invoiceItems: "Monthly Rental - October 2024",
      approvedBy: "Admin",
      approvedDate: "2024-11-22",
    },
    {
      id: "3",
      refundId: "REF-2024-003",
      invoiceNo: "DEP-2024-0198",
      invoiceType: "Deposit",
      customer: "Metro Builders Sdn Bhd",
      refundAmount: "RM3,500.00",
      status: "Draft",
      createdDate: "2024-11-28",
      refundMethod: "Bank Transfer",
      reason: "Early contract termination",
      paidAmount: "RM5,000.00",
      invoiceItems: "Equipment Deposit",
    },
    {
      id: "4",
      refundId: "REF-2024-004",
      invoiceNo: "CN-2024-0045",
      invoiceType: "Credit Note",
      customer: "Premium Projects",
      refundAmount: "RM850.00",
      status: "Rejected",
      createdDate: "2024-11-15",
      refundMethod: "Cash",
      reason: "Damaged item refund claim",
      paidAmount: "RM850.00",
      invoiceItems: "Credit Note for damaged scaffolding",
      rejectionReason: "Insufficient documentation provided. Please upload damage assessment report.",
    },
    {
      id: "5",
      refundId: "REF-2024-005",
      invoiceNo: "DEP-2024-0302",
      invoiceType: "Deposit",
      customer: "City Construction Group",
      refundAmount: "RM7,500.00",
      status: "Approved",
      createdDate: "2024-11-10",
      refundMethod: "Bank Transfer",
      reason: "Project completion, no outstanding issues",
      paidAmount: "RM7,500.00",
      invoiceItems: "Full Equipment Deposit",
      approvedBy: "Finance Manager",
      approvedDate: "2024-11-12",
    },
  ]);

  const handleCreateNew = () => {
    setCurrentView("create");
  };

  const handleViewDetails = (refund: RefundRecord) => {
    setSelectedRefund(refund);
    setCurrentView("details");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedRefund(null);
  };

  const handleSaveRefund = (newRefund: RefundRecord) => {
    setRefunds([...refunds, newRefund]);
    setCurrentView("list");
  };

  const handleUpdateRefund = (updatedRefund: RefundRecord) => {
    setRefunds(refunds.map(r => r.id === updatedRefund.id ? updatedRefund : r));
    if (currentView === "details") {
      setSelectedRefund(updatedRefund);
    }
  };

  const handleApproveRefund = (refundId: string) => {
    const updatedRefunds = refunds.map(r => {
      if (r.id === refundId) {
        return {
          ...r,
          status: "Approved" as RefundStatus,
          approvedBy: userRole,
          approvedDate: new Date().toISOString().split('T')[0],
        };
      }
      return r;
    });
    setRefunds(updatedRefunds);
    const updated = updatedRefunds.find(r => r.id === refundId);
    if (updated) {
      setSelectedRefund(updated);
    }
  };

  const handleRejectRefund = (refundId: string, reason: string) => {
    const updatedRefunds = refunds.map(r => {
      if (r.id === refundId) {
        return {
          ...r,
          status: "Rejected" as RefundStatus,
          rejectionReason: reason,
        };
      }
      return r;
    });
    setRefunds(updatedRefunds);
    const updated = updatedRefunds.find(r => r.id === refundId);
    if (updated) {
      setSelectedRefund(updated);
    }
  };

  if (currentView === "create") {
    return <CreateRefund onBack={handleBackToList} onSave={handleSaveRefund} />;
  }

  if (currentView === "details" && selectedRefund) {
    return (
      <RefundDetails
        refund={selectedRefund}
        userRole={userRole}
        onBack={handleBackToList}
        onApprove={handleApproveRefund}
        onReject={handleRejectRefund}
        onUpdate={handleUpdateRefund}
      />
    );
  }

  return (
    <RefundList
      refunds={refunds}
      onCreateNew={handleCreateNew}
      onViewDetails={handleViewDetails}
    />
  );
}
