import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DepositRecordsTable } from './DepositRecordsTable';
import { MonthlyBillingTable } from './MonthlyBillingTable';
import { CreditNotesTable } from './CreditNotesTable';
import { sampleDepositRecords, sampleMonthlyBillingRecords, sampleCreditNoteRecords } from '../../types/report';
import { format } from 'date-fns';

type ReportType = 'all' | 'deposit' | 'monthly-billing' | 'credit-note';
type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'rejected' | 'pending-approval';

interface ReportPreviewProps {
  reportType: ReportType;
  statusFilter: StatusFilter;
  customerFilter: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function ReportPreview({ 
  reportType, 
  statusFilter, 
  customerFilter,
  dateFrom,
  dateTo 
}: ReportPreviewProps) {
  
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

  // Calculate summary statistics
  const depositTotal = filteredDepositRecords.reduce((sum, r) => sum + r.depositAmount, 0);
  const depositPaid = filteredDepositRecords.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.depositAmount, 0);
  
  const billingTotal = filteredMonthlyBillingRecords.reduce((sum, r) => sum + r.amount, 0);
  const billingPaid = filteredMonthlyBillingRecords.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.amount, 0);

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
