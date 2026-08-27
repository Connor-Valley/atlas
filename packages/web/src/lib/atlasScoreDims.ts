import type { DimensionScores, CityCharacteristics } from './atlasScore';
import type { UserPreferences } from '../composables/usePreferences';

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
  affordable: 'Affordable', moderate: 'Moderate', pricey: 'Pricey', expensive: 'Expensive',
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
  high: 'Clean air priority', medium: 'Balanced', low: 'Not a priority',
  // connectivity
  walkable: 'Walkable', balanced: 'Balanced access', airport: 'Airport access', car: 'Car-friendly',
  // political
  progressive: 'Progressive cities', conservative: 'Conservative cities',
  open: 'Open to any', not_a_factor: 'Not a factor',
  // any
  any: 'No preference',
};

const DIM_BY_KEY = new Map(DIMS.map(d => [d.key, d]));

export function getDim(key: keyof DimensionScores): DimMeta | undefined {
  return DIM_BY_KEY.get(key);
}
