create table public.profiles (
  id           uuid        references auth.users(id) on delete cascade primary key,
  username     text        not null unique,
  display_name text        not null default '',
  created_at   timestamptz default now() not null,
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

alter table public.profiles enable row level security;

-- Anyone can read profiles (needed for searching friends by username)
create policy "profiles are publicly readable"
  on public.profiles
  for select
  using (true);

-- Users can insert their own profile
create policy "users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "users can update their own profile"
  on public.profiles
  for update
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile row when a new user signs up.
-- The username and display_name are pulled from user_metadata set at signup time.
-- If username is missing (e.g. users created before this migration), no row is inserted —
-- the app will prompt them to set a username via the profile page.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_username text;
begin
  v_username := new.raw_user_meta_data->>'username';
  if v_username is not null then
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      v_username,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
