import type { SourceAttribution } from "../common/source.types.js";

export type HazardRisk = {
  score: number | null;   // national percentile 0–100 (higher = riskier)
  rating: string | null;  // "Very Low" | "Relatively Low" | "Relatively Moderate" | "Relatively High" | "Very High" | "Not Applicable"
};

export type NaturalHazardRisks = {
  compositeScore: number | null;
  compositeRating: string | null;
  tornado: HazardRisk;
  hurricane: HazardRisk;
  riverineFlooding: HazardRisk;
  coastalFlooding: HazardRisk;
  wildfire: HazardRisk;
  earthquake: HazardRisk;
  winterWeather: HazardRisk;
  heatWave: HazardRisk;
  drought: HazardRisk;
  source: SourceAttribution;
};

export type ClimateSummary = {
  city: string;
  state: string;
  avgTempF: number | null;
  summerAvgHighF: number | null;
  winterAvgLowF: number | null;
  sunnyDaysPerYear: number | null;
  annualPrecipitationInches: number | null;
  annualSnowfallInches: number | null;
  hotDaysPerYear: number | null;
  freezingDaysPerYear: number | null;
  hazardRisks: NaturalHazardRisks | null;
  dataYearRange: string | null;
  source: SourceAttribution;
};
