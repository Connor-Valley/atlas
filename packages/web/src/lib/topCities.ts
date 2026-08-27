import { getCitiesForState } from '../api/states';
import { fetchDetailedCityProfile } from '../api/cityProfile';
import { fetchDetailedQualityOfLife } from '../api/qualityOfLife';
import { fetchDetailedIncome } from '../api/income';
import { fetchAffordability } from '../api/affordability';
import { fetchDetailedHousing } from '../api/housing';
import { fetchClimate } from '../api/climate';
import { fetchAirQuality } from '../api/airQuality';
import { fetchLifestyle } from '../api/lifestyle';
import { fetchPoliticalLean } from '../api/politicalLean';
import { fetchCostOfLiving } from '../api/costOfLiving';
import { computeAtlasScore } from './atlasScore';
import type { UserPreferences } from '../composables/usePreferences';

// How many of the largest-by-population cities *within the chosen state* to actually run the
// full scoring pipeline against. Some states have 1,000+ Census places (CA: 1,618, TX: 1,863 as
// of writing) — scoring literally all of them isn't viable client-side (each city needs ~10
// fetches), so population stands in for "cities worth ranking" within that one state. Smaller
// states get close to full coverage; big ones get their most populous 150.
const CANDIDATE_POOL_SIZE = 150;
const CONCURRENCY = 6;

export interface TopCityResult {
  city: string;
  state: string;
  cityName: string;
  score: number;
}

interface Candidate {
  city: string;
  state: string;
  cityName: string;
  population: number;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function timed<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
  ]).catch(() => null);
}

async function scoreCandidate(candidate: Candidate, prefs: UserPreferences): Promise<TopCityResult | null> {
  const [profile, qol, income, affordability, housing, climate, airQuality, lifestyle, politicalLean, costOfLiving] =
    await Promise.all([
      timed(fetchDetailedCityProfile(candidate.state, candidate.city)),
      timed(fetchDetailedQualityOfLife(candidate.state, candidate.city)),
      timed(fetchDetailedIncome(candidate.state, candidate.city)),
      timed(fetchAffordability(candidate.state, candidate.city)),
      timed(fetchDetailedHousing(candidate.state, candidate.city)),
      timed(fetchClimate(candidate.state, candidate.city)),
      timed(fetchAirQuality(candidate.state, candidate.city)),
      timed(fetchLifestyle(candidate.state, candidate.city)),
      timed(fetchPoliticalLean(candidate.state, candidate.city)),
      timed(fetchCostOfLiving(candidate.state, candidate.city)),
    ]);

  if (!income && !affordability && !profile && !qol) return null;

  const result = computeAtlasScore(
    { income, affordability, costOfLiving, profile, qol, climate, airQuality, lifestyle, politicalLean, housing },
    prefs,
  );

  // A very small/data-sparse city (missing income, housing, lifestyle, etc.) can still have,
  // say, climate data — averaging just that one dimension isn't a real assessment of the city,
  // so it shouldn't get ranked as if it were a confident, fully-informed score.
  if (!result.hasEnoughData) return null;

  return {
    city: candidate.city,
    state: candidate.state,
    cityName: candidate.cityName,
    score: result.score,
  };
}

export async function computeTopCitiesForState(
  stateCode: string,
  prefs: UserPreferences,
  onProgress?: (done: number, total: number) => void,
): Promise<TopCityResult[]> {
  const cities = await getCitiesForState(stateCode);
  const candidates: Candidate[] = cities
    .map((c) => ({ city: c.slug, state: stateCode, cityName: c.name, population: c.population }))
    .sort((a, b) => b.population - a.population)
    .slice(0, CANDIDATE_POOL_SIZE);

  let done = 0;
  const scored = await mapLimit(candidates, CONCURRENCY, async (candidate) => {
    const result = await scoreCandidate(candidate, prefs);
    done++;
    onProgress?.(done, candidates.length);
    return result;
  });

  return scored
    .filter((r): r is TopCityResult => r != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
