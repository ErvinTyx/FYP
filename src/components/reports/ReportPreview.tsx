import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DepositRecordsTable } from './DepositRecordsTable';
import { MonthlyBillingTable } from './MonthlyBillingTable';
import { CreditNotesTable } from './CreditNotesTable';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { DepositRecord, MonthlyBillingRecord, CreditNoteRecord } from '../../types/report';

type ReportType = 'all' | 'deposit' | 'monthly-billing' | 'credit-note';
type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'rejected' | 'pending-approval';

interface ReportPreviewProps {
  reportType: ReportType;
  statusFilter: StatusFilter;
  customerFilter: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface FinancialData {
  deposits: DepositRecord[];
  billingRecords: MonthlyBillingRecord[];
  creditNotes: CreditNoteRecord[];
}

export function ReportPreview({ 
  reportType, 
  statusFilter, 
  customerFilter,
  dateFrom,
  dateTo 
}: ReportPreviewProps) {
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
                date: customer.lastPaymentDate ? new Date(customer.lastPaymentDate).toLocaleDateString() : '-'
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

        // Map invoice status breakdown to credit notes (for demonstration)
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

  // Calculate summary statistics
  const depositTotal = filteredDepositRecords.reduce((sum, r) => sum + r.depositAmount, 0);
  const depositPaid = filteredDepositRecords.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.depositAmount, 0);
  
  const billingTotal = filteredMonthlyBillingRecords.reduce((sum, r) => sum + r.amount, 0);
  const billingPaid = filteredMonthlyBillingRecords.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-[#F15929]" />
        <span className="ml-2 text-gray-600">Loading financial data from database...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle style={{ color: '#231F20' }}>
            {reportType === 'all' ? 'Consolidated Financial Report' :
             reportType === 'deposit' ? 'Deposit Report' :
             reportType === 'monthly-billing' ? 'Monthly Billing Report' :
             'Credit Note Report'}
          </CardTitle>
          <div className="text-sm text-gray-600">
            Generated on: {format(new Date(), 'PPP p')}
            {dateFrom && dateTo && (
              <span className="ml-4">
                Period: {format(dateFrom, 'PP')} - {format(dateTo, 'PP')}
              </span>
            )}
            <span className="ml-4 text-green-600">(Real-time data from database)</span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl" style={{ color: '#F15929' }}>
                  RM {depositTotal.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {filteredDepositRecords.length} record(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deposits Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-green-600">
                  RM {depositPaid.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {filteredDepositRecords.filter(r => r.status === 'Paid').length} record(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Monthly Billing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl" style={{ color: '#F15929' }}>
                  RM {billingTotal.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {filteredMonthlyBillingRecords.length} invoice(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Billing Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-green-600">
                  RM {billingPaid.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {filteredMonthlyBillingRecords.filter(r => r.status === 'Paid').length} invoice(s)
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Tables */}
      {(reportType === 'all' || reportType === 'deposit') && filteredDepositRecords.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <DepositRecordsTable records={filteredDepositRecords} />
          </CardContent>
        </Card>
      )}

      {(reportType === 'all' || reportType === 'monthly-billing') && filteredMonthlyBillingRecords.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <MonthlyBillingTable records={filteredMonthlyBillingRecords} />
          </CardContent>
        </Card>
      )}

      {(reportType === 'all' || reportType === 'credit-note') && filteredCreditNoteRecords.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <CreditNotesTable records={filteredCreditNoteRecords} />
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {filteredDepositRecords.length === 0 && 
       filteredMonthlyBillingRecords.length === 0 && 
       filteredCreditNoteRecords.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No records found matching the selected filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
