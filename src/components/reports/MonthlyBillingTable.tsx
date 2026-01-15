import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { MonthlyBillingRecord } from '../../types/report';

interface MonthlyBillingTableProps {
  records: MonthlyBillingRecord[];
}

export function MonthlyBillingTable({ records }: MonthlyBillingTableProps) {
  const getStatusBadge = (status: MonthlyBillingRecord['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      case 'Pending Payment':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Pending Payment</Badge>;
      case 'Overdue':
        return <Badge className="bg-red-600 hover:bg-red-700">Overdue</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl">Monthly Billing</h3>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Billing Month</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items Returned?</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Payment Proof</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.invoiceNo}>
                <TableCell>{record.invoiceNo}</TableCell>
                <TableCell>{record.project}</TableCell>
                <TableCell>{record.billingMonth}</TableCell>
                <TableCell>RM {record.amount.toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge(record.status)}</TableCell>
                <TableCell>
                  {record.itemsReturned ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </TableCell>
                <TableCell>{record.dueDate}</TableCell>
                <TableCell>
                  {record.paymentProof ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
