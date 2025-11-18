import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { HomeService } from '../types';

export function useHomeServices(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: services = [], isLoading, error, refetch } = useQuery({
    queryKey: ['homeServices', userId],
    queryFn: async () => {
      if (!userId || !supabase) return [];
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('next_service_due', { ascending: true });
      
      if (error) throw error;
      return (data || []) as HomeService[];
    },
    enabled: !!userId && !!supabase,
  });

  const createMutation = useMutation({
    mutationFn: async (newService: Omit<HomeService, 'id' | 'created_at' | 'updated_at'>) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('services')
        .insert([newService])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeServices', userId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<HomeService> }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeServices', userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeServices', userId] });
    },
  });

  return {
    services,
    isLoading,
    error,
    refetch,
    createService: createMutation.mutateAsync,
    updateService: updateMutation.mutateAsync,
    deleteService: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
