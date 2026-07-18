import type { DimensionScores } from './atlasScore';

export type DimMeta = { key: keyof DimensionScores; label: string; tooltip: string };

export const DIMS: DimMeta[] = [
  { key: 'affordability',     label: 'Affordability',       tooltip: 'How far income stretches relative to local rent and cost of living.' },
  { key: 'jobMarket',         label: 'Job Market',          tooltip: 'Strength of the local economy based on median income and unemployment.' },
  { key: 'climate',           label: 'Climate',             tooltip: 'Year-round weather quality — sunny days, mild temps, and low hazard risk.' },
  { key: 'opportunity',       label: 'Opportunity',         tooltip: 'Growth potential based on education attainment, labor force participation, and employment trends.' },
  { key: 'lifestyleVibrancy', label: 'Lifestyle & Vibrancy', tooltip: 'Day-to-day quality of life including restaurants, arts, and walkability.' },
  { key: 'airQuality',        label: 'Air Quality',         tooltip: 'Air cleanliness based on EPA AQI data — good days vs. unhealthy days.' },
  { key: 'connectivity',      label: 'Connectivity',        tooltip: 'Access to transportation options including airports and public transit.' },
];

const DIM_BY_KEY = new Map(DIMS.map(d => [d.key, d]));

export function getDim(key: keyof DimensionScores): DimMeta | undefined {
  return DIM_BY_KEY.get(key);
}
