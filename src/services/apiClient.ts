import { authClient, client } from './neonClient';

/**
 * Browser → Neon Function transport (Phase 4).
 * The SPA calls the `api` Function directly (no app backend in the path, so
 * long AI/market streams never hit a host timeout). Every request carries the
 * user's Managed Auth JWT; the Function derives userId from the verified
 * token and never trusts client-supplied ids.
 */

/**
 * Read lazily (not module top-level) so tests can stub the env per case via
 * `vi.stubEnv('VITE_FUNCTION_URL', …)` and local `.env` never leaks into
 * unrelated unit tests.
 */
export function functionUrl(): string | null {
  const raw = import.meta.env.VITE_FUNCTION_URL as string | undefined;
  const url = raw?.replace(/\/+$/, '');
  return url ? url : null;
}

export function isFunctionConfigured(): boolean {
  return functionUrl() !== null;
}

/**
 * Short-lived bearer token for Function calls. Prefers the native client
 * (`token()` → 15-min EdDSA JWT); falls back to the adapter session's
 * access token. Returns null when signed out.
 */
interface NativeTokenClient {
  token?: () => Promise<{ data?: { token?: string } }>;
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const native = authClient as unknown as NativeTokenClient | null;
    const { data } = (await native?.token?.()) ?? {};
    if (typeof data?.token === 'string' && data.token.length > 0) return data.token;
  } catch {
    // fall through to the adapter session
  }
  try {
    const adapter = client as {
      auth?: {
        getSession?: () => Promise<{ data?: { session?: { access_token?: string } } }>;
      };
    } | null;
    const { data } = (await adapter?.auth?.getSession?.()) ?? {};
    const token = data?.session?.access_token;
    if (typeof token === 'string' && token.length > 0) return token;
  } catch {
    // signed out or unavailable
  }
  return null;
}

export class FunctionApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'FunctionApiError';
    this.status = status;
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

/** GET/POST JSON to the Function with the user's JWT. Throws FunctionApiError. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const base = functionUrl();
  if (!base) {
    throw new FunctionApiError(0, 'Function API not configured (VITE_FUNCTION_URL missing).');
  }
  const token = await getAccessToken();
  if (!token) {
    throw new FunctionApiError(401, 'Sign in to use this feature.');
  }
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error body
  }
  if (!res.ok) {
    const message =
      (data as { error?: unknown } | null)?.error ??
      `Function request failed (${res.status}).`;
    throw new FunctionApiError(res.status, String(message));
  }
  return data as T;
}
