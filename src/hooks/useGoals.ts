import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client as neonClient, isNeonConfigured } from '../services/neonClient';
import { FinancialGoal } from '../types';

export const GOALS_QUERY_KEY = ['financial_goals'];

export function useGoals(userId: string | undefined) {
    const queryClient = useQueryClient();

    const goalsQuery = useQuery({
        queryKey: [...GOALS_QUERY_KEY, userId],
        enabled: Boolean(userId) && isNeonConfigured,
        queryFn: async (): Promise<FinancialGoal[]> => {
            if (!userId || !isNeonConfigured) return [];
            const { data, error } = await (neonClient as any)
                .from('financial_goals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as FinancialGoal[];
        },
    });

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });

    const addMutation = useMutation({
        mutationFn: async (goal: Omit<FinancialGoal, 'id' | 'created_at'>) => {
            if (!userId) throw new Error('Missing user id');
            const { data, error } = await (neonClient as any)
                .from('financial_goals')
                .insert([{ ...goal, user_id: userId }])
                .select()
                .single();
            if (error) throw error;
            return data as FinancialGoal;
        },
        onSuccess: invalidate,
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinancialGoal> }) => {
            const { data, error } = await (neonClient as any)
                .from('financial_goals')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as FinancialGoal;
        },
        onSuccess: invalidate,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (neonClient as any)
                .from('financial_goals')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    return {
        goals: goalsQuery.data ?? [],
        isLoading: goalsQuery.isLoading,
        error: goalsQuery.error ? (goalsQuery.error as Error).message : null,
        addGoal: addMutation.mutateAsync,
        updateGoal: (id: string, updates: Partial<FinancialGoal>) =>
            updateMutation.mutateAsync({ id, updates }),
        deleteGoal: deleteMutation.mutateAsync,
        refetch: goalsQuery.refetch,
    };
}
