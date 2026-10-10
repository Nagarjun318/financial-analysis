/**
 * `api` Function — server-side proxy for AI, market data, and weather (Phase 4).
 *
 * Why: the SPA previously shipped VITE_GEMINI_API_KEY / VITE_INDIAN_API_KEY /
 * the Google key in its bundle. Those secrets now live only here as Function
 * env. The browser calls this Function directly with its Managed Auth JWT;
 * the user id always comes from the verified token, never from client input.
 */
import { Hono, type Context, type Next } from 'hono';
import { Pool } from 'pg';
import { attachDatabasePool } from '@neon/functions';
import { verifyRequest } from './auth.ts';
import { corsHeaders, corsPatterns } from './cors.ts';
import { checkRateLimit, limitFor, type EndpointClass } from './ratelimit.ts';
import { TtlCache } from './cache.ts';
import { completePrompt, parseCompleteRequest, RateLimitError } from './ai.ts';
import { fetchHistoricalPrice, fetchRealTimePrice } from './market.ts';
import {
  currentConditions,
  dailyForecast,
  geocodeAddress,
  parseCoords,
  reverseGeocode,
} from './weather.ts';

type Variables = { userId: string };
type AppContext = Context<{ Variables: Variables }>;
const app = new Hono<{ Variables: Variables }>();

// --- Module-scope shared state (per isolate) --------------------------------

function envOf(c: AppContext): Record<string, string | undefined> {
  // Prefer deployed Function env, fall back to process.env so `neon dev`
  // and tests behave the same.
  const live = (c.env ?? {}) as Record<string, string | undefined>;
  return { ...process.env, ...live };
}

let pool: Pool | null = null;
function getPool(): Pool | null {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[api] DATABASE_URL not injected — rate limits use memory fallback');
    return null;
  }
  try {
    pool = new Pool({ connectionString, max: 5 });
    attachDatabasePool(pool);
  } catch (err) {
    console.warn('[api] pg pool init failed — rate limits use memory fallback:', err);
    pool = null;
  }
  return pool;
}

// Server-side price caches (client keeps its own Phase-3 caches too).
const realtimeCache = new TtlCache<number | null>();
const historicalCache = new TtlCache<number | null>();
const REALTIME_TTL_MS: Record<string, number> = {
  Crypto: 30 * 1000,
  Stock: 60 * 1000,
  ETF: 60 * 1000,
};
const DEFAULT_REALTIME_TTL_MS = 5 * 60 * 1000;
const HISTORICAL_TTL_MS = 24 * 60 * 60 * 1000;

// --- Middleware ---------------------------------------------------------------

app.use('*', async (c, next) => {
  const env = envOf(c);
  const headers = corsHeaders(c.req.raw, corsPatterns(env));
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  // finally (not just post-next): Hono skips code after `await next()` when
  // a handler throws, which used to strip CORS headers from 500s and turn
  // them into opaque browser "Failed to fetch" errors. The onError handler
  // below re-applies the headers for the same reason.
  try {
    await next();
  } finally {
    for (const [key, value] of Object.entries(headers)) {
      c.res.headers.set(key, value);
    }
  }
});

async function requireAuth(c: AppContext, next: Next): Promise<Response | void> {
  const env = envOf(c);
  const identity = await verifyRequest(c.req.raw, env);
  if (!identity) {
    return c.json({ error: 'Unauthorized — valid Bearer JWT required.' }, 401);
  }
  c.set('userId', identity.userId);
  await next();
}

app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health') return next();
  return requireAuth(c, next);
});

async function enforceLimit(c: AppContext, endpoint: EndpointClass): Promise<Response | null> {
  const env = envOf(c);
  const userId = c.get('userId');
  const result = await checkRateLimit(getPool(), userId, endpoint, limitFor(endpoint, env));
  if (!result.allowed) {
    return c.json(
      { error: `Rate limit exceeded (${result.count}/${result.limit} per hour). Try again later.` },
      429
    );
  }
  return null;
}

// --- Routes -------------------------------------------------------------------

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/ai/complete', async (c) => {
  const limited = await enforceLimit(c, 'ai');
  if (limited) return limited;
  let body: unknown = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Expected a JSON body.' }, 400);
  }
  const parsed = parseCompleteRequest(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, parsed.status as 400);
  const env = envOf(c);
  try {
    const result = await completePrompt(parsed.model, parsed.prompt, env);
    return c.json({ text: result.text, via: result.via, model: parsed.model });
  } catch (err) {
    // Upstream (Google/gateway) throttling — forward 429 + wait hint so the
    // client backs off instead of burning quota on instant retries.
    if (err instanceof RateLimitError) {
      console.warn('[api/ai] provider rate limit, retry after', err.retryAfterSeconds, 's');
      return c.json(
        { error: 'AI provider is busy. Try again shortly.', retryAfter: err.retryAfterSeconds },
        429
      );
    }
    console.error('[api/ai] completion failed:', err);
    return c.json({ error: 'AI completion failed. Try again later.' }, 502);
  }
});

