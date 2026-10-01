import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client as neonClient, isNeonConfigured } from '../services/neonClient';
import { Asset } from '../domain/networth/calculateNetWorth';

interface AssetRow {
  id: string;
  name: string;
  type: string;
  current_value: string | number | null;
  last_updated: string | null;
  created_on: string | null;
}

const mapRow = (row: AssetRow): Asset => ({
  id: row.id,
  name: row.name,
  type: row.type,
  currentValue: parseFloat(String(row.current_value ?? 0)) || 0,
  lastUpdated: row.last_updated ?? undefined,
  createdOn: row.created_on ?? undefined,
});

export const ASSETS_QUERY_KEY = ['assets'];

export function useAssets(userId: string | undefined) {
  const queryClient = useQueryClient();

  const assetsQuery = useQuery({
    queryKey: [...ASSETS_QUERY_KEY, userId],
    enabled: Boolean(userId) && isNeonConfigured,
    queryFn: async (): Promise<Asset[]> => {
      if (!userId || !isNeonConfigured) return [];
      const { data, error: fetchError } = await (neonClient as any)
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      return ((data || []) as AssetRow[]).map(mapRow);
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });

  const insertMutation = useMutation({
    mutationFn: async (asset: Omit<Asset, 'id'>) => {
      if (!userId) throw new Error('Missing user id');
      const { error: insertError } = await (neonClient as any)
        .from('assets')
        .insert({
          user_id: userId,
          name: asset.name,
          type: asset.type,
          current_value: asset.currentValue,
          last_updated: asset.lastUpdated || new Date().toISOString().split('T')[0],
          created_on: asset.createdOn || new Date().toISOString().split('T')[0],
        });
      if (insertError) throw insertError;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Asset> }) => {
      if (!userId) throw new Error('Missing user id');
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.currentValue !== undefined) updateData.current_value = updates.currentValue;
      if (updates.lastUpdated !== undefined) updateData.last_updated = updates.lastUpdated;
      if (updates.createdOn !== undefined) updateData.created_on = updates.createdOn;
      updateData.updated_at = new Date().toISOString();
      const { error: updateError } = await (neonClient as any)
        .from('assets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);
      if (updateError) throw updateError;
      return { id, updates };
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Missing user id');
      const { error: deleteError } = await (neonClient as any)
        .from('assets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (deleteError) throw deleteError;
    },
    onSuccess: invalidate,
  });

  return {
    assets: assetsQuery.data ?? [],
    isLoading: assetsQuery.isLoading,
    error: assetsQuery.error ? (assetsQuery.error as Error).message : null,
    refetch: assetsQuery.refetch,
    insertAsset: insertMutation.mutateAsync,
    updateAsset: (id: string, updates: Partial<Asset>) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteAsset: deleteMutation.mutateAsync,
  };
}
