import type { ComparedCity } from "./compare";

export type PersonaScore = {
  persona: string;
  aScore: number;
  bScore: number;
  winner: "a" | "b" | "tie";
  margin: number;
};

type Weight = {
  key: string;
  weight: number;
  direction: "higher" | "lower";
};

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function scoreCity(city: ComparedCity, weights: Weight[]): number {
  let total = 0;
  let usedWeight = 0;

  for (const { key, weight, direction } of weights) {
    const raw = getMetric(city, key);
    if (raw == null) continue;

    // Normalize to 0-100 using reasonable domain ranges
    const normalized = normalizeMetric(key, raw, direction);
    total += normalized * weight;
    usedWeight += weight;
  }

  if (usedWeight === 0) return 50;
  return Math.round(total / usedWeight);
}

function getMetric(city: ComparedCity, key: string): number | null {
  switch (key) {
    case "income": return city.income.medianHouseholdIncome ?? null;
    case "rent": return city.housing.housing.medianRent ?? null;
    case "homeValue": return city.housing.housing.medianHomeValue ?? null;
    case "renterShare": return city.housing.housing.renterShare ?? null;
    case "rentToIncome": return city.affordability.rentToIncomeRatio ?? null;
    case "povertyRate": return city.income.povertyRate ?? null;
    case "affordabilityScore": return city.scores.affordability ?? null;
    case "unemployment": return city.qualityOfLife?.unemploymentRate?.value ?? null;
    case "collegeGrads": {
      const att = city.cityProfile?.educationalAttainment as Array<{ label: string; share: number }> | undefined;
      if (!att) return null;
      const b = att.find(e => e.label === "Bachelor's degree")?.share ?? 0;
      const g = att.find(e => e.label === "Graduate degree")?.share ?? 0;
      return b + g;
    }
    case "rentBurden": return city.detailedAffordability?.rentBurdenPercent ?? null;
    default: return null;
  }
}

function normalizeMetric(key: string, value: number, direction: "higher" | "lower"): number {
  // Define reasonable min/max for each metric
  const ranges: Record<string, [number, number]> = {
    income: [30000, 150000],
    rent: [700, 4000],
    homeValue: [100000, 1200000],
    renterShare: [0.2, 0.8],
    rentToIncome: [0.15, 0.6],
    povertyRate: [3, 30],
    affordabilityScore: [0, 100],
    unemployment: [0.02, 0.12],
    collegeGrads: [0.1, 0.7],
    rentBurden: [0.3, 0.7],
  };

  const [min, max] = ranges[key] ?? [0, 100];
  const raw = normalize(value, min, max);
  // If lower is better, flip the score
  return direction === "lower" ? 100 - raw : raw;
}

const PERSONA_WEIGHTS: Record<string, Weight[]> = {
  "Young professional": [
    { key: "income", weight: 0.3, direction: "higher" },
    { key: "rentToIncome", weight: 0.3, direction: "lower" },
    { key: "unemployment", weight: 0.2, direction: "lower" },
    { key: "collegeGrads", weight: 0.2, direction: "higher" },
  ],
  "Family buying a home": [
    { key: "homeValue", weight: 0.3, direction: "lower" },
    { key: "income", weight: 0.3, direction: "higher" },
    { key: "rentBurden", weight: 0.2, direction: "lower" },
    { key: "affordabilityScore", weight: 0.2, direction: "higher" },
  ],
  "Remote worker": [
    { key: "rent", weight: 0.3, direction: "lower" },
    { key: "affordabilityScore", weight: 0.3, direction: "higher" },
    { key: "income", weight: 0.2, direction: "higher" },
    { key: "rentToIncome", weight: 0.2, direction: "lower" },
  ],
  "Career climber": [
    { key: "income", weight: 0.35, direction: "higher" },
    { key: "unemployment", weight: 0.25, direction: "lower" },
    { key: "collegeGrads", weight: 0.2, direction: "higher" },
    { key: "affordabilityScore", weight: 0.2, direction: "higher" },
  ],
  "Tight budget": [
    { key: "rent", weight: 0.3, direction: "lower" },
    { key: "rentToIncome", weight: 0.3, direction: "lower" },
    { key: "povertyRate", weight: 0.2, direction: "lower" },
    { key: "affordabilityScore", weight: 0.2, direction: "higher" },
  ],
};

export function buildPersonaScores(cityA: ComparedCity, cityB: ComparedCity): PersonaScore[] {
  return Object.entries(PERSONA_WEIGHTS).map(([persona, weights]) => {
    const aScore = scoreCity(cityA, weights);
    const bScore = scoreCity(cityB, weights);
    const diff = aScore - bScore;
    const winner: "a" | "b" | "tie" = Math.abs(diff) <= 3 ? "tie" : diff > 0 ? "a" : "b";
    return { persona, aScore, bScore, winner, margin: Math.abs(diff) };
  });
}
