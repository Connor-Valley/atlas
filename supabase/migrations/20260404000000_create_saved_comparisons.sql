create table public.saved_comparisons (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references auth.users(id) on delete cascade not null,
  state_a      text        not null,
  city_a       text        not null,  -- slug, e.g. "denver"
  city_name_a  text        not null,  -- display name, e.g. "Denver"
  state_b      text        not null,
  city_b       text        not null,  -- slug, e.g. "austin"
  city_name_b  text        not null,  -- display name, e.g. "Austin"
  created_at   timestamptz default now() not null,
  unique (user_id, state_a, city_a, state_b, city_b)
);

alter table public.saved_comparisons enable row level security;

create policy "users can manage their own saved comparisons"
  on public.saved_comparisons
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
