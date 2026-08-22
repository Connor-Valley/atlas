alter table user_preferences
  add column if not exists affordability_preference  text not null default 'any',
  add column if not exists job_market_preference     text not null default 'any',
  add column if not exists lifestyle_preference      text not null default 'any',
  add column if not exists opportunity_preference    text not null default 'any',
  add column if not exists connectivity_preference   text not null default 'any',
  add column if not exists air_quality_priority      text not null default 'medium',
  add column if not exists political_lean_preference text not null default 'not_a_factor';
