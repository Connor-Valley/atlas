-- Allow friends to read each other's favorites
create policy "friends can view each other's favorites"
  on public.favorites
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.from_user_id = auth.uid() and fr.to_user_id = favorites.user_id)
          or
          (fr.to_user_id = auth.uid() and fr.from_user_id = favorites.user_id)
        )
    )
  );

-- Allow friends to read each other's saved comparisons
create policy "friends can view each other's saved comparisons"
  on public.saved_comparisons
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.from_user_id = auth.uid() and fr.to_user_id = saved_comparisons.user_id)
          or
          (fr.to_user_id = auth.uid() and fr.from_user_id = saved_comparisons.user_id)
        )
    )
  );
