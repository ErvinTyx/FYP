import { FileText, Calendar, DollarSign, AlertCircle, Printer, Eye } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useState } from 'react';
import { DamageInvoice } from '../../types/inspection';
import { DamageInvoicePrint } from './DamageInvoicePrint';

interface DamageInvoiceListProps {
  invoices: DamageInvoice[];
  searchQuery: string;
}

export function DamageInvoiceList({ invoices, searchQuery }: DamageInvoiceListProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<DamageInvoice | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.orpNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPaymentStatusColor = (status: DamageInvoice['paymentStatus']) => {
    const colors = {
      'pending': 'bg-amber-100 text-amber-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const handlePrintInvoice = (invoice: DamageInvoice) => {
    setSelectedInvoice(invoice);
    setShowPrintPreview(true);
  };

  if (showPrintPreview && selectedInvoice) {
    return (
      <DamageInvoicePrint
        invoice={selectedInvoice}
        onClose={() => {
          setShowPrintPreview(false);
          setSelectedInvoice(null);
        }}
      />
    );
  }

  if (filteredInvoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="size-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No damage invoices found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try adjusting your search' : 'Invoices will appear here when repairs are billed'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredInvoices.map(invoice => (
        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-[#231F20]">{invoice.invoiceNumber}</h3>
                      {invoice.paymentStatus === 'paid' && (
                        <Badge className={getPaymentStatusColor(invoice.paymentStatus)}>
                          {invoice.paymentStatus.toUpperCase()}
                        </Badge>
                      )}
                      {invoice.paymentStatus === 'overdue' && (
                        <Badge className={getPaymentStatusColor(invoice.paymentStatus)}>
                          {invoice.paymentStatus.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">ORP: {invoice.orpNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Invoice Date</p>
                      <p className="text-[#231F20]">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {invoice.vendor && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Vendor</p>
                        <p className="text-[#231F20]">{invoice.vendor}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Line Items</p>
                      <p className="text-[#231F20]">{invoice.items.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Total Amount</p>
                      <p className="text-[#231F20]">RM {invoice.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {invoice.paidDate && (
                  <div className="text-sm text-green-600">
                    Paid on {new Date(invoice.paidDate).toLocaleDateString()}
                  </div>
                )}

                {invoice.notes && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm text-[#231F20] mt-1">{invoice.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 lg:ml-4">
                <Button
                  onClick={() => handlePrintInvoice(invoice)}
                  className="bg-[#F15929] hover:bg-[#d94d1f]"
                >
                  <Printer className="size-4 mr-2" />
                  Print Invoice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}