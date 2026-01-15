import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { CreditNoteRecord } from '../../types/report';

interface CreditNotesTableProps {
  records: CreditNoteRecord[];
}

export function CreditNotesTable({ records }: CreditNotesTableProps) {
  const getStatusBadge = (status: CreditNoteRecord['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      case 'Pending Approval':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Pending Approval</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-600 hover:bg-red-700">Rejected</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl">Credit Notes</h3>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CN No</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Quantity Adjusted</TableHead>
              <TableHead>Price Adjusted</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.cnNo}>
                <TableCell>{record.cnNo}</TableCell>
                <TableCell>{record.invoiceNo}</TableCell>
                <TableCell>{record.customer}</TableCell>
                <TableCell>{record.item}</TableCell>
                <TableCell>{record.quantityAdjusted}</TableCell>
                <TableCell>{record.priceAdjusted}</TableCell>
                <TableCell>{record.reason}</TableCell>
                <TableCell>{getStatusBadge(record.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
