# Functions Setup — `api` proxy (Phase 4)

The SPA calls the branch-local `api` Function directly for AI, market data,
and weather, so provider keys never ship in the browser bundle. Every route
(except `/api/health`) requires the user's Managed Auth JWT; the user id comes
from the verified token, never from client input.

## Routes

| Method | Path | Purpose | Rate limit/hour/user |
|--------|------|---------|----------------------|
| GET | `/api/health` | Uptime check (public) | — |
| POST | `/api/ai/complete` `{model, prompt}` | Gemini via AI Gateway, direct fallback | 60 (`AI_HOURLY_LIMIT`) |
| GET | `/api/market/price?symbol=&type=` | Real-time price (server IndianAPI key) | 600 (`MARKET_HOURLY_LIMIT`) |
| GET | `/api/market/historical?symbol=&type=&date=` | Historical price | 600 |
| GET | `/api/weather/full?lat=&lon=` | Current + 3-day forecast + revgeo | 600 (`WEATHER_HOURLY_LIMIT`) |
| GET | `/api/weather/geocode?address=` | Place name → coords | 600 |
| GET | `/api/weather/by-location?location=` | `lat,lon` or place name → full payload | 600 |

Models are allowlisted server-side (`functions/api/src/ai.ts`); prompts are
capped at 12,000 chars. Counters live in the `api_usage` table (Postgres, so
limits hold across isolates); without a DB the Function warns and uses a
per-isolate memory fallback (local dev only).

## First deploy

```bash
# 1. Server keys into .env (never VITE_-prefixed for the Function itself;
#    neon.ts falls back to the legacy VITE_ vars during transition)
INDIAN_API_KEY=... GOOGLE_API_KEY=... GEMINI_API_KEY=... >> .env

# 2. Rate-limit table (safe to re-run)
#    Apply API_USAGE_SCHEMA.sql to the branch (psql $DATABASE_URL or console).

# 3. Provision gateway + function on the linked branch
neon deploy --env .env

# 4. Read the public URL and point the app at it
neon functions get api   # → invocation_url
#    .env: VITE_FUNCTION_URL=<invocation_url>
#    GitHub: repo secret FUNCTION_URL=<invocation_url> (Pages build injects it)
```

Notes:

- AI Gateway needs a paid plan, and `neon deploy` hard-refuses `aiGateway`
  on free (verified 2026-09-19) — the flag is commented out in `neon.ts` and
  the Function uses the direct Gemini endpoint with server-side
  `GEMINI_API_KEY`. Re-add after upgrading.
- Production `api` URL (2026-09-19):
  `https://br-super-cherry-b37983l0-api.compute.c-4.ap-southeast-1.aws.neon.tech/`
- New branches: `neon checkout <name> --create --env .env` applies `neon.ts`
  (function + gateway) on creation.
- Client behavior without `VITE_FUNCTION_URL` (or signed out): AI/market/
  weather fall back to direct provider calls only when legacy dev keys exist;
  production builds ship none, so those features require the Function.
- Local function loop: `neon dev` (injects `DATABASE_URL` + gateway creds).

## Files

- `functions/api/src/index.ts` — Hono app, CORS, auth/rate-limit wiring
- `functions/api/src/{auth,cors,ratelimit,cache,ai,market,weather}.ts`
- `functions/api/src/server.test.ts` — pure-helper unit tests (run in `npm test`)
- `src/services/apiClient.ts` — browser transport (JWT + `VITE_FUNCTION_URL`)
- `API_USAGE_SCHEMA.sql` — `api_usage` counters table
