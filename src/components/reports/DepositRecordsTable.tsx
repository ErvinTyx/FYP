import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { DepositRecord } from '../../types/report';

interface DepositRecordsTableProps {
  records: DepositRecord[];
}

export function DepositRecordsTable({ records }: DepositRecordsTableProps) {
  const getStatusBadge = (status: DepositRecord['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      case 'Pending Approval':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Pending Approval</Badge>;
      case 'Overdue':
        return <Badge className="bg-red-600 hover:bg-red-700">Overdue</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl">Deposit Records</h3>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Deposit Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proof Uploaded</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.invoiceNo}>
                <TableCell>{record.invoiceNo}</TableCell>
                <TableCell>{record.customer}</TableCell>
                <TableCell>RM {record.depositAmount.toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge(record.status)}</TableCell>
                <TableCell>
                  {record.proofUploaded ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </TableCell>
                <TableCell>{record.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
