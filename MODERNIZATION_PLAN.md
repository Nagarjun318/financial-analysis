# Modernization Plan — Phases 0–6

> Last updated: 2026-09-19 · Repo: `financial-analysis` (Vite + React 18 + Neon Postgres/Auth)
> This file is the single source of truth for what is done and what remains.

## Status legend

- ✅ Done — verified (lint / tsc / tests / build / browser where noted)
- 🚧 In progress — work started, not yet verified end-to-end
- ⏳ Pending — not started
- ⏭️ Deferred — intentionally after earlier phases

---

## Phase 0 — Stop the bleeding (quick wins) ✅ Done

**Goal:** Remove dead weight, make the style pipeline real, stop hostile UX, and gate CI.

| Task | Status | Notes |
|------|--------|-------|
| Remove dead CDN weight (importmap for React 19, Babel standalone, SheetJS CDN) and bundle `xlsx` via npm | ✅ | `src/utils.ts` now `import * as XLSX from 'xlsx'`; fixed `cellDates` to be a read option (`XLSX.read(..., {cellDates:true})`). Deleted 3 `<script>` tags from `index.html`. |
| Install Tailwind properly and move 190 lines of inline CSS out of `index.html` | ✅ | Tailwind 3 + PostCSS + autoprefixer installed. `tailwind.config.js` holds the full palette (brand, dark mode). Styles now in `src/index.css` (imported in `src/main.tsx`). Purged output ~95 KB vs runtime CDN. Verified no dynamic class names that would be purged away. |
| Replace 21 `alert()` calls with toast/banners; gate geolocation behind click | ✅ | New `src/utils/toast.ts` + `src/components/ToastHost.tsx` (auto-dismiss, success/error/info). `App.tsx` geolocation no longer on mount; all 21 alerts in `StagingModal`, `MonthlySummaryTable`, `ServiceHistoryModal`, `ServicesPage`, `WeatherSmartAssistant`, `GroceriesPage`, `InvestmentPage` replaced. |
| Strip `console.log` (keep `warn`/`error`) and add CI gates | ✅ | Removed 82 `console.log` lines (kept 164 `warn`/`error`). `deploy.yml` now runs `lint → tsc --noEmit → vitest → build`. Deleted `src/types/react-shim.d.ts` that was masking real `@types/react` (53 errors). Fixed real bugs surfaced: AI-category prediction matched by index not id, `react-hooks/rules-of-hooks` violation in `ServiceHistoryModal`, `services`/`goals`/`networth` `userId` prop now `string | undefined`, many unused-import cleanups. `prefer-const`, `no-empty`, `react/no-unescaped-entities` fixes. |
| Clean stale Supabase docs | ✅ | `README.md` rewritten for Neon (`VITE_NEON_*`, `neon deploy`, RLS notes). `INDIAN_API_SETUP.md` and `INVESTMENT_SETUP.md` de-Supabased. `AUTHENTICATION_FIX.md` marked historical. Historical `*.md` docs otherwise left untouched. |
| Verify | ✅ | `tsc --noEmit` clean (was 101 errors) · `npm run lint` 0 errors, 145 `any` warnings (downgraded from errors, tracked) · `npm test` 10/10 pass · `npm run build` passes · fresh browser render verified (desktop + 390 px mobile, no error boundary) |

---

## Phase 1 — Design system & UI consistency ✅ Done

**Goal:** Tokens as truth, small accessible component kit, consistent loading/empty/error states, responsive + a11y baseline.

