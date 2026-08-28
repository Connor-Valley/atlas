-- Redesign saved_comparisons for 2-4 city support: replace the fixed a/b columns with a
-- parent + child-table shape so slot count is flexible and RLS stays a plain auth.uid() check.
-- Clean-break migration (no backfill) — pre-launch app, no indication of production rows to
-- preserve.
drop table if exists public.saved_comparisons cascade;

create table public.saved_comparisons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

create table public.saved_comparison_cities (
  comparison_id uuid not null references public.saved_comparisons(id) on delete cascade,
  slot smallint not null check (slot between 1 and 4),
  state text not null,
  city text not null,
  city_name text not null,
  primary key (comparison_id, slot)
);

alter table public.saved_comparisons enable row level security;
alter table public.saved_comparison_cities enable row level security;

create policy "users can manage their own saved comparisons"
  on public.saved_comparisons for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mirrors the current effective visibility rule on the old table (from
-- 20260405000005_profile_privacy_levels.sql), which supersedes the earlier friend-only and
-- "all authenticated users" policies dropped along the way — recreate that same rule, not the
-- superseded ones.
create policy "users can view saved comparisons by profile visibility"
  on public.saved_comparisons for select
  using (public.can_view_profile_content(user_id));

create policy "users can manage their own saved comparison cities"
  on public.saved_comparison_cities for all
  using (exists (select 1 from public.saved_comparisons sc where sc.id = comparison_id and sc.user_id = auth.uid()))
  with check (exists (select 1 from public.saved_comparisons sc where sc.id = comparison_id and sc.user_id = auth.uid()));

create policy "users can view saved comparison cities by profile visibility"
  on public.saved_comparison_cities for select
  using (exists (
    select 1 from public.saved_comparisons sc
    where sc.id = comparison_id and public.can_view_profile_content(sc.user_id)
  ));
