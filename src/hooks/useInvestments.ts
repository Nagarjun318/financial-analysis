import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface Investment {
  id: string;
  name: string;
  type: 'Stock' | 'Mutual Fund' | 'Crypto' | 'Gold' | 'Real Estate' | 'Bond' | 'ETF' | 'Other';
  investedAmount: number;
  currentValue: number;
  date: string;
  notes?: string;
  quantity?: number;
  symbol?: string;
  lastUpdated?: string;
  autoRefresh?: boolean;
}

export function useInvestments(userId: string) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvestments = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('investments')
        .select('*')
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform database format to component format
      const transformedData: Investment[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        investedAmount: parseFloat(item.invested_amount),
        currentValue: parseFloat(item.current_value),
        date: item.date,
        notes: item.notes || '',
        quantity: item.quantity || undefined,
        symbol: item.symbol || undefined,
        lastUpdated: item.last_updated || undefined,
        autoRefresh: item.auto_refresh || false
      }));

      setInvestments(transformedData);
    } catch (err) {
      console.error('Error loading investments:', err);
      setError('Failed to load investments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, [userId]);

  return {
    investments,
    isLoading,
    error,
    refreshInvestments: loadInvestments
  };
}
