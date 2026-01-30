/**
 * RFQ API Hook Module
 * Module: Request for Quotation (RFQ)
 * Purpose: React hook for managing RFQ API operations
 * 
 * Provides functions for:
 * - Creating RFQs
 * - Fetching RFQs
 * - Updating RFQs
 * - Deleting RFQs
 */

import { useState, useCallback } from 'react';
import { RFQ } from '../types/rfq';

export interface UseRFQReturn {
  rfqs: RFQ[];
  loading: boolean;
  error: string | null;
  createRFQ: (data: any) => Promise<RFQ>;
  fetchRFQs: (filters?: any) => Promise<void>;
  fetchRFQById: (id: string) => Promise<RFQ>;
  updateRFQ: (id: string, data: any) => Promise<RFQ>;
  deleteRFQ: (id: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing RFQ API operations
 */
export function useRFQAPI(): UseRFQReturn {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create a new RFQ
   */
  const createRFQ = useCallback(async (data: any): Promise<RFQ> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rfq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create RFQ');
      }

      const result = await response.json();
      setRfqs((prev) => [result.data, ...prev]);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create RFQ';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch all RFQs with optional filters
   */
  const fetchRFQs = useCallback(async (filters?: any) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, String(value));
        });
      }

      const response = await fetch(
        `/api/rfq${queryParams.toString() ? '?' + queryParams.toString() : ''}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch RFQs');
      }

      const result = await response.json();
      setRfqs(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch RFQs';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a specific RFQ by ID
   */
  const fetchRFQById = useCallback(async (id: string): Promise<RFQ> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfq/${id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch RFQ');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch RFQ';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update an existing RFQ
   */
  const updateRFQ = useCallback(async (id: string, data: any): Promise<RFQ> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfq/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update RFQ');
      }

      const result = await response.json();
      setRfqs((prev) =>
        prev.map((rfq) => (rfq.id === id ? result.data : rfq))
      );
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update RFQ';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete an RFQ
   */
  const deleteRFQ = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfq/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete RFQ');
      }

      setRfqs((prev) => prev.filter((rfq) => rfq.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete RFQ';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rfqs,
    loading,
    error,
    createRFQ,
    fetchRFQs,
    fetchRFQById,
    updateRFQ,
    deleteRFQ,
    clearError,
  };
}
