import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Transaction } from '../types';

// Raw row shape from database (assuming normalized lowercase columns)
// Support both legacy capitalized column names and normalized lowercase ones.
// Using index signature to allow accessing dynamic properties during mapping.
interface TransactionRow {
  id: number;
  user_id: string;
  date: string; // ISO or YYYY-MM-DD
  description?: string; // normalized
  Description?: string; // legacy capitalized
  amount?: number;
  Amount?: number;
  category?: string;
  Category?: string;
  [key: string]: unknown;
}

const mapRowToTransaction = (r: TransactionRow): Transaction => {
  const description = (r.description ?? r.Description ?? '').toString();
  const rawAmount = (r.amount ?? r.Amount ?? 0);
  const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount));
  const category = (r.category ?? r.Category ?? 'Other') as string;
  return {
    id: r.id,
    user_id: r.user_id,
    date: r.date,
    description,
    amount,
    category,
    type: amount >= 0 ? 'credit' : 'debit'
  };
};

export const TRANSACTIONS_QUERY_KEY = ['transactions'];

export function useTransactions(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Normalize outgoing row payload to match DB schema when certain columns are capitalized (Amount, Category, Description).
  const normalizeWriteRow = (row: Partial<TransactionRow>): Partial<TransactionRow> => {
    // If DB uses 'Amount' (capital A) and caller provided lowercase 'amount', shift the key.
    if ('amount' in row && !('Amount' in row)) {
      const copy: any = { ...row };
      copy.Amount = copy.amount;
      delete copy.amount;
      row = copy;
    }
    // Category normalization
    if ('category' in row && !('Category' in row)) {
      const copy: any = { ...row };
      copy.Category = copy.category;
      delete copy.category;
      row = copy;
    }
    // Description normalization (if needed)
    if ('description' in row && !('Description' in row)) {
      const copy: any = { ...row };
      copy.Description = copy.description;
      delete copy.description;
      row = copy;
    }
    return row;
  };

  const transactionsQuery = useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, userId],
    enabled: Boolean(userId) && isSupabaseConfigured,
    queryFn: async () => {
      if (!userId || !isSupabaseConfigured) return [] as Transaction[];
      // Simple single-page fetch; pagination can be reintroduced if needed.
      const { data, error } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRowToTransaction);
    }
  });

  const insertMutation = useMutation({
    mutationFn: async (rows: Omit<TransactionRow, 'id'>[]) => {
      const normalized = rows.map(r => normalizeWriteRow(r));
      const { error } = await (supabase as any)
        .from('transactions')
        .insert(normalized as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (update: { id: number; values: Partial<TransactionRow> }) => {
      const payload = normalizeWriteRow(update.values);
      const { error } = await (supabase as any)
        .from('transactions')
        .update(payload as any)
        .eq('id', update.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    }
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    isError: transactionsQuery.isError,
    refetch: transactionsQuery.refetch,
    insert: insertMutation.mutateAsync,
    updating: updateMutation.isPending,
    update: updateMutation.mutateAsync,
    deleting: deleteMutation.isPending,
    remove: deleteMutation.mutateAsync,
  };
}
