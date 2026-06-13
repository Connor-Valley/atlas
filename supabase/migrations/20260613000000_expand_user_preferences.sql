alter table user_preferences
  add column if not exists weight_climate               int not null default 20,
  add column if not exists weight_air_quality           int not null default 10,
  add column if not exists weight_education             int not null default 15,
  add column if not exists weight_lifestyle_vibrancy    int not null default 15,
  add column if not exists weight_safety                int not null default 0,
  add column if not exists climate_preference           text not null default 'any',
  add column if not exists political_preference_enabled boolean not null default false,
  add column if not exists political_preference         int not null default 0;
