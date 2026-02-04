import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefundInvoiceType, RelatedCreditNote } from '../types/refund';

interface CreditNoteSummaryState {
  creditNotes: RelatedCreditNote[];
  totalCredited: number;
  amountToReturn: number;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: CreditNoteSummaryState = {
  creditNotes: [],
  totalCredited: 0,
  amountToReturn: 0,
  loading: false,
  error: null,
};

export interface UseCreditNotesForSourceReturn extends CreditNoteSummaryState {
  refresh: () => Promise<void>;
  hasData: boolean;
}

/**
 * Fetches approved credit notes for a given invoice source and exposes derived totals.
 */
export function useCreditNotesForSource(
  invoiceType?: RefundInvoiceType,
  sourceId?: string
): UseCreditNotesForSourceReturn {
  const [state, setState] = useState<CreditNoteSummaryState>(INITIAL_STATE);

  const resetState = useCallback(() => setState(INITIAL_STATE), []);

  const fetchSummary = useCallback(async () => {
    if (!invoiceType || !sourceId) {
      resetState();
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        invoiceType,
        sourceId,
      });
      const response = await fetch(`/api/refunds/invoice-details?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load credit note summary');
      }

      const json = await response.json();
      setState({
        creditNotes: json.relatedCreditNotes ?? [],
        totalCredited: Number(json.totalCredited) || 0,
        amountToReturn: Number(json.amountToReturn) || 0,
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load credit note summary';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, [invoiceType, resetState, sourceId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const refresh = useCallback(async () => {
    await fetchSummary();
  }, [fetchSummary]);

  const hasData = useMemo(
    () => state.creditNotes.length > 0 || state.totalCredited > 0 || state.amountToReturn > 0,
    [state.amountToReturn, state.creditNotes.length, state.totalCredited]
  );

  return {
    ...state,
    refresh,
    hasData,
  };
}
