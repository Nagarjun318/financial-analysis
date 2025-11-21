import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { HomeService, ServiceHistory, ServiceStatistics } from '../types';

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

// Hook for service history
export function useServiceHistory(serviceId: number | undefined) {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ['serviceHistory', serviceId],
    queryFn: async () => {
      if (!serviceId || !supabase) return [];
      const { data, error } = await supabase
        .from('service_history')
        .select('*')
        .eq('service_id', serviceId)
        .order('service_date', { ascending: false });

      if (error) throw error;
      return (data || []) as ServiceHistory[];
    },
    enabled: !!serviceId && !!supabase,
  });

  const { data: statistics } = useQuery({
    queryKey: ['serviceStatistics', serviceId],
    queryFn: async () => {
      if (!serviceId || !supabase) return null;
      const { data, error } = await supabase
        .rpc('get_service_statistics', { p_service_id: serviceId })
        .single();

      if (error) throw error;
      return data as ServiceStatistics;
    },
    enabled: !!serviceId && !!supabase,
  });

  const addHistoryMutation = useMutation({
    mutationFn: async (newHistory: Omit<ServiceHistory, 'id' | 'created_at'>) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('service_history')
        .insert([newHistory])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceHistory', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['serviceStatistics', serviceId] });
    },
  });

  const updateHistoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ServiceHistory> }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('service_history')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceHistory', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['serviceStatistics', serviceId] });
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('service_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceHistory', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['serviceStatistics', serviceId] });
    },
  });

  return {
    history,
    statistics,
    isLoading,
    error,
    addHistory: addHistoryMutation.mutateAsync,
    updateHistory: updateHistoryMutation.mutateAsync,
    deleteHistory: deleteHistoryMutation.mutateAsync,
    isAdding: addHistoryMutation.isPending,
    isUpdatingHistory: updateHistoryMutation.isPending,
    isDeletingHistory: deleteHistoryMutation.isPending,
  };
}
