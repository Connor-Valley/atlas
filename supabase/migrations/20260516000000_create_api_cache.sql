create table api_cache (
  key        text primary key,
  data       jsonb not null,
  cached_at  timestamptz not null default now()
);

-- No RLS needed — this table contains only public Census/API data, no user PII.
-- The API accesses it via the service role key server-side.
