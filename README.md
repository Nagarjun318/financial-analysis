# FinanceHub — Personal Financial Platform

React + Vite + TypeScript app for tracking transactions, investments, net worth,
groceries, home services, and goals — with Gemini-powered AI insights.
Backend: **Neon Postgres** (Lakebase) + **Neon Auth** (Managed Better Auth) via
the Neon Data API.

## Run locally

Prerequisites: Node.js 20+

1. Install dependencies:
   `npm install`
2. Copy `.env.local.example` to `.env.local` (or use `.env`) and set:
   ```bash
   VITE_NEON_AUTH_URL=https://<endpoint>.neonauth.<region>.aws.neon.tech/neondb/auth
   VITE_NEON_DATA_API_URL=https://<endpoint>.apirest.<region>.aws.neon.tech/neondb/rest/v1
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_INDIAN_API_KEY=your_indianapi_key
   ```
   Tip: `neon deploy` pulls the `VITE_NEON_*` values into `.env` automatically.
3. Start the dev server:
   `npm run dev`

### Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_NEON_AUTH_URL` | Neon Auth base URL (public; JWT-secured) |
| `VITE_NEON_DATA_API_URL` | Neon Data API URL (public; RLS-secured) |
| `VITE_GEMINI_API_KEY` | Google Gemini API key for AI search/insights |
| `VITE_INDIAN_API_KEY` | IndianAPI.in key for stock/ETF/mutual-fund prices |

## Database

Schema lives in `NEON_SCHEMA.sql` (11 tables, RLS per user via
`auth.user_id()`). Apply with `psql` against `DATABASE_URL_UNPOOLED`, then
refresh the Data API cache: `neon data-api refresh-schema`.

## Quality gates (all enforced in CI)

- `npm run lint` — ESLint (0 errors; `no-explicit-any` is a warning while
  legacy `any` usage is cleaned up incrementally)
- `npx tsc --noEmit` — strict typecheck, must pass
- `npm test` — Vitest unit tests
- `npm run build` — production build

## Docs

Feature guides live alongside the code (`AI_SEARCH_SETUP.md`,
`INVESTMENT_SETUP.md`, `SERVICE_HISTORY_SETUP.md`, …). Historical
Supabase-era notes were removed during the Neon migration.
