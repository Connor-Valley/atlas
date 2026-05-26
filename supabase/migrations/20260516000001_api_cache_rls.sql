alter table api_cache enable row level security;
-- No policies — service role key bypasses RLS; anon/authenticated roles get no access.
