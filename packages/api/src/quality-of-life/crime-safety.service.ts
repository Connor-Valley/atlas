import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { City } from "../cities/cities.types.js";
import type { SafetyScore } from "./quality-of-life.types.js";

const FBI_API_BASE = "https://api.usa.gov/crime/fbi/cde";
const FETCH_TIMEOUT_MS = 15_000;

const __dir = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dir, "../../../cache");
const ORI_CACHE_FILE = join(CACHE_DIR, "ori-cache.json");
const CRIME_STATS_FILE = join(__dir, "../../../data/crime-stats.json");

// ── File-backed caches ────────────────────────────────────────────────────────
type OriEntry = { ori: string; isNibrs: boolean };
type CrimeStatEntry = { count: number; year: number };

let oriCache: Record<string, OriEntry> = {};
let crimeStats: Record<string, CrimeStatEntry> = {};

async function loadCaches() {
  try { oriCache = JSON.parse(await readFile(ORI_CACHE_FILE, "utf8")); } catch { /* first run */ }
  try { crimeStats = JSON.parse(await readFile(CRIME_STATS_FILE, "utf8")); } catch { /* first run */ }
}

async function saveOriCache() {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(ORI_CACHE_FILE, JSON.stringify(oriCache, null, 2));
  } catch (e) {
    console.warn("[crime-safety] failed to save ORI cache:", e);
  }
}

// Load caches when module is imported
loadCaches().catch(() => {});

// ── In-memory score cache ─────────────────────────────────────────────────────
const scoreCache = new Map<string, SafetyScore | null>();

// ── Map state FIPS → abbreviation ────────────────────────────────────────────
const FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

// ── Retry with exponential backoff ────────────────────────────────────────────
async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 5,
  baseDelayMs = 1000,
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[crime-safety] ${label} attempt ${attempt}/${maxAttempts} failed: ${msg}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  console.warn(`[crime-safety] ${label} all retries exhausted, returning null`);
  return null;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Atlas/1.0 (city data explorer; contact@helloatlas.app)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type FbiAgency = {
  ori: string;
  agency_name: string;
  agency_type_name: string;
  is_nibrs: boolean;
  latitude: number | null;
  longitude: number | null;
};

// ── Main export ───────────────────────────────────────────────────────────────
export async function fetchCitySafetyScore(city: City): Promise<SafetyScore | null> {
  const apiKey = process.env.FBI_API_KEY;
  if (!apiKey) return null;

  const stateAbbr = FIPS_TO_ABBR[city.stateFips];
  if (!stateAbbr) return null;

  const scoreKey = `${stateAbbr}:${city.name}`;
  if (scoreCache.has(scoreKey)) return scoreCache.get(scoreKey)!;

  // 1. Check static crime-stats.json first
  const oriKey = scoreKey;
  const cached = oriCache[oriKey];
  if (cached && crimeStats[cached.ori]) {
    const stat = crimeStats[cached.ori];
    const score = calculateSafetyScore(stat.count, city.population, stat.year);
    scoreCache.set(scoreKey, score);
    return score;
  }

  // 2. Fall back to live FBI API
  console.log(`[crime-safety] live lookup for ${city.name}, ${stateAbbr}`);

  const agency = await withRetry(
    `ORI lookup ${city.name}`,
    () => lookupAgencyOri(city.name, stateAbbr, apiKey, city.lat, city.lon),
  );

  if (!agency) { scoreCache.set(scoreKey, null); return null; }

  // Save ORI to file cache
  oriCache[oriKey] = agency;
  saveOriCache();

  const result = await withRetry(
    `crime count ${agency.ori}`,
    () => fetchViolentCrimeCount(agency.ori, apiKey, city.population),
  );

  if (!result) { scoreCache.set(scoreKey, null); return null; }

  const score = calculateSafetyScore(result.count, city.population, result.year);
  scoreCache.set(scoreKey, score);
  return score;
}

// ── Agency ORI lookup ─────────────────────────────────────────────────────────
async function lookupAgencyOri(
  cityName: string,
  stateAbbr: string,
  apiKey: string,
  cityLat: number | null,
  cityLon: number | null,
): Promise<OriEntry> {
  const url = `${FBI_API_BASE}/agency/byStateAbbr/${stateAbbr}?api_key=${apiKey}`;
  const res = await fetchWithTimeout(url);
  const raw = await res.json();

  let agencies: FbiAgency[];
  if (Array.isArray(raw)) {
    agencies = raw;
  } else if (raw && typeof raw === "object") {
    agencies = Object.values(raw).flat() as FbiAgency[];
  } else {
    throw new Error("unexpected agency response shape");
  }

  const normalizedCity = cityName.toLowerCase().trim();
  const cityAgencies = agencies.filter((a) => a.agency_type_name?.toLowerCase() === "city");

  const exactName = `${normalizedCity} police department`;
  const exactAlt  = `${normalizedCity} police`;
  // Also try "{city} city police department" — handles e.g. "New York City Police Department"
  const exactCity = `${normalizedCity} city police department`;
  const exact = cityAgencies.find((a) => {
    const n = a.agency_name?.toLowerCase() ?? "";
    return n === exactName || n === exactAlt || n === exactCity;
  });
  if (exact) return { ori: exact.ori, isNibrs: exact.is_nibrs };

  // startsWith can match wrong agencies (e.g. "New York Mills" before NYPD) —
  // prefer the match whose name ends with "police department" and is shortest.
  const startsWithMatches = cityAgencies.filter((a) =>
    a.agency_name?.toLowerCase().startsWith(normalizedCity + " ")
  );
  if (startsWithMatches.length) {
    const best = startsWithMatches
      .filter((a) => a.agency_name?.toLowerCase().includes("police"))
      .sort((a, b) => a.agency_name.length - b.agency_name.length)[0]
      ?? startsWithMatches[0];
    return { ori: best.ori, isNibrs: best.is_nibrs };
  }

  if (cityLat != null && cityLon != null) {
    const closest = cityAgencies
      .filter((a) => a.latitude != null && a.longitude != null)
      .map((a) => ({ ...a, dist: haversineKm(cityLat, cityLon, a.latitude!, a.longitude!) }))
      .sort((a, b) => a.dist - b.dist)[0];
    if (closest && closest.dist < 5) return { ori: closest.ori, isNibrs: closest.is_nibrs };
  }

  throw new Error(`no agency match for ${cityName}, ${stateAbbr}`);
}

