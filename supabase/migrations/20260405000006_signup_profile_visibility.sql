create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_username text;
  v_profile_visibility text;
begin
  v_username := new.raw_user_meta_data->>'username';
  v_profile_visibility := coalesce(new.raw_user_meta_data->>'profile_visibility', 'public');

  if v_profile_visibility not in ('public', 'friends_only', 'private') then
    v_profile_visibility := 'public';
  end if;

  if v_username is not null then
    insert into public.profiles (id, username, display_name, profile_visibility)
    values (
      new.id,
      v_username,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      v_profile_visibility
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;
