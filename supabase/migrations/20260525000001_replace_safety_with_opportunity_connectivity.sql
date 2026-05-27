alter table user_preferences
  drop column weight_safety,
  add column weight_opportunity  int not null default 20 check (weight_opportunity  between 0 and 100),
  add column weight_connectivity int not null default 20 check (weight_connectivity between 0 and 100);

-- Rebalance remaining defaults to 20 each (5 equal dimensions)
alter table user_preferences
  alter column weight_affordability set default 20,
  alter column weight_job_market    set default 20,
  alter column weight_lifestyle     set default 20;
