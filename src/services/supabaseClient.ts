import { createClient } from '@supabase/supabase-js';

// ✅ Force Vite to include these env variables in the bundle.
// Without these static references, Vite might tree-shake them.
void import.meta.env.VITE_SUPABASE_URL;
void import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabaseClient] Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
