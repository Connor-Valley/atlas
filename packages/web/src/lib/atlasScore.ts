import type { UserPreferences } from '../composables/usePreferences';
import { DEFAULT_PREFERENCES, deriveWeightsFromQuiz } from '../composables/usePreferences';

export type DimensionScores = {
  affordability:     number | null;
  jobMarket:         number | null;
  climate:           number | null;
  opportunity:       number | null;
  lifestyleVibrancy: number | null;
  airQuality:        number | null;
  safety:            number | null;
  connectivity:      number | null;
};

export type ScoreInputs = {
  income:        any;
  affordability: any;
  costOfLiving:  any;
  profile:       any;
  qol:           any;
  climate:       any;
  airQuality:    any;
  lifestyle:     any;
  politicalLean: any;
  housing:       any;
};

export type AtlasScoreResult = {
  score: number;
  breakdown: DimensionScores;
  isPersonalized: boolean;
};

// ── Normalization ─────────────────────────────────────────────────────────────

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function score(value: number | null | undefined, min: number, max: number, direction: 'higher' | 'lower'): number | null {
  if (value == null) return null;
  const n = normalize(value, min, max);
  return direction === 'lower' ? 100 - n : n;
}

function wavg(pairs: Array<{ s: number | null; w: number }>): number | null {
  const valid = pairs.filter(({ s }) => s != null);
  if (!valid.length) return null;
  const totalW = valid.reduce((a, { w }) => a + w, 0);
  return valid.reduce((a, { s, w }) => a + s! * w, 0) / totalW;
}

