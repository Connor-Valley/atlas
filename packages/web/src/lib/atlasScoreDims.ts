import type { DimensionScores, CityCharacteristics } from './atlasScore';
import type { UserPreferences, DealbreakerDim } from '../composables/usePreferences';

export type DimMeta = {
  key: keyof DimensionScores;
  charKey: keyof CityCharacteristics;
  prefKey: keyof UserPreferences | null;
  icon: string;
  label: string;
  tooltip: string;
};

export const DIMS: DimMeta[] = [
  { key: 'climate',           charKey: 'climate',           prefKey: 'climate_preference',       icon: 'mdi-weather-partly-cloudy',        label: 'Climate',        tooltip: 'Year-round weather quality — sunny days, mild temps, and low hazard risk.' },
  { key: 'affordability',     charKey: 'affordability',     prefKey: 'affordability_preference', icon: 'mdi-credit-card-outline',          label: 'Cost of Living', tooltip: 'How far income stretches relative to local rent and cost of living.' },
  { key: 'jobMarket',         charKey: 'jobMarket',         prefKey: 'job_market_preference',    icon: 'mdi-trending-up',                  label: 'Job Market',     tooltip: 'Size of the labor market actually reachable within 25 miles, plus unemployment and growth trends.' },
  { key: 'lifestyleVibrancy', charKey: 'lifestyleVibrancy', prefKey: 'lifestyle_preference',     icon: 'mdi-home-city-outline',            label: 'Lifestyle',      tooltip: 'Day-to-day quality of life including restaurants, arts, and walkability.' },
  { key: 'opportunity',       charKey: 'opportunity',       prefKey: 'opportunity_preference',   icon: 'mdi-chart-line',                   label: 'Opportunity',    tooltip: "The area's dominant job industry, based on what residents actually work in." },
  { key: 'airQuality',        charKey: 'airQuality',        prefKey: 'air_quality_priority',     icon: 'mdi-leaf-circle-outline',          label: 'Air Quality',    tooltip: 'Air cleanliness based on EPA AQI data — good days vs. unhealthy days.' },
  { key: 'connectivity',      charKey: 'connectivity',      prefKey: 'connectivity_preference',  icon: 'mdi-map-marker-radius-outline',    label: 'Getting Around', tooltip: 'Access to transportation options including airports and public transit.' },
];

export const PREF_LABELS: Record<string, string> = {
  // climate
  warm: 'Warm & sunny', hot_dry: 'Hot & dry', cool: 'Cool & crisp',
  mild: 'Mild year-round', four_seasons: 'Four seasons',
  // affordability
  cost_high: 'Very important', cost_medium: 'Somewhat important', cost_low: 'Not very important',
  // job market
  high_earning: 'High-earning', stable: 'Stable market',
  growth: 'Fast growth', remote: 'Remote-friendly',
  // lifestyle
  urban: 'City energy', urban_edge: 'Urban edge',
  suburban: 'Suburban', nature: 'Outdoors & nature',
  // opportunity
  tech_media_pro: 'Tech & Professional Services', corporate_finance: 'Corporate & Finance',
  manufacturing: 'Manufacturing & Industrial', construction_trades: 'Construction & Trades',
  transportation_logistics: 'Transportation & Logistics', education_healthcare: 'Education & Healthcare',
  government_services: 'Government & Public Services', retail: 'Retail & Consumer Services',
  hospitality_arts: 'Hospitality, Arts & Entertainment', agriculture: 'Agriculture & Natural Resources',
  nonprofit: 'Nonprofit & Community Organizations',
  // air quality
  high: 'Very important', medium: 'Somewhat important', low: 'Not very important',
  // connectivity
  walkable: 'Walkable', balanced: 'Balanced access', airport: 'Airport access', car: 'Car-friendly',
  // political
  progressive: 'Progressive cities', conservative: 'Conservative cities',
  open: 'Open to any', not_a_factor: 'Not a factor',
  // any
  any: 'No preference',
};

// Several preference fields are multi-select (see MULTI_SELECT_KEYS in usePreferences.ts) —
// this joins every selected value's label for display (e.g. "City energy or Urban edge") instead
// of assuming a single scalar value. Also accepts a plain scalar for the fields that stay
// single-select (affordability_preference, air_quality_priority, political_lean_preference).
export function prefLabelFor(values: string[] | string | null | undefined): string {
  const list = Array.isArray(values) ? values : values != null ? [values] : [];
  const labels = list.map((v) => PREF_LABELS[v] ?? v).filter(Boolean);
  return labels.length ? labels.join(' or ') : '—';
}

// Maps a DimensionScores key (camelCase) to its DealbreakerDim name (snake_case) — the two enums
// diverge in naming (jobMarket vs job_market, etc.), so AtlasScoreResult.dealbreakerFailures
// (typed DealbreakerDim[]) needs this to check against a DIMS entry's `key`. `safety` has no
// deal-breaker dimension (it's never scored — see computeAtlasScore).
export const DIM_KEY_TO_DEALBREAKER: Partial<Record<keyof DimensionScores, DealbreakerDim>> = {
  affordability:     'affordability',
  jobMarket:         'job_market',
  climate:           'climate',
  opportunity:       'opportunity',
  lifestyleVibrancy: 'lifestyle_vibrancy',
  airQuality:        'air_quality',
  connectivity:      'connectivity',
};

const DIM_BY_KEY = new Map(DIMS.map(d => [d.key, d]));

export function getDim(key: keyof DimensionScores): DimMeta | undefined {
  return DIM_BY_KEY.get(key);
}
