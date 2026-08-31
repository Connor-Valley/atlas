-- Multi-select preferences: users can pick more than one acceptable option for climate,
-- job market, lifestyle, opportunity, and connectivity (see atlasScore.ts's lookupMatchScore /
-- evaluateOpportunityMatch, which now take an array of selected values and score a city against
-- whichever selected option it matches best). affordability_preference and air_quality_priority
-- stay single-value text columns — both are importance-level dials (cost_low/medium/high,
-- low/medium/high), not "type" choices, so multi-select doesn't apply to them. political_lean_preference
-- also stays single-value (explicitly out of scope).
alter table user_preferences
  alter column climate_preference      type text[] using array[climate_preference],
  alter column job_market_preference   type text[] using array[job_market_preference],
  alter column lifestyle_preference    type text[] using array[lifestyle_preference],
  alter column opportunity_preference  type text[] using array[opportunity_preference],
  alter column connectivity_preference type text[] using array[connectivity_preference],
  alter column climate_preference      set default array['any'],
  alter column job_market_preference   set default array['any'],
  alter column lifestyle_preference    set default array['any'],
  alter column opportunity_preference  set default array['any'],
  alter column connectivity_preference set default array['any'];
