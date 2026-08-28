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
  // New-snowfall accumulation — only ever populated from Open-Meteo. The Meteostat fallback
  // measures snow *depth*, not new snowfall, so it can't honestly fill this field — see
  // snowDaysPerYear below for what the fallback source can actually say about snow.
  annualSnowfallInches: number | null;
  hotDaysPerYear: number | null;
  freezingDaysPerYear: number | null;
  // Days per year with measurable snow depth on the ground. Only populated when weather came
  // from the station-based fallback (Open-Meteo has no depth data). Deliberately a different
  // metric than annualSnowfallInches, not a substitute for it.
  snowDaysPerYear: number | null;
  // True when weatherApproximate fields above came from the nearest-station fallback rather
  // than a live Open-Meteo fetch — the frontend uses this to show a caveat.
  weatherApproximate: boolean;
  hazardRisks: NaturalHazardRisks | null;
  dataYearRange: string | null;
  source: SourceAttribution;
};
