import type { UserPreferences } from '../composables/usePreferences';

export type AtlasScoreBreakdown = {
  affordability: number | null;
  jobMarket: number | null;
  opportunity: number | null;
  connectivity: number | null;
  lifestyle: number | null;
};

export type AtlasScoreResult = {
  score: number;
  breakdown: AtlasScoreBreakdown;
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

function affordabilityScore(affordability: any): number | null {
  return score(affordability?.rentToIncomeRatio, 0.15, 0.6, 'lower');
}

function jobMarketScore(income: any, qol: any): number | null {
  const incomeS = score(income?.medianHouseholdIncome, 30_000, 150_000, 'higher');
  const unempS  = score(qol?.unemploymentRate?.value, 0.02, 0.12, 'lower');
  return avg(incomeS, unempS);
}

function opportunityScore(profile: any, income: any, qol: any): number | null {
  // College attainment (bachelors + graduate share)
  const att = profile?.educationalAttainment as Array<{ label: string; share: number }> | undefined;
  const collegeRate = att
    ? (att.find((e) => e.label === "Bachelor's degree")?.share ?? 0) +
      (att.find((e) => e.label === "Graduate degree")?.share ?? 0)
    : null;

  const collegeS = score(collegeRate, 0.1, 0.7, 'higher');
  const laborS   = score(qol?.laborForceParticipationRate?.value, 0.55, 0.75, 'higher');
  // povertyRate is a percentage (e.g. 16.5)
  const povertyS = score(income?.povertyRate, 3, 30, 'lower');
  return avg(collegeS, laborS, povertyS);
}

function connectivityScore(profile: any, qol: any): number | null {
  const airportPercentile = qol?.airportBusyness?.value?.nationalPercentile;
  const airportDistanceS  = score(qol?.airportDistanceMiles?.value, 0, 100, 'lower');
  // airportBusyness nationalPercentile is already 0-100
  const airportPercentileS = airportPercentile != null ? airportPercentile : null;
  const transitS = score(profile?.transitShare, 0.02, 0.40, 'higher');
  return avg(airportPercentileS, airportDistanceS, transitS);
}

function lifestyleScore(profile: any): number | null {
  const commuteS = score(profile?.meanCommuteMinutes, 10, 45, 'lower');
  const remoteS  = score(profile?.remoteWorkShare, 0.05, 0.40, 'higher');
  return avg(commuteS, remoteS);
}

// ── Public API ────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPreferences = {
  persona_id: 'balanced',
  weight_affordability: 20,
  weight_job_market: 20,
  weight_opportunity: 20,
  weight_connectivity: 20,
  weight_lifestyle: 20,
};

export function computeAtlasScore(
  income: any,
  affordability: any,
  profile: any,
  qol: any,
  prefs?: UserPreferences | null,
): AtlasScoreResult {
  const p = prefs ?? DEFAULT_PREFS;
  const isPersonalized = !!prefs;

  const breakdown: AtlasScoreBreakdown = {
    affordability: affordabilityScore(affordability),
    jobMarket:     jobMarketScore(income, qol),
    opportunity:   opportunityScore(profile, income, qol),
    connectivity:  connectivityScore(profile, qol),
    lifestyle:     lifestyleScore(profile),
  };

  const weighted: Array<{ score: number | null; weight: number }> = [
    { score: breakdown.affordability, weight: p.weight_affordability },
    { score: breakdown.jobMarket,     weight: p.weight_job_market },
    { score: breakdown.opportunity,   weight: p.weight_opportunity },
    { score: breakdown.connectivity,  weight: p.weight_connectivity },
    { score: breakdown.lifestyle,     weight: p.weight_lifestyle },
  ];

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
