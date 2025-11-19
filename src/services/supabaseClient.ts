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

/**
 * Update AI category for a transaction
 */
export async function updateTransactionAICategory(
  transactionId: number,
  aiCategory: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .update({ ai_category: aiCategory })
      .eq('id', transactionId);

    if (error) {
      console.error('Error updating AI category:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating AI category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch update AI categories for multiple transactions
 */
export async function updateTransactionAICategoriesBatch(
  updates: Array<{ id: number; ai_category: string }>
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    let successCount = 0;

    // Process in batches of 50 to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      // Use Promise.all for concurrent updates within each batch
      const results = await Promise.all(
        batch.map(update =>
          supabase
            .from('transactions')
            .update({ ai_category: update.ai_category })
            .eq('id', update.id)
        )
      );

      // Count successes
      results.forEach(result => {
        if (!result.error) successCount++;
      });
    }

    return { success: true, updatedCount: successCount };
  } catch (error) {
    console.error('Error batch updating AI categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clear all AI categories (set to null)
 */
export async function clearAllAICategories(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .update({ ai_category: null })
      .neq('id', -1); // Update all rows (id is never -1)

    if (error) {
      console.error('Error clearing AI categories:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing AI categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
