import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DepositRecord, MonthlyBillingRecord, CreditNoteRecord } from '../../types/report';
import { formatRfqDate } from '../../lib/rfqDate';

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

interface FinancialData {
  deposits: DepositRecord[];
  billingRecords: MonthlyBillingRecord[];
  creditNotes: CreditNoteRecord[];
}

export function ReportPrintLayout({
  reportType,
  statusFilter,
  customerFilter,
  dateFrom,
  dateTo,
  onClose
}: ReportPrintLayoutProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData>({
    deposits: [],
    billingRecords: [],
    creditNotes: []
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom.toISOString());
        if (dateTo) params.set('dateTo', dateTo.toISOString());

        const response = await fetch(`/api/reports/financial?${params}`);
        if (!response.ok) throw new Error('Failed to fetch data');

        const result = await response.json();

        // Transform API data to component format
        const deposits: DepositRecord[] = [];
        const billingRecords: MonthlyBillingRecord[] = [];
        const creditNotes: CreditNoteRecord[] = [];

        // Map customer data to deposit records format
        if (result.customerData) {
          result.customerData.forEach((customer: { customerId: string; customerName: string; depositsPaid: number; depositsOutstanding: number; status: string; lastPaymentDate: string | null }) => {
            if (customer.depositsPaid > 0 || customer.depositsOutstanding > 0) {
              deposits.push({
                invoiceNo: `DEP-${customer.customerId}`,
                customer: customer.customerName,
                depositAmount: customer.depositsPaid + customer.depositsOutstanding,
                status: customer.depositsOutstanding > 0 ? 'Pending Approval' : 'Paid',
                proofUploaded: customer.depositsPaid > 0,
                date: customer.lastPaymentDate ? formatRfqDate(customer.lastPaymentDate) : '-'
              });
            }
          });
        }

        // Map monthly data to billing records format
        if (result.monthlyData) {
          result.monthlyData.forEach((month: { period: string; month: string; totalInvoiced: number; totalPaid: number; status: string; numberOfInvoices: number }) => {
            billingRecords.push({
              invoiceNo: `MRI-${month.period}`,
              project: 'All Projects',
              billingMonth: month.month,
              amount: month.totalInvoiced,
              status: month.totalPaid >= month.totalInvoiced ? 'Paid' : 
                      month.status === 'Critical' ? 'Overdue' : 'Pending Payment',
              itemsReturned: false,
              dueDate: month.month,
              paymentProof: month.totalPaid > 0
            });
          });
        }

        // Map invoice status breakdown to credit notes
        if (result.invoiceStatusBreakdown) {
          result.invoiceStatusBreakdown.forEach((status: { status: string; count: number; amount: number }, index: number) => {
            if (status.status !== 'Paid') {
              creditNotes.push({
                cnNo: `CN-${String(index + 1).padStart(3, '0')}`,
                invoiceNo: `Various`,
                customer: 'Multiple Customers',
                item: `${status.status} Invoices`,
                quantityAdjusted: `${status.count} invoices`,
                priceAdjusted: `RM ${status.amount.toLocaleString()}`,
                reason: 'Invoice Status Summary',
                status: status.status === 'Overdue' ? 'Pending Approval' : 'Paid'
              });
            }
          });
        }

        setData({ deposits, billingRecords, creditNotes });
      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateFrom, dateTo]);
  
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
    return customer.toLowerCase().includes(customerFilter.toLowerCase());
  };

  const filteredDepositRecords = data.deposits.filter(
    record => filterByStatus(record.status) && filterByCustomer(record.customer)
  );

  const filteredMonthlyBillingRecords = data.billingRecords.filter(
    record => filterByStatus(record.status) && filterByCustomer(record.project)
  );

  const filteredCreditNoteRecords = data.creditNotes.filter(
    record => filterByStatus(record.status) && filterByCustomer(record.customer)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-[#F15929] mx-auto mb-4" />
          <p className="text-gray-600">Loading financial data from database...</p>
          <div className="print:hidden mt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                  Period: {formatRfqDate(dateFrom)} - {formatRfqDate(dateTo)}
                </p>
              )}
              <p className="text-xs text-green-600 mt-1">
                Data from database
              </p>
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
                  <td colSpan={2} className="border px-2 py-2 font-semibold">Total</td>
                  <td className="border px-2 py-2 text-right font-semibold">
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
                  <td colSpan={3} className="border px-2 py-2 font-semibold">Total</td>
                  <td className="border px-2 py-2 text-right font-semibold">
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

        {/* No data message */}
        {filteredDepositRecords.length === 0 && 
         filteredMonthlyBillingRecords.length === 0 && 
         filteredCreditNoteRecords.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No records found matching the selected filters.
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
          Printed on: {format(new Date(), 'PPP p')} | Data sourced from database
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