| Task | Status | Notes |
|------|--------|-------|
| Survey UI patterns (cards, buttons, modals, loading/empty states) | ✅ | Counted `glass-panel`, button, loading, and empty-state variants across 54 components. |
| Codify design tokens (Tailwind theme + CSS variables) | ✅ | Brand gradient/rainbow, glass bg/border, radii as CSS variables in `src/index.css` (`:root`); palette stays in `tailwind.config.js`. `index.html` script-based Tailwind config removed. |
| Build component kit (`Card`, `Button`, `Modal`, `EmptyState`, `Skeleton`, `Stat`) | ✅ | New `src/components/ui/` — `Card`, `Button` (primary/secondary/ghost/danger, loading spinner), `Modal` (Escape, focus, scroll lock, backdrop), `EmptyState`, `Skeleton`, `Stat`, `index.ts` barrel. |
| Migrate views to kit + standardize states | ✅ | Modals: `StagingModal`, `EditTransactionModal`, `NetWorthEditModal`, `ServiceHistoryModal`, `InvestmentPage` add/edit modal → `Modal` shell. Buttons in `Auth` + investment/grocery/goal/service flows → `Button`. Empties in `GoalsPage`, `ServicesPage`, `GroceriesPage` (×2), `InvestmentPage`, `TransactionList`, `VirtualizedTransactionList` → `EmptyState`. Loaders in `GroceriesPage`, `ServiceHistoryModal`, `App` skeleton overhaul. NetWorth/Investment custom dead code removed (`renderNode`, price fetcher gap, etc). |
| Responsive + a11y audit pass | ✅ | Skip-to-content link + `#main-content` anchor in `App.tsx`; `aria-label` on row edit/delete; table `overflow-x-auto`; grids mobile-first. Verified with real 390 px / 1440 px headless screenshots. |
| Verify | ✅ | `tsc` clean · `lint` 0 errors, 145 `any` warnings · `tests` 10/10 · `build` passes · screenshots verified |

---

## Phase 2 — App architecture ✅ Done

**Goal:** URL-driven navigation, unified data layer, clean Neon client surface, bounded god-component surgery.

| Task | Status | Notes |
|------|--------|-------|
| React Router with lazy-loaded routes (basename-aware) | ✅ | `BrowserRouter` (basename from `import.meta.env.BASE_URL` via `getBasename()`) in `main.tsx`; `Routes`/`Route` + `Navigate` in `App.tsx` with route-level `Suspense` fallback; `Sidebar` uses `NavLink` (auth stays a modal button); `sectionFromPath` strips basename so `/financial-analysis/finance` deep-links correctly; home canonical `/` with `/home` → `/` redirect; per-route `document.title`; `src/app/sections.test.ts` (6 tests) covers mapping + basename stripping. Build emits per-page chunks (Dashboard/AnalyticsPage/NetWorthPage/GroceriesPage/ServicesPage/InvestmentPage/GoalsPage). |
| Unify data layer on TanStack Query | ✅ | `useAssets`, `useLiabilities`, `useInvestments`, `useGoals` rewritten on `useQuery`/`useMutation` (same return keys: `insertAsset`/`updateAsset`/`deleteAsset`, `insertLiability`/`updateLiability`/`deleteLiability`, `addGoal`/`updateGoal`/`deleteGoal`, `refreshInvestments` + new `addInvestment`/`updateInvestment`/`deleteInvestment` for the upcoming `InvestmentPage` migration). Query keys scoped per `userId`; invalidation on `['assets']`/`['liabilities']`/`['investments']`/`['financial_goals']`. |
| Replace `supabase` shim imports with clean `neonClient` surface | ✅ | All 9 remaining `services/supabaseClient` importers (`Auth`, `GroceriesPage`, `InvestmentPage`, `TransactionList`, `AICategoryPredictor`, `useHomeServices`, `useCategoryBudgets`, `useLastUpload`, `useTransactions` + `App`/rewritten hooks) now import from `services/neonClient` directly; `src/services/supabaseClient.ts` deleted. Local `supabase` aliases kept where rename would churn dozens of call sites — follow-up can rename locals to `neonClient`. |
| Break up god components (bounded) | ✅ | `InvestmentPage` done 2026-09-19 (→ ~660 LOC); `GroceriesPage` done 2026-09-19 (1,640 → ~1,000 LOC, details above); `Dashboard` done 2026-09-19 (854 → ~510 LOC): forecast state machine extracted to `src/hooks/useForecast.ts` (generation effect, 24h localStorage cache with pure, unit-tested key/load/save helpers, regenerate, mode toggle) + presentational `ForecastSection.tsx` (error banner, cached indicator, collapsible header, model picker, regenerate); Dashboard keeps header/upload/customize, memos, tables, search, advisor. Side fixes: groceries geolocation used a Vite-proxy-only `/api/geocode` URL (prod-broken, leaked key) — now `weatherService.getLocationName` via the Function (`/api/weather/revgeo` added; redeploy `api` pending). |
| Verify | ✅ | `tsc --noEmit` clean · `npm run lint` 0 errors, 139 `any` warnings (was 145) · `npm test` 16/16 pass (10 existing + 6 new router tests) · `npm run build` passes with per-route chunks · basename/deep-link covered by unit tests (full browser back/forward check still recommended on preview deploy) |

