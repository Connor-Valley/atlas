alter table public.profiles
  add column if not exists profile_visibility text not null default 'public'
  check (profile_visibility in ('public', 'friends_only', 'private'));

create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.from_user_id = user_a and fr.to_user_id = user_b)
        or
        (fr.from_user_id = user_b and fr.to_user_id = user_a)
      )
  );
$$;

create or replace function public.can_view_profile_content(target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  visibility_setting text;
begin
  if viewer_id = target_user_id then
    return true;
  end if;

  select p.profile_visibility
    into visibility_setting
  from public.profiles p
  where p.id = target_user_id;

  if visibility_setting is null then
    return false;
  end if;

  if visibility_setting = 'public' then
    return true;
  end if;

  if visibility_setting = 'friends_only' and viewer_id is not null then
    return public.are_friends(viewer_id, target_user_id);
  end if;

  return false;
end;
$$;

drop policy if exists "authenticated users can view all favorites" on public.favorites;
drop policy if exists "authenticated users can view all saved comparisons" on public.saved_comparisons;
drop policy if exists "friends can view each other's favorites" on public.favorites;
drop policy if exists "friends can view each other's saved comparisons" on public.saved_comparisons;

create policy "users can view favorites by profile visibility"
  on public.favorites
  for select
  using (public.can_view_profile_content(user_id));

create policy "users can view saved comparisons by profile visibility"
  on public.saved_comparisons
  for select
  using (public.can_view_profile_content(user_id));
