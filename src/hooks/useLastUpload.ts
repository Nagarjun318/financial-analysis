import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export interface UserUploadRecord {
  id?: number;
  user_id: string;
  last_upload_at: string; // ISO timestamp
  updated_at?: string;
}

const QUERY_KEY = ['user_last_upload'];

/**
 * Hook to manage per-user last upload timestamp stored in Supabase table `user_uploads`.
 * Table schema suggestion:
 *   create table user_uploads (
 *     id bigint generated always as identity primary key,
 *     user_id text not null references auth.users(id) on delete cascade,
 *     last_upload_at timestamptz not null,
 *     updated_at timestamptz not null default now(),
 *     unique(user_id)
 *   );
 */
export function useLastUpload(userId: string | undefined) {
  const qc = useQueryClient();

  const lastUploadQuery = useQuery<UserUploadRecord | null>({
    queryKey: [...QUERY_KEY, userId],
    enabled: Boolean(userId) && isSupabaseConfigured,
    queryFn: async () => {
      if (!userId || !isSupabaseConfigured) return null;
      const { data, error } = await (supabase as any)
        .from('user_uploads')
        .select('*')
        .eq('user_id', userId)
        .single();
      // PGRST116 => no rows found
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return (data as UserUploadRecord) || null;
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (isoTimestamp: string) => {
      if (!userId) throw new Error('Missing user id');
      const payload = { user_id: userId, last_upload_at: isoTimestamp };
      const { error } = await (supabase as any)
        .from('user_uploads')
        .upsert(payload)
        .select();
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY })
  });

  return {
    lastUpload: lastUploadQuery.data?.last_upload_at || null,
    loadingLastUpload: lastUploadQuery.isLoading,
    errorLastUpload: lastUploadQuery.error,
    setLastUpload: upsertMutation.mutateAsync,
    settingLastUpload: upsertMutation.isPending,
  };
}

export function formatLastUpload(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
