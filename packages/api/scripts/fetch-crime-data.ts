/**
 * fetch-crime-data.ts
 *
 * Pre-fetches FBI crime data for all supported states and writes static JSON
 * files consumed by the API at runtime. Run at build time, not on user request.
 *
 * Usage:
 *   pnpm tsx packages/api/scripts/fetch-crime-data.ts [STATE1 STATE2 ...]
 *
 * Examples:
 *   pnpm tsx packages/api/scripts/fetch-crime-data.ts          # all states
 *   pnpm tsx packages/api/scripts/fetch-crime-data.ts CA TX NY  # selected states
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const CACHE_DIR = join(ROOT, "cache");
const DATA_DIR = join(ROOT, "data");
const ORI_CACHE_FILE = join(CACHE_DIR, "ori-cache.json");
const CRIME_STATS_FILE = join(DATA_DIR, "crime-stats.json");

const FBI_BASE = "https://api.usa.gov/crime/fbi/cde";
const API_KEY = process.env.FBI_API_KEY;
if (!API_KEY) { console.error("FBI_API_KEY env var is required"); process.exit(1); }

const SUPPORTED_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL",
  "GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

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
      console.warn(`  [retry] ${label} attempt ${attempt}/${maxAttempts} failed: ${msg}`);
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
      }
    }
  }
  console.warn(`  [retry] ${label} all retries exhausted`);
  return null;
}

async function fbiGet(path: string): Promise<unknown> {
  const url = `${FBI_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Atlas/1.0 (city data explorer; contact@helloatlas.app)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.json();
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ── Agency fetch ──────────────────────────────────────────────────────────────
type Agency = {
  ori: string;
  agency_name: string;
  agency_type_name: string;
  is_nibrs: boolean;
  latitude: number | null;
  longitude: number | null;
};

async function fetchStateAgencies(stateAbbr: string): Promise<Agency[]> {
  const raw = await fbiGet(`/agency/byStateAbbr/${stateAbbr}`);
  if (Array.isArray(raw)) return raw as Agency[];
  if (raw && typeof raw === "object") return Object.values(raw as Record<string, Agency[]>).flat();
  throw new Error(`unexpected agency response for ${stateAbbr}`);
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

async function fetchCrimeCount(ori: string): Promise<{ count: number; year: number } | null> {
  for (const year of [2022, 2021, 2020, 2019, 2018, 2017]) {
    try {
      const data = await fbiGet(`/summarized/agency/${ori}/violent-crime?from=01-${year}&to=12-${year}`);
      const r = extractCount(data, year);
      if (r) return r;
    } catch { /* try next */ }
    await sleep(200);
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  // Load existing files so we can append/update without losing prior work
  let oriCache: Record<string, { ori: string; isNibrs: boolean }> = {};
  let crimeStats: Record<string, { count: number; year: number }> = {};
  try { oriCache = JSON.parse(await readFile(ORI_CACHE_FILE, "utf8")); } catch { /* first run */ }
  try { crimeStats = JSON.parse(await readFile(CRIME_STATS_FILE, "utf8")); } catch { /* first run */ }

  const stateArgs = process.argv.slice(2).map((s) => s.toUpperCase());
  const states = stateArgs.length ? stateArgs : SUPPORTED_STATES;

  console.log(`Fetching crime data for ${states.length} state(s): ${states.join(", ")}\n`);

  for (const state of states) {
    console.log(`\n── ${state} ──`);

    const agencies = await withRetry(`agencies:${state}`, () => fetchStateAgencies(state));
    if (!agencies) { console.log(`  skipping ${state} (agency fetch failed)`); continue; }

    const cityAgencies = agencies.filter((a) => a.agency_type_name?.toLowerCase() === "city");
    console.log(`  ${cityAgencies.length} city agencies`);

    for (const agency of cityAgencies) {
      const oriKey = agency.ori;

      // Skip if we already have fresh crime data for this ORI
      if (crimeStats[oriKey]) {
        process.stdout.write(".");
        continue;
      }

      const result = await withRetry(
        `crime:${agency.ori}`,
        () => fetchCrimeCount(agency.ori),
      );

      if (result) {
        crimeStats[oriKey] = result;
        // Also index by "STATE:agency city name" for quick city → ORI lookup
        const cityName = agency.agency_name
          .replace(/\s+police\s+department$/i, "")
          .replace(/\s+police$/i, "")
          .replace(/\s+pd$/i, "")
          .trim();
        oriCache[`${state}:${cityName}`] = { ori: agency.ori, isNibrs: agency.is_nibrs };
        process.stdout.write("+");
      } else {
        process.stdout.write("-");
      }

      await sleep(300); // be respectful to the FBI API
    }

    process.stdout.write("\n");

    // Save after each state so partial runs aren't lost
    await writeFile(ORI_CACHE_FILE, JSON.stringify(oriCache, null, 2));
    await writeFile(CRIME_STATS_FILE, JSON.stringify(crimeStats, null, 2));
    console.log(`  saved (${Object.keys(crimeStats).length} total ORI entries)`);

    await sleep(1000); // pause between states
  }

  console.log(`\nDone. ${Object.keys(crimeStats).length} ORIs with crime data.`);
  console.log(`  ${ORI_CACHE_FILE}`);
  console.log(`  ${CRIME_STATS_FILE}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