---

## Phase 3 — Performance ✅ Done (initial pass)

- Enforce bundle budget (fail CI over 300 KB initial) ✅ — `xlsx` (~430 KB raw) moved to a dynamic `import()` in `processXlsData` (own lazy chunk, loads only on upload); `recharts`/`react-markdown` verified already route-split (own lazy chunks, 0 occurrences in initial). `scripts/check-bundle-budget.mjs` + `npm run check-budget` gates `deploy.yml` post-build. Initial JS: **~197 KB gzip** (was ~315 KB, −37%), budget 300 KB.
- Lists ✅ — `Dashboard` auto-switches to the existing `VirtualizedTransactionList` past `VIRTUALIZED_TABLE_AFTER = 500` filtered rows (bounded DOM for 6.6k-row accounts) with a manual toggle back to the full-featured table; `TransactionList` keeps its 50-row incremental windowing below that. `useTransactionsPage(userId, page, pageSize)` added (`.range()` + exact count, `buildTransactionPageRange` unit-tested). Full server-paginated tables deferred: analytics (summary/charts/monthly) legitimately needs the full dataset until aggregation moves server-side — single fetch + client virtualization is optimal today.
- Memoize derived data ✅ — `App.tsx` `analyzeTransactions` (summary + forecast + anomalies) moved from setState-in-effect to `useMemo` on `[session, isLoading, transactions]`; sign-out path simplified (analysis derives from session). Heavy aggregation stays in `src/domain/` pure functions; `Dashboard` filter memos unchanged.
- Cache market/AI responses ✅ — in-memory TTL caches: `callGeminiAPI` (10 min, 100 entries, `clearGeminiCache`), market real-time per-type TTL (crypto 30 s / stock+ETF 60 s / rest 5 min) + historical 24 h (`clearMarketCache`), wired into `updateInvestmentValue`/`batchUpdateInvestmentValues`. Persistent `market_cache` table reserved as follow-up for cross-session reuse.
- Verify ✅ — `tsc` clean · `lint` 0 errors, 140 `any` warnings (tracked) · `tests` 22/22 (12 new: 3 range + 3 cache + 6 router from Phase 2 + existing 10) · `build` passes · budget gate passes. Lighthouse + real-data perf test still recommended on a preview deploy (no browser env here).

---

## Phase 4 — Backend & security 🚧 Code complete, deploy pending

