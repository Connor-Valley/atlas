import { fetchCity } from "../api/cities";
import { fetchIncome, fetchDetailedIncome } from "../api/income";
import { fetchHousing } from "../api/housing";
import { fetchAffordability, fetchDetailedAffordability } from "../api/affordability";
import { fetchQualityOfLife } from "../api/qualityOfLife";
import { fetchCityProfile } from "../api/cityProfile";
import { fetchClimate } from "../api/climate";
import { fetchAirQuality } from "../api/airQuality";
import { fetchCostOfLiving } from "../api/costOfLiving";
import { fetchLifestyle } from "../api/lifestyle";
import { fetchCityPhoto } from "./cityPhotos";
import { computeAtlasScore, rawIncomeScore, rawHousingScore } from "./atlasScore";
import type { UserPreferences } from "../composables/usePreferences";
import {
  rankCells,
  bestIndex,
  barWidth,
  deltaVsFirst,
  leaderTally,
  type CompareCell,
  type MetricDirection,
} from "./compareMetrics";

export const MIN_COMPARE_CITIES = 2;
export const MAX_COMPARE_CITIES = 4;

export function slugToDisplay(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function cityLabel(city: string, state: string): string {
  return `${slugToDisplay(city)}, ${state.toUpperCase()}`;
}

export type CompareCityRef = { state: string; city: string };

export function buildCompareUrl(cities: CompareCityRef[]): string {
  if (!cities.length) return "/compare";
  return `/compare/${cities.map((c) => `${c.state.toLowerCase()}-${c.city}`).join("_")}`;
}

export function parseCompareCitiesParam(param: string | string[] | undefined): CompareCityRef[] {
  if (!param || Array.isArray(param)) return [];
  return param
    .split("_")
    .slice(0, MAX_COMPARE_CITIES)
    .map((pair) => {
      const [state, ...rest] = pair.split("-");
      return { state: (state ?? "").toLowerCase(), city: rest.join("-") };
    })
    .filter((c) => c.state && c.city);
}

// ── Per-city data loading ──────────────────────────────────────────────────────

export type CompareCityBundle = {
  state: string;
  city: string;
  name: string;
  county: string;
  population: number;
  photoUrl: string | null;

  atlasScore: number | null;
  personalizedAtlasScore: number | null;
  incomeScore: number | null;
  housingScore: number | null;
  jobMarketScore: number | null;
  climateScore: number | null;
  lifestyleScore: number | null;

  medianHouseholdIncome: number | null;
  medianRenterIncome: number | null;
  povertyRate: number | null;
  unemploymentRate: number | null;
  employmentGrowthPct5yr: number | null;
  giniCoefficient: number | null;

  medianRent: number | null;
  medianHomeValue: number | null;
  rentBurdenPercent: number | null;
  priceToIncomeRatio: number | null;
  ownerShare: number | null;
  rppIndex: number | null;
  rppIsStateLevel: boolean;

  summerAvgHighF: number | null;
  winterAvgLowF: number | null;
  sunnyDaysPerYear: number | null;
  annualPrecipitationInches: number | null;
  medianAqi: number | null;
  aqiCategory: string | null;
};

export async function loadCompareCity(state: string, city: string, prefs?: UserPreferences | null): Promise<CompareCityBundle> {
  const [
    cityInfo,
    income,
    detailedIncome,
    housingRes,
    affordability,
    detailedAffordability,
    qol,
    profile,
    climate,
    airQuality,
    costOfLiving,
    lifestyle,
    photoUrl,
  ] = await Promise.all([
    fetchCity(state, city),
    fetchIncome(state, city),
    fetchDetailedIncome(state, city).catch(() => null),
    fetchHousing(state, city),
    fetchAffordability(state, city).catch(() => null),
    fetchDetailedAffordability(state, city).catch(() => null),
    fetchQualityOfLife(state, city).catch(() => null),
    fetchCityProfile(state, city).catch(() => null),
    fetchClimate(state, city).catch(() => null),
    fetchAirQuality(state, city).catch(() => null),
    fetchCostOfLiving(state, city).catch(() => null),
    fetchLifestyle(state, city).catch(() => null),
    fetchCityPhoto(state, city).catch(() => null),
  ]);

  const housing = housingRes?.housing ?? null;

  const atlasResult = computeAtlasScore({
    income: detailedIncome ?? income,
    affordability,
    costOfLiving,
    profile,
    qol,
    climate,
    airQuality,
    lifestyle,
    politicalLean: null,
    housing,
  });

  const personalizedScore = prefs
    ? computeAtlasScore({
        income: detailedIncome ?? income,
        affordability,
        costOfLiving,
        profile,
        qol,
        climate,
        airQuality,
        lifestyle,
        politicalLean: null,
        housing,
      }, prefs)
    : null;

  return {
    state,
    city,
    name: cityInfo.name,
    county: cityInfo.county,
    population: cityInfo.population,
    photoUrl,

    atlasScore: Math.round(atlasResult.score),
    personalizedAtlasScore: personalizedScore ? Math.round(personalizedScore.score) : null,
    incomeScore: roundOrNull(rawIncomeScore(income)),
    housingScore: roundOrNull(rawHousingScore(detailedAffordability, housing, costOfLiving)),
    jobMarketScore: roundOrNull(atlasResult.breakdown.jobMarket),
    climateScore: roundOrNull(atlasResult.breakdown.climate),
    lifestyleScore: roundOrNull(atlasResult.breakdown.lifestyleVibrancy),

    medianHouseholdIncome: income?.medianHouseholdIncome ?? null,
    medianRenterIncome: income?.medianRenterIncome ?? null,
    povertyRate: income?.povertyRate ?? null,
    unemploymentRate: qol?.unemploymentRate?.value ?? null,
    employmentGrowthPct5yr: detailedIncome?.employmentGrowthPct5yr ?? null,
    giniCoefficient: detailedIncome?.giniCoefficient ?? null,

    medianRent: housing?.medianRent ?? null,
    medianHomeValue: housing?.medianHomeValue ?? null,
    rentBurdenPercent: detailedAffordability?.rentBurdenPercent ?? null,
    priceToIncomeRatio: detailedAffordability?.priceToIncomeRatio ?? null,
    ownerShare: profile?.ownerShare ?? null,
    rppIndex: costOfLiving?.rppIndex ?? null,
    rppIsStateLevel: costOfLiving?.level === "state",

    summerAvgHighF: climate?.summerAvgHighF ?? null,
    winterAvgLowF: climate?.winterAvgLowF ?? null,
    sunnyDaysPerYear: climate?.sunnyDaysPerYear ?? null,
    annualPrecipitationInches: climate?.annualPrecipitationInches ?? null,
    medianAqi: airQuality?.medianAqi ?? null,
    aqiCategory: airQuality?.aqiCategory ?? null,
  };
}

function roundOrNull(v: number | null): number | null {
  return v == null ? null : Math.round(v);
}

// ── Grouped metric table ───────────────────────────────────────────────────────

export type CompareRow = {
  key: string;
  label: string;
  subLabel: string;
  direction: MetricDirection;
  // False for "context" metrics (e.g. summer high temp) — no best/worst highlight or rank badge.
  ranked: boolean;
  usValue: number | null;
  cells: CompareCell[];
};

export type CompareGroup = {
  key: string;
  label: string;
  rows: CompareRow[];
};

type MetricDef = {
  key: string;
  label: string;
  // "context" metrics (e.g. summer high temp) have no better/worse direction.
  direction: MetricDirection | "context";
  us: number | null;
  format: (v: number) => string;
  pick: (b: CompareCityBundle) => number | null;
  // Called only when pick() returns null, to explain the missing value as a tooltip.
  note?: (b: CompareCityBundle) => string | null;
};

const fmtUsd = (v: number) => `$${Math.round(v).toLocaleString()}`;
const fmtScore = (v: number) => `${Math.round(v)}`;
const fmtPct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtPctPoint1 = (v: number) => `${v.toFixed(1)}%`;
const fmtPctSigned = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtGini = (v: number) => v.toFixed(3);
const fmtX = (v: number) => `${v.toFixed(2)}×`;
const fmtTemp = (v: number) => `${Math.round(v)}°`;
const fmtIn = (v: number) => `${v.toFixed(1)}"`;
const fmtIdx = (v: number) => v.toFixed(0);

// US reference values (approximate national medians/averages), used for the "US AVG" sub-label
// only — a rough anchor for reading an individual value, not a ranked comparison target.
const US_REFERENCE = {
  medianHouseholdIncome: 75149,
  medianRenterIncome: 51000,
  povertyRate: 12.5,
  unemploymentRate: 0.04,
  employmentGrowthPct5yr: 3.1,
  giniCoefficient: 0.39,
  medianRent: 1406,
  medianHomeValue: 340000,
  rentBurdenPercent: 0.3,
  priceToIncomeRatio: 4.6,
  ownerShare: 0.652,
  rppIndex: 100,
  summerAvgHighF: 86,
  winterAvgLowF: 28,
  sunnyDaysPerYear: 205,
  annualPrecipitationInches: 30,
  medianAqi: 42,
};

const GROUP_DEFS: Array<{ key: string; label: string; metrics: MetricDef[] }> = [
  {
    key: "atlas-score",
    label: "ATLAS SCORE",
    metrics: [
      { key: "atlasScore", label: "Atlas Score", direction: "higher", us: null, format: fmtScore, pick: (b) => b.atlasScore },
      { key: "incomeScore", label: "Income", direction: "higher", us: null, format: fmtScore, pick: (b) => b.incomeScore },
      { key: "housingScore", label: "Housing", direction: "higher", us: null, format: fmtScore, pick: (b) => b.housingScore },
      { key: "jobMarketScore", label: "Job market", direction: "higher", us: null, format: fmtScore, pick: (b) => b.jobMarketScore },
      { key: "climateScore", label: "Climate", direction: "higher", us: null, format: fmtScore, pick: (b) => b.climateScore },
      { key: "lifestyleScore", label: "Lifestyle", direction: "higher", us: null, format: fmtScore, pick: (b) => b.lifestyleScore },
    ],
  },
  {
    key: "income-jobs",
    label: "INCOME & JOBS",
    metrics: [
      { key: "medianHouseholdIncome", label: "Median household income", direction: "higher", us: US_REFERENCE.medianHouseholdIncome, format: fmtUsd, pick: (b) => b.medianHouseholdIncome },
      { key: "medianRenterIncome", label: "Median renter income", direction: "higher", us: US_REFERENCE.medianRenterIncome, format: fmtUsd, pick: (b) => b.medianRenterIncome },
      { key: "povertyRate", label: "Poverty rate", direction: "lower", us: US_REFERENCE.povertyRate, format: fmtPctPoint1, pick: (b) => b.povertyRate },
      { key: "unemploymentRate", label: "Unemployment", direction: "lower", us: US_REFERENCE.unemploymentRate, format: fmtPct1, pick: (b) => b.unemploymentRate },
      { key: "employmentGrowthPct5yr", label: "Job growth (5yr)", direction: "higher", us: US_REFERENCE.employmentGrowthPct5yr, format: fmtPctSigned, pick: (b) => b.employmentGrowthPct5yr },
      { key: "giniCoefficient", label: "Gini index", direction: "lower", us: US_REFERENCE.giniCoefficient, format: fmtGini, pick: (b) => b.giniCoefficient },
    ],
  },
  {
    key: "housing-cost",
    label: "HOUSING & COST",
    metrics: [
      { key: "medianRent", label: "Median rent", direction: "lower", us: US_REFERENCE.medianRent, format: fmtUsd, pick: (b) => b.medianRent },
      { key: "medianHomeValue", label: "Median home value", direction: "lower", us: US_REFERENCE.medianHomeValue, format: fmtUsd, pick: (b) => b.medianHomeValue },
      { key: "rentBurdenPercent", label: "Rent burden", direction: "lower", us: US_REFERENCE.rentBurdenPercent, format: fmtPct1, pick: (b) => b.rentBurdenPercent },
      { key: "priceToIncomeRatio", label: "Price to income", direction: "lower", us: US_REFERENCE.priceToIncomeRatio, format: fmtX, pick: (b) => b.priceToIncomeRatio },
      { key: "ownerShare", label: "Owner-occupied", direction: "higher", us: US_REFERENCE.ownerShare, format: fmtPct1, pick: (b) => b.ownerShare },
      {
        key: "rppIndex",
        label: "Cost of living",
        direction: "lower",
        us: US_REFERENCE.rppIndex,
        format: fmtIdx,
        pick: (b) => (b.rppIsStateLevel ? null : b.rppIndex),
        note: (b) => (b.rppIsStateLevel
          ? "Only state-level cost-of-living data is available for this city, so it's hidden here to avoid comparing a whole-state average against another city's metro-specific number."
          : null),
      },
    ],
  },
  {
    key: "climate-air",
    label: "CLIMATE & AIR",
    metrics: [
      { key: "summerAvgHighF", label: "Summer high", direction: "context", us: US_REFERENCE.summerAvgHighF, format: fmtTemp, pick: (b) => b.summerAvgHighF },
      { key: "winterAvgLowF", label: "Winter low", direction: "context", us: US_REFERENCE.winterAvgLowF, format: fmtTemp, pick: (b) => b.winterAvgLowF },
      { key: "sunnyDaysPerYear", label: "Sunny days", direction: "higher", us: US_REFERENCE.sunnyDaysPerYear, format: fmtScore, pick: (b) => b.sunnyDaysPerYear },
      { key: "annualPrecipitationInches", label: "Annual rainfall", direction: "context", us: US_REFERENCE.annualPrecipitationInches, format: fmtIn, pick: (b) => b.annualPrecipitationInches },
      { key: "medianAqi", label: "Air quality (AQI)", direction: "lower", us: US_REFERENCE.medianAqi, format: fmtScore, pick: (b) => b.medianAqi },
    ],
  },
];

export function buildCompareGroups(bundles: CompareCityBundle[]): CompareGroup[] {
  return GROUP_DEFS.map((group) => ({
    key: group.key,
    label: group.label,
    rows: group.metrics.map((metric) => {
      // "context" metrics (e.g. summer high, rainfall) have no better/worse direction — treat
      // as "higher" for rank/bar bookkeeping but the UI never shows a best/worst highlight for them.
      const direction: MetricDirection = metric.direction === "context" ? "higher" : metric.direction;
      const cells: CompareCell[] = bundles.map((b) => {
        const value = metric.pick(b);
        return {
          value,
          display: value == null ? "—" : metric.format(value),
          note: value == null ? (metric.note?.(b) ?? null) : null,
        };
      });
      return {
        key: metric.key,
        label: metric.label,
        subLabel: metric.us != null ? `US AVG ${metric.format(metric.us)}` : "ATLAS SUBSCORE",
        direction,
        ranked: metric.direction !== "context",
        usValue: metric.us,
        cells,
      };
    }),
  }));
}

export { rankCells, bestIndex, barWidth, deltaVsFirst, leaderTally };
export type { CompareCell, MetricDirection };

// ── Key differences insight panel ──────────────────────────────────────────────

export type KeyDifference = {
  label: string;
  text: string;
};

export function buildKeyDifferences(bundles: CompareCityBundle[]): KeyDifference[] {
  if (bundles.length < 2) {
    return [{ label: "GET STARTED", text: "Add a second city to see gaps, leaders, and rankings across all metrics." }];
  }

  const byIncome = [...bundles].filter((b) => b.medianHouseholdIncome != null).sort((a, b) => b.medianHouseholdIncome! - a.medianHouseholdIncome!);
  const byRent = [...bundles].filter((b) => b.medianRent != null).sort((a, b) => a.medianRent! - b.medianRent!);
  const byScore = [...bundles].filter((b) => b.atlasScore != null).sort((a, b) => b.atlasScore! - a.atlasScore!);

  const items: KeyDifference[] = [];

  if (byIncome.length > 1) {
    const top = byIncome[0];
    const bottom = byIncome[byIncome.length - 1];
    items.push({
      label: "INCOME GAP",
      text: `${top.name} earns $${(top.medianHouseholdIncome! - bottom.medianHouseholdIncome!).toLocaleString()} more in median household income than ${bottom.name}.`,
    });
  }

  if (byRent.length > 1) {
    const cheapest = byRent[0];
    const priciest = byRent[byRent.length - 1];
    items.push({
      label: "HOUSING COST",
      text: `${cheapest.name} has the lowest median rent at $${cheapest.medianRent!.toLocaleString()}/mo — $${(priciest.medianRent! - cheapest.medianRent!).toLocaleString()} under ${priciest.name}.`,
    });
  }

  if (byScore.length > 1) {
    const top = byScore[0];
    const bottom = byScore[byScore.length - 1];
    items.push({
      label: "OVERALL FIT",
      text: `${top.name} posts the top Atlas Score at ${top.atlasScore}, ${top.atlasScore! - bottom.atlasScore!} points clear of ${bottom.name}.`,
    });
  }

  return items.length
    ? items
    : [{ label: "GET STARTED", text: "Add a second city to see gaps, leaders, and rankings across all metrics." }];
}
