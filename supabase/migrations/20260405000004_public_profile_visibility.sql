-- Replace friend-only visibility with open visibility for all authenticated users.
-- Any signed-in user can view any user's favorites and saved comparisons.

drop policy if exists "friends can view each other's favorites" on public.favorites;
drop policy if exists "friends can view each other's saved comparisons" on public.saved_comparisons;

create policy "authenticated users can view all favorites"
  on public.favorites
  for select
  using (auth.uid() is not null);

create policy "authenticated users can view all saved comparisons"
  on public.saved_comparisons
  for select
  using (auth.uid() is not null);
