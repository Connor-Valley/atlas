import type { UserPreferences } from '../composables/usePreferences';

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
  income:        any; // /income/details
  affordability: any; // /affordability
  costOfLiving:  any; // /cost-of-living
  profile:       any; // /city-profile/details
  qol:           any; // /quality-of-life/details
  climate:       any; // /climate
  airQuality:    any; // /air-quality
  lifestyle:     any; // /lifestyle
  education:     any; // /education
  politicalLean: any; // /political-lean
  housing:       any; // /housing/details
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

function avg(...values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ── Dimension scorers ─────────────────────────────────────────────────────────

function affordabilityScore(affordability: any, costOfLiving: any, housing: any): number | null {
  const rentToIncomeS  = score(affordability?.rentToIncomeRatio, 0.15, 0.6, 'lower');
  const rppS           = score(costOfLiving?.rppIndex, 80, 130, 'lower');
  const rentGrowthS    = score(housing?.rentGrowthPct5yr, -5, 30, 'lower');
  return avg(rentToIncomeS, rppS, rentGrowthS);
}

function jobMarketScore(income: any, qol: any): number | null {
  const incomeS    = score(income?.medianHouseholdIncome, 30_000, 150_000, 'higher');
  const unempS     = score(qol?.unemploymentRate?.value, 0.02, 0.12, 'lower');
  const growthS    = score(income?.employmentGrowthPct5yr, -5, 15, 'higher');
  const diversityS = score(income?.industryDiversityIndex, 0, 1, 'higher');
  // income + unemployment drive the score; growth and diversity are supporting signals
  const signals = [
    { s: incomeS, w: 0.35 },
    { s: unempS,  w: 0.35 },
    { s: growthS, w: 0.20 },
    { s: diversityS, w: 0.10 },
  ];
  const valid = signals.filter(({ s }) => s != null);
  if (!valid.length) return null;
  const totalW = valid.reduce((a, { w }) => a + w, 0);
  return valid.reduce((a, { s, w }) => a + s! * w, 0) / totalW;
}

function climateScore(climate: any, climatePref: UserPreferences['climate_preference']): number | null {
  if (!climate) return null;

  const hazardS = score(climate.hazardRisks?.compositeScore, 0, 100, 'lower');
  const sunnyS  = score(climate.sunnyDaysPerYear, 100, 300, 'higher');

  if (climatePref === 'warm') {
    const tempS     = score(climate.avgTempF, 45, 85, 'higher');
    const freezingS = score(climate.freezingDaysPerYear, 0, 120, 'lower');
    return avg(sunnyS, tempS, freezingS, hazardS);
  }

  if (climatePref === 'cool') {
    // cooler avg temps score better — invert by scoring distance below 70°F
    const coolTempS = score(climate.avgTempF, 30, 70, 'lower');
    const hotS      = score(climate.hotDaysPerYear, 0, 90, 'lower');
    return avg(coolTempS, hotS, sunnyS, hazardS);
  }

  if (climatePref === 'mild') {
    // bell curve around 65°F: the closer to 65, the better
    const tempDeviation = climate.avgTempF != null ? Math.abs(climate.avgTempF - 65) : null;
    const mildTempS = score(tempDeviation, 0, 40, 'lower');
    const hotS      = score(climate.hotDaysPerYear, 0, 60, 'lower');
    const freezingS = score(climate.freezingDaysPerYear, 0, 60, 'lower');
    return avg(mildTempS, hotS, freezingS, hazardS);
  }

  if (climatePref === 'four_seasons') {
    const comfortDays = (climate.hotDaysPerYear != null && climate.freezingDaysPerYear != null)
      ? 365 - climate.hotDaysPerYear - climate.freezingDaysPerYear
      : null;
    const comfortS = score(comfortDays, 100, 300, 'higher');
    return avg(comfortS, sunnyS, hazardS);
  }

  // 'any' — generic desirability
  return avg(sunnyS, hazardS);
}


function opportunityScore(education: any, profile: any, income: any, qol: any): number | null {
  let bachelorS: number | null = null;
  let graduateS: number | null = null;

  if (education) {
    // /education endpoint returns 0–100 percentages
    bachelorS = score(education.bachelorsPlusPct, 15, 75, 'higher');
    graduateS = score(education.graduatePlusPct, 5, 35, 'higher');
  } else {
    // Safety net — /education should always resolve first; profile attainment shares are 0–1
    const att = profile?.educationalAttainment as Array<{ label: string; share: number }> | undefined;
    if (att) {
      const collegeRate =
        ((att.find((e) => e.label === "Bachelor's degree")?.share ?? 0) +
         (att.find((e) => e.label === "Graduate degree")?.share ?? 0)) * 100;
      bachelorS = score(collegeRate, 15, 75, 'higher');
    }
  }

  const povertyS = score(income?.povertyRate, 3, 30, 'lower');
  const laborS   = score(qol?.laborForceParticipationRate?.value, 0.55, 0.75, 'higher');
  return avg(bachelorS, graduateS, povertyS, laborS);
}

function lifestyleVibrancyScore(lifestyle: any, profile: any): number | null {
  const restaurantS = score(lifestyle?.restaurants?.perTenThousandResidents, 5, 80, 'higher');
  const barsS       = score(lifestyle?.bars?.perTenThousandResidents, 2, 40, 'higher');
  const artsS       = score(lifestyle?.artsAndCulture?.perTenThousandResidents, 1, 20, 'higher');
  const commuteS    = score(profile?.meanCommuteMinutes, 10, 45, 'lower');
  const remoteS     = score(profile?.remoteWorkShare, 0.05, 0.40, 'higher');
  return avg(restaurantS, barsS, artsS, commuteS, remoteS);
}

function airQualityScore(airQuality: any): number | null {
  const aqiS      = score(airQuality?.medianAqi, 20, 120, 'lower');
  const goodDaysS = score(airQuality?.goodDaysPercent, 30, 90, 'higher');
  return avg(aqiS, goodDaysS);
}

function safetyScore(): number | null {
  return null; // placeholder — wires in when crime data is available
}

function connectivityScore(profile: any, qol: any): number | null {
  const airportPercentile = qol?.airportBusyness?.value?.nationalPercentile ?? null;
  const airportDistanceS  = score(qol?.airportDistanceMiles?.value, 0, 100, 'lower');
  const transitS          = score(profile?.transitShare, 0.02, 0.40, 'higher');
  return avg(airportPercentile, airportDistanceS, transitS);
}

function politicalMatchScore(politicalLean: any, preference: number): number | null {
  const cityMargin = politicalLean?.marginPct; // -100 to +100, Dem-positive
  if (cityMargin == null) return null;
  // 100 = perfect alignment, 0 = opposite poles
  return Math.max(0, 100 - Math.abs(cityMargin - preference) / 2);
}

// ── Public API ────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPreferences = {
  persona_id: 'balanced',
  weight_affordability: 20,
  weight_job_market: 20,
  weight_opportunity: 15,
  weight_connectivity: 20,
  weight_climate: 20,
  weight_lifestyle_vibrancy: 15,
  weight_air_quality: 10,
  weight_safety: 0,
  climate_preference: 'any',
  political_preference_enabled: false,
  political_preference: 0, // -100 (full Dem) to +100 (full Rep), matches cityMargin in politicalMatchScore
};

export function computeAtlasScore(inputs: ScoreInputs, prefs?: UserPreferences | null): AtlasScoreResult {
  const p = prefs ?? DEFAULT_PREFS;
  const isPersonalized = !!prefs;

  const breakdown: DimensionScores = {
    affordability:     affordabilityScore(inputs.affordability, inputs.costOfLiving, inputs.housing),
    jobMarket:         jobMarketScore(inputs.income, inputs.qol),
    climate:           climateScore(inputs.climate, p.climate_preference),
    opportunity:       opportunityScore(inputs.education, inputs.profile, inputs.income, inputs.qol),
    lifestyleVibrancy: lifestyleVibrancyScore(inputs.lifestyle, inputs.profile),
    airQuality:        airQualityScore(inputs.airQuality),
    safety:            safetyScore(),
    connectivity:      connectivityScore(inputs.profile, inputs.qol),
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

  // Optional political match — fixed weight of 15 when opted in
  if (p.political_preference_enabled) {
    const polScore = politicalMatchScore(inputs.politicalLean, p.political_preference);
    weighted.push({ score: polScore, weight: 15 });
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
