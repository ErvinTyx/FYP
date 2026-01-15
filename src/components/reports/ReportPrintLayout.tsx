import React from 'react';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { sampleDepositRecords, sampleMonthlyBillingRecords, sampleCreditNoteRecords } from '../../types/report';
import { format } from 'date-fns';

type ReportType = 'all' | 'deposit' | 'monthly-billing' | 'credit-note';
type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'rejected' | 'pending-approval';

interface ReportPrintLayoutProps {
  reportType: ReportType;
  statusFilter: StatusFilter;
  customerFilter: string;
  dateFrom?: Date;
  dateTo?: Date;
  onClose: () => void;
}

export function ReportPrintLayout({
  reportType,
  statusFilter,
  customerFilter,
  dateFrom,
  dateTo,
  onClose
}: ReportPrintLayoutProps) {
  
  // Filter data based on filters
  const filterByStatus = (status: string) => {
    if (statusFilter === 'all') return true;
    
    const statusMap: { [key: string]: string[] } = {
      'paid': ['Paid'],
      'pending': ['Pending Payment', 'Pending Approval'],
      'overdue': ['Overdue'],
      'rejected': ['Rejected'],
      'pending-approval': ['Pending Approval']
    };
    
    return statusMap[statusFilter]?.includes(status);
  };

  const filterByCustomer = (customer: string) => {
    if (customerFilter === 'all') return true;
    
    const customerMap: { [key: string]: string[] } = {
      'alpha-construction': ['Alpha Construction'],
      'beta-builders': ['Beta Builders'],
      'citra-engineering': ['Citra Engineering'],
      'kl-tower': ['KL Tower Project'],
      'pj-mall': ['PJ Mall']
    };
    
    return customerMap[customerFilter]?.includes(customer);
  };

  const filteredDepositRecords = sampleDepositRecords.filter(
    record => filterByStatus(record.status) && filterByCustomer(record.customer)
  );

  const filteredMonthlyBillingRecords = sampleMonthlyBillingRecords.filter(
    record => filterByStatus(record.status) && filterByCustomer(record.project)
  );

  const filteredCreditNoteRecords = sampleCreditNoteRecords.filter(
    record => filterByStatus(record.status) && filterByCustomer(record.customer)
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Close button - hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close Print Preview
        </Button>
      </div>

      {/* Print content */}
      <div className="max-w-[210mm] mx-auto p-8 print:p-0">
        {/* Header */}
        <div className="mb-8 pb-4 border-b-2" style={{ borderColor: '#231F20' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl mb-1" style={{ color: '#F15929' }}>
                Power Metal & Steel
              </h1>
              <p className="text-sm text-gray-600">ERP & CRM System</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl" style={{ color: '#231F20' }}>
                {reportType === 'all' ? 'Consolidated Report' :
                 reportType === 'deposit' ? 'Deposit Report' :
                 reportType === 'monthly-billing' ? 'Monthly Billing Report' :
                 'Credit Note Report'}
              </h2>
              <p className="text-sm text-gray-600">
                Generated: {format(new Date(), 'PPP p')}
              </p>
              {dateFrom && dateTo && (
                <p className="text-sm text-gray-600">
                  Period: {format(dateFrom, 'PP')} - {format(dateTo, 'PP')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Deposit Records Table */}
        {(reportType === 'all' || reportType === 'deposit') && filteredDepositRecords.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg mb-3" style={{ color: '#231F20' }}>
              Deposit Records
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F5F5F5' }}>
                  <th className="border px-2 py-2 text-left">Invoice No</th>
                  <th className="border px-2 py-2 text-left">Customer</th>
                  <th className="border px-2 py-2 text-right">Deposit Amount</th>
                  <th className="border px-2 py-2 text-left">Status</th>
                  <th className="border px-2 py-2 text-center">Proof</th>
                  <th className="border px-2 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepositRecords.map((record) => (
                  <tr key={record.invoiceNo}>
                    <td className="border px-2 py-2">{record.invoiceNo}</td>
                    <td className="border px-2 py-2">{record.customer}</td>
                    <td className="border px-2 py-2 text-right">RM {record.depositAmount.toLocaleString()}</td>
                    <td className="border px-2 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        record.status === 'Pending Approval' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="border px-2 py-2 text-center">
                      {record.proofUploaded ? 'Yes' : 'No'}
                    </td>
                    <td className="border px-2 py-2">{record.date}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#F5F5F5' }}>
                  <td colSpan={2} className="border px-2 py-2">Total</td>
                  <td className="border px-2 py-2 text-right">
                    RM {filteredDepositRecords.reduce((sum, r) => sum + r.depositAmount, 0).toLocaleString()}
                  </td>
                  <td colSpan={3} className="border px-2 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Monthly Billing Table */}
        {(reportType === 'all' || reportType === 'monthly-billing') && filteredMonthlyBillingRecords.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg mb-3" style={{ color: '#231F20' }}>
              Monthly Billing
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F5F5F5' }}>
                  <th className="border px-2 py-2 text-left">Invoice No</th>
                  <th className="border px-2 py-2 text-left">Project</th>
                  <th className="border px-2 py-2 text-left">Month</th>
                  <th className="border px-2 py-2 text-right">Amount</th>
                  <th className="border px-2 py-2 text-left">Status</th>
                  <th className="border px-2 py-2 text-center">Returned</th>
                  <th className="border px-2 py-2 text-left">Due Date</th>
                  <th className="border px-2 py-2 text-center">Proof</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlyBillingRecords.map((record) => (
                  <tr key={record.invoiceNo}>
                    <td className="border px-2 py-2">{record.invoiceNo}</td>
                    <td className="border px-2 py-2">{record.project}</td>
                    <td className="border px-2 py-2">{record.billingMonth}</td>
                    <td className="border px-2 py-2 text-right">RM {record.amount.toLocaleString()}</td>
                    <td className="border px-2 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        record.status === 'Pending Payment' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="border px-2 py-2 text-center">
                      {record.itemsReturned ? 'Yes' : 'No'}
                    </td>
                    <td className="border px-2 py-2">{record.dueDate}</td>
                    <td className="border px-2 py-2 text-center">
                      {record.paymentProof ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#F5F5F5' }}>
                  <td colSpan={3} className="border px-2 py-2">Total</td>
                  <td className="border px-2 py-2 text-right">
                    RM {filteredMonthlyBillingRecords.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                  </td>
                  <td colSpan={4} className="border px-2 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Credit Notes Table */}
        {(reportType === 'all' || reportType === 'credit-note') && filteredCreditNoteRecords.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg mb-3" style={{ color: '#231F20' }}>
              Credit Notes
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F5F5F5' }}>
                  <th className="border px-2 py-2 text-left">CN No</th>
                  <th className="border px-2 py-2 text-left">Invoice No</th>
                  <th className="border px-2 py-2 text-left">Customer</th>
                  <th className="border px-2 py-2 text-left">Item</th>
                  <th className="border px-2 py-2 text-left">Qty Adjusted</th>
                  <th className="border px-2 py-2 text-left">Price Adjusted</th>
                  <th className="border px-2 py-2 text-left">Reason</th>
                  <th className="border px-2 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreditNoteRecords.map((record) => (
                  <tr key={record.cnNo}>
                    <td className="border px-2 py-2">{record.cnNo}</td>
                    <td className="border px-2 py-2">{record.invoiceNo}</td>
                    <td className="border px-2 py-2">{record.customer}</td>
                    <td className="border px-2 py-2">{record.item}</td>
                    <td className="border px-2 py-2">{record.quantityAdjusted}</td>
                    <td className="border px-2 py-2">{record.priceAdjusted}</td>
                    <td className="border px-2 py-2">{record.reason}</td>
                    <td className="border px-2 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        record.status === 'Pending Approval' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-sm text-gray-600 flex justify-between">
          <div>
            Power Metal & Steel - Financial Report
          </div>
          <div>
            Page 1 of 1
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 text-center">
          Printed on: {format(new Date(), 'PPP p')}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
