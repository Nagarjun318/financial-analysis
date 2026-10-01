import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client as supabase, isNeonConfigured as isSupabaseConfigured } from '../services/neonClient';
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
  const ai_category = r.ai_category as string | null | undefined;
  return {
    id: r.id,
    user_id: r.user_id,
    date: r.date,
    description,
    amount,
    category,
    type: amount >= 0 ? 'credit' : 'debit',
    ai_category
  };
};

export const TRANSACTIONS_QUERY_KEY = ['transactions'];

const EMPTY_ARRAY: Transaction[] = [];

/**
 * Server-side page window for the transactions table (Phase 3).
 * PostgREST `.range()` is inclusive on both ends, so page 0 with size 100
 * fetches rows [0, 99].
 */
export function buildTransactionPageRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(0, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const from = safePage * safeSize;
  return { from, to: from + safeSize - 1 };
}

/**
 * Paginated transaction fetch: one page via `.range()` plus the exact total
 * count in a single round trip. Use for large table displays; the analytics
 * path (`useTransactions`) still needs the full dataset until aggregation
 * moves server-side.
 */
export function useTransactionsPage(
  userId: string | undefined,
  page: number,
  pageSize: number
) {
  const { from, to } = buildTransactionPageRange(page, pageSize);
  const pageQuery = useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, 'page', userId, from, to],
    enabled: Boolean(userId) && isSupabaseConfigured,
    queryFn: async () => {
      if (!userId || !isSupabaseConfigured) return { rows: [] as Transaction[], totalCount: 0 };
      const { data, error, count } = await (supabase as any)
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return {
        rows: ((data || []) as TransactionRow[]).map(mapRowToTransaction),
        totalCount: typeof count === 'number' ? count : 0,
      };
    },
  });

  return {
    rows: pageQuery.data?.rows ?? EMPTY_ARRAY,
    totalCount: pageQuery.data?.totalCount ?? 0,
    isLoading: pageQuery.isLoading,
    isError: pageQuery.isError,
    refetch: pageQuery.refetch,
  };
}

export function useTransactions(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Normalize outgoing row payload to the Neon schema (lowercase columns).
  // Legacy Supabase rows used capitalized keys (Amount, Category, Description);
  // map those to lowercase so writes always match NEON_SCHEMA.sql.
  const normalizeWriteRow = (row: Partial<TransactionRow>): Partial<TransactionRow> => {
    const copy: any = { ...row };
    if ('Amount' in copy && !('amount' in copy)) {
      copy.amount = copy.Amount;
      delete copy.Amount;
    }
    if ('Category' in copy && !('category' in copy)) {
      copy.category = copy.Category;
      delete copy.Category;
    }
    if ('Description' in copy && !('description' in copy)) {
      copy.description = copy.Description;
      delete copy.Description;
    }
    // Neon uses ai_category (lowercase); map legacy AI_Category.
    if ('AI_Category' in copy && !('ai_category' in copy)) {
      copy.ai_category = copy.AI_Category;
      delete copy.AI_Category;
    }
    return copy;
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
    transactions: transactionsQuery.data || EMPTY_ARRAY,
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
