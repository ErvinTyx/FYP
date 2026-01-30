import { useState, useEffect, useCallback } from 'react';
import { MonthlyRentalInvoiceList } from './MonthlyRentalInvoiceList';
import { MonthlyRentalInvoiceDetails } from './MonthlyRentalInvoiceDetails';
import { MonthlyRentalInvoice } from '../../types/monthly-rental';
import { toast } from 'sonner';
import { uploadPaymentProof } from '@/lib/upload';
import { Loader2 } from 'lucide-react';

type View = 'list' | 'details';

interface MonthlyRentalBillingProps {
  userRole?: 'super_user' | 'Admin' | 'Finance' | 'Staff' | 'Customer';
}

export function MonthlyRentalBilling({ userRole = 'Admin' }: MonthlyRentalBillingProps) {
  const [currentView, setCurrentView] = useState<View>('list');
  const [invoices, setInvoices] = useState<MonthlyRentalInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch invoices from API
  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/monthly-rental');
      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.invoices || []);
      } else {
        console.error('Failed to fetch invoices:', data.message);
        toast.error(data.message || 'Failed to load invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load invoices on mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleView = (id: string) => {
    setSelectedInvoiceId(id);
    setCurrentView('details');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedInvoiceId(null);
    // Refresh the list when going back
    fetchInvoices();
  };

  const handleSubmitPayment = async (invoiceId: string, file: File) => {
    try {
      setIsProcessing(true);
      
      // Upload file to server
      toast.info('Uploading payment proof...');
      const uploadResult = await uploadPaymentProof(file);
      
      if (!uploadResult.success || !uploadResult.url) {
        toast.error(uploadResult.error || 'Failed to upload payment proof');
        return;
      }
      
      // Update invoice via API
      const response = await fetch('/api/monthly-rental', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: invoiceId,
          action: 'upload-proof',
          paymentProofUrl: uploadResult.url,
          paymentProofFileName: file.name,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Payment proof submitted successfully');
        // Update local state
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? data.invoice : inv
        ));
        setCurrentView('list');
      } else {
        toast.error(data.message || 'Failed to submit payment proof');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('An error occurred while submitting payment proof');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditPayment = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setCurrentView('details');
  };

  const handleApprove = async (invoiceId: string, referenceNumber: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/monthly-rental', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: invoiceId,
          action: 'approve',
          referenceNumber,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Payment approved successfully');
        // Update local state
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? data.invoice : inv
        ));
        setCurrentView('list');
      } else {
        toast.error(data.message || 'Failed to approve payment');
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('An error occurred while approving payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (invoiceId: string, reason: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/monthly-rental', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: invoiceId,
          action: 'reject',
          rejectionReason: reason,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.error('Payment rejected');
        // Update local state
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? data.invoice : inv
        ));
        setCurrentView('list');
      } else {
        toast.error(data.message || 'Failed to reject payment');
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('An error occurred while rejecting payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsReturned = async (invoiceId: string) => {
    // This functionality would require backend support
    // For now, show a message that this is handled through the Return module
    toast.info('Items return is handled through the Return Request module');
  };

  const selectedInvoice = selectedInvoiceId
    ? invoices.find(inv => inv.id === selectedInvoiceId)
    : null;

  // Show loading state
  if (isLoading && currentView === 'list') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#F15929]" />
        <span className="ml-2 text-[#6B7280]">Loading invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentView === 'list' && (
        <>
          <div className="space-y-2">
            <h1>Monthly Rental Billing</h1>
            <p className="text-[#374151]">
              Automated monthly rental invoicing with payment tracking and approval workflows
            </p>
          </div>
          
          <MonthlyRentalInvoiceList
            invoices={invoices}
            onView={handleView}
            onEditPayment={handleEditPayment}
            userRole={userRole}
          />
        </>
      )}
      
      {currentView === 'details' && selectedInvoice && (
        <MonthlyRentalInvoiceDetails
          invoice={selectedInvoice}
          onBack={handleBack}
          onSubmitPayment={handleSubmitPayment}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkAsReturned={handleMarkAsReturned}
          userRole={userRole}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