// ── Crime count fetch ─────────────────────────────────────────────────────────

// Summarized endpoint returns:
// { offenses: { actuals: { "<Agency> Offenses": { "MM-YYYY": count, ... }, "<Agency> Clearances": {...} } } }
// The actuals object only contains agency-specific keys (no state/US-level rows).
function extractCount(data: unknown, year: number): { count: number; year: number } | null {
  const d = data as Record<string, unknown>;
  const actuals = (d?.offenses as Record<string, unknown>)?.actuals as Record<string, Record<string, number>> | undefined;
  if (actuals) {
    const agencyKey = Object.keys(actuals).find((k) => k.endsWith(" Offenses"));
    if (agencyKey) {
      const monthly = actuals[agencyKey];
      const total = Object.values(monthly).reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
      if (total > 0) return { count: total, year };
    }
  }
  return null;
}

async function fetchViolentCrimeCount(
  ori: string,
  apiKey: string,
  cityPopulation: number,
): Promise<{ count: number; year: number }> {
  for (const year of [2022, 2021, 2020, 2019, 2018, 2017]) {
    try {
      const url = `${FBI_API_BASE}/summarized/agency/${ori}/violent-crime?from=01-${year}&to=12-${year}&api_key=${apiKey}`;
      const res = await fetchWithTimeout(url);
      const data = await res.json();
      const result = extractCount(data, year);
      if (!result) continue;

      // Sanity-check: FBI agency population should be within 5x of our city population.
      // If wildly off we almost certainly matched the wrong agency.
      const fbiPop = extractFbiPopulation(data);
      if (fbiPop && cityPopulation > 0) {
        const ratio = Math.max(fbiPop, cityPopulation) / Math.min(fbiPop, cityPopulation);
        if (ratio > 5) {
          console.warn(`[crime-safety] population mismatch for ${ori}: FBI=${fbiPop}, city=${cityPopulation} (ratio ${ratio.toFixed(1)}x) — skipping`);
          throw new Error(`population mismatch (${ratio.toFixed(1)}x)`);
        }
      }

      return result;
    } catch { /* try next year */ }
  }
  throw new Error(`no crime data found for ORI ${ori}`);
}

function extractFbiPopulation(data: unknown): number | null {
  const pop = (data as Record<string, unknown>)?.populations as Record<string, Record<string, Record<string, number>>> | undefined;
  if (!pop?.population) return null;
  // Find the agency-specific population key (not state or US)
  const agencyKey = Object.keys(pop.population).find(
    (k) => k !== "United States" && !k.match(/^[A-Z][a-z]/)
  ) ?? Object.keys(pop.population).find(
    (k) => k !== "United States"
  );
  if (!agencyKey) return null;
  const vals = Object.values(pop.population[agencyKey]).filter((v) => typeof v === "number");
  return vals.length ? (vals[0] as number) : null;
}

// ── Score calculation ─────────────────────────────────────────────────────────
export function calculateSafetyScore(violentCount: number, population: number, dataYear: number): SafetyScore {
  const ratePer100k = population > 0 ? (violentCount / population) * 100_000 : 0;

  let score: number;
  let label: string;
  let tier: "excellent" | "good" | "average" | "below-average" | "high";

  if (ratePer100k < 150)       { score = 5; label = "Excellent";     tier = "excellent"; }
  else if (ratePer100k < 450)  { score = 4; label = "Good";          tier = "good"; }
  else if (ratePer100k < 1100) { score = 3; label = "Average";       tier = "average"; }
  else if (ratePer100k < 1800) { score = 2; label = "Below Average"; tier = "below-average"; }
  else                         { score = 1; label = "High Concern";  tier = "high"; }

  return {
    score, label, tier, dataYear,
    methodology:
      "Safety score is derived from FBI Crime Data Explorer statistics for the city's primary law enforcement agency. " +
      "It reflects reported violent crime rates relative to the national average of approximately 380 incidents per 100,000 residents. " +
      "Reported statistics are influenced by policing practices, agency reporting rates, and jurisdictional differences — " +
      "this score is intended as general context, not a precise safety ranking.",
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
