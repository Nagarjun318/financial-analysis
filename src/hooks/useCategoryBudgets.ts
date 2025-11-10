import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export interface CategoryBudgetRecord {
  id?: number;
  user_id: string;
  category: string;
  budget: number;
  created_at?: string;
}

const QUERY_KEY = ['category_budget'];

export function useCategoryBudgets(userId: string | undefined) {
  const qc = useQueryClient();

  const budgetsQuery = useQuery({
    queryKey: [...QUERY_KEY, userId],
    enabled: Boolean(userId) && isSupabaseConfigured,
    queryFn: async () => {
      if (!userId || !isSupabaseConfigured) return [] as CategoryBudgetRecord[];
      const { data, error } = await (supabase as any)
        .from('category_budget')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data as CategoryBudgetRecord[];
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: { category: string; budget: number }) => {
      if (!userId) throw new Error('Missing user id');
      const { error } = await (supabase as any)
        .from('category_budget')
        .upsert({ user_id: userId, category: payload.category, budget: payload.budget })
        .select();
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY })
  });

  const deleteMutation = useMutation({
    mutationFn: async (category: string) => {
      if (!userId) throw new Error('Missing user id');
      const { error } = await (supabase as any)
        .from('category_budget')
        .delete()
        .eq('user_id', userId)
        .eq('category', category);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY })
  });

  return {
    budgets: budgetsQuery.data || [],
    loading: budgetsQuery.isLoading,
    error: budgetsQuery.error,
    saveBudget: upsertMutation.mutateAsync,
    removing: deleteMutation.isPending,
    removeBudget: deleteMutation.mutateAsync,
  };
}

// Utility to compute variance using server budgets
export function computeCategoryBudgetVariance(
  monthKey: string,
  category: string,
  transactions: { date: string; type: 'debit' | 'credit'; amount: number; category: string }[],
  budgets: CategoryBudgetRecord[]
) {
  const record = budgets.find(b => b.category === category);
  if (!record) return null;
  let actual = 0;
  for (const t of transactions) {
    if (t.type === 'debit' && t.date.startsWith(monthKey) && t.category.split('-').includes(category)) {
      actual += Math.abs(t.amount);
    }
  }
  const target = record.budget;
  return {
    category,
    monthKey,
    actual,
    target,
    variance: actual - target,
    percent: target > 0 ? actual / target : undefined,
  };
}