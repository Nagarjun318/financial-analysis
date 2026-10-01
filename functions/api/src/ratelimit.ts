import type { Pool } from 'pg';
import { TtlCache } from './cache.ts';

/**
 * Per-user, per-endpoint-class hourly rate limiting (Phase 4).
 * Primary store is Postgres (`api_usage`, one row per user/endpoint/hour via
 * INSERT … ON CONFLICT DO UPDATE … RETURNING) so limits hold across isolates.
 * When the DB is unreachable (e.g. local dev without Postgres), it falls back
 * to a per-isolate in-memory counter and logs a warning — fail-open locally,
 * enforced in production where the branch always has Postgres.
 */
export type EndpointClass = 'ai' | 'market' | 'weather';

export function limitFor(
  endpoint: EndpointClass,
  env: { AI_HOURLY_LIMIT?: string; MARKET_HOURLY_LIMIT?: string; WEATHER_HOURLY_LIMIT?: string }
): number {
  const fallback = { ai: 60, market: 600, weather: 600 } as const;
  const raw =
    endpoint === 'ai'
      ? env.AI_HOURLY_LIMIT
      : endpoint === 'market'
        ? env.MARKET_HOURLY_LIMIT
        : env.WEATHER_HOURLY_LIMIT;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback[endpoint];
}

const memoryFallback = new TtlCache<number>(2000);
const HOUR_MS = 60 * 60 * 1000;

function memoryCheck(key: string, limit: number): { allowed: boolean; count: number } {
  const count = (memoryFallback.get(key) ?? 0) + 1;
  memoryFallback.set(key, count, HOUR_MS);
  return { allowed: count <= limit, count };
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

export async function checkRateLimit(
  pool: Pool | null,
  userId: string,
  endpoint: EndpointClass,
  limit: number
): Promise<RateLimitResult> {
  if (!pool) {
    console.warn('[ratelimit] no Postgres pool — using per-isolate memory fallback');
    const { allowed, count } = memoryCheck(`${userId}::${endpoint}`, limit);
    return { allowed, count, limit };
  }
  try {
    const { rows } = await pool.query(
      `insert into api_usage (user_id, endpoint, window_start, count)
       values ($1, $2, date_trunc('hour', now()), 1)
       on conflict (user_id, endpoint, window_start)
       do update set count = api_usage.count + 1
       returning count`,
      [userId, endpoint]
    );
    const count = (rows[0]?.count as number) ?? 1;
    return { allowed: count <= limit, count, limit };
  } catch (err) {
    console.warn('[ratelimit] Postgres check failed, memory fallback:', err);
    const { allowed, count } = memoryCheck(`${userId}::${endpoint}`, limit);
    return { allowed, count, limit };
  }
}