- Move secrets off the client ✅ — Hono `api` Function (`functions/api/src/`, slug `api`): `POST /api/ai/complete` (Gateway native-Gemini dialect, direct server-key fallback), `GET /api/market/price|historical` (server IndianAPI key), `GET /api/weather/full|geocode|by-location` (server Google key). Client (`apiClient.ts` + server-first `geminiService`/`marketDataService`/`weatherService`) sends only `{model, prompt}`/query + user JWT. `deploy.yml` no longer injects `VITE_GEMINI_API_KEY`/`VITE_INDIAN_API_KEY`; legacy direct paths remain as local-dev fallbacks only. Initial bundle unchanged (~198 KB gzip, budget 300 KB).
- Migrate auth UI to native Better Auth React ⚖️ Deliberately partial — native `authClient` (`@neondatabase/auth` + `BetterAuthReactAdapter`, typed, no new lint warnings) added and used for Function bearer tokens (typed `getSession()` → `session.token` JWT, adapter-session fallback). Login UI stays on `SupabaseAuthAdapter` shapes: the adapter's `getSession` delegates to the same Better Auth instance, but `onAuthStateChange` propagation across two SDK instances is unverified without e2e, and Managed Auth exposes **no** MFA/passkeys today (roadmap/not exposed) — so a full UI re-plumb risks login regressions for zero unlocked features. Revisit when e2e-verifiable or plugins land.
- Enforce auth server-side ✅ — `verifyRequest` (jose, `NEON_AUTH_JWKS_URL`, issuer from `NEON_AUTH_BASE_URL`) on all `/api/*` except public `/api/health`; userId strictly from `sub`; CORS allowlist (localhost + `*.github.io` + `*.vercel.app` defaults, `ALLOWED_ORIGINS` merges in extras); model allowlist + 12k prompt cap; no stacks/keys in error bodies.
- Rate-limit AI endpoints per user + usage counters ✅ — Postgres `api_usage` (user/endpoint/hour, `INSERT … ON CONFLICT … RETURNING`; `API_USAGE_SCHEMA.sql`) with per-isolate memory fallback; defaults AI 60 / market+weather 600 per hour (env-overridable).
- Requires per-branch Functions deploy + `neon deploy --env .env` wiring ✅ — `neon.ts` declares `functions.api` (env with `VITE_` fallbacks for transition). **Free-plan caveat (hit live):** `neon deploy` *refuses* `aiGateway: true` on free (plan only warned) — flag removed, Function uses direct Gemini path with server-side `GEMINI_API_KEY`; re-add after paid upgrade. Deployed 2026-09-19 to `production`: `https://br-super-cherry-b37983l0-api.compute.c-4.ap-southeast-1.aws.neon.tech/` (`VITE_FUNCTION_URL` set in local `.env`; add as `FUNCTION_URL` repo secret for Pages). `FUNCTIONS_SETUP.md` documents the flow.
- Verify ✅ — `tsc` clean · `lint` 0 errors, 139 `any` warnings (no new) · `tests` 34/34 (12 new server-helper tests) · `build` + budget pass · live smoke: `/api/health` 200, unauthenticated `/api/ai/complete` 401. Remaining: logged-in browser pass (AI/market/weather via Function, 429 path, cross-user isolation) + `api_usage` table created ✅.

---

## Phase 5 — Quality & reliability ✅ Done (initial pass)

- Component tests ✅ — jsdom (`vitest.setup.ts` with jest-dom + RTL cleanup) + `src/test/mockNeonClient.ts` PostgREST-chain fake: `Auth` (4: form state, enablement, unconfigured error, modal close), `TransactionList` (3: rows+total, amount sort, delete-by-id), `useGoals` via `renderHook` + QueryClient (4: load, no-user empty, add, delete). `e2e/` excluded from vitest.
- Playwright e2e ✅ — `smoke.spec.ts` (landing shell, `/finance` deep link) **passes in real Chromium** against `vite preview`; `journey.spec.ts` (login → .xlsx upload → dashboard rows, fixture generated via SheetJS) self-skips without `E2E_EMAIL`/`E2E_PASSWORD`, wired as a `workflow_dispatch`-only CI job (chromium install + preview server + build). Full journey needs a throwaway test user.
- Error analytics ✅ — `utils/monitoring.ts`: Sentry (`@sentry/react`) loads only via dynamic `import()` when `VITE_SENTRY_DSN` is set (empty → `console.error` fallback; verified out of initial chunk — budget still ~199 KB). `ErrorBoundary` + `window.onerror`/`unhandledrejection` report through it; `SENTRY_DSN` plumbed in `deploy.yml` (unset = no-op).
- PWA ✅ — `vite-plugin-pwa` (autoUpdate): precached offline shell + `navigateFallback`, `NetworkOnly` for same-origin subresource/API (no stale authed financial data), `manifest.webmanifest` + `icon.svg` + `theme-color`/`description`/favicon in `index.html`. PNG icons (192/512) reserved as follow-up for the install prompt.
- Verify ✅ — `tsc` clean · `lint` 0 errors, 139 warnings (baseline held) · `vitest` 48/48 · Playwright smoke 2/2 (+1 skip-gated) · `build` emits `sw.js`+manifest · budget pass.

