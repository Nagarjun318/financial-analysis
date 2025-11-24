import React from 'react';
import { supabase } from '../services/supabaseClient';
import { FinancialGoal } from '../types';

export function useGoals(userId: string | undefined) {
    const [goals, setGoals] = React.useState<FinancialGoal[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchGoals = React.useCallback(async () => {
        if (!userId || !supabase) {
            setGoals([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('financial_goals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGoals(data || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching goals:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const addGoal = React.useCallback(async (goal: Omit<FinancialGoal, 'id' | 'created_at'>) => {
        if (!userId || !supabase) return;

        try {
            const { data, error } = await supabase
                .from('financial_goals')
                .insert([{ ...goal, user_id: userId }])
                .select()
                .single();

            if (error) throw error;
            setGoals(prev => [data, ...prev]);
            return data;
        } catch (err: any) {
            console.error('Error adding goal:', err);
            setError(err.message);
            throw err;
        }
    }, [userId]);

    const updateGoal = React.useCallback(async (id: string, updates: Partial<FinancialGoal>) => {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('financial_goals')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setGoals(prev => prev.map(g => g.id === id ? data : g));
            return data;
        } catch (err: any) {
            console.error('Error updating goal:', err);
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteGoal = React.useCallback(async (id: string) => {
        if (!supabase) return;

        try {
            const { error } = await supabase
                .from('financial_goals')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setGoals(prev => prev.filter(g => g.id !== id));
        } catch (err: any) {
            console.error('Error deleting goal:', err);
            setError(err.message);
            throw err;
        }
    }, []);

    return {
        goals,
        isLoading,
        error,
        addGoal,
        updateGoal,
        deleteGoal,
        refetch: fetchGoals
    };
}
