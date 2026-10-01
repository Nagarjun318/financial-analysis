import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client as neonClient, isNeonConfigured } from '../services/neonClient';
import { Liability } from '../domain/networth/calculateNetWorth';

interface LiabilityRow {
  id: string;
  name: string;
  type: string;
  principal: string | number | null;
  opening_principal: string | number | null;
  current_principal: string | number | null;
  interest_rate_annual: string | number | null;
  monthly_emi: string | number | null;
  extra_payment_monthly: string | number | null;
  start_date: string | null;
  updated_at: string | null;
}

const num = (v: string | number | null): number => parseFloat(String(v ?? 0)) || 0;

const mapRow = (row: LiabilityRow): Liability => ({
  id: row.id,
  name: row.name,
  type: row.type as Liability['type'],
  principal: num(row.principal) || num(row.opening_principal),
  // Keep old fields for backward compatibility
  openingPrincipal: num(row.opening_principal) || num(row.principal),
  currentPrincipal: parseFloat(String(row.current_principal ?? '')),
  interestRateAnnual: num(row.interest_rate_annual),
  monthlyEMI: num(row.monthly_emi),
  extraPaymentMonthly: num(row.extra_payment_monthly),
  startDate: row.start_date ?? '',
  lastUpdated: row.updated_at ?? undefined,
});

export const LIABILITIES_QUERY_KEY = ['liabilities'];

export function useLiabilities(userId: string | undefined) {
  const queryClient = useQueryClient();

  const liabilitiesQuery = useQuery({
    queryKey: [...LIABILITIES_QUERY_KEY, userId],
    enabled: Boolean(userId) && isNeonConfigured,
    queryFn: async (): Promise<Liability[]> => {
      if (!userId || !isNeonConfigured) return [];
      const { data, error: fetchError } = await (neonClient as any)
        .from('liabilities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      return ((data || []) as LiabilityRow[]).map(mapRow);
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: LIABILITIES_QUERY_KEY });

  const insertMutation = useMutation({
    mutationFn: async (liability: Omit<Liability, 'id'>) => {
      if (!userId) throw new Error('Missing user id');
      const { error: insertError } = await (neonClient as any)
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
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Liability> }) => {
      if (!userId) throw new Error('Missing user id');
      const updateData: Record<string, unknown> = {};
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
      const { error: updateError } = await (neonClient as any)
        .from('liabilities')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);
      if (updateError) throw updateError;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Missing user id');
      const { error: deleteError } = await (neonClient as any)
        .from('liabilities')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (deleteError) throw deleteError;
    },
    onSuccess: invalidate,
  });

  return {
    liabilities: liabilitiesQuery.data ?? [],
    isLoading: liabilitiesQuery.isLoading,
    error: liabilitiesQuery.error ? (liabilitiesQuery.error as Error).message : null,
    refetch: liabilitiesQuery.refetch,
    insertLiability: insertMutation.mutateAsync,
    updateLiability: (id: string, updates: Partial<Liability>) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteLiability: deleteMutation.mutateAsync,
  };
}