---

## Phase 6 — UX polish ✅ Done (initial pass)

- Onboarding flow for new signups ✅ — `OnboardingGuide` (3 steps: upload → AI categories → insights; Upload CTA deep-links to `/finance`) renders on home for signed-in users with zero transactions; per-user dismiss persists in `localStorage` (4 tests).
- Command palette (`Cmd+K`/`Ctrl+K`) ✅ — `CommandPalette` (9 routes grouped under Go to + Actions: upload, theme toggle, sign out when logged in; substring filter, up/down/enter/esc, listbox semantics) opened via shortcut or the Sidebar search button; ThemeSwitcher syncs off the palette's `app:theme` event (6 tests).
- Consistent chart theming + dashboard customization ✅ — `components/charts/chartTheme.ts` is the single source (`CATEGORY_PALETTE`, `SEMANTIC` income/expense/savings, `useChartTheme` dark-aware grid/tick/tooltip via class observer); adopted by CategoryChart, TrendsChart, DynamicChart, InvestmentPage allocation, ComparativeSpending (tooltips in light mode fixed as a side effect). `Dashboard` section toggles (summary/forecast/charts/monthly/search/transactions/advisor) with per-user `localStorage` persistence via a Customize popover.
- SEO/meta + OG tags, per-route `<title>`, favicon set ✅ — per-route titles landed in Phase 2; OG/Twitter/description tags added to `index.html` (Pages URL). Favicon is SVG-only (`icon.svg`, incl. apple-touch) — PNG 192/512 for the install prompt still reserved (no rasterizer available here).
- Verify ✅ — `tsc` clean · `lint` 0 errors, 139 warnings (baseline held) · `vitest` 58/58 (10 new) · Playwright smoke 2/2 · `build` + budget pass (~201 KB gzip).

## Follow-ups (post-plan)

- ✅ 2026-09-19 — `InvestmentPage` hook migration + `InvestmentFormModal` extraction (above). `vitest` 62/62 (4 new modal tests), lint warnings 139 → 136, budget unchanged (~201 KB), smoke 2/2.
- ✅ 2026-09-19 — `GroceriesPage` hook migration + `ShoppingListSection` extraction (above). `useGroceries` 5 tests, `ShoppingListSection` 4 tests (modal label `htmlFor` wired, inline edit flow); `vitest` 67/67, lint 142 warnings (0 errors), budget unchanged (~201 KB), smoke 2/2. **Reminder:** re-deploy the `api` Function (`neon deploy --env .env`) to serve the new `/api/weather/revgeo` route.
- ✅ 2026-09-19 — `Dashboard` forecast extraction (above). `useForecast` cache-helper tests (4) + `ForecastSection` tests (4); `vitest` 75/75, `tsc` clean, lint 0 errors, budget unchanged (~201 KB), smoke 2/2.

---

## Non-goals

- No framework migration (Next.js etc.) — Vite SPA + Functions is the right shape.
- No micro-frontends / monorepo / new CSS-in-JS — Tailwind + tokens suffice.
- No charts lib replacement (`recharts` is fine, just lazy-load it).

---

## Suggested execution order

1. **Phase 2** (current) — router first (cheap, de-risks splitting), then Query unification + shim cleanup.
2. **Phase 4** — secret extraction (only security hole; needs Functions + AI Gateway).
3. **Phase 3** — perf (needs router in place).
4. **Phases 5 & 6** in parallel with 3.
