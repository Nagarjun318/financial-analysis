import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

// Public Neon endpoints. Prefer explicit Auth + Data API URLs (already in .env
// via `neon deploy`), fall back to single base URL derivation.
void import.meta.env.VITE_NEON_AUTH_URL;
void import.meta.env.VITE_NEON_DATA_API_URL;
void import.meta.env.VITE_NEON_URL;

const authUrl =
  import.meta.env.VITE_NEON_AUTH_URL as string | undefined;
const dataApiUrl =
  import.meta.env.VITE_NEON_DATA_API_URL as string | undefined;
const baseUrl = import.meta.env.VITE_NEON_URL as string | undefined;

export const isNeonConfigured = Boolean(
  (authUrl && dataApiUrl) || baseUrl
);

if (!isNeonConfigured) {
  console.warn(
    '[neonClient] Neon not configured. Set VITE_NEON_AUTH_URL + VITE_NEON_DATA_API_URL (or VITE_NEON_URL) in your .env file.'
  );
}

// SupabaseAuthAdapter keeps `signUp`, `signInWithPassword`, `getSession`,
// `onAuthStateChange`, and `from()` query shapes working after the migration.
// Password hashes cannot transfer from Supabase: users create new accounts.
// Wrapped in try/catch so a throwing SDK init can never blank the page;
// the app falls back to the setup screen instead.
function initClient(): any {
  if (!isNeonConfigured) return null;
  try {
    if (baseUrl && !(authUrl && dataApiUrl)) {
      // String form: adapter goes in the second arg (buildConfigFromBaseUrl).
      return (createClient as any)(baseUrl, {
        auth: { adapter: SupabaseAuthAdapter() },
      });
    }
    // Object form: adapter must live inside arg1.auth — a second arg is ignored.
    return (createClient as any)({
      auth: { url: authUrl!, adapter: SupabaseAuthAdapter() },
      dataApi: { url: dataApiUrl! },
    });
  } catch (err) {
    console.error('[neonClient] Failed to initialize Neon client:', err);
    return null;
  }
}

export const client: any = initClient();

/**
 * Native Managed Auth client (Phase 4). Used for short-lived Function bearer
 * tokens (`authClient.token()` → `data.token`) and any future native Better
 * Auth UI. Session reads + the Data API compat surface stay on `client`
 * (SupabaseAuthAdapter) — see MODERNIZATION_PLAN Phase 4 for why the login
 * UI itself was deliberately not re-plumbed.
 */
import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

type NativeAuthClient = ReturnType<typeof createAuthClient>;

function initAuthClient(): NativeAuthClient | null {
  if (!authUrl) return null;
  try {
    return createAuthClient(authUrl, {
      adapter: BetterAuthReactAdapter(),
    });
  } catch (err) {
    console.error('[neonClient] Failed to initialize native auth client:', err);
    return null;
  }
}

export const authClient: NativeAuthClient | null = initAuthClient();

// Minimal session/user shape used across the app (Neon + Supabase compatible).
export interface NeonUser {
  id: string;
  email?: string | null;
}

export interface NeonSession {
  user: NeonUser;
  access_token?: string;
}

/**
 * Update AI category for a transaction
 */
export async function updateTransactionAICategory(
  transactionId: number,
  aiCategory: string
): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    return { success: false, error: 'Neon not configured' };
  }

  try {
    const { error } = await client
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
  if (!client) {
    return { success: false, error: 'Neon not configured' };
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
          client
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
  if (!client) {
    return { success: false, error: 'Neon not configured' };
  }

  try {
    const { error } = await client
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
