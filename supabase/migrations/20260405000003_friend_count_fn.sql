-- Public helper to count a user's accepted friends.
-- SECURITY DEFINER bypasses RLS so any authenticated user can
-- read another user's friend count without exposing request details.
create or replace function public.get_friend_count(profile_id uuid)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.friend_requests
  where status = 'accepted'
    and (from_user_id = profile_id or to_user_id = profile_id);
$$;
