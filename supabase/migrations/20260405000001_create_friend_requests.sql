create table public.friend_requests (
  id           uuid        default gen_random_uuid() primary key,
  from_user_id uuid        references auth.users(id) on delete cascade not null,
  to_user_id   uuid        references auth.users(id) on delete cascade not null,
  status       text        not null default 'pending'
                           check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz default now() not null,
  constraint friend_requests_no_self_add check (from_user_id <> to_user_id),
  -- Prevent sending duplicate requests in the same direction
  unique (from_user_id, to_user_id)
);

alter table public.friend_requests enable row level security;

-- Both parties can see their requests
create policy "users can view their own friend requests"
  on public.friend_requests
  for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Only the sender can create a request
create policy "users can send friend requests"
  on public.friend_requests
  for insert
  with check (auth.uid() = from_user_id);

-- Only the recipient can accept or decline
create policy "recipients can respond to friend requests"
  on public.friend_requests
  for update
  using  (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

-- Sender can cancel a pending request; either party can remove an accepted friendship
create policy "users can delete their own friend requests"
  on public.friend_requests
  for delete
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
