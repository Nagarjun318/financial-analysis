-- Phase 4: per-user, per-endpoint hourly counters backing Function rate limits.
-- The `api` Function increments via INSERT … ON CONFLICT DO UPDATE … RETURNING
-- (see functions/api/src/ratelimit.ts). Safe to run repeatedly (IF NOT EXISTS).
create table if not exists api_usage (
  user_id text not null,
  endpoint text not null, -- 'ai' | 'market' | 'weather'
  window_start timestamptz not null, -- date_trunc('hour', now())
  count integer not null default 1,
  primary key (user_id, endpoint, window_start)
);

-- Optional hygiene: drop windows older than 7 days (run via cron trigger later).
-- delete from api_usage where window_start < now() - interval '7 days';
