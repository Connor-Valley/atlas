import type { SourceAttribution } from "../common/source.types.js";

export type AirQualitySummary = {
  city: string;
  state: string;
  medianAqi: number | null;
  p90Aqi: number | null;
  maxAqi: number | null;
  daysWithAqi: number | null;
  goodDaysPercent: number | null;
  moderateDaysPercent: number | null;
  unhealthyDaysPercent: number | null;  // USG + Unhealthy + Very Unhealthy + Hazardous combined
  aqiCategory: string | null;           // "Good" | "Moderate" | "Unhealthy for Sensitive Groups" | "Unhealthy" | "Very Unhealthy"
  year: number | null;
  source: SourceAttribution;
};