app.get('/api/market/price', async (c) => {
  const limited = await enforceLimit(c, 'market');
  if (limited) return limited;
  const symbol = (c.req.query('symbol') ?? '').trim();
  const type = (c.req.query('type') ?? '').trim();
  if (!symbol || !type) {
    return c.json({ error: 'Query params "symbol" and "type" are required.' }, 400);
  }
  const key = `rt::${symbol}::${type}`;
  const hit = realtimeCache.get(key);
  if (hit !== null) return c.json({ symbol, type, price: hit, cached: true });
  const env = envOf(c);
  const price = await fetchRealTimePrice(symbol, type, {
    INDIAN_API_KEY: env.INDIAN_API_KEY,
  });
  realtimeCache.set(key, price, REALTIME_TTL_MS[type] ?? DEFAULT_REALTIME_TTL_MS);
  return c.json({ symbol, type, price, cached: false });
});

app.get('/api/market/historical', async (c) => {
  const limited = await enforceLimit(c, 'market');
  if (limited) return limited;
  const symbol = (c.req.query('symbol') ?? '').trim();
  const type = (c.req.query('type') ?? '').trim();
  const date = (c.req.query('date') ?? '').trim();
  if (!symbol || !type || !date) {
    return c.json({ error: 'Query params "symbol", "type", and "date" are required.' }, 400);
  }
  const key = `hist::${symbol}::${type}::${date}`;
  const hit = historicalCache.get(key);
  if (hit !== null) return c.json({ symbol, type, date, price: hit, cached: true });
  const env = envOf(c);
  const price = await fetchHistoricalPrice(symbol, type, date, {
    INDIAN_API_KEY: env.INDIAN_API_KEY,
  });
  historicalCache.set(key, price, HISTORICAL_TTL_MS);
  return c.json({ symbol, type, date, price, cached: false });
});

app.get('/api/weather/revgeo', async (c) => {
  const limited = await enforceLimit(c, 'weather');
  if (limited) return limited;
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return c.json({ error: 'Query params "lat" and "lon" must be numbers.' }, 400);
  }
  const env = envOf(c);
  try {
    const name = await reverseGeocode(lat, lon, { GOOGLE_API_KEY: env.GOOGLE_API_KEY });
    return c.json({ name });
  } catch (err) {
    console.error('[api/weather] revgeo failed:', err);
    return c.json({ error: 'Reverse geocoding failed.' }, 502);
  }
});

app.get('/api/weather/geocode', async (c) => {
  const limited = await enforceLimit(c, 'weather');
  if (limited) return limited;
  const address = (c.req.query('address') ?? '').trim();
  if (!address) return c.json({ error: 'Query param "address" is required.' }, 400);
  const env = envOf(c);
  try {
    const coords = await geocodeAddress(address, { GOOGLE_API_KEY: env.GOOGLE_API_KEY });
    return c.json(coords);
  } catch (err) {
    console.error('[api/weather] geocode failed:', err);
    return c.json({ error: 'Geocoding failed.' }, 502);
  }
});

app.get('/api/weather/full', async (c) => {
  const limited = await enforceLimit(c, 'weather');
  if (limited) return limited;
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));
  const days = Number(c.req.query('days') ?? '3');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return c.json({ error: 'Query params "lat" and "lon" must be numbers.' }, 400);
  }
  const env = envOf(c);
  const wenv = { GOOGLE_API_KEY: env.GOOGLE_API_KEY };
  try {
    const [current, forecast, locationName] = await Promise.all([
      currentConditions(lat, lon, wenv),
      dailyForecast(lat, lon, days, wenv),
      reverseGeocode(lat, lon, wenv),
    ]);
    return c.json({ current, forecast, locationName });
  } catch (err) {
    console.error('[api/weather] full fetch failed:', err);
    return c.json({ error: 'Weather fetch failed.' }, 502);
  }
});

// Back-compat alias used by older clients that parse "lat,lon" strings.
app.get('/api/weather/by-location', async (c) => {
  const limited = await enforceLimit(c, 'weather');
  if (limited) return limited;
  const location = (c.req.query('location') ?? '').trim();
  if (!location) return c.json({ error: 'Query param "location" is required.' }, 400);
  const env = envOf(c);
  const wenv = { GOOGLE_API_KEY: env.GOOGLE_API_KEY };
  try {
    const coords = parseCoords(location) ?? (await geocodeAddress(location, wenv));
    const [current, forecast, locationName] = await Promise.all([
      currentConditions(coords.lat, coords.lon, wenv),
      dailyForecast(coords.lat, coords.lon, 3, wenv),
      reverseGeocode(coords.lat, coords.lon, wenv),
    ]);
    return c.json({ current, forecast, locationName });
  } catch (err) {
    console.error('[api/weather] by-location fetch failed:', err);
    return c.json({ error: 'Weather fetch failed.' }, 502);
  }
});

app.notFound((c) => {
  const headers = corsHeaders(c.req.raw, corsPatterns(envOf(c)));
  return c.json({ error: 'Not found.' }, 404, headers);
});

app.onError((err, c) => {
  console.error('[api] unhandled error:', err);
  const headers = corsHeaders(c.req.raw, corsPatterns(envOf(c)));
  return c.json({ error: 'Internal server error.' }, 500, headers);
});

export default app;
