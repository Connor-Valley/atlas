create table user_preferences (
  user_id              uuid primary key references auth.users on delete cascade,
  persona_id           text not null default 'remote_worker',
  weight_affordability int  not null default 25 check (weight_affordability between 0 and 100),
  weight_job_market    int  not null default 25 check (weight_job_market between 0 and 100),
  weight_safety        int  not null default 25 check (weight_safety between 0 and 100),
  weight_lifestyle     int  not null default 25 check (weight_lifestyle between 0 and 100),
  updated_at           timestamptz not null default now()
);

alter table user_preferences enable row level security;

create policy "users manage own preferences"
  on user_preferences for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