function avg(...values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ── Dimension scorers ─────────────────────────────────────────────────────────

function affordabilityScore(
  affordability: any,
  costOfLiving: any,
  housing: any,
  pref: UserPreferences['affordability_preference'],
): number | null {
  const rentToIncomeS = score(affordability?.rentToIncomeRatio, 0.15, 0.6, 'lower');
  const rppS          = score(costOfLiving?.rppIndex, 80, 130, 'lower');
  const rentGrowthS   = score(housing?.rentGrowthPct5yr, -5, 30, 'lower');

  if (pref === 'budget') {
    // Rent-to-income is the primary signal — cost of living index is secondary
    return wavg([
      { s: rentToIncomeS, w: 0.55 },
      { s: rppS,          w: 0.30 },
      { s: rentGrowthS,   w: 0.15 },
    ]);
  }
  if (pref === 'flexible') {
    // Only care that it's not wildly expensive — rent growth trend matters most
    return wavg([
      { s: rppS,        w: 0.50 },
      { s: rentGrowthS, w: 0.50 },
    ]);
  }
  // 'value' or 'any' — balanced
  return avg(rentToIncomeS, rppS, rentGrowthS);
}

function jobMarketScore(
  income: any,
  qol: any,
  pref: UserPreferences['job_market_preference'],
): number | null {
  const incomeS   = score(income?.medianHouseholdIncome, 30_000, 150_000, 'higher');
  const unempS    = score(qol?.unemploymentRate?.value, 0.02, 0.12, 'lower');
  const growthS   = score(income?.employmentGrowthPct5yr, -5, 15, 'higher');
  const sectors   = income?.industryBreakdown as Array<{ share: number }> | undefined;
  const diversity = sectors?.length
    ? Math.max(0, 1 - sectors.reduce((sum, s) => sum + s.share * s.share, 0))
    : null;
  const diversityS = score(diversity, 0, 1, 'higher');

  if (pref === 'high_earning') {
    return wavg([
      { s: incomeS,    w: 0.55 },
      { s: unempS,     w: 0.25 },
      { s: growthS,    w: 0.15 },
      { s: diversityS, w: 0.05 },
    ]);
  }
  if (pref === 'stable') {
    return wavg([
      { s: unempS,     w: 0.50 },
      { s: incomeS,    w: 0.25 },
      { s: diversityS, w: 0.20 },
      { s: growthS,    w: 0.05 },
    ]);
  }
  if (pref === 'growth') {
    return wavg([
      { s: growthS,    w: 0.40 },
      { s: diversityS, w: 0.25 },
      { s: incomeS,    w: 0.25 },
      { s: unempS,     w: 0.10 },
    ]);
  }
  if (pref === 'remote') {
    // Job market matters much less — just sanity-check it isn't collapsing
    return wavg([
      { s: unempS,  w: 0.50 },
      { s: incomeS, w: 0.30 },
      { s: growthS, w: 0.20 },
    ]);
  }
  // 'any' — balanced defaults
  return wavg([
    { s: incomeS,    w: 0.35 },
    { s: unempS,     w: 0.35 },
    { s: growthS,    w: 0.20 },
    { s: diversityS, w: 0.10 },
  ]);
}

function climateScore(
  climate: any,
  pref: UserPreferences['climate_preference'],
): number | null {
  if (!climate) return null;

  const hazardS = score(climate.hazardRisks?.compositeScore, 0, 100, 'lower');
  const sunnyS  = score(climate.sunnyDaysPerYear, 100, 300, 'higher');

  if (pref === 'warm') {
    const tempS     = score(climate.avgTempF, 45, 85, 'higher');
    const freezingS = score(climate.freezingDaysPerYear, 0, 120, 'lower');
    return avg(sunnyS, tempS, freezingS, hazardS);
  }
  if (pref === 'cool') {
    const coolTempS = score(climate.avgTempF, 30, 70, 'lower');
    const hotS      = score(climate.hotDaysPerYear, 0, 90, 'lower');
    return avg(coolTempS, hotS, sunnyS, hazardS);
  }
  if (pref === 'mild') {
    const tempDeviation = climate.avgTempF != null ? Math.abs(climate.avgTempF - 65) : null;
    const mildTempS = score(tempDeviation, 0, 40, 'lower');
    const hotS      = score(climate.hotDaysPerYear, 0, 60, 'lower');
    const freezingS = score(climate.freezingDaysPerYear, 0, 60, 'lower');
    return avg(mildTempS, hotS, freezingS, hazardS);
  }
  if (pref === 'four_seasons') {
    const comfortDays = (climate.hotDaysPerYear != null && climate.freezingDaysPerYear != null)
      ? 365 - climate.hotDaysPerYear - climate.freezingDaysPerYear
      : null;
    const comfortS = score(comfortDays, 100, 300, 'higher');
    return avg(comfortS, sunnyS, hazardS);
  }
  return avg(sunnyS, hazardS);
}

function opportunityScore(
  profile: any,
  income: any,
  qol: any,
  pref: UserPreferences['opportunity_preference'],
): number | null {
  const att = profile?.educationalAttainment as Array<{ label: string; share: number }> | undefined;
  let bachelorS: number | null = null;
  let graduateS: number | null = null;
  if (att) {
    const bachelorsShare = att.find((e) => e.label === "Bachelor's degree")?.share ?? 0;
    const graduateShare  = att.find((e) => e.label === "Graduate degree")?.share ?? 0;
    bachelorS = score((bachelorsShare + graduateShare) * 100, 15, 75, 'higher');
    graduateS = score(graduateShare * 100, 5, 35, 'higher');
  }

  const povertyS = score(income?.povertyRate, 3, 30, 'lower');
  const laborS   = score(qol?.laborForceParticipationRate?.value, 0.55, 0.75, 'higher');
  const growthS  = score(income?.employmentGrowthPct5yr, -5, 15, 'higher');

  const sectors    = income?.industryBreakdown as Array<{ share: number }> | undefined;
  const diversity  = sectors?.length
    ? Math.max(0, 1 - sectors.reduce((sum, s) => sum + s.share * s.share, 0))
    : null;
  const diversityS = score(diversity, 0, 1, 'higher');

  if (pref === 'education') {
    return wavg([
      { s: bachelorS,  w: 0.45 },
      { s: graduateS,  w: 0.30 },
      { s: laborS,     w: 0.15 },
      { s: povertyS,   w: 0.10 },
    ]);
  }
  if (pref === 'growth') {
    return wavg([
      { s: growthS,    w: 0.45 },
      { s: laborS,     w: 0.25 },
      { s: bachelorS,  w: 0.15 },
      { s: povertyS,   w: 0.15 },
    ]);
  }
  if (pref === 'diverse') {
    return wavg([
      { s: diversityS, w: 0.40 },
      { s: growthS,    w: 0.25 },
      { s: laborS,     w: 0.20 },
      { s: povertyS,   w: 0.15 },
    ]);
  }
  if (pref === 'mobility') {
    return wavg([
      { s: povertyS,  w: 0.40 },
      { s: laborS,    w: 0.35 },
      { s: growthS,   w: 0.15 },
      { s: bachelorS, w: 0.10 },
    ]);
  }
  // 'any' — balanced
  return avg(bachelorS, graduateS, povertyS, laborS);
}

function lifestyleVibrancyScore(
  lifestyle: any,
  profile: any,
  pref: UserPreferences['lifestyle_preference'],
): number | null {
  const restaurantS = score(lifestyle?.restaurants?.perTenThousandResidents, 5, 80, 'higher');
  const barsS       = score(lifestyle?.bars?.perTenThousandResidents, 2, 40, 'higher');
  const artsS       = score(lifestyle?.artsAndCulture?.perTenThousandResidents, 1, 20, 'higher');
  const commuteS    = score(profile?.meanCommuteMinutes, 10, 45, 'lower');
  const remoteS     = score(profile?.remoteWorkShare, 0.05, 0.40, 'higher');
  const transitS    = score(profile?.transitShare, 0.02, 0.40, 'higher');

  if (pref === 'urban') {
    return wavg([
      { s: restaurantS, w: 0.25 },
      { s: barsS,       w: 0.20 },
      { s: artsS,       w: 0.20 },
      { s: transitS,    w: 0.20 },
      { s: commuteS,    w: 0.15 },
    ]);
  }
  if (pref === 'suburban') {
    return wavg([
      { s: commuteS,    w: 0.50 },
      { s: remoteS,     w: 0.30 },
      { s: restaurantS, w: 0.20 },
    ]);
  }
  if (pref === 'nature') {
    // Vibrancy matters less — just check it isn't a dead city
    return wavg([
      { s: commuteS,    w: 0.40 },
      { s: remoteS,     w: 0.35 },
      { s: restaurantS, w: 0.25 },
    ]);
  }
  // 'any'
  return avg(restaurantS, barsS, artsS, commuteS, remoteS);
}

function airQualityScore(airQuality: any): number | null {
  const aqiS      = score(airQuality?.medianAqi, 20, 120, 'lower');
  const goodDaysS = score(airQuality?.goodDaysPercent, 30, 90, 'higher');
  return avg(aqiS, goodDaysS);
}

function safetyScore(): number | null {
  return null;
}

function connectivityScore(
  profile: any,
  qol: any,
  pref: UserPreferences['connectivity_preference'],
): number | null {
  const airportPercentile  = qol?.airportBusyness?.value?.nationalPercentile ?? null;
  const airportDistanceS   = score(qol?.airportDistanceMiles?.value, 0, 100, 'lower');
  const transitS           = score(profile?.transitShare, 0.02, 0.40, 'higher');
  const walkS              = score(profile?.transitShare, 0.05, 0.45, 'higher'); // proxy until walk score available

  if (pref === 'walkable') {
    return wavg([
      { s: walkS,           w: 0.50 },
      { s: transitS,        w: 0.35 },
      { s: airportDistanceS, w: 0.15 },
    ]);
  }
  if (pref === 'balanced') {
    return wavg([
      { s: airportPercentile, w: 0.30 },
      { s: airportDistanceS,  w: 0.25 },
      { s: transitS,          w: 0.25 },
      { s: walkS,             w: 0.20 },
    ]);
  }
  if (pref === 'airport') {
    return wavg([
      { s: airportPercentile, w: 0.50 },
      { s: airportDistanceS,  w: 0.40 },
      { s: transitS,          w: 0.10 },
    ]);
  }
  if (pref === 'car') {
    // Not a priority — return null so weight zeroes out
    return null;
  }
  // 'any'
  return avg(airportPercentile, airportDistanceS, transitS);
}

function politicalMatchScore(politicalLean: any, preference: number): number | null {
  const cityMargin = politicalLean?.marginPct;
  if (cityMargin == null) return null;
  return Math.max(0, 100 - Math.abs(cityMargin - preference) / 2);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeAtlasScore(inputs: ScoreInputs, prefs?: UserPreferences | null): AtlasScoreResult {
  const raw = prefs ?? DEFAULT_PREFERENCES;
  const p   = deriveWeightsFromQuiz(raw);
  const isPersonalized = !!prefs;

  const breakdown: DimensionScores = {
    affordability:     affordabilityScore(inputs.affordability, inputs.costOfLiving, inputs.housing, p.affordability_preference),
    jobMarket:         jobMarketScore(inputs.income, inputs.qol, p.job_market_preference),
    climate:           climateScore(inputs.climate, p.climate_preference),
    opportunity:       opportunityScore(inputs.profile, inputs.income, inputs.qol, p.opportunity_preference),
    lifestyleVibrancy: lifestyleVibrancyScore(inputs.lifestyle, inputs.profile, p.lifestyle_preference),
    airQuality:        airQualityScore(inputs.airQuality),
    safety:            safetyScore(),
    connectivity:      connectivityScore(inputs.profile, inputs.qol, p.connectivity_preference),
  };

  const weighted: Array<{ score: number | null; weight: number }> = [
    { score: breakdown.affordability,     weight: p.weight_affordability },
    { score: breakdown.jobMarket,         weight: p.weight_job_market },
    { score: breakdown.climate,           weight: p.weight_climate },
    { score: breakdown.opportunity,       weight: p.weight_opportunity },
    { score: breakdown.lifestyleVibrancy, weight: p.weight_lifestyle_vibrancy },
    { score: breakdown.airQuality,        weight: p.weight_air_quality },
    { score: breakdown.safety,            weight: p.weight_safety },
    { score: breakdown.connectivity,      weight: p.weight_connectivity },
  ];

  if (p.political_preference_enabled) {
    const polScore = politicalMatchScore(inputs.politicalLean, p.political_preference);
    weighted.push({ score: polScore, weight: 20 });
  }

  let total = 0;
  let totalWeight = 0;
  for (const { score: s, weight } of weighted) {
    if (s != null && weight > 0) {
      total += s * weight;
      totalWeight += weight;
    }
  }

  const finalScore = totalWeight > 0 ? Math.round(total / totalWeight) : 50;
  return { score: finalScore, breakdown, isPersonalized };
}

export function scoreTier(score: number): { label: string; tier: 'excellent' | 'good' | 'average' | 'below' | 'poor' } {
  if (score >= 80) return { label: 'Excellent',     tier: 'excellent' };
  if (score >= 65) return { label: 'Good',          tier: 'good' };
  if (score >= 45) return { label: 'Average',       tier: 'average' };
  if (score >= 30) return { label: 'Below Average', tier: 'below' };
  return               { label: 'Poor',           tier: 'poor' };
}
