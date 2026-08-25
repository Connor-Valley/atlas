import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { STATE_FIPS } from "../states/states.types.js";
import { toNumber } from "../common/census.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

// Total employed population within a 25-mile radius of each US county — a regional labor-
// market-size signal for the Job Market dimension ("how many jobs are within reach," not just
// "what's the local economy like"). Precomputed once at startup and kept in memory: bounded by
// county count (3,222), not by the number of resolvable cities, so every place sharing (or
// near) a county reuses the same number for free — no per-city computation needed.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTROIDS_FILE = path.resolve(__dirname, "../data/county_centroids.json");

const RADIUS_MILES = 25;
const EARTH_RADIUS_MILES = 3958.8;

type CountyCentroids = Record<string, [number, number]>; // countyFips (5-digit) -> [lat, lon]

let regionalJobsCache: Record<string, number> | null = null;
let initPromise: Promise<void> | null = null;

function haversineMiles(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function initializeRegionalJobsCache(): Promise<void> {
  if (!initPromise) initPromise = build();
  return initPromise;
}

async function build(): Promise<void> {
  try {
    const centroids = JSON.parse(readFileSync(CENTROIDS_FILE, "utf-8")) as CountyCentroids;
    const key = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "";

    const employment: Record<string, number> = {};
    await Promise.all(
      Object.values(STATE_FIPS).map(async (stateFips) => {
        const url =
          `https://api.census.gov/data/${CURRENT_ACS_YEAR}/acs/acs5` +
          `?get=B23025_004E&for=county:*&in=state:${stateFips}${key}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const [, ...rows] = (await res.json()) as string[][];
        for (const [count, stateCode, countyCode] of rows) {
          employment[`${stateCode}${countyCode}`] = toNumber(count);
        }
      }),
    );

    const fipsList = Object.keys(centroids).filter((f) => employment[f] != null);
    const result: Record<string, number> = {};
    for (const fromFips of fipsList) {
      const fromPoint = centroids[fromFips]!;
      let total = 0;
      for (const toFips of fipsList) {
        if (haversineMiles(fromPoint, centroids[toFips]!) <= RADIUS_MILES) {
          total += employment[toFips]!;
        }
      }
      result[fromFips] = total;
    }

    regionalJobsCache = result;
    console.log(`Regional jobs (${RADIUS_MILES}mi radius) cache built: ${Object.keys(result).length} counties`);
  } catch (err) {
    console.warn("Failed to build regional jobs cache:", err);
  }
}

export function getJobsWithinRadius(countyFips: string): number | null {
  return regionalJobsCache?.[countyFips] ?? null;
}
