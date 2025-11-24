import React from 'react';
import { supabase } from '../services/supabaseClient';
import { Asset } from '../domain/networth/calculateNetWorth';

export function useAssets(userId: string | undefined) {
  const [assets, setAssets] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchAssets = async () => {
    if (!userId || !supabase) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedAssets: Asset[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        currentValue: parseFloat(row.current_value) || 0,
        lastUpdated: row.last_updated,
        createdOn: row.created_on,
      }));

      setAssets(mappedAssets);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.message);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAssets();
  }, [userId]);

  const insertAsset = async (asset: Omit<Asset, 'id'>) => {
    if (!userId || !supabase) return;

    try {
      const { error: insertError } = await supabase
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
      await fetchAssets();
    } catch (err: any) {
      console.error('Error inserting asset:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    if (!userId || !supabase) return;

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.currentValue !== undefined) updateData.current_value = updates.currentValue;
      if (updates.lastUpdated !== undefined) updateData.last_updated = updates.lastUpdated;
      if (updates.createdOn !== undefined) updateData.created_on = updates.createdOn;

      updateData.updated_at = new Date().toISOString();

      console.log('Sending update to Supabase:', { id, updateData, userId });

      const { error: updateError } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }
      
      console.log('Supabase update successful');
      
      // Optimistic update - update local state without refetch
      setAssets((prev: any) => prev.map((a: any) => a.id === id ? { ...a, ...updates } : a));
    } catch (err: any) {
      console.error('Error updating asset:', err);
      setError(err.message);
      // On error, refetch to get correct state
      await fetchAssets();
      throw err;
    }
  };

  const deleteAsset = async (id: string) => {
    if (!userId || !supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      await fetchAssets();
    } catch (err: any) {
      console.error('Error deleting asset:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    assets,
    isLoading,
    error,
    refetch: fetchAssets,
    insertAsset,
    updateAsset,
    deleteAsset,
  };
}
