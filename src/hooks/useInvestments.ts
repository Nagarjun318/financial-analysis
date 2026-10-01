import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client as neonClient, isNeonConfigured } from '../services/neonClient';

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

interface InvestmentRow {
  id: string;
  name: string;
  type: Investment['type'];
  invested_amount: string | number | null;
  current_value: string | number | null;
  date: string;
  notes?: string | null;
  quantity?: number | null;
  symbol?: string | null;
  last_updated?: string | null;
  auto_refresh?: boolean | null;
}

const mapRow = (item: InvestmentRow): Investment => ({
  id: item.id,
  name: item.name,
  type: item.type,
  investedAmount: parseFloat(String(item.invested_amount ?? 0)) || 0,
  currentValue: parseFloat(String(item.current_value ?? 0)) || 0,
  date: item.date,
  notes: item.notes || '',
  quantity: item.quantity || undefined,
  symbol: item.symbol || undefined,
  lastUpdated: item.last_updated || undefined,
  autoRefresh: item.auto_refresh || false,
});

const toDbRow = (userId: string, inv: Omit<Investment, 'id'>) => ({
  user_id: userId,
  name: inv.name,
  type: inv.type,
  invested_amount: inv.investedAmount,
  current_value: inv.currentValue,
  date: inv.date,
  notes: inv.notes || null,
  quantity: inv.quantity ?? null,
  symbol: inv.symbol ?? null,
  last_updated: inv.lastUpdated ?? null,
  auto_refresh: inv.autoRefresh ?? false,
});

export const INVESTMENTS_QUERY_KEY = ['investments'];

export function useInvestments(userId: string | undefined) {
  const queryClient = useQueryClient();

  const investmentsQuery = useQuery({
    queryKey: [...INVESTMENTS_QUERY_KEY, userId],
    enabled: Boolean(userId) && isNeonConfigured,
    queryFn: async (): Promise<Investment[]> => {
      if (!userId || !isNeonConfigured) return [];
      const { data, error: fetchError } = await (neonClient as any)
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (fetchError) throw fetchError;
      return ((data || []) as InvestmentRow[]).map(mapRow);
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: async (investment: Omit<Investment, 'id'>) => {
      if (!userId) throw new Error('Missing user id');
      const { error } = await (neonClient as any)
        .from('investments')
        .insert(toDbRow(userId, investment));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Investment> }) => {
      if (!userId) throw new Error('Missing user id');
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.investedAmount !== undefined) dbUpdates.invested_amount = updates.investedAmount;
      if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.symbol !== undefined) dbUpdates.symbol = updates.symbol;
      if (updates.lastUpdated !== undefined) dbUpdates.last_updated = updates.lastUpdated;
      if (updates.autoRefresh !== undefined) dbUpdates.auto_refresh = updates.autoRefresh;
      const { error } = await (neonClient as any)
        .from('investments')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Missing user id');
      const { error } = await (neonClient as any)
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    investments: investmentsQuery.data ?? [],
    isLoading: investmentsQuery.isLoading,
    error: investmentsQuery.error ? (investmentsQuery.error as Error).message : null,
    refreshInvestments: () =>
      queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY }),
    refetch: investmentsQuery.refetch,
    addInvestment: addMutation.mutateAsync,
    updateInvestment: (id: string, updates: Partial<Investment>) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteInvestment: deleteMutation.mutateAsync,
  };
}
