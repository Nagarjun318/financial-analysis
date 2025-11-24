import React from 'react';
import { supabase } from '../services/supabaseClient';
import { Liability } from '../domain/networth/calculateNetWorth';

export function useLiabilities(userId: string | undefined) {
  const [liabilities, setLiabilities] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchLiabilities = async () => {
    if (!userId || !supabase) {
      setLiabilities([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('liabilities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedLiabilities: Liability[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        principal: parseFloat(row.principal) || parseFloat(row.opening_principal) || 0,
        // Keep old fields for backward compatibility
        openingPrincipal: parseFloat(row.opening_principal) || parseFloat(row.principal) || 0,
        currentPrincipal: parseFloat(row.current_principal),
        interestRateAnnual: parseFloat(row.interest_rate_annual) || 0,
        monthlyEMI: parseFloat(row.monthly_emi) || 0,
        extraPaymentMonthly: parseFloat(row.extra_payment_monthly) || 0,
        startDate: row.start_date,
        lastUpdated: row.updated_at,
      }));

      setLiabilities(mappedLiabilities);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching liabilities:', err);
      setError(err.message);
      setLiabilities([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLiabilities();
  }, [userId]);

  const insertLiability = async (liability: Omit<Liability, 'id'>) => {
    if (!userId || !supabase) return;

    try {
      const { error: insertError } = await supabase
        .from('liabilities')
        .insert({
          user_id: userId,
          name: liability.name,
          type: liability.type,
          principal: liability.principal,
          // For backward compatibility, also save to old columns if they exist
          opening_principal: liability.principal,
          interest_rate_annual: liability.interestRateAnnual,
          monthly_emi: liability.monthlyEMI,
          extra_payment_monthly: liability.extraPaymentMonthly || 0,
          start_date: liability.startDate,
        });

      if (insertError) throw insertError;
      await fetchLiabilities();
    } catch (err: any) {
      console.error('Error inserting liability:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateLiability = async (id: string, updates: Partial<Liability>) => {
    if (!userId || !supabase) return;

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.principal !== undefined) {
        updateData.principal = updates.principal;
        // For backward compatibility
        updateData.opening_principal = updates.principal;
      }
      if (updates.interestRateAnnual !== undefined) updateData.interest_rate_annual = updates.interestRateAnnual;
      if (updates.monthlyEMI !== undefined) updateData.monthly_emi = updates.monthlyEMI;
      if (updates.extraPaymentMonthly !== undefined) updateData.extra_payment_monthly = updates.extraPaymentMonthly;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;

      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('liabilities')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) throw updateError;
      
      // Optimistic update - update local state without refetch
      setLiabilities((prev: any) => prev.map((l: any) => l.id === id ? { ...l, ...updates } : l));
    } catch (err: any) {
      console.error('Error updating liability:', err);
      setError(err.message);
      // On error, refetch to get correct state
      await fetchLiabilities();
      throw err;
    }
  };

  const deleteLiability = async (id: string) => {
    if (!userId || !supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from('liabilities')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      await fetchLiabilities();
    } catch (err: any) {
      console.error('Error deleting liability:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    liabilities,
    isLoading,
    error,
    refetch: fetchLiabilities,
    insertLiability,
    updateLiability,
    deleteLiability,
  };
}
