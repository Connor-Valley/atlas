create table public.recent_searches (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  state       text        not null,
  city        text        not null,  -- slug, e.g. "los-angeles"
  city_name   text        not null,  -- display name, e.g. "Los Angeles"
  created_at  timestamptz default now() not null
);

alter table public.recent_searches enable row level security;

create policy "users can manage their own recent searches"
  on public.recent_searches
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
